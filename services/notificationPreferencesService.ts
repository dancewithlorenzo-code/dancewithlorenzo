import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

export interface NotificationPreferences {
  id: string;
  user_id: string;
  enable_class_promotions: boolean;
  enable_product_promotions: boolean;
  enable_bundle_promotions: boolean;
  enable_general_promotions: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch user's notification preferences (creates default if not exists)
 */
export async function fetchUserPreferences(userId: string): Promise<{ data: NotificationPreferences | null; error: string | null }> {
  try {
    // Try to fetch existing preferences
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No preferences found, create default
      const { data: newPrefs, error: createError } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: userId,
          enable_class_promotions: true,
          enable_product_promotions: true,
          enable_bundle_promotions: true,
          enable_general_promotions: true,
        })
        .select()
        .single();

      if (createError) throw createError;
      return { data: newPrefs, error: null };
    }

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching notification preferences:', err);
    return { data: null, error: err.message || 'Failed to fetch preferences' };
  }
}

/**
 * Update user's notification preferences
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('notification_preferences')
      .update({
        ...preferences,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error updating notification preferences:', err);
    return { success: false, error: err.message || 'Failed to update preferences' };
  }
}

/**
 * Check if user wants to receive a specific promotion type
 */
export async function shouldReceivePromotion(
  userId: string,
  promotionType: 'class' | 'product' | 'bundle' | 'general'
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!data) return true; // Default to sending if no preferences set

    switch (promotionType) {
      case 'class':
        return data.enable_class_promotions;
      case 'product':
        return data.enable_product_promotions;
      case 'bundle':
        return data.enable_bundle_promotions;
      case 'general':
        return data.enable_general_promotions;
      default:
        return true;
    }
  } catch (err) {
    console.error('Error checking promotion preference:', err);
    return true; // Default to sending on error
  }
}

/**
 * Get count of enabled notification types
 */
export async function getEnabledNotificationCount(userId: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!data) return 4; // All enabled by default

    let count = 0;
    if (data.enable_class_promotions) count++;
    if (data.enable_product_promotions) count++;
    if (data.enable_bundle_promotions) count++;
    if (data.enable_general_promotions) count++;

    return count;
  } catch (err) {
    console.error('Error counting enabled notifications:', err);
    return 4;
  }
}
