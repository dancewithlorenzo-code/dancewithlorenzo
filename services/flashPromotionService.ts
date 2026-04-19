import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

export interface FlashPromotion {
  id: string;
  title: string;
  message: string;
  promotion_type: 'class' | 'product' | 'bundle' | 'general';
  action_url: string | null;
  action_text: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  priority: number;
  style_color: string;
  icon_name: string;
  created_at: string;
  created_by: string | null;
}

/**
 * Fetch active promotions (auto-filtered by date range)
 */
export async function fetchActivePromotions(): Promise<{ data: FlashPromotion[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('flash_promotions')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', new Date().toISOString())
      .gte('end_date', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching active promotions:', err);
    return { data: null, error: err.message || 'Failed to fetch promotions' };
  }
}

/**
 * Admin: Fetch all promotions (including inactive and expired)
 */
export async function fetchAllPromotions(): Promise<{ data: FlashPromotion[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('flash_promotions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching all promotions:', err);
    return { data: null, error: err.message || 'Failed to fetch promotions' };
  }
}

/**
 * Admin: Create promotion
 */
export async function createPromotion(promotion: Omit<FlashPromotion, 'id' | 'created_at' | 'created_by'>): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('flash_promotions')
      .insert(promotion);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error creating promotion:', err);
    return { success: false, error: err.message || 'Failed to create promotion' };
  }
}

/**
 * Admin: Update promotion
 */
export async function updatePromotion(promotionId: string, updates: Partial<FlashPromotion>): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('flash_promotions')
      .update(updates)
      .eq('id', promotionId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error updating promotion:', err);
    return { success: false, error: err.message || 'Failed to update promotion' };
  }
}

/**
 * Admin: Delete promotion
 */
export async function deletePromotion(promotionId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('flash_promotions')
      .delete()
      .eq('id', promotionId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error deleting promotion:', err);
    return { success: false, error: err.message || 'Failed to delete promotion' };
  }
}

/**
 * Calculate time remaining until promotion ends
 */
export function getTimeRemaining(endDate: string): { days: number; hours: number; minutes: number; seconds: number; expired: boolean } {
  const now = new Date().getTime();
  const end = new Date(endDate).getTime();
  const difference = end - now;

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, expired: false };
}

/**
 * Send push notification for flash promotion
 */
export async function sendPromotionNotification(promotionId: string): Promise<{ success: boolean; sent: number; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke('send-promotion-notification', {
      body: { promotionId },
    });

    if (error) {
      console.error('Error sending promotion notification:', error);
      return { success: false, sent: 0, error: error.message || 'Failed to send notification' };
    }

    return { 
      success: data.success || false, 
      sent: data.sent || 0, 
      error: data.error || null,
    };
  } catch (err: any) {
    console.error('Error sending promotion notification:', err);
    return { success: false, sent: 0, error: err.message || 'Failed to send notification' };
  }
}
