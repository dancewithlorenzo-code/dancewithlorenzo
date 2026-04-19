// Dance with Lorenzo - Health Monitoring Edge Function
// Call this via external scheduler (GitHub Actions, cron-job.org, etc.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const ALERT_EMAIL = 'contact@onspace.ai'; // Change to your monitoring email
const SLACK_WEBHOOK_CRITICAL = Deno.env.get('SLACK_WEBHOOK_CRITICAL'); // Critical alerts channel
const SLACK_WEBHOOK_WARNING = Deno.env.get('SLACK_WEBHOOK_WARNING'); // Warning alerts channel

interface MonitoringReport {
  timestamp: string;
  alerts: Alert[];
  stats: HealthStats;
}

interface Alert {
  level: 'critical' | 'warning' | 'info';
  category: 'database' | 'stripe' | 'edge_function' | 'general';
  message: string;
  details?: any;
}

interface HealthStats {
  total_edge_function_errors: number;
  slow_queries_count: number;
  stripe_webhook_failures: number;
  total_bookings_24h: number;
  total_revenue_24h: number;
}

// Create admin Supabase client
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting health monitoring check...');

    const alerts: Alert[] = [];
    const stats: HealthStats = {
      total_edge_function_errors: 0,
      slow_queries_count: 0,
      stripe_webhook_failures: 0,
      total_bookings_24h: 0,
      total_revenue_24h: 0,
    };

    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // ===== LOAD CONFIGURABLE THRESHOLDS FROM DATABASE =====
    console.log('Loading alert thresholds...');
    const { data: thresholds } = await supabaseAdmin
      .from('alert_thresholds')
      .select('*')
      .eq('is_active', true);

    const getThreshold = (name: string, defaultValue: number): number => {
      const threshold = thresholds?.find(t => t.threshold_name === name);
      return threshold?.threshold_value ?? defaultValue;
    };

    // Get threshold values (with fallbacks)
    const SLOW_QUERY_MS = getThreshold('slow_query_ms', 500);
    const EDGE_FUNCTION_ERROR_RATE = getThreshold('edge_function_error_rate', 5);
    const STRIPE_WEBHOOK_FAILURE_COUNT = getThreshold('stripe_webhook_failure_count', 5);
    const STRIPE_WEBHOOK_WARNING_COUNT = getThreshold('stripe_webhook_warning_count', 1);
    const STUCK_PAYMENT_HOURS = getThreshold('stuck_payment_hours', 48);
    const MIN_DAILY_BOOKINGS = getThreshold('min_daily_bookings', 5);
    const MIN_DAILY_REVENUE = getThreshold('min_daily_revenue', 50000);
    const NOTIFICATION_FAILURE_THRESHOLD = getThreshold('notification_failure_threshold', 3);

    console.log('Loaded thresholds:', {
      SLOW_QUERY_MS,
      EDGE_FUNCTION_ERROR_RATE,
      STRIPE_WEBHOOK_FAILURE_COUNT,
      STRIPE_WEBHOOK_WARNING_COUNT,
      STUCK_PAYMENT_HOURS,
      MIN_DAILY_BOOKINGS,
      MIN_DAILY_REVENUE,
      NOTIFICATION_FAILURE_THRESHOLD,
    });

    // ===== 1. DATABASE HEALTH CHECKS =====
    console.log('Checking database health...');

    // Check for slow queries (this is a placeholder - OnSpace Cloud may not expose query performance metrics)
    // In production, you'd need to check database logs or use pg_stat_statements
    // For now, we'll check if database is responsive
    const startTime = Date.now();
    const { data: dbTest, error: dbError } = await supabaseAdmin
      .from('classes')
      .select('id')
      .limit(1);
    const dbResponseTime = Date.now() - startTime;

    if (dbError) {
      alerts.push({
        level: 'critical',
        category: 'database',
        message: 'Database connection failed',
        details: dbError.message,
      });
    } else if (dbResponseTime > SLOW_QUERY_MS) {
      alerts.push({
        level: 'warning',
        category: 'database',
        message: `Database response slow: ${dbResponseTime}ms`,
        details: { threshold: SLOW_QUERY_MS, actual: dbResponseTime },
      });
      stats.slow_queries_count++;
    }

    // ===== 2. STRIPE WEBHOOK MONITORING =====
    console.log('Checking Stripe webhook health...');

    // Check payment_reminder_logs for webhook failures in last 24 hours
    const { data: webhookLogs, error: webhookError } = await supabaseAdmin
      .from('payment_reminder_logs')
      .select('*')
      .eq('success', false)
      .gte('sent_at', last24Hours.toISOString());

    if (!webhookError && webhookLogs && webhookLogs.length > 0) {
      stats.stripe_webhook_failures = webhookLogs.length;
      
      if (webhookLogs.length >= STRIPE_WEBHOOK_FAILURE_COUNT) {
        alerts.push({
          level: 'critical',
          category: 'stripe',
          message: `${webhookLogs.length} Stripe webhook failures in last 24 hours`,
          details: webhookLogs.slice(0, 5), // Include first 5 failures
        });
      } else if (webhookLogs.length >= STRIPE_WEBHOOK_WARNING_COUNT) {
        alerts.push({
          level: 'warning',
          category: 'stripe',
          message: `${webhookLogs.length} Stripe webhook failure(s) detected`,
          details: webhookLogs,
        });
      }
    }

    // Check for pending payments stuck for >STUCK_PAYMENT_HOURS
    const stuckPaymentCutoff = new Date(now.getTime() - STUCK_PAYMENT_HOURS * 60 * 60 * 1000);
    const { data: stuckBookings } = await supabaseAdmin
      .from('bookings')
      .select('id, created_at, class_id')
      .eq('status', 'pending_payment')
      .lt('created_at', stuckPaymentCutoff.toISOString());

    if (stuckBookings && stuckBookings.length > 0) {
      alerts.push({
        level: 'warning',
        category: 'stripe',
        message: `${stuckBookings.length} bookings stuck in pending_payment for >${STUCK_PAYMENT_HOURS} hours`,
        details: stuckBookings,
      });
    }

    // ===== 3. EDGE FUNCTION ERROR MONITORING =====
    console.log('Checking Edge Function health...');

    // Check notification_logs for failed notifications
    const { data: notificationErrors } = await supabaseAdmin
      .from('notification_logs')
      .select('*')
      .eq('success', false)
      .gte('sent_at', last24Hours.toISOString());

    if (notificationErrors && notificationErrors.length > 0) {
      const errorRate = (notificationErrors.length / Math.max(1, notificationErrors.length + 10)) * 100; // Rough estimate
      
      if (errorRate > EDGE_FUNCTION_ERROR_RATE) {
        alerts.push({
          level: 'critical',
          category: 'edge_function',
          message: `High notification failure rate: ${notificationErrors.length} failures (${errorRate.toFixed(1)}%)`,
          details: { count: notificationErrors.length, errorRate: errorRate.toFixed(1), sample: notificationErrors.slice(0, 3) },
        });
        stats.total_edge_function_errors = notificationErrors.length;
      } else if (notificationErrors.length >= NOTIFICATION_FAILURE_THRESHOLD) {
        alerts.push({
          level: 'warning',
          category: 'edge_function',
          message: `${notificationErrors.length} notification failures detected`,
          details: { count: notificationErrors.length, sample: notificationErrors.slice(0, 3) },
        });
      }
    }

    // ===== 4. ANOMALY DETECTION =====
    console.log('Running anomaly detection...');
    
    const anomalyAlerts = await runAnomalyDetection(now, last24Hours);
    alerts.push(...anomalyAlerts);

    // ===== 5. BUSINESS METRICS =====
    console.log('Collecting business metrics...');

    // Count bookings in last 24 hours
    const { count: bookingCount } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last24Hours.toISOString());

    stats.total_bookings_24h = bookingCount || 0;

    // Check if bookings below minimum
    if (bookingCount !== null && bookingCount < MIN_DAILY_BOOKINGS) {
      alerts.push({
        level: 'info',
        category: 'general',
        message: `Low booking volume: ${bookingCount} bookings (minimum: ${MIN_DAILY_BOOKINGS})`,
        details: { actual: bookingCount, threshold: MIN_DAILY_BOOKINGS },
      });
    }

    // Calculate revenue (approximate from bookings)
    const { data: recentBookings } = await supabaseAdmin
      .from('bookings')
      .select('payment_amount')
      .gte('created_at', last24Hours.toISOString());

    if (recentBookings) {
      stats.total_revenue_24h = recentBookings.reduce((sum, b) => sum + (b.payment_amount || 0), 0);
      
      // Check if revenue below minimum
      if (stats.total_revenue_24h < MIN_DAILY_REVENUE) {
        alerts.push({
          level: 'info',
          category: 'general',
          message: `Low revenue: ¥${stats.total_revenue_24h.toLocaleString()} (minimum: ¥${MIN_DAILY_REVENUE.toLocaleString()})`,
          details: { actual: stats.total_revenue_24h, threshold: MIN_DAILY_REVENUE },
        });
      }
    }

    // ===== 6. GENERATE REPORT =====
    const report: MonitoringReport = {
      timestamp: now.toISOString(),
      alerts,
      stats,
    };

    console.log('Monitoring report generated:', report);

    // ===== 7. SEND ALERTS IF NECESSARY =====
    if (alerts.length > 0 || req.url.includes('force_send=true')) {
      // Send email alerts
      await sendAlertEmail(report);
      
      // Send Slack alerts
      await sendSlackAlerts(report);
    }

    return new Response(
      JSON.stringify({
        success: true,
        report,
        alerts_sent: alerts.length > 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Monitoring error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// ===== ANOMALY DETECTION INTEGRATION =====

interface AnomalyAlert extends Alert {
  z_score?: number;
  confidence?: number;
  historical_data?: any;
}

async function runAnomalyDetection(now: Date, last24Hours: Date): Promise<AnomalyAlert[]> {
  const anomalyAlerts: AnomalyAlert[] = [];
  
  try {
    // Collect historical data for key metrics
    const metrics = [
      { name: 'daily_bookings', category: 'business' },
      { name: 'daily_revenue', category: 'business' },
      { name: 'edge_function_error_rate', category: 'edge_function' },
    ];
    
    for (const metric of metrics) {
      const historicalData = await getHistoricalData(metric.name, 30);
      if (historicalData.length < 7) continue; // Need at least 7 days
      
      const currentValue = await getCurrentMetricValue(metric.name, last24Hours, now);
      const anomaly = await detectMetricAnomaly(metric.name, currentValue, historicalData);
      
      if (anomaly) {
        anomalyAlerts.push({
          level: anomaly.severity === 'critical' ? 'critical' : anomaly.severity === 'warning' ? 'warning' : 'info',
          category: metric.category as 'database' | 'stripe' | 'edge_function' | 'general',
          message: `🔍 ANOMALY DETECTED: ${formatMetricName(metric.name)} - ${anomaly.message}`,
          details: {
            actual: anomaly.actual_value,
            expected: anomaly.expected_value,
            deviation: `${anomaly.deviation_percent.toFixed(1)}%`,
            z_score: anomaly.z_score.toFixed(2),
            confidence: `${anomaly.confidence_level.toFixed(1)}%`,
            type: anomaly.anomaly_type,
            contributing_factors: anomaly.contributing_factors,
          },
          z_score: anomaly.z_score,
          confidence: anomaly.confidence_level,
          historical_data: anomaly.historical_comparison,
        });
      }
    }
  } catch (error) {
    console.error('Anomaly detection error:', error);
  }
  
  return anomalyAlerts;
}

async function getHistoricalData(metricName: string, days: number): Promise<any[]> {
  const dataPoints: any[] = [];
  const now = new Date();
  
  // Collect historical data based on metric type
  if (metricName === 'daily_bookings') {
    for (let i = days; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const { count } = await supabaseAdmin
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', date.toISOString())
        .lt('created_at', nextDate.toISOString());
      
      dataPoints.push({
        timestamp: date.toISOString(),
        value: count || 0,
      });
    }
  } else if (metricName === 'daily_revenue') {
    for (let i = days; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const { data: bookings } = await supabaseAdmin
        .from('bookings')
        .select('payment_amount')
        .gte('created_at', date.toISOString())
        .lt('created_at', nextDate.toISOString());
      
      const revenue = bookings?.reduce((sum, b) => sum + (b.payment_amount || 0), 0) || 0;
      
      dataPoints.push({
        timestamp: date.toISOString(),
        value: revenue,
      });
    }
  } else if (metricName === 'edge_function_error_rate') {
    for (let i = days; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const { data: errors } = await supabaseAdmin
        .from('notification_logs')
        .select('success')
        .gte('sent_at', date.toISOString())
        .lt('sent_at', nextDate.toISOString());
      
      const failureCount = errors?.filter(e => !e.success).length || 0;
      const totalCount = errors?.length || 1;
      const errorRate = (failureCount / totalCount) * 100;
      
      dataPoints.push({
        timestamp: date.toISOString(),
        value: errorRate,
      });
    }
  }
  
  return dataPoints;
}

async function getCurrentMetricValue(metricName: string, startTime: Date, endTime: Date): Promise<number> {
  if (metricName === 'daily_bookings') {
    const { count } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startTime.toISOString())
      .lt('created_at', endTime.toISOString());
    return count || 0;
  } else if (metricName === 'daily_revenue') {
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('payment_amount')
      .gte('created_at', startTime.toISOString())
      .lt('created_at', endTime.toISOString());
    return bookings?.reduce((sum, b) => sum + (b.payment_amount || 0), 0) || 0;
  } else if (metricName === 'edge_function_error_rate') {
    const { data: errors } = await supabaseAdmin
      .from('notification_logs')
      .select('success')
      .gte('sent_at', startTime.toISOString())
      .lt('sent_at', endTime.toISOString());
    const failureCount = errors?.filter(e => !e.success).length || 0;
    const totalCount = errors?.length || 1;
    return (failureCount / totalCount) * 100;
  }
  return 0;
}

async function detectMetricAnomaly(metricName: string, currentValue: number, historicalData: any[]): Promise<any | null> {
  // Update baseline
  await updateAnomalyBaseline(metricName, historicalData);
  
  // Get baseline
  const { data: baseline } = await supabaseAdmin
    .from('anomaly_baselines')
    .select('*')
    .eq('metric_name', metricName)
    .single();
  
  if (!baseline) return null;
  
  // Calculate Z-score
  const expectedValue = baseline.has_weekly_pattern && baseline.weekly_pattern
    ? baseline.weekly_pattern[new Date().getDay().toString()] || baseline.moving_average_7d
    : baseline.moving_average_7d;
  
  const stdDev = baseline.standard_deviation;
  if (stdDev === 0) return null;
  
  const zScore = (currentValue - expectedValue) / stdDev;
  const absZScore = Math.abs(zScore);
  
  // Only create anomaly if exceeds warning threshold
  if (absZScore < baseline.z_score_warning) return null;
  
  // Determine severity
  let severity: 'info' | 'warning' | 'critical' = 'info';
  if (absZScore >= baseline.z_score_critical) severity = 'critical';
  else if (absZScore >= baseline.z_score_warning) severity = 'warning';
  
  // Calculate confidence
  let confidence = 50.0;
  if (absZScore >= 3.0) confidence = 99.7;
  else if (absZScore >= 2.5) confidence = 98.8;
  else if (absZScore >= 2.0) confidence = 95.4;
  else if (absZScore >= 1.5) confidence = 86.6;
  
  const deviation = currentValue - expectedValue;
  const deviationPercent = (deviation / expectedValue) * 100;
  
  // Determine anomaly type
  const anomalyType = deviation > 0 ? 'spike' : 'drop';
  
  // Build historical comparison
  const last7Days = historicalData.slice(-7).map(d => d.value);
  const last30Days = historicalData.slice(-30).map(d => d.value);
  
  // Contributing factors
  const contributingFactors: string[] = [];
  if (baseline.has_weekly_pattern) {
    contributingFactors.push('Weekly pattern detected - deviation from typical day-of-week average');
  }
  
  // Create anomaly record
  await supabaseAdmin
    .from('anomaly_detections')
    .insert({
      metric_name: metricName,
      detected_at: new Date().toISOString(),
      actual_value: currentValue,
      expected_value: expectedValue,
      deviation_amount: deviation,
      deviation_percent: deviationPercent,
      z_score: zScore,
      confidence_level: confidence,
      anomaly_type: anomalyType,
      severity: severity,
      historical_comparison: {
        last_7_days: last7Days,
        last_30_days: last30Days,
        trend_direction: 'stable',
      },
      contributing_factors: contributingFactors.length > 0 ? contributingFactors : null,
      status: 'new',
    });
  
  return {
    actual_value: currentValue,
    expected_value: expectedValue,
    deviation_percent: deviationPercent,
    z_score: zScore,
    confidence_level: confidence,
    anomaly_type: anomalyType,
    severity: severity,
    message: `${formatMetricName(metricName)} is ${deviation > 0 ? 'higher' : 'lower'} than expected (${currentValue.toFixed(0)} vs expected ${expectedValue.toFixed(0)})`,
    historical_comparison: { last_7_days: last7Days, last_30_days: last30Days },
    contributing_factors: contributingFactors,
  };
}

async function updateAnomalyBaseline(metricName: string, historicalData: any[]): Promise<void> {
  const values = historicalData.map(d => d.value);
  const movingAvg7d = values.slice(-7).reduce((sum, v) => sum + v, 0) / Math.min(7, values.length);
  const movingAvg30d = values.reduce((sum, v) => sum + v, 0) / values.length;
  
  const mean = movingAvg30d;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  await supabaseAdmin
    .from('anomaly_baselines')
    .upsert({
      metric_name: metricName,
      moving_average_7d: movingAvg7d,
      moving_average_30d: movingAvg30d,
      standard_deviation: stdDev,
      min_value: Math.min(...values),
      max_value: Math.max(...values),
      data_points_count: values.length,
      last_calculated_at: new Date().toISOString(),
    }, { onConflict: 'metric_name' });
}

function formatMetricName(metricName: string): string {
  return metricName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

async function sendSlackAlerts(report: MonitoringReport): Promise<void> {
  const criticalAlerts = report.alerts.filter(a => a.level === 'critical');
  const warningAlerts = report.alerts.filter(a => a.level === 'warning');

  // Send critical alerts to critical channel
  if (criticalAlerts.length > 0 && SLACK_WEBHOOK_CRITICAL) {
    await sendSlackMessage(SLACK_WEBHOOK_CRITICAL, formatSlackMessage(report, 'critical'));
  }

  // Send warning alerts to warning channel
  if (warningAlerts.length > 0 && SLACK_WEBHOOK_WARNING) {
    await sendSlackMessage(SLACK_WEBHOOK_WARNING, formatSlackMessage(report, 'warning'));
  }

  // If only one channel is configured, send all alerts there
  if (SLACK_WEBHOOK_CRITICAL && !SLACK_WEBHOOK_WARNING && warningAlerts.length > 0) {
    await sendSlackMessage(SLACK_WEBHOOK_CRITICAL, formatSlackMessage(report, 'all'));
  }
}

function formatSlackMessage(report: MonitoringReport, filterLevel: 'critical' | 'warning' | 'all'): any {
  const criticalCount = report.alerts.filter(a => a.level === 'critical').length;
  const warningCount = report.alerts.filter(a => a.level === 'warning').length;
  
  let alertsToShow = report.alerts;
  if (filterLevel === 'critical') {
    alertsToShow = report.alerts.filter(a => a.level === 'critical');
  } else if (filterLevel === 'warning') {
    alertsToShow = report.alerts.filter(a => a.level === 'warning');
  }

  const emoji = criticalCount > 0 ? '🚨' : warningCount > 0 ? '⚠️' : 'ℹ️';
  const color = criticalCount > 0 ? '#ff5757' : warningCount > 0 ? '#ffb800' : '#06d6a0';
  
  const timestamp = new Date(report.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Tokyo' });

  // Build alert fields
  const alertFields = alertsToShow.slice(0, 10).map(alert => {
    const alertEmoji = alert.level === 'critical' ? '🔴' : alert.level === 'warning' ? '🟡' : 'ℹ️';
    return {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${alertEmoji} *${alert.category.toUpperCase()}*\n${alert.message}${alert.details ? `\n\`\`\`${JSON.stringify(alert.details, null, 2).substring(0, 200)}...\`\`\`` : ''}`
      }
    };
  });

  // Build stats section
  const statsText = [
    `*24-Hour Statistics*`,
    `• Bookings: ${report.stats.total_bookings_24h}`,
    `• Revenue: ¥${report.stats.total_revenue_24h.toLocaleString()}`,
    `• Edge Function Errors: ${report.stats.total_edge_function_errors}`,
    `• Slow Queries: ${report.stats.slow_queries_count}`,
    `• Stripe Failures: ${report.stats.stripe_webhook_failures}`,
  ].join('\n');

  return {
    text: `${emoji} Dance with Lorenzo Monitoring Alert`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} Dance with Lorenzo - System Alert`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Level:*\n${filterLevel === 'critical' ? '🚨 Critical' : filterLevel === 'warning' ? '⚠️ Warning' : '📊 Mixed'}`
          },
          {
            type: 'mrkdwn',
            text: `*Time (JST):*\n${timestamp}`
          },
          {
            type: 'mrkdwn',
            text: `*Critical Alerts:*\n${criticalCount}`
          },
          {
            type: 'mrkdwn',
            text: `*Warning Alerts:*\n${warningCount}`
          }
        ]
      },
      {
        type: 'divider'
      },
      ...alertFields,
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: statsText
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Next Steps:*\n• Review <https://ctvkeqwytarocihhctvk.backend.onspace.ai|OnSpace Cloud Dashboard>\n• Check <https://dashboard.stripe.com|Stripe Dashboard>\n• Investigate critical alerts immediately`
        }
      }
    ],
    attachments: [
      {
        color: color,
        footer: 'Dance with Lorenzo Monitoring',
        footer_icon: 'https://platform.slack-edge.com/img/default_application_icon.png',
        ts: Math.floor(Date.now() / 1000)
      }
    ]
  };
}

async function sendSlackMessage(webhookUrl: string, message: any): Promise<void> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send Slack message:', response.status, errorText);
    } else {
      console.log('Slack alert sent successfully');
    }
  } catch (error) {
    console.error('Error sending Slack message:', error);
  }
}

