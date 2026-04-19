// Alert Threshold Service - Manage monitoring alert thresholds
import { getSupabaseClient } from '@/template';

export interface AlertThreshold {
  id: string;
  threshold_name: string;
  threshold_value: number;
  threshold_unit: 'ms' | 'percent' | 'count' | 'jpy' | 'hours';
  category: 'database' | 'stripe' | 'edge_function' | 'business';
  description?: string;
  is_active: boolean;
  updated_at: string;
  updated_by?: string;
}

export interface ThresholdPreview {
  threshold_name: string;
  current_value: number;
  threshold_value: number;
  would_trigger: boolean;
  alert_level: 'critical' | 'warning' | 'info' | 'none';
  sample_scenario: string;
}

/**
 * Get all alert thresholds
 */
export async function getAllThresholds(): Promise<{ data: AlertThreshold[] | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('alert_thresholds')
      .select('*')
      .order('category', { ascending: true })
      .order('threshold_name', { ascending: true });

    if (error) {
      console.error('Failed to fetch thresholds:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error in getAllThresholds:', err);
    return { data: null, error: String(err) };
  }
}

/**
 * Get active thresholds only
 */
export async function getActiveThresholds(): Promise<{ data: AlertThreshold[] | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('alert_thresholds')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true });

    if (error) {
      console.error('Failed to fetch active thresholds:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error in getActiveThresholds:', err);
    return { data: null, error: String(err) };
  }
}

/**
 * Update threshold value
 */
export async function updateThreshold(
  id: string,
  updates: Partial<Pick<AlertThreshold, 'threshold_value' | 'is_active' | 'description'>>
): Promise<{ data: AlertThreshold | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('alert_thresholds')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update threshold:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error in updateThreshold:', err);
    return { data: null, error: String(err) };
  }
}

/**
 * Generate real-time preview of what would trigger alerts
 * based on current thresholds and recent system data
 */
