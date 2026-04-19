import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

export interface StockAlert {
  id: string;
  user_id: string;
  product_id: string;
  requested_size: string | null;
  email: string;
  is_active: boolean;
  notified_at: string | null;
  created_at: string;
}

export interface StockAlertWithProduct extends StockAlert {
  product_name: string;
  product_image_url: string | null;
  product_price: number;
}

/**
 * Request stock alert for a product/size
 */
export async function requestStockAlert(
  userId: string,
  productId: string,
  email: string,
  size?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Check if alert already exists for this user/product/size
    const { data: existing } = await supabase
      .from('stock_alerts')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .eq('is_active', true)
      .eq('requested_size', size || null)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'You already have an active alert for this item' };
    }

    const { error } = await supabase
      .from('stock_alerts')
      .insert({
        user_id: userId,
        product_id: productId,
        email,
        requested_size: size || null,
      });

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error requesting stock alert:', err);
    return { success: false, error: err.message || 'Failed to create stock alert' };
  }
}

/**
 * Fetch user's active stock alerts with product details
 */
export async function fetchUserStockAlerts(
  userId: string
): Promise<{ data: StockAlertWithProduct[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('stock_alerts')
      .select(`
        *,
        boutique_products!inner(name, image_url, price)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform data to include product details
    const alerts: StockAlertWithProduct[] = (data || []).map((alert: any) => ({
      id: alert.id,
      user_id: alert.user_id,
      product_id: alert.product_id,
      requested_size: alert.requested_size,
      email: alert.email,
      is_active: alert.is_active,
      notified_at: alert.notified_at,
      created_at: alert.created_at,
      product_name: alert.boutique_products.name,
      product_image_url: alert.boutique_products.image_url,
      product_price: alert.boutique_products.price,
    }));

    return { data: alerts, error: null };
  } catch (err: any) {
    console.error('Error fetching user stock alerts:', err);
    return { data: null, error: err.message || 'Failed to fetch stock alerts' };
  }
}

/**
 * Cancel a stock alert
 */
export async function cancelStockAlert(
  alertId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('stock_alerts')
      .update({ is_active: false })
      .eq('id', alertId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error cancelling stock alert:', err);
    return { success: false, error: err.message || 'Failed to cancel alert' };
  }
}

/**
 * Admin: Get all active alerts for a specific product
 */
export async function getProductStockAlerts(
  productId: string
): Promise<{ data: StockAlert[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('stock_alerts')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching product stock alerts:', err);
    return { data: null, error: err.message || 'Failed to fetch alerts' };
  }
}

/**
 * Admin: Get count of waiting customers for a product
 */
export async function getStockAlertCount(
  productId: string,
  size?: string
): Promise<{ count: number; error: string | null }> {
  try {
    let query = supabase
      .from('stock_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId)
      .eq('is_active', true);

    if (size) {
      query = query.eq('requested_size', size);
    }

    const { count, error } = await query;

    if (error) throw error;
    return { count: count || 0, error: null };
  } catch (err: any) {
    console.error('Error getting stock alert count:', err);
    return { count: 0, error: err.message || 'Failed to get alert count' };
  }
}
