import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

// Size variant interface
export interface SizeVariant {
  size: string;
  bust_cm?: string;
  bust_in?: string;
  length_cm?: string;
  width_cm?: string;
  stock: number;
}

export interface BoutiqueProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: 'costume' | 'accessories' | 'shoes' | 'jewelry' | 'bags' | 'other';
  image_url: string | null;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  sizes?: SizeVariant[] | null;
}

export interface BoutiqueOrder {
  id: string;
  user_id: string;
  total_price: number;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_intent_id: string | null;
  shipping_name: string;
  shipping_email: string;
  shipping_phone: string | null;
  shipping_address: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoutiqueOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_purchase: number;
  product_name: string;
  created_at: string;
  selected_size?: string | null;
}

export interface CartItem {
  product: BoutiqueProduct;
  quantity: number;
  selectedSize?: string;
}

export interface ShippingInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  notes?: string;
}

/**
 * Fetch all active boutique products
 */
export async function fetchBoutiqueProducts(): Promise<{ data: BoutiqueProduct[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('boutique_products')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching boutique products:', err);
    return { data: null, error: err.message || 'Failed to fetch products' };
  }
}

/**
 * Fetch products by category
 */
export async function fetchProductsByCategory(category: string): Promise<{ data: BoutiqueProduct[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('boutique_products')
      .select('*')
      .eq('is_active', true)
      .eq('category', category)
      .order('name', { ascending: true});

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching products by category:', err);
    return { data: null, error: err.message || 'Failed to fetch products' };
  }
}

/**
 * Create a new boutique order
 */
export async function createBoutiqueOrder(
  userId: string,
  cartItems: CartItem[],
  shippingInfo: ShippingInfo
): Promise<{ orderId: string | null; error: string | null }> {
  try {
    const totalPrice = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('boutique_orders')
      .insert({
        user_id: userId,
        total_price: totalPrice,
        status: 'pending',
        shipping_name: shippingInfo.name,
        shipping_email: shippingInfo.email,
        shipping_phone: shippingInfo.phone,
        shipping_address: shippingInfo.address,
        notes: shippingInfo.notes || null,
      })
      .select('id')
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = cartItems.map(item => ({
      order_id: order.id,
      product_id: item.product.id,
      quantity: item.quantity,
      price_at_purchase: item.product.price,
      product_name: item.product.name,
      selected_size: item.selectedSize || null,
    }));

    const { error: itemsError } = await supabase
      .from('boutique_order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    return { orderId: order.id, error: null };
  } catch (err: any) {
    console.error('Error creating boutique order:', err);
    return { orderId: null, error: err.message || 'Failed to create order' };
  }
}

/**
 * Update order payment status
 */
export async function updateOrderPayment(
  orderId: string,
  paymentIntentId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('boutique_orders')
      .update({
        status: 'paid',
        payment_intent_id: paymentIntentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error updating order payment:', err);
    return { success: false, error: err.message || 'Failed to update payment' };
  }
}

/**
 * Fetch user's boutique orders
 */
export async function fetchUserOrders(userId: string): Promise<{ data: BoutiqueOrder[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('boutique_orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching user orders:', err);
    return { data: null, error: err.message || 'Failed to fetch orders' };
  }
}

/**
 * Fetch order items for a specific order
 */
export async function fetchOrderItems(orderId: string): Promise<{ data: BoutiqueOrderItem[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('boutique_order_items')
      .select('*')
      .eq('order_id', orderId);

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching order items:', err);
    return { data: null, error: err.message || 'Failed to fetch order items' };
  }
}

/**
 * Admin: Create new product
 */
export async function createProduct(product: Omit<BoutiqueProduct, 'id' | 'created_at'>): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('boutique_products')
      .insert(product);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error creating product:', err);
    return { success: false, error: err.message || 'Failed to create product' };
  }
}

/**
 * Admin: Update product
 */
export async function updateProduct(productId: string, updates: Partial<BoutiqueProduct>): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('boutique_products')
      .update(updates)
      .eq('id', productId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error updating product:', err);
    return { success: false, error: err.message || 'Failed to update product' };
  }
}

/**
 * Admin: Delete product
 */
export async function deleteProduct(productId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('boutique_products')
      .delete()
      .eq('id', productId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error deleting product:', err);
    return { success: false, error: err.message || 'Failed to delete product' };
  }
}

/**
 * Admin: Upload product image
 */
export async function uploadProductImage(
  file: { uri: string; name: string; type: string }
): Promise<{ url: string | null; error: string | null }> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `boutique/product-${Date.now()}.${fileExt}`;

    // Create FormData for React Native
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);

    const authToken = (await supabase.auth.getSession()).data.session?.access_token;

    const uploadResponse = await fetch(`https://ctvkeqwytarocihhctvk.backend.onspace.ai/storage/v1/object/class-media/${fileName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('class-media')
      .getPublicUrl(fileName);

    return { url: urlData.publicUrl, error: null };
  } catch (err: any) {
    console.error('Product image upload error:', err);
    return { url: null, error: err.message || 'Failed to upload image' };
  }
}

/**
 * Admin: Fetch all products (including inactive)
 */
export async function fetchAllProducts(): Promise<{ data: BoutiqueProduct[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('boutique_products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching all products:', err);
    return { data: null, error: err.message || 'Failed to fetch products' };
  }
}

/**
 * Admin: Fetch all orders
 */
export async function fetchAllOrders(): Promise<{ data: BoutiqueOrder[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('boutique_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching all orders:', err);
    return { data: null, error: err.message || 'Failed to fetch orders' };
  }
}

/**
 * Admin: Update order status with optional tracking number
 */
export async function updateOrderStatus(
  orderId: string, 
  status: BoutiqueOrder['status'],
  trackingNumber?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Add tracking number field if provided (for shipped status)
    if (trackingNumber) {
      updateData.tracking_number = trackingNumber;
    }

    const { error } = await supabase
      .from('boutique_orders')
      .update(updateData)
      .eq('id', orderId);

    if (error) throw error;

    // Send status update notification email
    try {
      const { error: emailError } = await supabase.functions.invoke('send-order-status-update', {
        body: { 
          orderId, 
          newStatus: status,
          trackingNumber: trackingNumber || null,
        },
      });

      if (emailError) {
        console.error('Failed to send status update email:', emailError);
        // Don't fail the status update if email fails
      }
    } catch (emailErr) {
      console.error('Error sending status update email:', emailErr);
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error updating order status:', err);
    return { success: false, error: err.message || 'Failed to update status' };
  }
}
