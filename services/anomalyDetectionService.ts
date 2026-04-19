// Anomaly Detection Service - Statistical analysis using Z-score and moving averages
import { getSupabaseClient } from '@/template';

export interface AnomalyBaseline {
  id: string;
  metric_name: string;
  metric_category: 'business' | 'technical' | 'user_engagement';
  moving_average_7d: number;
  moving_average_30d: number;
  standard_deviation: number;
  min_value: number;
  max_value: number;
  z_score_warning: number;
  z_score_critical: number;
  has_weekly_pattern: boolean;
  weekly_pattern?: Record<string, number>;
  data_points_count: number;
  last_calculated_at: string;
  is_active: boolean;
}

export interface AnomalyDetection {
  id: string;
  metric_name: string;
  detected_at: string;
  actual_value: number;
  expected_value: number;
  deviation_amount: number;
  deviation_percent: number;
  z_score: number;
  confidence_level: number;
  anomaly_type: 'spike' | 'drop' | 'trend_change' | 'volatility';
  severity: 'info' | 'warning' | 'critical';
  historical_comparison: HistoricalComparison;
  contributing_factors?: string[];
  alert_sent: boolean;
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
  resolution_notes?: string;
}

export interface HistoricalComparison {
  last_7_days: number[];
  last_30_days: number[];
  same_day_last_week: number;
  same_day_last_month: number;
  trend_direction: 'up' | 'down' | 'stable';
}

export interface MetricDataPoint {
  timestamp: string;
  value: number;
}

/**
 * Calculate Z-score for a value relative to a baseline
 */
export function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Calculate moving average for a dataset
 */
export function calculateMovingAverage(values: number[], window: number): number {
  if (values.length === 0) return 0;
  const relevantValues = values.slice(-window);
  return relevantValues.reduce((sum, val) => sum + val, 0) / relevantValues.length;
}

/**
 * Calculate standard deviation
 */
