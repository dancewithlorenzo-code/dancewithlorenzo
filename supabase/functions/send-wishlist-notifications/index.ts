import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface ExpoPushMessage {
  to: string[];
  title: string;
  body: string;
  data?: any;
  sound?: string;
  priority?: 'default' | 'normal' | 'high';
}

async function sendExpoPushNotifications(messages: ExpoPushMessage[]): Promise<{ success: number; failed: number }> {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Expo push notification error:', errorText);
      return { success: 0, failed: messages.reduce((sum, m) => sum + m.to.length, 0) };
    }

    const result = await response.json();
    const successCount = result.data?.filter((r: any) => r.status === 'ok').length || 0;
    const failedCount = result.data?.length - successCount || 0;

    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error('Error sending Expo push notifications:', error);
    return { success: 0, failed: messages.reduce((sum, m) => sum + m.to.length, 0) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { productId, notificationType } = await req.json();

    if (!productId || !notificationType) {
      throw new Error('productId and notificationType are required');
    }

    console.log(`Sending wishlist notification for product ${productId}, type: ${notificationType}`);

    // Fetch product details
    const { data: product, error: productError } = await supabase
      .from('boutique_products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError) throw new Error(`Failed to fetch product: ${productError.message}`);
    if (!product) throw new Error('Product not found');

    // Fetch wishlist items for this product
    const { data: wishlistItems, error: wishlistError } = await supabase
      .from('wishlists')
      .select(`
        id,
        user_id,
        notified_for_restock,
        notified_for_sale,
        last_known_price,
        user_profiles!inner(push_token, email)
      `)
      .eq('product_id', productId);

    if (wishlistError) throw new Error(`Failed to fetch wishlist items: ${wishlistError.message}`);
    if (!wishlistItems || wishlistItems.length === 0) {
      console.log('No wishlist items found for this product');
      return new Response(
        JSON.stringify({ 
          success: true,
          sent: 0,
          message: 'No users to notify',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let notificationTitle = '';
    let notificationBody = '';
    let itemsToNotify: any[] = [];

    if (notificationType === 'restock') {
      // Only notify users who haven't been notified for restock
      itemsToNotify = wishlistItems.filter(item => !item.notified_for_restock && item.user_profiles.push_token);
      notificationTitle = '🎉 Back in Stock!';
      notificationBody = `"${product.name}" is now available in our boutique!`;
    } else if (notificationType === 'sale') {
      // Only notify users who haven't been notified for this sale
      itemsToNotify = wishlistItems.filter(item => !item.notified_for_sale && item.user_profiles.push_token);
      
      if (itemsToNotify.length > 0 && itemsToNotify[0].last_known_price) {
        const priceDrop = itemsToNotify[0].last_known_price - product.price;
        const percentDrop = ((priceDrop / itemsToNotify[0].last_known_price) * 100).toFixed(0);
        notificationTitle = '🔥 Price Drop Alert!';
        notificationBody = `"${product.name}" is now ¥${(product.price / 100).toLocaleString()} (${percentDrop}% off)!`;
      } else {
        notificationTitle = '💰 On Sale Now!';
        notificationBody = `"${product.name}" has a special price: ¥${(product.price / 100).toLocaleString()}`;
      }
    }

    if (itemsToNotify.length === 0) {
      console.log('All users already notified for this event');
      return new Response(
        JSON.stringify({ 
          success: true,
          sent: 0,
          message: 'All users already notified',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pushTokens = itemsToNotify
      .map(item => item.user_profiles.push_token)
      .filter(Boolean);

    console.log(`Found ${pushTokens.length} push tokens to notify`);

    // Send push notifications
    const message: ExpoPushMessage = {
      to: pushTokens,
      title: notificationTitle,
      body: notificationBody,
      data: {
        productId: product.id,
        type: 'wishlist_notification',
        notificationType,
        actionUrl: '/boutique',
      },
      sound: 'default',
      priority: 'high',
    };

    const { success, failed } = await sendExpoPushNotifications([message]);

    // Update notification flags for users
    const updateField = notificationType === 'restock' ? 'notified_for_restock' : 'notified_for_sale';
    const wishlistIds = itemsToNotify.map(item => item.id);

    await supabase
      .from('wishlists')
      .update({ [updateField]: true })
      .in('id', wishlistIds);

    console.log(`Wishlist notification sent: ${success} success, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        sent: success,
        failed: failed,
        product: {
          id: product.id,
          name: product.name,
        },
        notificationType,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-wishlist-notifications:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
