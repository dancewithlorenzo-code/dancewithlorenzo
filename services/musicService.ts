import { getSupabaseClient } from '@/template';

export interface MusicProduct {
  id: string;
  title: string;
  artist: string;
  description: string | null;
  product_type: 'album' | 'single' | 'ep';
  price: number;
  cover_image_url: string | null;
  preview_audio_url: string | null;
  track_count: number | null;
  release_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MusicPurchase {
  id: string;
  user_id: string;
  product_id: string;
  purchase_price: number;
  payment_method: string;
  payment_status: 'pending' | 'confirmed' | 'cancelled';
  payment_confirmed_at: string | null;
  download_sent: boolean;
  created_at: string;
  product?: MusicProduct;
}

export const musicService = {
  /**
   * Get all active music products
   */
  async getActiveProducts(): Promise<{ data: MusicProduct[] | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      const { data, error } = await supabase
        .from('music_products')
        .select('*')
        .eq('is_active', true)
        .order('release_date', { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      console.error('Error fetching music products:', err);
      return { data: null, error: String(err) };
    }
  },

  /**
   * Get all music products (including hidden ones - for admin)
   */
  async getAllProducts(): Promise<{ data: MusicProduct[] | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      const { data, error } = await supabase
        .from('music_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      console.error('Error fetching all music products:', err);
      return { data: null, error: String(err) };
    }
  },

  /**
   * Get user's music purchases
   */
  async getUserPurchases(userId: string): Promise<{ data: MusicPurchase[] | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      const { data, error } = await supabase
        .from('music_purchases')
        .select(`
          *,
          product:music_products(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data: data as any, error: null };
    } catch (err) {
      console.error('Error fetching purchases:', err);
      return { data: null, error: String(err) };
    }
  },

  /**
   * Create a purchase (manual payment - pending status)
   */
  async createPurchase(
    userId: string,
    productId: string,
    price: number
  ): Promise<{ data: MusicPurchase | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      // Check if already purchased
      const { data: existing } = await supabase
        .from('music_purchases')
        .select('id, payment_status')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .in('payment_status', ['pending', 'confirmed'])
        .maybeSingle();

      if (existing) {
        return { 
          data: null, 
          error: existing.payment_status === 'confirmed' 
            ? 'You already own this music' 
            : 'You have a pending purchase for this music' 
        };
      }

      const { data, error } = await supabase
        .from('music_purchases')
        .insert({
          user_id: userId,
          product_id: productId,
          purchase_price: price,
          payment_method: 'manual',
          payment_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      console.error('Error creating purchase:', err);
      return { data: null, error: String(err) };
    }
  },

  /**
   * Admin: Mark purchase as confirmed
   */
  async confirmPurchase(purchaseId: string): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      const { error } = await supabase
        .from('music_purchases')
        .update({
          payment_status: 'confirmed',
          payment_confirmed_at: new Date().toISOString(),
        })
        .eq('id', purchaseId);

      if (error) throw error;

      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },

  /**
   * Admin: Mark download as sent
   */
  async markDownloadSent(purchaseId: string): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      const { error } = await supabase
        .from('music_purchases')
        .update({ download_sent: true })
        .eq('id', purchaseId);

      if (error) throw error;

      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },
};