export function calculateStandardDeviation(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Get confidence level from Z-score (percentage)
 */
export function getConfidenceLevel(zScore: number): number {
  const absZScore = Math.abs(zScore);
  
  if (absZScore >= 3.0) return 99.7; // 3 sigma
  if (absZScore >= 2.5) return 98.8;
  if (absZScore >= 2.0) return 95.4; // 2 sigma
  if (absZScore >= 1.5) return 86.6;
  if (absZScore >= 1.0) return 68.3; // 1 sigma
  
  return 50.0;
}

/**
 * Determine anomaly type based on Z-score and trend
 */
export function determineAnomalyType(
  value: number,
  expected: number,
  zScore: number,
  recentValues: number[]
): 'spike' | 'drop' | 'trend_change' | 'volatility' {
  const absZScore = Math.abs(zScore);
  
  // Check for sudden spike or drop
  if (absZScore >= 2.0) {
    return value > expected ? 'spike' : 'drop';
  }
  
  // Check for trend change (last 3 values consistently different)
  if (recentValues.length >= 3) {
    const lastThree = recentValues.slice(-3);
    const avgLastThree = lastThree.reduce((sum, v) => sum + v, 0) / 3;
    const deviation = Math.abs(avgLastThree - expected) / expected;
    
    if (deviation > 0.2) { // 20% deviation
      return 'trend_change';
    }
  }
  
  // Check for high volatility (large standard deviation relative to mean)
  const recentStdDev = calculateStandardDeviation(recentValues, expected);
  if (recentStdDev / expected > 0.5) { // Coefficient of variation > 0.5
    return 'volatility';
  }
  
  return value > expected ? 'spike' : 'drop';
}

/**
 * Determine severity based on Z-score
 */
export function determineSeverity(zScore: number, warningThreshold: number, criticalThreshold: number): 'info' | 'warning' | 'critical' {
  const absZScore = Math.abs(zScore);
  
  if (absZScore >= criticalThreshold) return 'critical';
  if (absZScore >= warningThreshold) return 'warning';
  return 'info';
}

/**
 * Update baseline statistics for a metric
 */
export async function updateBaseline(
  metricName: string,
  historicalData: MetricDataPoint[]
): Promise<{ data: AnomalyBaseline | null; error: string | null }> {
  try {
    if (historicalData.length < 7) {
      return { data: null, error: 'Insufficient data for baseline calculation (minimum 7 days)' };
    }
    
    const supabase = getSupabaseClient();
    const values = historicalData.map(d => d.value);
    
    // Calculate statistics
    const movingAvg7d = calculateMovingAverage(values, 7);
    const movingAvg30d = calculateMovingAverage(values, Math.min(30, values.length));
    const stdDev = calculateStandardDeviation(values, movingAvg30d);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    
    // Detect weekly pattern (check if same day of week has consistent values)
    const weeklyPattern: Record<string, number[]> = {};
    historicalData.forEach((point) => {
      const dayOfWeek = new Date(point.timestamp).getDay().toString();
      if (!weeklyPattern[dayOfWeek]) weeklyPattern[dayOfWeek] = [];
      weeklyPattern[dayOfWeek].push(point.value);
    });
    
    const weeklyAvgs: Record<string, number> = {};
    let hasWeeklyPattern = false;
    
    Object.keys(weeklyPattern).forEach(day => {
      const dayValues = weeklyPattern[day];
      weeklyAvgs[day] = dayValues.reduce((sum, v) => sum + v, 0) / dayValues.length;
    });
    
    // Check if weekly variation is significant (> 30% difference between days)
    const weeklyAvgValues = Object.values(weeklyAvgs);
    if (weeklyAvgValues.length >= 5) {
      const weeklyStdDev = calculateStandardDeviation(
        weeklyAvgValues,
        weeklyAvgValues.reduce((sum, v) => sum + v, 0) / weeklyAvgValues.length
      );
      const weeklyMean = weeklyAvgValues.reduce((sum, v) => sum + v, 0) / weeklyAvgValues.length;
      hasWeeklyPattern = (weeklyStdDev / weeklyMean) > 0.3;
    }
    
    // Update or insert baseline
    const { data, error } = await supabase
      .from('anomaly_baselines')
      .upsert({
        metric_name: metricName,
        moving_average_7d: movingAvg7d,
        moving_average_30d: movingAvg30d,
        standard_deviation: stdDev,
        min_value: minValue,
        max_value: maxValue,
        has_weekly_pattern: hasWeeklyPattern,
        weekly_pattern: hasWeeklyPattern ? weeklyAvgs : null,
        data_points_count: values.length,
        last_calculated_at: new Date().toISOString(),
      }, { onConflict: 'metric_name' })
      .select()
      .single();
    
    if (error) {
      return { data: null, error: error.message };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('Error updating baseline:', err);
    return { data: null, error: String(err) };
  }
}

/**
 * Detect anomalies in current metric value
 */
export async function detectAnomaly(
  metricName: string,
  currentValue: number,
  historicalData: MetricDataPoint[]
): Promise<{ data: AnomalyDetection | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    
    // Get baseline
    const { data: baseline } = await supabase
      .from('anomaly_baselines')
      .select('*')
      .eq('metric_name', metricName)
      .eq('is_active', true)
      .single();
    
    if (!baseline) {
      // No baseline yet, update it first
      await updateBaseline(metricName, historicalData);
      return { data: null, error: 'Baseline created, run detection again' };
    }
    
    // Calculate expected value (use weekly pattern if available)
    let expectedValue = baseline.moving_average_7d;
    if (baseline.has_weekly_pattern && baseline.weekly_pattern) {
      const currentDayOfWeek = new Date().getDay().toString();
      expectedValue = baseline.weekly_pattern[currentDayOfWeek] || baseline.moving_average_7d;
    }
    
    // Calculate Z-score
    const zScore = calculateZScore(currentValue, expectedValue, baseline.standard_deviation);
    const absZScore = Math.abs(zScore);
    
    // Only create anomaly detection if Z-score exceeds warning threshold
    if (absZScore < baseline.z_score_warning) {
      return { data: null, error: null }; // No anomaly
    }
    
    // Calculate deviation
    const deviationAmount = currentValue - expectedValue;
    const deviationPercent = (deviationAmount / expectedValue) * 100;
    
    // Determine anomaly characteristics
    const recentValues = historicalData.slice(-7).map(d => d.value);
    const anomalyType = determineAnomalyType(currentValue, expectedValue, zScore, recentValues);
    const severity = determineSeverity(zScore, baseline.z_score_warning, baseline.z_score_critical);
    const confidenceLevel = getConfidenceLevel(zScore);
    
    // Build historical comparison
    const last7Days = historicalData.slice(-7).map(d => d.value);
    const last30Days = historicalData.slice(-30).map(d => d.value);
    const sameDayLastWeek = historicalData.length >= 7 ? historicalData[historicalData.length - 7].value : 0;
    const sameDayLastMonth = historicalData.length >= 30 ? historicalData[historicalData.length - 30].value : 0;
    
    // Determine trend
    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    if (last7Days.length >= 3) {
      const recentAvg = calculateMovingAverage(last7Days.slice(-3), 3);
      const olderAvg = calculateMovingAverage(last7Days.slice(0, 3), 3);
      const trendChange = (recentAvg - olderAvg) / olderAvg;
      
      if (trendChange > 0.1) trendDirection = 'up';
      else if (trendChange < -0.1) trendDirection = 'down';
    }
    
    const historicalComparison: HistoricalComparison = {
      last_7_days: last7Days,
      last_30_days: last30Days,
      same_day_last_week: sameDayLastWeek,
      same_day_last_month: sameDayLastMonth,
      trend_direction: trendDirection,
    };
    
    // Identify contributing factors
    const contributingFactors: string[] = [];
    
    if (anomalyType === 'spike' && metricName.includes('bookings')) {
      contributingFactors.push('Possible promotional campaign or special event');
    } else if (anomalyType === 'drop' && metricName.includes('bookings')) {
      contributingFactors.push('Possible holiday period or class cancellations');
    }
    
    if (baseline.has_weekly_pattern) {
      const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      contributingFactors.push(`Weekly pattern detected - ${currentDay} typically differs from average`);
    }
    
    if (trendDirection !== 'stable') {
      contributingFactors.push(`Overall trend is ${trendDirection}ward over past week`);
    }
    
    // Create anomaly detection record
    const { data, error } = await supabase
      .from('anomaly_detections')
      .insert({
        metric_name: metricName,
        detected_at: new Date().toISOString(),
        actual_value: currentValue,
        expected_value: expectedValue,
        deviation_amount: deviationAmount,
        deviation_percent: deviationPercent,
        z_score: zScore,
        confidence_level: confidenceLevel,
        anomaly_type: anomalyType,
        severity: severity,
        historical_comparison: historicalComparison,
        contributing_factors: contributingFactors.length > 0 ? contributingFactors : null,
        status: 'new',
      })
      .select()
      .single();
    
    if (error) {
      return { data: null, error: error.message };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('Error detecting anomaly:', err);
    return { data: null, error: String(err) };
  }
}

/**
 * Get recent anomaly detections
 */
export async function getRecentAnomalies(
  limit: number = 20,
  status?: 'new' | 'investigating' | 'resolved' | 'false_positive'
): Promise<{ data: AnomalyDetection[] | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('anomaly_detections')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(limit);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return { data: null, error: error.message };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('Error fetching anomalies:', err);
    return { data: null, error: String(err) };
  }
}

/**
 * Get all baselines
 */
export async function getAllBaselines(): Promise<{ data: AnomalyBaseline[] | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('anomaly_baselines')
      .select('*')
      .order('metric_category', { ascending: true })
      .order('metric_name', { ascending: true });
    
    if (error) {
      return { data: null, error: error.message };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('Error fetching baselines:', err);
    return { data: null, error: String(err) };
  }
}

/**
 * Mark anomaly as resolved
 */
export async function resolveAnomaly(
  anomalyId: string,
  status: 'resolved' | 'false_positive',
  notes?: string
): Promise<{ data: boolean; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: false, error: 'User not authenticated' };
    }
    
    const { error } = await supabase
      .from('anomaly_detections')
      .update({
        status: status,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        resolution_notes: notes || null,
      })
      .eq('id', anomalyId);
    
    if (error) {
      return { data: false, error: error.message };
    }
    
    return { data: true, error: null };
  } catch (err) {
    console.error('Error resolving anomaly:', err);
    return { data: false, error: String(err) };
  }
}

