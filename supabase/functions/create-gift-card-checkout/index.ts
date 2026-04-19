import Stripe from 'https://esm.sh/stripe@17.5.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      purchaser_id, 
      recipient_email, 
      recipient_name,
      bundle_type, 
      custom_message 
    } = await req.json();

    if (!purchaser_id || !recipient_email || !bundle_type) {
      return new Response(
        JSON.stringify({ error: 'purchaser_id, recipient_email, and bundle_type are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!['3_pack', '5_pack', '7_pack'].includes(bundle_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid bundle_type. Must be 3_pack, 5_pack, or 7_pack' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient_email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid recipient email address' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Calculate pricing
    const PRICE_PER_WORKSHOP = 15000;
    const EXPECTED_GIFT_CARD_PRICES = {
      '3_pack': { credits: 3, price: 40500, discount: 10 },
      '5_pack': { credits: 5, price: 63750, discount: 15 },
      '7_pack': { credits: 7, price: 84000, discount: 20 },
    };

    let credits: number;
    let price: number;
    let bundleName: string;
    let description: string;

    const expected = EXPECTED_GIFT_CARD_PRICES[bundle_type];

    if (bundle_type === '3_pack') {
      credits = 3;
      price = Math.round(PRICE_PER_WORKSHOP * 3 * 0.9); // ¥40,500
      bundleName = '3 Workshop Bundle Gift Card';
      description = '3 workshop credits with 10% savings';
    } else if (bundle_type === '5_pack') {
      credits = 5;
      price = Math.round(PRICE_PER_WORKSHOP * 5 * 0.85); // ¥63,750
      bundleName = '5 Workshop Bundle Gift Card';
      description = '5 workshop credits with 15% savings';
    } else {
      credits = 7;
      price = Math.round(PRICE_PER_WORKSHOP * 7 * 0.8); // ¥84,000
      bundleName = '7 Workshop Bundle Gift Card';
      description = '7 workshop credits with 20% savings';
    }

    // === GIFT CARD PRICE VALIDATION ===
    console.log('=== GIFT CARD CHECKOUT PRICE VALIDATION ===');
    console.log('Bundle Type:', bundle_type);
    console.log('Expected Credits:', expected.credits);
    console.log('Expected Price:', expected.price, 'JPY');
    console.log('Expected Discount:', expected.discount + '%');
    console.log('Actual Price:', price, 'JPY');

    // Assertion: Price must match expected
    if (price !== expected.price) {
      const error = `CRITICAL PRICE MISMATCH: ${bundle_type} gift card should be ¥${expected.price} but got ¥${price}`;
      console.error('🚨', error);
      throw new Error(error);
    }

    // Assertion: Price sanity checks
    if (price <= 0) {
      const error = `INVALID PRICE: Price must be positive, got ¥${price}`;
      console.error('🚨', error);
      throw new Error(error);
    }

    if (price > 200000) {
      const error = `SUSPICIOUS PRICE: Gift card price ¥${price} exceeds ¥200,000 - likely error`;
      console.error('🚨', error);
      throw new Error(error);
    }

    // Verify calculation
    const calculatedOriginal = PRICE_PER_WORKSHOP * credits;
    const calculatedDiscount = Math.round(calculatedOriginal * (1 - expected.discount / 100));
    if (price !== calculatedDiscount) {
      const error = `CALCULATION ERROR: ${credits} workshops × ¥${PRICE_PER_WORKSHOP} - ${expected.discount}% should be ¥${calculatedDiscount} but got ¥${price}`;
      console.error('🚨', error);
      throw new Error(error);
    }

    console.log('✅ Price validation PASSED');
    console.log('==========================================');

    // Generate unique redemption code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let redemptionCode = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) redemptionCode += '-';
      redemptionCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify redemption code uniqueness
    let codeExists = true;
    let attempts = 0;
    while (codeExists && attempts < 5) {
      const { data: existing } = await supabaseAdmin
        .from('gift_cards')
        .select('id')
        .eq('redemption_code', redemptionCode)
        .single();
      
      if (!existing) {
        codeExists = false;
      } else {
        // Regenerate code
        redemptionCode = '';
        for (let i = 0; i < 12; i++) {
          if (i > 0 && i % 4 === 0) redemptionCode += '-';
          redemptionCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        attempts++;
      }
    }

    console.log('Gift card pricing:', {
      bundle_type,
      credits,
      price,
      redemptionCode
    });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2024-12-18.acacia',
    });

    // Create Stripe checkout session
    // Use generic URLs since mobile apps don't have a traditional origin
    const successUrl = 'https://dancewithlonrenzo.com/payment-success';
    const cancelUrl = 'https://dancewithlonrenzo.com/payment-cancelled';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: bundleName,
              description: `${description} • Digital gift card for ${recipient_email}`,
              metadata: {
                bundle_type,
                credits: credits.toString(),
                gift_card: 'true',
              },
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        product_type: 'gift_card',
        purchaser_id,
        recipient_email,
        recipient_name: recipient_name || '',
        bundle_type,
        credits: credits.toString(),
        amount_paid: price.toString(),
        custom_message: custom_message || '',
        redemption_code: redemptionCode,
      },
    });

    console.log('Created gift card checkout session:', session.id);

    return new Response(
      JSON.stringify({ 
        url: session.url,
        bundle_type,
        credits,
        price,
        redemption_code: redemptionCode
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error creating gift card checkout session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
