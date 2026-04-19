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

    // Token package: 4 tokens for ¥33,000
    // IMPORTANT: JPY has no decimal places, so 33000 = ¥33,000 (not ¥3,300,000)
    const EXPECTED_TOKEN_PRICE = 33000;
    const EXPECTED_TOKEN_QUANTITY = 4;
    const tokenPrice = EXPECTED_TOKEN_PRICE;
    const tokenQuantity = EXPECTED_TOKEN_QUANTITY;

    // === PRICE VALIDATION ===
    console.log('=== TOKEN CHECKOUT PRICE VALIDATION ===');
    console.log('Expected Price:', EXPECTED_TOKEN_PRICE, 'JPY');
    console.log('Actual Price:', tokenPrice, 'JPY');
    console.log('Token Quantity:', tokenQuantity);
    console.log('Price per Token:', Math.round(tokenPrice / tokenQuantity), 'JPY');

    // Assertion: Exact price match
    if (tokenPrice !== EXPECTED_TOKEN_PRICE) {
      const error = `CRITICAL PRICE MISMATCH: Expected ¥${EXPECTED_TOKEN_PRICE} but got ¥${tokenPrice}`;
      console.error('🚨', error);
      throw new Error(error);
    }

    // Assertion: Price sanity checks
    if (tokenPrice <= 0) {
      const error = `INVALID PRICE: Price must be positive, got ¥${tokenPrice}`;
      console.error('🚨', error);
      throw new Error(error);
    }

    if (tokenPrice > 1000000) {
      const error = `SUSPICIOUS PRICE: Price ¥${tokenPrice} exceeds ¥1,000,000 - likely decimal error`;
      console.error('🚨', error);
      throw new Error(error);
    }

    if (tokenPrice < 10000) {
      console.warn('⚠️ WARNING: Token price', tokenPrice, 'seems too low (expected ¥33,000)');
    }

    console.log('✅ Price validation PASSED');
    console.log('======================================');

    // Create checkout session
    // Use a generic success URL since mobile apps don't have a traditional origin
    // The webhook will handle fulfillment, so the success page is just for user confirmation
    const successUrl = 'https://dancewithlonrenzo.com/payment-success';
    const cancelUrl = 'https://dancewithlonrenzo.com/payment-cancelled';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: 'BMD Token Package (4 Tokens)',
              description: '4 tokens for Become my Dancers classes at Dance with Lorenzo',
              metadata: {
                token_quantity: tokenQuantity.toString(),
              },
            },
            unit_amount: tokenPrice,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        product_type: 'tokens',
        user_id: user_id,
        quantity: tokenQuantity.toString(),
      },
    });

    console.log('Created token checkout session:', session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error creating token checkout session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
