import { getSupabaseClient } from '@/template';

export interface GiftCard {
  id: string;
  purchaser_id: string;
  recipient_email: string;
  recipient_name: string | null;
  bundle_type: '3_pack' | '5_pack' | '7_pack';
  credits: number;
  amount_paid: number;
  custom_message: string | null;
  redemption_code: string;
  is_redeemed: boolean;
  redeemed_by: string | null;
  redeemed_at: string | null;
  expires_at: string;
  payment_intent_id: string | null;
  created_at: string;
}

export const giftCardService = {
  /**
   * Generate unique redemption code
   */
  generateRedemptionCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing characters
    let code = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code; // Format: XXXX-XXXX-XXXX
  },

  /**
   * Calculate gift card expiration date (1 year from purchase)
   */
  calculateExpirationDate(): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString();
  },

  /**
   * Get bundle pricing for gift card
   */
  getBundlePricing(bundleType: '3_pack' | '5_pack' | '7_pack'): {
    credits: number;
    price: number;
    bundleName: string;
  } {
    const pricePerWorkshop = 15000;
    
    if (bundleType === '3_pack') {
      return {
        credits: 3,
        price: Math.round(pricePerWorkshop * 3 * 0.9), // ¥40,500
        bundleName: '3 Workshop Bundle'
      };
    } else if (bundleType === '5_pack') {
      return {
        credits: 5,
        price: Math.round(pricePerWorkshop * 5 * 0.85), // ¥63,750
        bundleName: '5 Workshop Bundle'
      };
    } else {
      return {
        credits: 7,
        price: Math.round(pricePerWorkshop * 7 * 0.8), // ¥84,000
        bundleName: '7 Workshop Bundle'
      };
    }
  },

  /**
   * Get user's sent gift cards
   */
  async getSentGiftCards(userId: string): Promise<{
    data: GiftCard[] | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('purchaser_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as GiftCard[], error: null };
  },

  /**
   * Get user's received gift cards
   */
  async getReceivedGiftCards(userEmail: string): Promise<{
    data: GiftCard[] | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('recipient_email', userEmail)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as GiftCard[], error: null };
  },

  /**
   * Validate redemption code
   */
  async validateRedemptionCode(code: string): Promise<{
    valid: boolean;
    giftCard: GiftCard | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();
    
    const cleanCode = code.toUpperCase().trim();
    
    const { data, error } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('redemption_code', cleanCode)
      .single();

    if (error || !data) {
      return { 
        valid: false, 
        giftCard: null, 
        error: 'Invalid redemption code. Please check and try again.' 
      };
    }

    const giftCard = data as GiftCard;

    // Check if already redeemed
    if (giftCard.is_redeemed) {
      return { 
        valid: false, 
        giftCard, 
        error: 'This gift card has already been redeemed.' 
      };
    }

    // Check if expired
    if (new Date(giftCard.expires_at) < new Date()) {
      return { 
        valid: false, 
        giftCard, 
        error: 'This gift card has expired.' 
      };
    }

    return { valid: true, giftCard, error: null };
  },

  /**
   * Redeem gift card
   */
  async redeemGiftCard(
    code: string,
    userId: string
  ): Promise<{
    success: boolean;
    credits: number;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();
    
    try {
      // Validate code first
      const { valid, giftCard, error: validationError } = await this.validateRedemptionCode(code);
      
      if (!valid || !giftCard) {
        return { success: false, credits: 0, error: validationError };
      }

      // Mark gift card as redeemed
      const { error: redeemError } = await supabase
        .from('gift_cards')
        .update({
          is_redeemed: true,
          redeemed_by: userId,
          redeemed_at: new Date().toISOString(),
        })
        .eq('id', giftCard.id)
        .eq('is_redeemed', false); // Prevent double redemption

      if (redeemError) {
        return { success: false, credits: 0, error: redeemError.message };
      }

      // Create workshop bundle for the redeemer
      const pricing = this.getBundlePricing(giftCard.bundle_type);
      
      const { error: bundleError } = await supabase
        .from('workshop_bundles')
        .insert({
          user_id: userId,
          bundle_type: giftCard.bundle_type,
          total_credits: giftCard.credits,
          used_credits: 0,
          original_price: giftCard.amount_paid,
          discounted_price: giftCard.amount_paid,
          discount_percent: 0,
          payment_intent_id: `gift_card_${giftCard.id}`,
        });

      if (bundleError) {
        // Rollback redemption on bundle creation failure
        await supabase
          .from('gift_cards')
          .update({
            is_redeemed: false,
            redeemed_by: null,
            redeemed_at: null,
          })
          .eq('id', giftCard.id);
        
        return { success: false, credits: 0, error: bundleError.message };
      }

      return { success: true, credits: giftCard.credits, error: null };
    } catch (err) {
      return { success: false, credits: 0, error: String(err) };
    }
  },

  /**
   * Check if gift card code exists (for backend validation)
   */
  async checkCodeExists(code: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    
    const { data } = await supabase
      .from('gift_cards')
      .select('id')
      .eq('redemption_code', code.toUpperCase().trim())
      .single();

    return !!data;
  },

  /**
   * Get gift card by ID
   */
  async getGiftCardById(id: string): Promise<{
    data: GiftCard | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as GiftCard, error: null };
  },
};
