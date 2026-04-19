import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { createOrderStatusUpdateEmail, sendEmail } from '../_shared/email.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { orderId, newStatus, trackingNumber } = await req.json();

    console.log('Processing order status update:', { orderId, newStatus, trackingNumber });

    // Validate status
    const validStatuses = ['processing', 'shipped', 'delivered'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Fetch order details with items
    const { data: order, error: orderError } = await supabase
      .from('boutique_orders')
      .select(`
        id,
        user_id,
        shipping_name,
        shipping_email,
        user_profiles!inner(email, username)
      `)
      .eq('id', orderId)
      .single();

    if (orderError) throw new Error(`Failed to fetch order: ${orderError.message}`);
    if (!order) throw new Error('Order not found');

    // Fetch order items
    const { data: items, error: itemsError } = await supabase
      .from('boutique_order_items')
      .select('product_name, quantity, selected_size')
      .eq('order_id', orderId);

    if (itemsError) throw new Error(`Failed to fetch order items: ${itemsError.message}`);
    if (!items || items.length === 0) throw new Error('No items found for order');

    console.log('Order found:', { 
      orderId, 
      customerEmail: order.shipping_email,
      itemCount: items.length,
    });

    // Create and send status update email
    const emailReceipt = createOrderStatusUpdateEmail(
      order.shipping_email,
      order.shipping_name,
      order.id,
      items,
      newStatus,
      trackingNumber || null
    );

    const { success, error: emailError } = await sendEmail(emailReceipt);

    if (!success || emailError) {
      console.error('Failed to send email:', emailError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Email send failed: ${emailError}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Order status update email sent successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        orderId,
        status: newStatus,
        emailSent: true,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in send-order-status-update:', error);
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
