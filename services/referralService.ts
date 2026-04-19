import { getSupabaseClient } from '@/template';

export interface Referral {
  id: string;
  referrer_id: string;
  referral_code: string;
  referred_user_id: string | null;
  referred_email: string | null;
  status: 'pending' | 'completed' | 'rewarded';
  created_at: string;
  completed_at: string | null;
  reward_credits: number;
}

export const referralService = {
  /**
   * Generate unique referral code for user
   */
  generateReferralCode(userId: string): string {
    // Create a unique code using user ID and timestamp
    const timestamp = Date.now().toString(36);
    const userPart = userId.substring(0, 6).toUpperCase();
    return `DANCE-${userPart}-${timestamp}`;
  },

  /**
   * Get or create user's referral code
   */
  async getUserReferralCode(userId: string): Promise<{
    code: string | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();

    try {
      // Check if user already has a referral code
      const { data: existing } = await supabase
        .from('referrals')
        .select('referral_code')
        .eq('referrer_id', userId)
        .limit(1)
        .single();

      if (existing?.referral_code) {
        return { code: existing.referral_code, error: null };
      }

      // Generate new referral code
      const newCode = this.generateReferralCode(userId);

      const { data, error } = await supabase
        .from('referrals')
        .insert({
          referrer_id: userId,
          referral_code: newCode,
        })
        .select('referral_code')
        .single();

      if (error) {
        console.error('Create referral code error:', error);
        return { code: null, error: error.message };
      }

      return { code: data.referral_code, error: null };
    } catch (err) {
      console.error('Get referral code error:', err);
      return { code: null, error: String(err) };
    }
  },

  /**
   * Track referral when new user signs up with code
   */
  async trackReferralSignup(
    referralCode: string,
    newUserId: string,
    newUserEmail: string
  ): Promise<{
    success: boolean;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();

    try {
      // Find referral by code
      const { data: referral, error: findError } = await supabase
        .from('referrals')
        .select('*')
        .eq('referral_code', referralCode)
        .single();

      if (findError || !referral) {
        return { success: false, error: 'Invalid referral code' };
      }

      // Check if user is trying to use their own code
      if (referral.referrer_id === newUserId) {
        return { success: false, error: 'You cannot use your own referral code' };
      }

      // Update referral with new user info
      const { error: updateError } = await supabase
        .from('referrals')
        .update({
          referred_user_id: newUserId,
          referred_email: newUserEmail,
          status: 'completed',
          completed_at: new Date().toISOString(),
          reward_credits: 3, // Reward 3 credits for successful referral
        })
        .eq('id', referral.id);

      if (updateError) {
        console.error('Update referral error:', updateError);
        return { success: false, error: updateError.message };
      }

      // Award credits to referrer (create a bundle or add to existing)
      const { data: existingBundles } = await supabase
        .from('workshop_bundles')
        .select('*')
        .eq('user_id', referral.referrer_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingBundles && existingBundles.length > 0) {
        // Add to existing bundle
        const bundle = existingBundles[0];
        await supabase
          .from('workshop_bundles')
          .update({
            total_credits: bundle.total_credits + 3,
            updated_at: new Date().toISOString(),
          })
          .eq('id', bundle.id);
      } else {
        // Create new bundle for referral rewards
        await supabase
          .from('workshop_bundles')
          .insert({
            user_id: referral.referrer_id,
            bundle_type: '3_pack',
            total_credits: 3,
            used_credits: 0,
            original_price: 0,
            discounted_price: 0,
            discount_percent: 100,
            payment_intent_id: `referral_reward_${Date.now()}`,
          });
      }

      // Update referral status to rewarded
      await supabase
        .from('referrals')
        .update({ status: 'rewarded' })
        .eq('id', referral.id);

      return { success: true, error: null };
    } catch (err) {
      console.error('Track referral signup error:', err);
      return { success: false, error: String(err) };
    }
  },

  /**
   * Get user's referral statistics
   */
  async getReferralStats(userId: string): Promise<{
    data: {
      totalReferrals: number;
      completedReferrals: number;
      pendingReferrals: number;
      creditsEarned: number;
      referralCode: string;
    } | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();

    try {
      const { data: referrals, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', userId);

      if (error) {
        return { data: null, error: error.message };
      }

      const total = referrals.length;
      const completed = referrals.filter(r => r.status === 'completed' || r.status === 'rewarded').length;
      const pending = referrals.filter(r => r.status === 'pending').length;
      const creditsEarned = referrals.reduce((sum, r) => sum + (r.reward_credits || 0), 0);

      // Get referral code
      const { code } = await this.getUserReferralCode(userId);

      return {
        data: {
          totalReferrals: total,
          completedReferrals: completed,
          pendingReferrals: pending,
          creditsEarned,
          referralCode: code || '',
        },
        error: null,
      };
    } catch (err) {
      console.error('Get referral stats error:', err);
      return { data: null, error: String(err) };
    }
  },

  /**
   * Get detailed referral history
   */
  async getReferralHistory(userId: string): Promise<{
    data: Referral[] | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Referral[], error: null };
  },
};
