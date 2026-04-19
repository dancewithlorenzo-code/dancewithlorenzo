import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@17.5.0';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Stripe instance
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2024-12-18.acacia',
    });

    // Get request body
    const { lesson_id } = await req.json();

    if (!lesson_id) {
      return new Response(
        JSON.stringify({ error: 'lesson_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get lesson details
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from('private_lessons')
      .select(`
        id,
        user_id,
        requested_date,
        requested_time,
        num_participants,
        total_price,
        status,
        user_profiles (email, username)
      `)
      .eq('id', lesson_id)
      .single();

    if (lessonError || !lesson) {
      console.error('Error fetching lesson:', lessonError);
      return new Response(
        JSON.stringify({ error: 'Lesson not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if lesson is approved
    if (lesson.status !== 'approved') {
      return new Response(
        JSON.stringify({ error: 'Lesson must be approved first' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === PRIVATE LESSON PRICE VALIDATION ===
    const EXPECTED_PRICE_PER_PARTICIPANT = 40000;
    const expectedTotalPrice = EXPECTED_PRICE_PER_PARTICIPANT * lesson.num_participants;

    console.log('=== PRIVATE LESSON PAYMENT PRICE VALIDATION ===');
    console.log('Lesson ID:', lesson.id);
    console.log('Number of Participants:', lesson.num_participants);
    console.log('Expected Price per Participant:', EXPECTED_PRICE_PER_PARTICIPANT, 'JPY');
    console.log('Expected Total:', expectedTotalPrice, 'JPY');
    console.log('Actual Total:', lesson.total_price, 'JPY');

    // Assertion: Total price must match participants × rate
    if (lesson.total_price !== expectedTotalPrice) {
      const error = `CRITICAL PRICE MISMATCH: ${lesson.num_participants} participants should cost ¥${expectedTotalPrice} but got ¥${lesson.total_price}`;
      console.error('🚨', error);
      throw new Error(error);
    }

    // Assertion: Price sanity checks
    if (lesson.total_price <= 0) {
      const error = `INVALID PRICE: Price must be positive, got ¥${lesson.total_price}`;
      console.error('🚨', error);
      throw new Error(error);
    }

    if (lesson.num_participants <= 0) {
      const error = `INVALID PARTICIPANTS: Must have at least 1 participant, got ${lesson.num_participants}`;
      console.error('🚨', error);
      throw new Error(error);
    }

    if (lesson.num_participants > 20) {
      console.warn('⚠️ WARNING: Unusually high participant count:', lesson.num_participants);
    }

    if (lesson.total_price > 1000000) {
      const error = `SUSPICIOUS PRICE: Private lesson ¥${lesson.total_price} exceeds ¥1,000,000 - likely error`;
      console.error('🚨', error);
      throw new Error(error);
    }

    // Verify it's a multiple of the base rate
    if (lesson.total_price % EXPECTED_PRICE_PER_PARTICIPANT !== 0) {
      const error = `CALCULATION ERROR: Total ¥${lesson.total_price} is not a multiple of ¥${EXPECTED_PRICE_PER_PARTICIPANT} per participant`;
      console.error('🚨', error);
      throw new Error(error);
    }

    console.log('✅ Price validation PASSED');
    console.log('===============================================');

    // Create Stripe Price
    const price = await stripe.prices.create({
      currency: 'jpy',
      unit_amount: lesson.total_price,
      product_data: {
        name: 'Private Dance Lesson',
        description: `Private lesson on ${lesson.requested_date} at ${lesson.requested_time} for ${lesson.num_participants} participant(s)`,
        metadata: {
          lesson_id: lesson.id,
          user_id: lesson.user_id,
        },
      },
    });

    console.log('Created Stripe price:', price.id);

    // Create Stripe Payment Link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'hosted_confirmation',
        hosted_confirmation: {
          custom_message: 'Your private lesson payment has been confirmed! Lorenzo will contact you soon.',
        },
      },
      metadata: {
        lesson_id: lesson.id,
        user_id: lesson.user_id,
        product_type: 'private_lesson',
      },
    });

    console.log('Created payment link:', paymentLink.url);

    // Update lesson with payment link
    const { error: updateError } = await supabaseAdmin
      .from('private_lessons')
      .update({
        payment_intent_id: paymentLink.id,
      })
      .eq('id', lesson.id);

    if (updateError) {
      console.error('Error updating lesson with payment link:', updateError);
    }

    return new Response(
      JSON.stringify({
        url: paymentLink.url,
        payment_link_id: paymentLink.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating payment link:', error);
    return new Response(
      JSON.stringify({ error: `Stripe: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
