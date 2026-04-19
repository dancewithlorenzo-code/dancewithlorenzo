import Stripe from 'https://esm.sh/stripe@17.5.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, bundle_type, promotion_code } = await req.json();

    if (!user_id || !bundle_type) {
      return new Response(
        JSON.stringify({ error: 'user_id and bundle_type are required' }),
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

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate promotion code if provided
    let seasonalDiscount = 0;
    let promotionId: string | null = null;
    let promotionName: string | null = null;
    
    if (promotion_code) {
      const now = new Date().toISOString();
      
      const { data: promoData, error: promoError } = await supabaseAdmin
        .from('seasonal_promotions')
        .select('*')
        .eq('promotion_code', promotion_code.toUpperCase())
        .eq('is_active', true)
        .lte('start_date', now)
        .gte('end_date', now)
        .single();

      if (!promoError && promoData) {
        // Check if bundle type matches
        if (promoData.bundle_type === bundle_type || promoData.bundle_type === 'any') {
          // Check max uses
          if (!promoData.max_uses || promoData.current_uses < promoData.max_uses) {
            seasonalDiscount = promoData.discount_percent;
            promotionId = promoData.id;
            promotionName = promoData.name;
            
            // Increment usage count
            await supabaseAdmin
              .from('seasonal_promotions')
              .update({ current_uses: promoData.current_uses + 1 })
              .eq('id', promotionId);
            
            console.log('Applied promotion:', promotionName, 'Discount:', seasonalDiscount + '%');
          }
        }
      }
    }

    // Calculate pricing
    const PRICE_PER_WORKSHOP = 15000;
    const EXPECTED_PRICES = {
      '3_pack': { credits: 3, original: 45000, discount: 10, final: 40500 },
      '5_pack': { credits: 5, original: 75000, discount: 15, final: 63750 },
      '7_pack': { credits: 7, original: 105000, discount: 20, final: 84000 },
    };

    let credits: number;
    let originalPrice: number;
    let discountPercent: number;
    let discountedPrice: number;
    let bundleName: string;
    let description: string;

    const expected = EXPECTED_PRICES[bundle_type];

    if (bundle_type === '3_pack') {
      credits = 3;
      originalPrice = PRICE_PER_WORKSHOP * credits; // ¥45,000
      discountPercent = 10;
      discountedPrice = Math.round(originalPrice * 0.9); // ¥40,500
      bundleName = '3 Workshop Bundle';
      description = 'Book 3 workshops and save 10%';
    } else if (bundle_type === '5_pack') {
      credits = 5;
      originalPrice = PRICE_PER_WORKSHOP * credits; // ¥75,000
      discountPercent = 15;
      discountedPrice = Math.round(originalPrice * 0.85); // ¥63,750
      bundleName = '5 Workshop Bundle';
      description = 'Book 5 workshops and save 15%';
    } else {
      credits = 7;
      originalPrice = PRICE_PER_WORKSHOP * credits; // ¥105,000
      discountPercent = 20;
      discountedPrice = Math.round(originalPrice * 0.8); // ¥84,000
      bundleName = '7 Workshop Bundle';
      description = 'Book 7 workshops and save 20%';
    }

    // === BASE PRICE VALIDATION ===
    console.log('=== BUNDLE CHECKOUT BASE PRICE VALIDATION ===');
    console.log('Bundle Type:', bundle_type);
    console.log('Expected Original:', expected.original, 'JPY');
    console.log('Actual Original:', originalPrice, 'JPY');
    console.log('Expected Base Discount:', expected.discount + '%');
    console.log('Expected Final (before seasonal):', expected.final, 'JPY');
    console.log('Actual Final (before seasonal):', discountedPrice, 'JPY');

    // Assertion: Original price must match
    if (originalPrice !== expected.original) {
      const error = `CRITICAL PRICE ERROR: ${bundle_type} original price should be ¥${expected.original} but got ¥${originalPrice}`;
      console.error('🚨', error);
      throw new Error(error);
    }

    // Assertion: Base discounted price must match
    if (discountedPrice !== expected.final) {
      const error = `CRITICAL DISCOUNT ERROR: ${bundle_type} base price should be ¥${expected.final} but got ¥${discountedPrice}`;
      console.error('🚨', error);
      throw new Error(error);
    }

    console.log('✅ Base price validation PASSED');
    
    // Apply seasonal discount on top of base discount
    if (seasonalDiscount > 0) {
      const finalPrice = Math.round(discountedPrice * (1 - seasonalDiscount / 100));
      const totalSavings = originalPrice - finalPrice;
      const totalDiscount = Math.round((totalSavings / originalPrice) * 100);
      
      discountedPrice = finalPrice;
      discountPercent = totalDiscount;
      
      if (promotionName) {
        description = `${description} + ${seasonalDiscount}% ${promotionName} offer!`;
      }
    }

    // === FINAL PRICE VALIDATION (with seasonal discount) ===
    console.log('=== BUNDLE CHECKOUT FINAL PRICE VALIDATION ===');
    console.log('Original Price:', originalPrice, 'JPY');
    console.log('Base Discount:', expected.discount + '%');
    console.log('Seasonal Discount:', seasonalDiscount + '%');
    console.log('Final Discount:', discountPercent + '%');
    console.log('Final Price:', discountedPrice, 'JPY');
    console.log('Total Savings:', originalPrice - discountedPrice, 'JPY');

    // Assertion: Final price sanity checks
    if (discountedPrice <= 0) {
      const error = `INVALID PRICE: Final price must be positive, got ¥${discountedPrice}`;
      console.error('🚨', error);
      throw new Error(error);
    }

    if (discountedPrice > originalPrice) {
      const error = `LOGIC ERROR: Final price ¥${discountedPrice} cannot exceed original ¥${originalPrice}`;
      console.error('🚨', error);
      throw new Error(error);
    }

    // Maximum possible discount should not exceed 50% (even with promotions)
    const maxAllowedDiscount = 50;
    const actualDiscountPercent = Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
    if (actualDiscountPercent > maxAllowedDiscount) {
      const error = `EXCESSIVE DISCOUNT: ${actualDiscountPercent}% discount exceeds maximum ${maxAllowedDiscount}% (¥${originalPrice} → ¥${discountedPrice})`;
      console.error('🚨', error);
      throw new Error(error);
    }

    if (discountedPrice < originalPrice * 0.5) {
      console.warn('⚠️ WARNING: Price', discountedPrice, 'is less than 50% of original', originalPrice);
    }

    // Verify seasonal discount calculation
    if (seasonalDiscount > 0) {
      const expectedWithSeasonal = Math.round(expected.final * (1 - seasonalDiscount / 100));
      if (Math.abs(discountedPrice - expectedWithSeasonal) > 10) {
        console.warn('⚠️ WARNING: Seasonal calculation may be incorrect. Expected ~¥' + expectedWithSeasonal + ' got ¥' + discountedPrice);
      }
    }

    console.log('✅ Final price validation PASSED');
    console.log('===============================================');

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2024-12-18.acacia',
    });

    // Create Stripe checkout session
    // Use generic URLs since mobile apps don't have a traditional origin
    // The webhook will handle fulfillment
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
              description: description,
              metadata: {
                bundle_type,
                credits: credits.toString(),
                discount_percent: discountPercent.toString(),
              },
            },
            unit_amount: discountedPrice,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        product_type: 'workshop_bundle',
        bundle_type,
        user_id,
        credits: credits.toString(),
        original_price: originalPrice.toString(),
        discounted_price: discountedPrice.toString(),
        discount_percent: discountPercent.toString(),
        promotion_id: promotionId || '',
        promotion_name: promotionName || '',
      },
    });

    console.log('Created workshop bundle checkout session:', session.id);

    return new Response(
      JSON.stringify({ 
        url: session.url,
        bundle_type,
        credits,
        discounted_price: discountedPrice,
        savings: originalPrice - discountedPrice
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error creating workshop bundle checkout session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
