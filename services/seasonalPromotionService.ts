import { getSupabaseClient } from '@/template';

export interface SeasonalPromotion {
  id: string;
  name: string;
  description: string | null;
  promotion_code: string;
  bundle_type: '3_pack' | '5_pack' | '7_pack' | 'any';
  discount_percent: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  max_uses: number | null;
  current_uses: number;
  created_at: string;
}

export const seasonalPromotionService = {
  /**
   * Get all active seasonal promotions
   */
  async getActivePromotions(): Promise<{
    data: SeasonalPromotion[] | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();
    
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('seasonal_promotions')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', now)
      .gte('end_date', now)
      .order('discount_percent', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as SeasonalPromotion[], error: null };
  },

  /**
   * Get best promotion for a specific bundle type
   */
  async getBestPromotion(bundleType: '3_pack' | '5_pack' | '7_pack'): Promise<{
    data: SeasonalPromotion | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();
    
    const now = new Date().toISOString();
    
    // Get promotions that apply to this bundle type or 'any'
    const { data, error } = await supabase
      .from('seasonal_promotions')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', now)
      .gte('end_date', now)
      .or(`bundle_type.eq.${bundleType},bundle_type.eq.any`)
      .order('discount_percent', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { data: null, error: error.message };
    }

    // Check if promotion has reached max uses
    if (data && data.max_uses !== null && data.current_uses >= data.max_uses) {
      return { data: null, error: null };
    }

    return { data: data as SeasonalPromotion | null, error: null };
  },

  /**
   * Validate and get promotion by code
   */
  async validatePromotionCode(
    code: string,
    bundleType: '3_pack' | '5_pack' | '7_pack'
  ): Promise<{
    valid: boolean;
    promotion: SeasonalPromotion | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();
    
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('seasonal_promotions')
      .select('*')
      .eq('promotion_code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return { valid: false, promotion: null, error: 'Invalid promotion code' };
    }

    // Check date range
    if (now < data.start_date || now > data.end_date) {
      return { valid: false, promotion: null, error: 'Promotion has expired or not started yet' };
    }

    // Check max uses
    if (data.max_uses !== null && data.current_uses >= data.max_uses) {
      return { valid: false, promotion: null, error: 'Promotion has reached maximum uses' };
    }

    // Check bundle type compatibility
    if (data.bundle_type !== 'any' && data.bundle_type !== bundleType) {
      return { 
        valid: false, 
        promotion: null, 
        error: `This promotion is only valid for ${data.bundle_type} bundles` 
      };
    }

    return { valid: true, promotion: data as SeasonalPromotion, error: null };
  },

  /**
   * Increment promotion usage count
   */
  async incrementPromotionUse(promotionId: string): Promise<{
    success: boolean;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('seasonal_promotions')
      .update({
        current_uses: supabase.raw('current_uses + 1'),
      })
      .eq('id', promotionId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  },

  /**
   * Calculate bundle pricing with seasonal promotion
   */
  calculatePromotionalPrice(
    bundleType: '3_pack' | '5_pack' | '7_pack',
    baseDiscount: number,
    seasonalDiscount: number
  ): {
    credits: number;
    basePrice: number;
    baseDiscountedPrice: number;
    seasonalDiscountedPrice: number;
    totalSavings: number;
    finalDiscount: number;
  } {
    const pricePerWorkshop = 15000;
    
    let credits: number;
    if (bundleType === '3_pack') credits = 3;
    else if (bundleType === '5_pack') credits = 5;
    else credits = 7;

    const basePrice = pricePerWorkshop * credits;
    const baseDiscountedPrice = Math.round(basePrice * (1 - baseDiscount / 100));
    const seasonalDiscountedPrice = Math.round(baseDiscountedPrice * (1 - seasonalDiscount / 100));
    const totalSavings = basePrice - seasonalDiscountedPrice;
    const finalDiscount = Math.round((totalSavings / basePrice) * 100);

    return {
      credits,
      basePrice,
      baseDiscountedPrice,
      seasonalDiscountedPrice,
      totalSavings,
      finalDiscount,
    };
  },

  /**
   * Get all promotions (admin only)
   */
  async getAllPromotions(): Promise<{
    data: SeasonalPromotion[] | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('seasonal_promotions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as SeasonalPromotion[], error: null };
  },

  /**
   * Create new promotion (admin only)
   */
  async createPromotion(promotion: {
    name: string;
    description: string;
    promotion_code: string;
    bundle_type: '3_pack' | '5_pack' | '7_pack' | 'any';
    discount_percent: number;
    start_date: string;
    end_date: string;
    max_uses: number | null;
  }): Promise<{
    data: SeasonalPromotion | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('seasonal_promotions')
      .insert({
        ...promotion,
        promotion_code: promotion.promotion_code.toUpperCase(),
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as SeasonalPromotion, error: null };
  },

  /**
   * Toggle promotion active status
   */
  async togglePromotionStatus(promotionId: string, isActive: boolean): Promise<{
    success: boolean;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('seasonal_promotions')
      .update({ is_active: isActive })
      .eq('id', promotionId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  },
};
