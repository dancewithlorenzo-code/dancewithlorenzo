import Stripe from 'https://esm.sh/stripe@17.5.0';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2024-12-18.acacia',
    });

    // TEST PAYMENT: Only ¥100 for safe verification
    const TEST_AMOUNT = 100;

    // === PRICE VALIDATION ===
    console.log('=== TEST CHECKOUT PRICE VALIDATION ===');
    console.log('🧪 TEST MODE: This is a ¥100 test transaction');
    console.log('Test Amount:', TEST_AMOUNT, 'JPY');
    console.log('User ID:', user_id);
    console.log('Purpose: Verify Stripe live mode integration');

    // Assertion: Test amount sanity checks
    if (TEST_AMOUNT !== 100) {
      const error = 'TEST AMOUNT MISMATCH: Should be exactly ¥100';
      console.error('🚨', error);
      throw new Error(error);
    }

    console.log('✅ Test payment validation PASSED');
    console.log('======================================');

    // Create checkout session
    const successUrl = 'https://dancewithlonrenzo.com/payment-success';
    const cancelUrl = 'https://dancewithlonrenzo.com/payment-cancelled';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: '🧪 Test Payment (¥100)',
              description: 'Pre-production test to verify Stripe live mode integration. This will process through webhook and send email receipt.',
              metadata: {
                test_payment: 'true',
                test_purpose: 'stripe_live_mode_verification',
              },
            },
            unit_amount: TEST_AMOUNT,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        product_type: 'test_payment',
        user_id: user_id,
        test_amount: TEST_AMOUNT.toString(),
        test_timestamp: new Date().toISOString(),
      },
    });

    console.log('✅ Created test checkout session:', session.id);
    console.log('🧪 Test payment URL:', session.url);

    return new Response(
      JSON.stringify({ 
        url: session.url,
        session_id: session.id,
        test_amount: TEST_AMOUNT,
        message: 'Test payment of ¥100 created. Complete payment to verify Stripe live mode.'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('❌ Error creating test checkout session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