async function sendAlertEmail(report: MonitoringReport): Promise<void> {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return;
  }

  const criticalCount = report.alerts.filter(a => a.level === 'critical').length;
  const warningCount = report.alerts.filter(a => a.level === 'warning').length;

  const subject = criticalCount > 0
    ? `🚨 CRITICAL: Dance with Lorenzo Monitoring Alert (${criticalCount} critical, ${warningCount} warnings)`
    : `⚠️ Dance with Lorenzo Monitoring Alert (${warningCount} warnings)`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0F4C81 0%, #FF6B35 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .alert { padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid; }
        .critical { background: #ffe6e6; border-color: #ff5757; }
        .warning { background: #fff9e6; border-color: #ffb800; }
        .info { background: #e6f7ff; border-color: #06d6a0; }
        .stats { background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 6px; }
        .stat-item { display: flex; justify-content: space-between; margin: 8px 0; }
        .stat-label { font-weight: 600; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Dance with Lorenzo</h1>
          <p style="margin: 5px 0 0 0;">System Monitoring Alert</p>
        </div>

        <div style="padding: 20px; background: white;">
          <p><strong>Monitoring Report</strong><br>
          Generated: ${new Date(report.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })} JST</p>

          <h2>Alerts (${report.alerts.length})</h2>
          ${report.alerts.map(alert => `
            <div class="alert ${alert.level}">
              <strong>${alert.level.toUpperCase()} - ${alert.category.toUpperCase()}</strong><br>
              ${alert.message}
              ${alert.details ? `<br><pre style="margin-top: 10px; font-size: 11px;">${JSON.stringify(alert.details, null, 2)}</pre>` : ''}
            </div>
          `).join('')}

          <div class="stats">
            <h3 style="margin-top: 0;">24-Hour Statistics</h3>
            <div class="stat-item">
              <span class="stat-label">Total Bookings:</span>
              <span>${report.stats.total_bookings_24h}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Total Revenue:</span>
              <span>¥${report.stats.total_revenue_24h.toLocaleString()}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Edge Function Errors:</span>
              <span>${report.stats.total_edge_function_errors}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Slow Queries:</span>
              <span>${report.stats.slow_queries_count}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Stripe Webhook Failures:</span>
              <span>${report.stats.stripe_webhook_failures}</span>
            </div>
          </div>

          <div class="footer">
            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Review OnSpace Cloud Dashboard → Log tab for detailed errors</li>
              <li>Check Stripe Dashboard for webhook delivery status</li>
              <li>Investigate critical alerts immediately</li>
              <li>Review database performance if slow queries detected</li>
            </ul>
            <p>This is an automated monitoring alert from Dance with Lorenzo. Do not reply to this email.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Dance with Lorenzo Monitoring <noreply@dancewithlorenzotokyojapan.info>',
        to: [ALERT_EMAIL],
        subject: subject,
        html: htmlBody,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send monitoring alert:', response.status, errorText);
    } else {
      console.log('Monitoring alert sent successfully');
    }
  } catch (error) {
    console.error('Error sending monitoring alert:', error);
  }
}
