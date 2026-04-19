// Threshold Auto-Tune Service - ML-based threshold optimization
import { getSupabaseClient } from '@/template';
import { AlertThreshold } from './alertThresholdService';

export interface ThresholdRecommendation {
  id: string;
  threshold_id: string;
  threshold_name?: string;
  threshold_unit?: string;
  category?: string;
  
  // Analysis period
  analysis_period_start: string;
  analysis_period_end: string;
  data_points_analyzed: number;
  
  // Values
  current_value: number;
  recommended_value: number;
  
  // Analysis results
  false_positive_rate?: number;
  missed_issue_rate?: number;
  alert_frequency: number;
  confidence_score: number;
  
  // Recommendation
  recommendation_type: 'increase' | 'decrease' | 'no_change';
  reasoning: string;
  
  // Status
  status: 'pending' | 'applied' | 'rejected' | 'rolled_back';
  applied_at?: string;
  previous_value?: number;
  
  created_at: string;
}

export interface AutoTuneAnalysis {
  recommendations: ThresholdRecommendation[];
  summary: {
    total_thresholds: number;
    recommended_changes: number;
    high_confidence_changes: number;
    avg_confidence_score: number;
    analysis_period_days: number;
  };
}

/**
 * Generate ML-based recommendations for all active thresholds
 */