/**
 * Get anomaly statistics summary
 */
export async function getAnomalyStats(days: number = 30): Promise<{
  data: {
    total_anomalies: number;
    critical_count: number;
    warning_count: number;
    resolved_count: number;
    false_positive_count: number;
    avg_resolution_time_hours: number;
    most_frequent_metric: string;
    anomaly_trend: 'increasing' | 'decreasing' | 'stable';
  } | null;
  error: string | null;
}> {
  try {
    const supabase = getSupabaseClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const { data: anomalies } = await supabase
      .from('anomaly_detections')
      .select('*')
      .gte('detected_at', cutoffDate.toISOString());
    
    if (!anomalies || anomalies.length === 0) {
      return {
        data: {
          total_anomalies: 0,
          critical_count: 0,
          warning_count: 0,
          resolved_count: 0,
          false_positive_count: 0,
          avg_resolution_time_hours: 0,
          most_frequent_metric: 'N/A',
          anomaly_trend: 'stable',
        },
        error: null,
      };
    }
    
    // Calculate stats
    const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
    const warningCount = anomalies.filter(a => a.severity === 'warning').length;
    const resolvedCount = anomalies.filter(a => a.status === 'resolved').length;
    const falsePositiveCount = anomalies.filter(a => a.status === 'false_positive').length;
    
    // Calculate average resolution time
    const resolvedAnomalies = anomalies.filter(a => a.resolved_at);
    const resolutionTimes = resolvedAnomalies.map(a => {
      const detected = new Date(a.detected_at).getTime();
      const resolved = new Date(a.resolved_at).getTime();
      return (resolved - detected) / (1000 * 60 * 60); // Hours
    });
    const avgResolutionTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((sum, t) => sum + t, 0) / resolutionTimes.length
      : 0;
    
    // Find most frequent metric
    const metricCounts: Record<string, number> = {};
    anomalies.forEach(a => {
      metricCounts[a.metric_name] = (metricCounts[a.metric_name] || 0) + 1;
    });
    const mostFrequentMetric = Object.keys(metricCounts).reduce((a, b) =>
      metricCounts[a] > metricCounts[b] ? a : b
    , 'N/A');
    
    // Determine trend (compare first half vs second half of period)
    const midpoint = Math.floor(anomalies.length / 2);
    const firstHalf = anomalies.slice(0, midpoint);
    const secondHalf = anomalies.slice(midpoint);
    const firstHalfRate = firstHalf.length / (days / 2);
    const secondHalfRate = secondHalf.length / (days / 2);
    
    let anomalyTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (secondHalfRate > firstHalfRate * 1.2) {
      anomalyTrend = 'increasing';
    } else if (secondHalfRate < firstHalfRate * 0.8) {
      anomalyTrend = 'decreasing';
    }
    
    return {
      data: {
        total_anomalies: anomalies.length,
        critical_count: criticalCount,
        warning_count: warningCount,
        resolved_count: resolvedCount,
        false_positive_count: falsePositiveCount,
        avg_resolution_time_hours: Math.round(avgResolutionTime * 10) / 10,
        most_frequent_metric: mostFrequentMetric,
        anomaly_trend: anomalyTrend,
      },
      error: null,
    };
  } catch (err) {
    console.error('Error calculating anomaly stats:', err);
    return { data: null, error: String(err) };
  }
}
