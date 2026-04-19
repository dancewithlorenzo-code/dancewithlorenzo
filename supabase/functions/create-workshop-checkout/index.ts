import Stripe from 'https://esm.sh/stripe@17.5.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, class_id } = await req.json();

    if (!user_id || !class_id) {
      return new Response(
        JSON.stringify({ error: 'user_id and class_id are required' }),
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

    // Get class details
    const { data: classData, error: classError } = await supabaseAdmin
      .from('classes')
      .select('*')
      .eq('id', class_id)
      .single();

    if (classError || !classData) {
      return new Response(
        JSON.stringify({ error: 'Class not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Calculate tiered price based on current participant count
    const EXPECTED_PRICE_UNDER_5 = 15000;
    const EXPECTED_PRICE_5_PLUS = 12000;
    const currentParticipants = classData.current_participants || 0;
    const pricePerPerson = currentParticipants < 5 ? EXPECTED_PRICE_UNDER_5 : EXPECTED_PRICE_5_PLUS;
    const amountInYen = pricePerPerson;

    // === PRICE VALIDATION ===
    console.log('=== WORKSHOP CHECKOUT PRICE VALIDATION ===');
    console.log('Current Participants:', currentParticipants);
    console.log('Price Tier:', currentParticipants < 5 ? '<5 people' : '5+ people');
    console.log('Expected Price:', currentParticipants < 5 ? EXPECTED_PRICE_UNDER_5 : EXPECTED_PRICE_5_PLUS, 'JPY');
    console.log('Actual Price:', amountInYen, 'JPY');

    // Assertion: Price must match one of the two tiers
    if (amountInYen !== EXPECTED_PRICE_UNDER_5 && amountInYen !== EXPECTED_PRICE_5_PLUS) {
      const error = `CRITICAL PRICE MISMATCH: Expected ¥${EXPECTED_PRICE_UNDER_5} or ¥${EXPECTED_PRICE_5_PLUS} but got ¥${amountInYen}`;
      console.error('🚨', error);
      throw new Error(error);
    }

    // Assertion: Price sanity checks
    if (amountInYen <= 0) {
      const error = `INVALID PRICE: Price must be positive, got ¥${amountInYen}`;
      console.error('🚨', error);
      throw new Error(error);
    }

    if (amountInYen > 100000) {
      const error = `SUSPICIOUS PRICE: Workshop price ¥${amountInYen} exceeds ¥100,000 - likely error`;
      console.error('🚨', error);
      throw new Error(error);
    }

    // Validation: Tier logic
    const expectedTier = currentParticipants < 5 ? 'under_5' : '5_plus';
    const expectedPrice = currentParticipants < 5 ? EXPECTED_PRICE_UNDER_5 : EXPECTED_PRICE_5_PLUS;
    if (amountInYen !== expectedPrice) {
      const error = `TIER LOGIC ERROR: ${currentParticipants} participants → ${expectedTier} tier → expected ¥${expectedPrice} but got ¥${amountInYen}`;
      console.error('🚨', error);
      throw new Error(error);
    }

    console.log('✅ Price validation PASSED');
    console.log('=========================================');

    // Check if already booked
    const { data: existingBooking } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('user_id', user_id)
      .eq('class_id', class_id)
      .eq('status', 'confirmed')
      .single();

    if (existingBooking) {
      return new Response(
        JSON.stringify({ error: 'You have already booked this class' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create a pending booking record
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert({
        user_id,
        class_id,
        status: 'pending_payment',
        payment_method: 'stripe',
        payment_amount: amountInYen,
      })
      .select()
      .single();

    if (bookingError || !booking) {
      console.error('Error creating booking:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Failed to create booking' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Created pending booking:', booking.id);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2024-12-18.acacia',
    });

    // Create Stripe checkout session
    // Use generic URLs since mobile apps don't have a traditional origin
    // The webhook will handle fulfillment, success/cancel pages are just for user confirmation
    const successUrl = 'https://dancewithlonrenzo.com/payment-success';
    const cancelUrl = 'https://dancewithlonrenzo.com/payment-cancelled';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: `Workshop: ${classData.title}`,
              description: `${new Date(classData.start_time).toLocaleDateString('ja-JP')} at ${new Date(classData.start_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`,
              metadata: {
                class_type: classData.class_type,
                location: classData.location || '',
              },
            },
            unit_amount: amountInYen,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        product_type: 'workshop',
        booking_id: booking.id,
        class_id,
        user_id,
        price_tier: currentParticipants < 5 ? 'under_5' : '5_plus',
      },
    });

    console.log('Created workshop checkout session:', session.id, 'for booking:', booking.id);

    return new Response(
      JSON.stringify({ 
        url: session.url,
        booking_id: booking.id,
        amount: amountInYen,
        price_tier: currentParticipants < 5 ? 'under_5' : '5_plus'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error creating workshop checkout session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
