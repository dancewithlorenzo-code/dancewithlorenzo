import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail, createStockAlertEmail } from '../_shared/email.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { productId, size } = await req.json();

    if (!productId) {
      return new Response(
        JSON.stringify({ error: 'Product ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending stock alerts for product: ${productId}, size: ${size || 'all'}`);

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('boutique_products')
      .select('name, image_url, price')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      throw new Error(`Product not found: ${productError?.message}`);
    }

    // Get active stock alerts for this product
    let query = supabase
      .from('stock_alerts')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true);

    // If size is specified, filter by size OR "any size" requests (null)
    if (size) {
      query = query.or(`requested_size.eq.${size},requested_size.is.null`);
    }

    const { data: alerts, error: alertsError } = await query;

    if (alertsError) {
      throw new Error(`Failed to fetch alerts: ${alertsError.message}`);
    }

    if (!alerts || alerts.length === 0) {
      console.log('No active alerts found for this product/size');
      return new Response(
        JSON.stringify({ message: 'No alerts to send', count: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${alerts.length} alerts to send`);

    // Send email to each customer
    const emailResults = await Promise.allSettled(
      alerts.map(async (alert) => {
        // Get user profile for name
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('username, email')
          .eq('id', alert.user_id)
          .single();

        const customerName = userProfile?.username || null;
        const productUrl = 'https://your-app-url.com/boutique'; // TODO: Update with actual app URL

        // Create and send email
        const emailReceipt = createStockAlertEmail(
          alert.email,
          customerName,
          product.name,
          product.image_url,
          product.price,
          productUrl,
          alert.requested_size || undefined
        );

        const emailResult = await sendEmail(emailReceipt);

        if (emailResult.success) {
          // Mark alert as notified
          await supabase
            .from('stock_alerts')
            .update({
              notified_at: new Date().toISOString(),
              is_active: false,
            })
            .eq('id', alert.id);

          console.log(`Email sent successfully to ${alert.email}`);
          return { success: true, email: alert.email };
        } else {
          console.error(`Failed to send email to ${alert.email}:`, emailResult.error);
          return { success: false, email: alert.email, error: emailResult.error };
        }
      })
    );

    // Count successes and failures
    const successful = emailResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = emailResults.length - successful;

    console.log(`Stock alerts sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({
        message: 'Stock alerts processed',
        total: alerts.length,
        successful,
        failed,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error sending stock alerts:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