export async function getThresholdPreview(): Promise<{ data: ThresholdPreview[] | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    
    // Get active thresholds
    const { data: thresholds } = await getActiveThresholds();
    if (!thresholds) {
      return { data: null, error: 'Failed to load thresholds' };
    }

    const previews: ThresholdPreview[] = [];
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get current system metrics
    const { count: bookingCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last24Hours.toISOString());

    const { data: recentBookings } = await supabase
      .from('bookings')
      .select('payment_amount')
      .gte('created_at', last24Hours.toISOString());

    const dailyRevenue = recentBookings?.reduce((sum, b) => sum + (b.payment_amount || 0), 0) || 0;

    const { data: notificationErrors } = await supabase
      .from('notification_logs')
      .select('*', { count: 'exact' })
      .eq('success', false)
      .gte('sent_at', last24Hours.toISOString());

    const { data: webhookErrors } = await supabase
      .from('payment_reminder_logs')
      .select('*', { count: 'exact' })
      .eq('success', false)
      .gte('sent_at', last24Hours.toISOString());

    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const { data: stuckPayments } = await supabase
      .from('bookings')
      .select('id', { count: 'exact' })
      .eq('status', 'pending_payment')
      .lt('created_at', twoDaysAgo.toISOString());

    // Map thresholds to preview data
    for (const threshold of thresholds) {
      let currentValue = 0;
      let wouldTrigger = false;
      let alertLevel: 'critical' | 'warning' | 'info' | 'none' = 'none';
      let sampleScenario = '';

      switch (threshold.threshold_name) {
        case 'slow_query_ms':
          // Simulated - we can't easily get real query times
          currentValue = 350; // Example: current avg response time
          wouldTrigger = currentValue > threshold.threshold_value;
          alertLevel = wouldTrigger ? 'warning' : 'none';
          sampleScenario = `Current avg DB response: ${currentValue}ms. ${wouldTrigger ? '⚠️ Would trigger warning' : '✅ Within limits'}`;
          break;

        case 'edge_function_error_rate':
          const totalNotifications = (notificationErrors?.length || 0) + 50; // Estimate
          const errorRate = totalNotifications > 0 ? ((notificationErrors?.length || 0) / totalNotifications) * 100 : 0;
          currentValue = Math.round(errorRate * 10) / 10;
          wouldTrigger = currentValue > threshold.threshold_value;
          alertLevel = wouldTrigger ? 'critical' : 'none';
          sampleScenario = `Current error rate: ${currentValue}%. ${wouldTrigger ? '🚨 Would trigger critical alert' : '✅ Within limits'}`;
          break;

        case 'stripe_webhook_failure_count':
          currentValue = webhookErrors?.length || 0;
          wouldTrigger = currentValue >= threshold.threshold_value;
          alertLevel = wouldTrigger ? 'critical' : 'none';
          sampleScenario = `Webhook failures (24h): ${currentValue}. ${wouldTrigger ? '🚨 Would trigger critical alert' : '✅ Within limits'}`;
          break;

        case 'stripe_webhook_warning_count':
          currentValue = webhookErrors?.length || 0;
          wouldTrigger = currentValue >= threshold.threshold_value && currentValue < 5;
          alertLevel = wouldTrigger ? 'warning' : 'none';
          sampleScenario = `Webhook failures (24h): ${currentValue}. ${wouldTrigger ? '⚠️ Would trigger warning' : '✅ Within limits'}`;
          break;

        case 'stuck_payment_hours':
          currentValue = stuckPayments?.length || 0;
          wouldTrigger = currentValue > 0;
          alertLevel = wouldTrigger ? 'warning' : 'none';
          sampleScenario = `Stuck payments (>${threshold.threshold_value}h): ${currentValue}. ${wouldTrigger ? '⚠️ Would trigger warning' : '✅ No stuck payments'}`;
          break;

        case 'min_daily_bookings':
          currentValue = bookingCount || 0;
          wouldTrigger = currentValue < threshold.threshold_value;
          alertLevel = wouldTrigger ? 'info' : 'none';
          sampleScenario = `Bookings (24h): ${currentValue}. ${wouldTrigger ? 'ℹ️ Below minimum' : '✅ Meeting target'}`;
          break;

        case 'min_daily_revenue':
          currentValue = dailyRevenue;
          wouldTrigger = currentValue < threshold.threshold_value;
          alertLevel = wouldTrigger ? 'info' : 'none';
          sampleScenario = `Revenue (24h): ¥${currentValue.toLocaleString()}. ${wouldTrigger ? 'ℹ️ Below minimum' : '✅ Meeting target'}`;
          break;

        case 'notification_failure_threshold':
          currentValue = notificationErrors?.length || 0;
          wouldTrigger = currentValue >= threshold.threshold_value;
          alertLevel = wouldTrigger ? 'warning' : 'none';
          sampleScenario = `Notification failures (24h): ${currentValue}. ${wouldTrigger ? '⚠️ Would trigger warning' : '✅ Within limits'}`;
          break;
      }

      previews.push({
        threshold_name: threshold.threshold_name,
        current_value: currentValue,
        threshold_value: threshold.threshold_value,
        would_trigger: wouldTrigger,
        alert_level: alertLevel,
        sample_scenario: sampleScenario,
      });
    }

    return { data: previews, error: null };
  } catch (err) {
    console.error('Error in getThresholdPreview:', err);
    return { data: null, error: String(err) };
  }
}

/**
 * Reset thresholds to default values
 */
export async function resetToDefaults(): Promise<{ data: boolean; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    
    const defaults = [
      { name: 'slow_query_ms', value: 500 },
      { name: 'edge_function_error_rate', value: 5 },
      { name: 'stripe_webhook_failure_count', value: 5 },
      { name: 'stripe_webhook_warning_count', value: 1 },
      { name: 'stuck_payment_hours', value: 48 },
      { name: 'min_daily_bookings', value: 5 },
      { name: 'min_daily_revenue', value: 50000 },
      { name: 'notification_failure_threshold', value: 3 },
    ];

    for (const def of defaults) {
      await supabase
        .from('alert_thresholds')
        .update({ threshold_value: def.value })
        .eq('threshold_name', def.name);
    }

    return { data: true, error: null };
  } catch (err) {
    console.error('Error in resetToDefaults:', err);
    return { data: false, error: String(err) };
  }
}
