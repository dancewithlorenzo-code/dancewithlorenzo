import { getSupabaseClient } from '@/template';

export interface UserProfile {
  id: string;
  username: string | null;
  email: string;
  language: string;
  is_admin: boolean;
  avatar_url: string | null;
}

export interface ProfileStats {
  total_bookings: number;
  attended_classes: number;
  upcoming_bookings: number;
  total_tokens_purchased: number;
  tokens_used: number;
  tokens_remaining: number;
  member_since: string;
  private_lessons_requested: number;
  private_lessons_completed: number;
}

export const profileService = {
  async getUserProfile(userId: string): Promise<{ data: UserProfile | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  },

  async updateProfile(
    userId: string,
    updates: { username?: string | null; language?: string; avatar_url?: string | null }
  ): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  },

  async getProfileStats(userId: string): Promise<{ data: ProfileStats | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      // Get bookings stats
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('status, created_at')
        .eq('user_id', userId);

      if (bookingsError) throw bookingsError;

      const total_bookings = bookings?.length || 0;
      const attended_classes = bookings?.filter(b => b.status === 'attended').length || 0;
      const upcoming_bookings = bookings?.filter(b => b.status === 'confirmed').length || 0;

      // Get token stats
      const { data: tokenData, error: tokenError } = await supabase
        .from('tokens')
        .select('total_tokens, used_tokens, remaining_tokens, created_at')
        .eq('user_id', userId)
        .eq('token_type', 'become_my_dancers')
        .maybeSingle();

      if (tokenError && tokenError.code !== 'PGRST116') throw tokenError;

      const total_tokens_purchased = tokenData?.total_tokens || 0;
      const tokens_used = tokenData?.used_tokens || 0;
      const tokens_remaining = tokenData?.remaining_tokens || 0;

      // Get private lesson stats
      const { data: lessons, error: lessonsError } = await supabase
        .from('private_lessons')
        .select('status, created_at')
        .eq('user_id', userId);

      if (lessonsError) throw lessonsError;

      const private_lessons_requested = lessons?.length || 0;
      const private_lessons_completed = lessons?.filter(l => l.status === 'paid').length || 0;

      // Get member since date
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      const stats: ProfileStats = {
        total_bookings,
        attended_classes,
        upcoming_bookings,
        total_tokens_purchased,
        tokens_used,
        tokens_remaining,
        member_since: tokenData?.created_at || new Date().toISOString(),
        private_lessons_requested,
        private_lessons_completed,
      };

      return { data: stats, error: null };
    } catch (err) {
      console.error('Error getting profile stats:', err);
      return { data: null, error: String(err) };
    }
  },
};
