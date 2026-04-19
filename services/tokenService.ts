import { getSupabaseClient } from '@/template';

export interface TokenBalance {
  id: string;
  user_id: string;
  total_tokens: number;
  used_tokens: number;
  remaining_tokens: number;
  created_at: string;
  updated_at: string;
}

export const tokenService = {
  async getUserTokens(userId: string): Promise<{ data: TokenBalance | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no tokens record exists, create one
      if (error.code === 'PGRST116') {
        return await this.createTokenRecord(userId);
      }
      return { data: null, error: error.message };
    }

    return { data, error: null };
  },

  async createTokenRecord(userId: string): Promise<{ data: TokenBalance | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('tokens')
      .insert({
        user_id: userId,
        total_tokens: 0,
        used_tokens: 0,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  },

  async addTokens(userId: string, amount: number): Promise<{ data: TokenBalance | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    // Get current tokens
    const { data: current, error: fetchError } = await this.getUserTokens(userId);
    if (fetchError || !current) {
      return { data: null, error: fetchError || 'Failed to fetch tokens' };
    }

    // Update tokens
    const { data, error } = await supabase
      .from('tokens')
      .update({
        total_tokens: current.total_tokens + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  },

  async useToken(userId: string): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    
    // Get current tokens
    const { data: current, error: fetchError } = await this.getUserTokens(userId);
    if (fetchError || !current) {
      return { success: false, error: fetchError || 'Failed to fetch tokens' };
    }

    // Check if user has tokens
    if (current.remaining_tokens <= 0) {
      return { success: false, error: 'No tokens remaining' };
    }

    // Use token
    const { error } = await supabase
      .from('tokens')
      .update({
        used_tokens: current.used_tokens + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  },
};
