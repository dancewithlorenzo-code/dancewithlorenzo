import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  notified_for_restock: boolean;
  notified_for_sale: boolean;
  last_known_price: number | null;
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    image_url: string;
    stock_quantity: number;
    is_active: boolean;
    sizes?: any;
  };
}

/**
 * Add product to user's wishlist
 */
export async function addToWishlist(userId: string, productId: string, currentPrice: number): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('wishlists')
      .insert({
        user_id: userId,
        product_id: productId,
        last_known_price: currentPrice,
      });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Product already in wishlist' };
      }
      throw error;
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error adding to wishlist:', err);
    return { success: false, error: err.message || 'Failed to add to wishlist' };
  }
}

/**
 * Remove product from user's wishlist
 */
export async function removeFromWishlist(userId: string, productId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('wishlists')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error removing from wishlist:', err);
    return { success: false, error: err.message || 'Failed to remove from wishlist' };
  }
}

/**
 * Get user's wishlist with product details
 */
export async function fetchUserWishlist(userId: string): Promise<{ data: WishlistItem[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('wishlists')
      .select(`
        *,
        product:boutique_products(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data: data as WishlistItem[], error: null };
  } catch (err: any) {
    console.error('Error fetching wishlist:', err);
    return { data: null, error: err.message || 'Failed to fetch wishlist' };
  }
}

/**
 * Check if product is in user's wishlist
 */
export async function isInWishlist(userId: string, productId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    return !!data && !error;
  } catch (err) {
    return false;
  }
}

/**
 * Get wishlist count for user
 */
export async function getWishlistCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('wishlists')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw error;
    return count || 0;
  } catch (err) {
    console.error('Error getting wishlist count:', err);
    return 0;
  }
}

/**
 * Toggle product in wishlist (add if not present, remove if present)
 */
export async function toggleWishlist(userId: string, productId: string, currentPrice: number): Promise<{ 
  success: boolean; 
  isInWishlist: boolean;
  error: string | null;
}> {
  const inWishlist = await isInWishlist(userId, productId);

  if (inWishlist) {
    const { success, error } = await removeFromWishlist(userId, productId);
    return { success, isInWishlist: false, error };
  } else {
    const { success, error } = await addToWishlist(userId, productId, currentPrice);
    return { success, isInWishlist: true, error };
  }
}

/**
 * Update last known price for wishlist item (used to detect price drops)
 */
export async function updateWishlistPrice(userId: string, productId: string, newPrice: number): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('wishlists')
      .update({ 
        last_known_price: newPrice,
        notified_for_sale: false, // Reset notification flag when price changes
      })
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error updating wishlist price:', err);
    return { success: false, error: err.message || 'Failed to update price' };
  }
}