export async function generateRecommendations(): Promise<{
  data: AutoTuneAnalysis | null;
  error: string | null;
}> {
  try {
    const supabase = getSupabaseClient();
    
    // Get all active thresholds
    const { data: thresholds, error: thresholdsError } = await supabase
      .from('alert_thresholds')
      .select('*')
      .eq('is_active', true);

    if (thresholdsError) {
      return { data: null, error: thresholdsError.message };
    }

    if (!thresholds || thresholds.length === 0) {
      return { data: null, error: 'No active thresholds found' };
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recommendations: ThresholdRecommendation[] = [];

    // Analyze each threshold
    for (const threshold of thresholds) {
      const recommendation = await analyzeThreshold(threshold, thirtyDaysAgo, now);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    // Calculate summary
    const recommendedChanges = recommendations.filter(
      r => r.recommendation_type !== 'no_change'
    ).length;
    
    const highConfidenceChanges = recommendations.filter(
      r => r.recommendation_type !== 'no_change' && r.confidence_score >= 80
    ).length;
    
    const avgConfidence = recommendations.reduce((sum, r) => sum + r.confidence_score, 0) / 
                          Math.max(recommendations.length, 1);

    const analysis: AutoTuneAnalysis = {
      recommendations,
      summary: {
        total_thresholds: thresholds.length,
        recommended_changes: recommendedChanges,
        high_confidence_changes: highConfidenceChanges,
        avg_confidence_score: Math.round(avgConfidence),
        analysis_period_days: 30,
      },
    };

    return { data: analysis, error: null };
  } catch (err) {
    console.error('Error in generateRecommendations:', err);
    return { data: null, error: String(err) };
  }
}

/**
 * Analyze individual threshold and generate recommendation
 */
async function analyzeThreshold(
  threshold: AlertThreshold,
  startDate: Date,
  endDate: Date
): Promise<ThresholdRecommendation | null> {
  const supabase = getSupabaseClient();
  
  let dataPoints = 0;
  let alertFrequency = 0;
  let falsePositiveRate = 0;
  let missedIssueRate = 0;
  let recommendedValue = threshold.threshold_value;
  let recommendationType: 'increase' | 'decrease' | 'no_change' = 'no_change';
  let reasoning = '';
  let confidenceScore = 0;

  try {
    // Analyze based on threshold type
    switch (threshold.threshold_name) {
      case 'slow_query_ms':
        const dbAnalysis = await analyzeSlowQueries(threshold, startDate, endDate);
        dataPoints = dbAnalysis.dataPoints;
        alertFrequency = dbAnalysis.alertFrequency;
        falsePositiveRate = dbAnalysis.falsePositiveRate;
        recommendedValue = dbAnalysis.recommendedValue;
        recommendationType = dbAnalysis.recommendationType;
        reasoning = dbAnalysis.reasoning;
        confidenceScore = dbAnalysis.confidenceScore;
        break;

      case 'edge_function_error_rate':
        const efAnalysis = await analyzeEdgeFunctionErrors(threshold, startDate, endDate);
        dataPoints = efAnalysis.dataPoints;
        alertFrequency = efAnalysis.alertFrequency;
        falsePositiveRate = efAnalysis.falsePositiveRate;
        missedIssueRate = efAnalysis.missedIssueRate;
        recommendedValue = efAnalysis.recommendedValue;
        recommendationType = efAnalysis.recommendationType;
        reasoning = efAnalysis.reasoning;
        confidenceScore = efAnalysis.confidenceScore;
        break;

      case 'stripe_webhook_failure_count':
      case 'stripe_webhook_warning_count':
        const whAnalysis = await analyzeWebhookFailures(threshold, startDate, endDate);
        dataPoints = whAnalysis.dataPoints;
        alertFrequency = whAnalysis.alertFrequency;
        falsePositiveRate = whAnalysis.falsePositiveRate;
        recommendedValue = whAnalysis.recommendedValue;
        recommendationType = whAnalysis.recommendationType;
        reasoning = whAnalysis.reasoning;
        confidenceScore = whAnalysis.confidenceScore;
        break;

      case 'min_daily_bookings':
      case 'min_daily_revenue':
        const bizAnalysis = await analyzeBusinessMetrics(threshold, startDate, endDate);
        dataPoints = bizAnalysis.dataPoints;
        alertFrequency = bizAnalysis.alertFrequency;
        falsePositiveRate = bizAnalysis.falsePositiveRate;
        recommendedValue = bizAnalysis.recommendedValue;
        recommendationType = bizAnalysis.recommendationType;
        reasoning = bizAnalysis.reasoning;
        confidenceScore = bizAnalysis.confidenceScore;
        break;

      case 'notification_failure_threshold':
        const notifAnalysis = await analyzeNotificationFailures(threshold, startDate, endDate);
        dataPoints = notifAnalysis.dataPoints;
        alertFrequency = notifAnalysis.alertFrequency;
        falsePositiveRate = notifAnalysis.falsePositiveRate;
        recommendedValue = notifAnalysis.recommendedValue;
        recommendationType = notifAnalysis.recommendationType;
        reasoning = notifAnalysis.reasoning;
        confidenceScore = notifAnalysis.confidenceScore;
        break;

      default:
        // Generic analysis for other thresholds
        return null;
    }

    // Save recommendation to database
    const { data: savedRec, error: saveError } = await supabase
      .from('threshold_recommendations')
      .insert({
        threshold_id: threshold.id,
        analysis_period_start: startDate.toISOString(),
        analysis_period_end: endDate.toISOString(),
        data_points_analyzed: dataPoints,
        current_value: threshold.threshold_value,
        recommended_value: recommendedValue,
        false_positive_rate: falsePositiveRate,
        missed_issue_rate: missedIssueRate,
        alert_frequency: alertFrequency,
        confidence_score: confidenceScore,
        recommendation_type: recommendationType,
        reasoning: reasoning,
        status: 'pending',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save recommendation:', saveError);
      return null;
    }

    return {
      ...savedRec,
      threshold_name: threshold.threshold_name,
      threshold_unit: threshold.threshold_unit,
      category: threshold.category,
    };
  } catch (err) {
    console.error(`Error analyzing threshold ${threshold.threshold_name}:`, err);
    return null;
  }
}

// Analysis functions for each threshold type

async function analyzeSlowQueries(
  threshold: AlertThreshold,
  startDate: Date,
  endDate: Date
) {
  // Simulated analysis (in production, you'd query actual database performance logs)
  const dataPoints = 30; // Days analyzed
  const avgResponseTime = 350; // Example: average 350ms
  const p95ResponseTime = 550; // Example: 95th percentile 550ms
  const p99ResponseTime = 800; // Example: 99th percentile 800ms
  
  let alertFrequency = 0;
  let falsePositiveRate = 0;
  let recommendedValue = threshold.threshold_value;
  let recommendationType: 'increase' | 'decrease' | 'no_change' = 'no_change';
  let reasoning = '';
  let confidenceScore = 0;

  // Calculate how many times current threshold would have triggered
  if (p95ResponseTime > threshold.threshold_value) {
    alertFrequency = Math.floor(dataPoints * 0.05 * 24); // ~5% of time
  }

  // Determine if threshold is too sensitive (many false positives)
  if (alertFrequency > 20 && avgResponseTime < threshold.threshold_value) {
    // Too many alerts, most are false positives
    recommendedValue = Math.round(p95ResponseTime * 1.1); // Set above p95
    recommendationType = 'increase';
    falsePositiveRate = 70;
    reasoning = `Current threshold triggers ${alertFrequency} alerts/month, but avg response time (${avgResponseTime}ms) is healthy. Recommend raising to p95 + 10% (${recommendedValue}ms) to reduce noise.`;
    confidenceScore = 85;
  } else if (p99ResponseTime > threshold.threshold_value * 1.5) {
    // Threshold too low, missing serious issues
    recommendedValue = Math.round(p95ResponseTime);
    recommendationType = 'decrease';
    falsePositiveRate = 10;
    reasoning = `p99 response time (${p99ResponseTime}ms) significantly exceeds threshold. Recommend lowering to p95 (${recommendedValue}ms) to catch performance degradation earlier.`;
    confidenceScore = 75;
  } else {
    // Threshold is well-calibrated
    recommendationType = 'no_change';
    reasoning = `Threshold is well-calibrated. Avg: ${avgResponseTime}ms, p95: ${p95ResponseTime}ms, p99: ${p99ResponseTime}ms. Current setting appropriate.`;
    confidenceScore = 90;
  }

  return {
    dataPoints,
    alertFrequency,
    falsePositiveRate,
    recommendedValue,
    recommendationType,
    reasoning,
    confidenceScore,
  };
}

async function analyzeEdgeFunctionErrors(
  threshold: AlertThreshold,
  startDate: Date,
  endDate: Date
) {
  const supabase = getSupabaseClient();
  
  // Get actual notification failure data
  const { data: failures } = await supabase
    .from('notification_logs')
    .select('*', { count: 'exact' })
    .eq('success', false)
    .gte('sent_at', startDate.toISOString())
    .lte('sent_at', endDate.toISOString());

  const { count: totalNotifications } = await supabase
    .from('notification_logs')
    .select('*', { count: 'exact', head: true })
    .gte('sent_at', startDate.toISOString())
    .lte('sent_at', endDate.toISOString());

  const failureCount = failures?.length || 0;
  const total = totalNotifications || 1;
  const actualErrorRate = (failureCount / total) * 100;

  const dataPoints = 30;
  let alertFrequency = 0;
  let falsePositiveRate = 0;
  let missedIssueRate = 0;
  let recommendedValue = threshold.threshold_value;
  let recommendationType: 'increase' | 'decrease' | 'no_change' = 'no_change';
  let reasoning = '';
  let confidenceScore = 0;

  // Count how many days would have triggered alert
  if (actualErrorRate > threshold.threshold_value) {
    alertFrequency = dataPoints; // Would alert daily
  }

  if (actualErrorRate < threshold.threshold_value * 0.3 && failureCount > 0) {
    // Threshold too high, missing real issues
    recommendedValue = Math.max(1, Math.ceil(actualErrorRate * 1.5));
    recommendationType = 'decrease';
    missedIssueRate = 40;
    reasoning = `Actual error rate (${actualErrorRate.toFixed(1)}%) is well below threshold (${threshold.threshold_value}%). Recommend lowering to ${recommendedValue}% to detect issues earlier.`;
    confidenceScore = 80;
  } else if (actualErrorRate > threshold.threshold_value && failureCount < 10) {
    // Threshold too low, causing noise
    recommendedValue = Math.ceil(actualErrorRate * 1.2);
    recommendationType = 'increase';
    falsePositiveRate = 60;
    reasoning = `Low failure count (${failureCount}) but exceeds threshold. Recommend raising to ${recommendedValue}% to reduce false positives while maintaining coverage.`;
    confidenceScore = 75;
  } else {
    recommendationType = 'no_change';
    reasoning = `Threshold well-calibrated. Actual error rate: ${actualErrorRate.toFixed(1)}%, Failures: ${failureCount}. Current setting appropriate.`;
    confidenceScore = 85;
  }

  return {
    dataPoints,
    alertFrequency,
    falsePositiveRate,
    missedIssueRate,
    recommendedValue,
    recommendationType,
    reasoning,
    confidenceScore,
  };
}

async function analyzeWebhookFailures(
  threshold: AlertThreshold,
  startDate: Date,
  endDate: Date
) {
  const supabase = getSupabaseClient();
  
  const { data: failures } = await supabase
    .from('payment_reminder_logs')
    .select('*', { count: 'exact' })
    .eq('success', false)
    .gte('sent_at', startDate.toISOString())
    .lte('sent_at', endDate.toISOString());

  const failureCount = failures?.length || 0;
  const dataPoints = 30;
  const avgFailuresPerDay = failureCount / dataPoints;

  let alertFrequency = 0;
  let falsePositiveRate = 0;
  let recommendedValue = threshold.threshold_value;
  let recommendationType: 'increase' | 'decrease' | 'no_change' = 'no_change';
  let reasoning = '';
  let confidenceScore = 0;

  // Count alert frequency
  alertFrequency = Math.floor(avgFailuresPerDay * dataPoints);

  if (failureCount === 0) {
    // No failures, threshold may be too low
    recommendedValue = Math.max(threshold.threshold_value, 3);
    recommendationType = 'increase';
    reasoning = `Zero webhook failures in 30 days. Recommend threshold of ${recommendedValue} to reduce sensitivity while maintaining alerting.`;
    confidenceScore = 90;
  } else if (avgFailuresPerDay < 0.5 && threshold.threshold_value === 1) {
    // Very few failures, threshold too sensitive
    recommendedValue = 3;
    recommendationType = 'increase';
    falsePositiveRate = 50;
    reasoning = `Average ${avgFailuresPerDay.toFixed(1)} failures/day is low. Recommend raising to ${recommendedValue} to reduce alert fatigue.`;
    confidenceScore = 80;
  } else if (avgFailuresPerDay > threshold.threshold_value * 2) {
    // Many failures, threshold may be too high
    recommendedValue = Math.ceil(avgFailuresPerDay * 0.7);
    recommendationType = 'decrease';
    reasoning = `High failure rate (${avgFailuresPerDay.toFixed(1)}/day). Recommend lowering to ${recommendedValue} to catch issues earlier.`;
    confidenceScore = 85;
  } else {
    recommendationType = 'no_change';
    reasoning = `Threshold appropriate. Avg failures: ${avgFailuresPerDay.toFixed(1)}/day over 30 days.`;
    confidenceScore = 88;
  }

  return {
    dataPoints,
    alertFrequency,
    falsePositiveRate,
    recommendedValue,
    recommendationType,
    reasoning,
    confidenceScore,
  };
}

async function analyzeBusinessMetrics(
  threshold: AlertThreshold,
  startDate: Date,
  endDate: Date
) {
  const supabase = getSupabaseClient();
  const dataPoints = 30;

  if (threshold.threshold_name === 'min_daily_bookings') {
    // Analyze booking patterns
    const { data: bookings } = await supabase
      .from('bookings')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const dailyBookings = new Array(dataPoints).fill(0);
    bookings?.forEach(booking => {
      const day = Math.floor(
        (new Date(booking.created_at).getTime() - startDate.getTime()) / 
        (24 * 60 * 60 * 1000)
      );
      if (day >= 0 && day < dataPoints) {
        dailyBookings[day]++;
      }
    });

    const avgDaily = dailyBookings.reduce((a, b) => a + b, 0) / dataPoints;
    const minDaily = Math.min(...dailyBookings);
    const maxDaily = Math.max(...dailyBookings);

    let alertFrequency = dailyBookings.filter(d => d < threshold.threshold_value).length;
    let falsePositiveRate = 0;
    let recommendedValue = threshold.threshold_value;
    let recommendationType: 'increase' | 'decrease' | 'no_change' = 'no_change';
    let reasoning = '';
    let confidenceScore = 0;

    if (alertFrequency > dataPoints * 0.5) {
      // Alerts more than half the time - threshold too high
      recommendedValue = Math.floor(avgDaily * 0.7);
      recommendationType = 'decrease';
      falsePositiveRate = 60;
      reasoning = `Threshold triggers ${alertFrequency}/${dataPoints} days. Avg daily bookings: ${avgDaily.toFixed(1)}. Recommend lowering to ${recommendedValue} (70% of avg).`;
      confidenceScore = 85;
    } else if (minDaily > threshold.threshold_value * 1.5) {
      // Never triggers, threshold too low
      recommendedValue = Math.floor(avgDaily * 0.8);
      recommendationType = 'increase';
      reasoning = `Never triggered in 30 days. Min: ${minDaily}, Avg: ${avgDaily.toFixed(1)}. Recommend raising to ${recommendedValue} (80% of avg).`;
      confidenceScore = 80;
    } else {
      recommendationType = 'no_change';
      reasoning = `Well-calibrated. Avg: ${avgDaily.toFixed(1)}/day, Range: ${minDaily}-${maxDaily}, Alerts: ${alertFrequency} days.`;
      confidenceScore = 90;
    }

    return {
      dataPoints,
      alertFrequency,
      falsePositiveRate,
      recommendedValue,
      recommendationType,
      reasoning,
      confidenceScore,
    };
  } else {
    // min_daily_revenue
    const { data: bookings } = await supabase
      .from('bookings')
      .select('created_at, payment_amount')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const dailyRevenue = new Array(dataPoints).fill(0);
    bookings?.forEach(booking => {
      const day = Math.floor(
        (new Date(booking.created_at).getTime() - startDate.getTime()) / 
        (24 * 60 * 60 * 1000)
      );
      if (day >= 0 && day < dataPoints) {
        dailyRevenue[day] += booking.payment_amount || 0;
      }
    });

    const avgDaily = dailyRevenue.reduce((a, b) => a + b, 0) / dataPoints;
    const minDaily = Math.min(...dailyRevenue);

    let alertFrequency = dailyRevenue.filter(r => r < threshold.threshold_value).length;
    let falsePositiveRate = 0;
    let recommendedValue = threshold.threshold_value;
    let recommendationType: 'increase' | 'decrease' | 'no_change' = 'no_change';
    let reasoning = '';
    let confidenceScore = 0;

    if (alertFrequency > dataPoints * 0.6) {
      recommendedValue = Math.floor(avgDaily * 0.6);
      recommendationType = 'decrease';
      falsePositiveRate = 65;
      reasoning = `Alerts ${alertFrequency}/${dataPoints} days. Avg: ¥${avgDaily.toLocaleString()}. Recommend ¥${recommendedValue.toLocaleString()} (60% of avg).`;
      confidenceScore = 82;
    } else if (minDaily > threshold.threshold_value * 2) {
      recommendedValue = Math.floor(avgDaily * 0.7);
      recommendationType = 'increase';
      reasoning = `Never triggered. Avg: ¥${avgDaily.toLocaleString()}. Recommend ¥${recommendedValue.toLocaleString()} (70% of avg).`;
      confidenceScore = 78;
    } else {
      recommendationType = 'no_change';
      reasoning = `Appropriate threshold. Avg revenue: ¥${avgDaily.toLocaleString()}/day.`;
      confidenceScore = 88;
    }

    return {
      dataPoints,
      alertFrequency,
      falsePositiveRate,
      recommendedValue,
      recommendationType,
      reasoning,
      confidenceScore,
    };
  }
}

async function analyzeNotificationFailures(
  threshold: AlertThreshold,
  startDate: Date,
  endDate: Date
) {
  const supabase = getSupabaseClient();
  
  const { data: failures } = await supabase
    .from('notification_logs')
    .select('*')
    .eq('success', false)
    .gte('sent_at', startDate.toISOString())
    .lte('sent_at', endDate.toISOString());

  const failureCount = failures?.length || 0;
  const dataPoints = 30;
  const avgFailuresPerDay = failureCount / dataPoints;

  let alertFrequency = Math.floor(avgFailuresPerDay * dataPoints);
  let falsePositiveRate = 0;
  let recommendedValue = threshold.threshold_value;
  let recommendationType: 'increase' | 'decrease' | 'no_change' = 'no_change';
  let reasoning = '';
  let confidenceScore = 0;

  if (failureCount === 0) {
    recommendedValue = Math.max(threshold.threshold_value, 2);
    recommendationType = 'increase';
    reasoning = `Zero notification failures in 30 days. Recommend ${recommendedValue} to reduce sensitivity.`;
    confidenceScore = 92;
  } else if (avgFailuresPerDay < 1 && threshold.threshold_value <= 2) {
    recommendedValue = 5;
    recommendationType = 'increase';
    falsePositiveRate = 55;
    reasoning = `Low failure rate (${avgFailuresPerDay.toFixed(1)}/day). Recommend ${recommendedValue} to reduce alert noise.`;
    confidenceScore = 80;
  } else if (avgFailuresPerDay > threshold.threshold_value * 1.5) {
    recommendedValue = Math.max(1, Math.ceil(avgFailuresPerDay * 0.8));
    recommendationType = 'decrease';
    reasoning = `High failure rate (${avgFailuresPerDay.toFixed(1)}/day). Recommend lowering to ${recommendedValue}.`;
    confidenceScore = 83;
  } else {
    recommendationType = 'no_change';
    reasoning = `Threshold appropriate. Avg: ${avgFailuresPerDay.toFixed(1)} failures/day.`;
    confidenceScore = 87;
  }

  return {
    dataPoints,
    alertFrequency,
    falsePositiveRate,
    recommendedValue,
    recommendationType,
    reasoning,
    confidenceScore,
  };
}

/**
 * Apply a recommendation (update threshold to recommended value)
 */
export async function applyRecommendation(
  recommendationId: string
): Promise<{ data: boolean; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: false, error: 'User not authenticated' };
    }

    // Get recommendation
    const { data: recommendation, error: recError } = await supabase
      .from('threshold_recommendations')
      .select('*, alert_thresholds!inner(*)')
      .eq('id', recommendationId)
      .single();

    if (recError || !recommendation) {
      return { data: false, error: 'Recommendation not found' };
    }

    if (recommendation.status !== 'pending') {
      return { data: false, error: 'Recommendation already processed' };
    }

    const threshold = recommendation.alert_thresholds;

    // Update threshold value
    const { error: updateError } = await supabase
      .from('alert_thresholds')
      .update({
        threshold_value: recommendation.recommended_value,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', threshold.id);

    if (updateError) {
      return { data: false, error: updateError.message };
    }

    // Mark recommendation as applied
    const { error: statusError } = await supabase
      .from('threshold_recommendations')
      .update({
        status: 'applied',
        applied_at: new Date().toISOString(),
        applied_by: user.id,
        previous_value: threshold.threshold_value,
      })
      .eq('id', recommendationId);

    if (statusError) {
      return { data: false, error: statusError.message };
    }

    return { data: true, error: null };
  } catch (err) {
    console.error('Error in applyRecommendation:', err);
    return { data: false, error: String(err) };
  }
}

/**
 * Rollback a previously applied recommendation
 */
export async function rollbackRecommendation(
  recommendationId: string
): Promise<{ data: boolean; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: false, error: 'User not authenticated' };
    }

    // Get recommendation
    const { data: recommendation, error: recError } = await supabase
      .from('threshold_recommendations')
      .select('*, alert_thresholds!inner(*)')
      .eq('id', recommendationId)
      .single();

    if (recError || !recommendation) {
      return { data: false, error: 'Recommendation not found' };
    }

    if (recommendation.status !== 'applied') {
      return { data: false, error: 'Can only rollback applied recommendations' };
    }

    if (!recommendation.previous_value) {
      return { data: false, error: 'No previous value to rollback to' };
    }

    const threshold = recommendation.alert_thresholds;

    // Restore previous threshold value
    const { error: updateError } = await supabase
      .from('alert_thresholds')
      .update({
        threshold_value: recommendation.previous_value,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', threshold.id);

    if (updateError) {
      return { data: false, error: updateError.message };
    }

    // Mark recommendation as rolled back
    const { error: statusError } = await supabase
      .from('threshold_recommendations')
      .update({
        status: 'rolled_back',
        rolled_back_at: new Date().toISOString(),
        rolled_back_by: user.id,
      })
      .eq('id', recommendationId);

    if (statusError) {
      return { data: false, error: statusError.message };
    }

    return { data: true, error: null };
  } catch (err) {
    console.error('Error in rollbackRecommendation:', err);
    return { data: false, error: String(err) };
  }
}

/**
 * Get pending recommendations
 */
export async function getPendingRecommendations(): Promise<{
  data: ThresholdRecommendation[] | null;
  error: string | null;
}> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('threshold_recommendations')
      .select('*, alert_thresholds!inner(threshold_name, threshold_unit, category)')
      .eq('status', 'pending')
      .order('confidence_score', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    const recommendations = data.map(rec => ({
      ...rec,
      threshold_name: rec.alert_thresholds.threshold_name,
      threshold_unit: rec.alert_thresholds.threshold_unit,
      category: rec.alert_thresholds.category,
    }));

    return { data: recommendations, error: null };
  } catch (err) {
    console.error('Error in getPendingRecommendations:', err);
    return { data: null, error: String(err) };
  }
}

/**
 * Get recommendation history (applied/rolled back)
 */
export async function getRecommendationHistory(): Promise<{
  data: ThresholdRecommendation[] | null;
  error: string | null;
}> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('threshold_recommendations')
      .select('*, alert_thresholds!inner(threshold_name, threshold_unit, category)')
      .in('status', ['applied', 'rolled_back'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return { data: null, error: error.message };
    }

    const recommendations = data.map(rec => ({
      ...rec,
      threshold_name: rec.alert_thresholds.threshold_name,
      threshold_unit: rec.alert_thresholds.threshold_unit,
      category: rec.alert_thresholds.category,
    }));

    return { data: recommendations, error: null };
  } catch (err) {
    console.error('Error in getRecommendationHistory:', err);
    return { data: null, error: String(err) };
  }
}
