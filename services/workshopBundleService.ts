import { getSupabaseClient } from '@/template';

export interface WorkshopBundle {
  id: string;
  user_id: string;
  bundle_type: '3_pack' | '5_pack';
  total_credits: number;
  used_credits: number;
  remaining_credits: number;
  original_price: number;
  discounted_price: number;
  discount_percent: number;
  payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
}

export const workshopBundleService = {
  /**
   * Get bundle pricing information
   */
  getBundlePricing(bundleType: '3_pack' | '5_pack' | '7_pack'): {
    credits: number;
    originalPrice: number;
    discountPercent: number;
    discountedPrice: number;
    savings: number;
  } {
    // Base price per workshop: ¥15,000 (assuming max price)
    const pricePerWorkshop = 15000;
    
    if (bundleType === '3_pack') {
      const credits = 3;
      const originalPrice = pricePerWorkshop * credits; // ¥45,000
      const discountPercent = 10;
      const discountedPrice = Math.round(originalPrice * (1 - discountPercent / 100)); // ¥40,500
      const savings = originalPrice - discountedPrice;
      
      return { credits, originalPrice, discountPercent, discountedPrice, savings };
    } else if (bundleType === '5_pack') {
      const credits = 5;
      const originalPrice = pricePerWorkshop * credits; // ¥75,000
      const discountPercent = 15;
      const discountedPrice = Math.round(originalPrice * (1 - discountPercent / 100)); // ¥63,750
      const savings = originalPrice - discountedPrice;
      
      return { credits, originalPrice, discountPercent, discountedPrice, savings };
    } else {
      const credits = 7;
      const originalPrice = pricePerWorkshop * credits; // ¥105,000
      const discountPercent = 20;
      const discountedPrice = Math.round(originalPrice * (1 - discountPercent / 100)); // ¥84,000
      const savings = originalPrice - discountedPrice;
      
      return { credits, originalPrice, discountPercent, discountedPrice, savings };
    }
  },

  /**
   * Get user's active workshop bundles
   */
  async getUserBundles(userId: string): Promise<{
    data: WorkshopBundle[] | null;
    totalCredits: number;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('workshop_bundles')
      .select('*')
      .eq('user_id', userId)
      .gt('remaining_credits', 0)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, totalCredits: 0, error: error.message };
    }

    const totalCredits = data?.reduce((sum, bundle) => sum + bundle.remaining_credits, 0) || 0;

    return { data: data as WorkshopBundle[], totalCredits, error: null };
  },

  /**
   * Get all user's bundles (including used)
   */
  async getAllUserBundles(userId: string): Promise<{
    data: WorkshopBundle[] | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('workshop_bundles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as WorkshopBundle[], error: null };
  },

  /**
   * Use one workshop credit from available bundles
   */
  async useCredit(userId: string): Promise<{
    success: boolean;
    bundleId?: string;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();
    
    try {
      // Get oldest bundle with remaining credits
      const { data: bundles } = await supabase
        .from('workshop_bundles')
        .select('*')
        .eq('user_id', userId)
        .gt('remaining_credits', 0)
        .order('created_at', { ascending: true })
        .limit(1);

      if (!bundles || bundles.length === 0) {
        return { success: false, error: 'No workshop credits available' };
      }

      const bundle = bundles[0];

      // Increment used credits
      const { error: updateError } = await supabase
        .from('workshop_bundles')
        .update({
          used_credits: bundle.used_credits + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bundle.id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true, bundleId: bundle.id, error: null };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },

  /**
   * Refund one credit (for cancellations)
   */
  async refundCredit(bundleId: string): Promise<{
    success: boolean;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();
    
    try {
      const { data: bundle } = await supabase
        .from('workshop_bundles')
        .select('*')
        .eq('id', bundleId)
        .single();

      if (!bundle || bundle.used_credits === 0) {
        return { success: false, error: 'Invalid bundle or no credits to refund' };
      }

      const { error: updateError } = await supabase
        .from('workshop_bundles')
        .update({
          used_credits: bundle.used_credits - 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bundleId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },
};
