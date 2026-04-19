import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@17.4.0';
import { sendEmail, createTokenPurchaseReceipt, createWorkshopBookingReceipt, createPrivateLessonReceipt, createGiftCardEmail, createBoutiqueOrderReceipt } from '../_shared/email.ts';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // 🔍 LOG IMMEDIATELY - First line of execution
  console.log('🎯 WEBHOOK RECEIVED:', new Date().toISOString());
  console.log('📨 Method:', req.method);
  console.log('🌐 URL:', req.url);
  console.log('📋 Headers:', Object.fromEntries(req.headers.entries()));

  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request - returning CORS headers');
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2024-12-18.acacia',
    });
    console.log('✅ Stripe client initialized');

    // Get the signature from headers
    const signature = req.headers.get('stripe-signature');
    console.log('🔐 Signature present:', !!signature);
    if (!signature) {
      console.error('❌ No stripe-signature header found!');
      return new Response(
        JSON.stringify({ error: 'No signature' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get raw body
    const body = await req.text();
    console.log('📦 Body length:', body.length, 'bytes');
    console.log('📦 Body preview:', body.substring(0, 200));

    // Verify webhook signature
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
    console.log('🔑 Webhook secret configured:', !!webhookSecret);
    console.log('🔑 Webhook secret preview:', webhookSecret.substring(0, 10) + '...');

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
      console.log('✅ Signature verification PASSED');
    } catch (err) {
      console.error('❌ Signature verification FAILED:', err.message);
      console.error('🔍 Error details:', err);
      return new Response(
        JSON.stringify({ error: `Webhook Error: ${err.message}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('Received webhook event:', event.type);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata;

      console.log('Checkout completed:', session.id, 'Metadata:', metadata);

      // Handle test payments
      if (metadata?.product_type === 'test_payment') {
        console.log('🧪 TEST PAYMENT DETECTED');
        console.log('Test Amount:', metadata?.test_amount, 'JPY');
        console.log('User ID:', metadata?.user_id);
        console.log('Session ID:', session.id);
        
        // Send test confirmation email
        if (session.customer_details?.email) {
          await sendEmail({
            to: [session.customer_details.email],
            subject: '🧪 Test Payment Confirmation - Dance with Lorenzo',
            html: `
              <h2>Test Payment Successful!</h2>
              <p>Your ¥${metadata?.test_amount} test payment has been processed successfully.</p>
              <p><strong>What this means:</strong></p>
              <ul>
                <li>✅ Stripe live mode is working correctly</li>
                <li>✅ Webhook processing is functional</li>
                <li>✅ Email delivery is operational</li>
                <li>✅ You're ready for production transactions!</li>
              </ul>
              <p><strong>Next steps:</strong></p>
              <ol>
                <li>Check Cloud Dashboard → Edge Functions → Logs</li>
                <li>Verify Stripe Dashboard shows ¥${metadata?.test_amount} transaction</li>
                <li>If everything looks good, proceed with real token purchases</li>
              </ol>
              <p>If you have any questions, contact Lorenzo at Dance with Lorenzo.</p>
            `,
          });
          console.log('✅ Test payment webhook processed successfully');
        }
        
        return new Response(
          JSON.stringify({ received: true }),
          { status: 200 }
        );
      }

      if (metadata?.product_type === 'tokens') {
        // Handle token purchase
        const userId = metadata.user_id;
        const quantity = parseInt(metadata.quantity || '4');
        const amount = session.amount_total || 0;

        console.log('Processing token purchase for user:', userId, 'Quantity:', quantity);

        // Get user details for email
        const { data: userData } = await supabaseAdmin
          .from('user_profiles')
          .select('email, username')
          .eq('id', userId)
          .single();

        // Get existing tokens or create new record
        const { data: existingTokens } = await supabaseAdmin
          .from('tokens')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (existingTokens) {
          // Update existing tokens
          const { error: updateError } = await supabaseAdmin
            .from('tokens')
            .update({
              total_tokens: existingTokens.total_tokens + quantity,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

          if (updateError) {
            console.error('Error updating tokens:', updateError);
          } else {
            console.log('Successfully updated tokens for user:', userId);
          }
        } else {
          // Create new token record
          const { error: insertError } = await supabaseAdmin
            .from('tokens')
            .insert({
              user_id: userId,
              total_tokens: quantity,
              used_tokens: 0,
            });

          if (insertError) {
            console.error('Error creating tokens:', insertError);
          } else {
            console.log('Successfully created tokens for user:', userId);
          }
        }

        // Send email receipt
        if (userData?.email) {
          const receipt = createTokenPurchaseReceipt(
            userData.email,
            userData.username,
            quantity,
            amount,
            new Date().toISOString()
          );
          
          const { success, error } = await sendEmail(receipt);
          if (success) {
            console.log('Token purchase receipt sent to:', userData.email);
          } else {
            console.error('Failed to send token receipt:', error);
          }
        }
      }

      if (metadata?.product_type === 'private_lesson') {
        // Handle private lesson payment
        const lessonId = metadata.lesson_id;
        const amount = session.amount_total || 0;

        console.log('Processing private lesson payment for lesson:', lessonId);

        // Get lesson details
        const { data: lessonData } = await supabaseAdmin
          .from('private_lessons')
          .select(`
            *,
            user_profiles (email, username)
          `)
          .eq('id', lessonId)
          .single();

        const { error: updateError } = await supabaseAdmin
          .from('private_lessons')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            payment_intent_id: session.payment_intent as string,
          })
          .eq('id', lessonId);

        if (updateError) {
          console.error('Error updating private lesson status:', updateError);
        } else {
          console.log('Successfully marked lesson as paid:', lessonId);
        }

        // Send email receipt
        if (lessonData?.user_profiles?.email) {
          const receipt = createPrivateLessonReceipt(
            lessonData.user_profiles.email,
            lessonData.user_profiles.username,
            lessonData.requested_date,
            lessonData.requested_time,
            lessonData.num_participants,
            amount,
            new Date().toISOString()
          );
          
          const { success, error } = await sendEmail(receipt);
          if (success) {
            console.log('Private lesson receipt sent to:', lessonData.user_profiles.email);
          } else {
            console.error('Failed to send private lesson receipt:', error);
          }
        }
      }

      if (metadata?.product_type === 'gift_card') {
        // Handle gift card purchase
        const purchaserId = metadata.purchaser_id;
        const recipientEmail = metadata.recipient_email;
        const recipientName = metadata.recipient_name || null;
        const bundleType = metadata.bundle_type;
        const credits = parseInt(metadata.credits || '0');
        const amountPaid = parseInt(metadata.amount_paid || '0');
        const customMessage = metadata.custom_message || null;
        const redemptionCode = metadata.redemption_code;

        console.log('Processing gift card purchase:', {
          purchaserId,
          recipientEmail,
          bundleType,
          credits,
          redemptionCode
        });

        // Get purchaser details
        const { data: purchaserData } = await supabaseAdmin
          .from('user_profiles')
          .select('email, username')
          .eq('id', purchaserId)
          .single();

        // Calculate expiration (1 year from now)
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        // Create gift card record
        const { error: giftCardError } = await supabaseAdmin
          .from('gift_cards')
          .insert({
            purchaser_id: purchaserId,
            recipient_email: recipientEmail,
            recipient_name: recipientName,
            bundle_type: bundleType,
            credits: credits,
            amount_paid: amountPaid,
            custom_message: customMessage,
            redemption_code: redemptionCode,
            expires_at: expiresAt.toISOString(),
            payment_intent_id: session.payment_intent as string,
          });

        if (giftCardError) {
          console.error('Error creating gift card:', giftCardError);
        } else {
          console.log('Successfully created gift card for recipient:', recipientEmail);
        }

        // Send gift card email to recipient
        const bundleName = bundleType === '3_pack' ? '3 Workshop Bundle' : bundleType === '5_pack' ? '5 Workshop Bundle' : '7 Workshop Bundle';
        
        const giftCardEmail = createGiftCardEmail(
          recipientEmail,
          recipientName,
          purchaserData?.username || null,
          bundleName,
          credits,
          customMessage,
          redemptionCode,
          expiresAt.toISOString()
        );
        
        const { success, error } = await sendEmail(giftCardEmail);
        if (success) {
          console.log('Gift card email sent to:', recipientEmail);
        } else {
          console.error('Failed to send gift card email:', error);
        }

        // Send confirmation to purchaser
        if (purchaserData?.email) {
          const purchaserReceipt = createTokenPurchaseReceipt(
            purchaserData.email,
            purchaserData.username,
            credits,
            amountPaid,
            new Date().toISOString()
          );
          
          await sendEmail(purchaserReceipt);
        }
      }

      if (metadata?.product_type === 'workshop_bundle') {
        // Handle workshop bundle purchase
        const userId = metadata.user_id;
        const bundleType = metadata.bundle_type;
        const credits = parseInt(metadata.credits || '0');
        const originalPrice = parseInt(metadata.original_price || '0');
        const discountedPrice = parseInt(metadata.discounted_price || '0');
        const discountPercent = parseInt(metadata.discount_percent || '0');
        const amount = session.amount_total || 0;

        console.log('Processing workshop bundle purchase:', {
          userId,
          bundleType,
          credits,
          discountedPrice
        });

        // Get user details for email
        const { data: userData } = await supabaseAdmin
          .from('user_profiles')
          .select('email, username')
          .eq('id', userId)
          .single();

        // Create workshop bundle record
        const { error: bundleError } = await supabaseAdmin
          .from('workshop_bundles')
          .insert({
            user_id: userId,
            bundle_type: bundleType,
            total_credits: credits,
            used_credits: 0,
            original_price: originalPrice,
            discounted_price: discountedPrice,
            discount_percent: discountPercent,
            payment_intent_id: session.payment_intent as string,
          });

        if (bundleError) {
          console.error('Error creating workshop bundle:', bundleError);
        } else {
          console.log('Successfully created workshop bundle for user:', userId);
        }

        // Send email receipt
        if (userData?.email) {
          const bundleName = bundleType === '3_pack' ? '3 Workshop Bundle' : '5 Workshop Bundle';
          const savings = originalPrice - discountedPrice;
          
          // Reuse token receipt template for now (you can create a custom one later)
          const receipt = createTokenPurchaseReceipt(
            userData.email,
            userData.username,
            credits,
            amount,
            new Date().toISOString()
          );
          
          const { success, error } = await sendEmail(receipt);
          if (success) {
            console.log('Workshop bundle receipt sent to:', userData.email);
          } else {
            console.error('Failed to send workshop bundle receipt:', error);
          }
        }
      }

      if (metadata?.product_type === 'boutique_order') {
        // Handle boutique order payment
        const orderId = metadata.order_id;
        const amount = session.amount_total || 0;

        console.log('Processing boutique order payment for order:', orderId);

        // Get order details
        const { data: orderData } = await supabaseAdmin
          .from('boutique_orders')
          .select(`
            *,
            user_profiles (email, username)
          `)
          .eq('id', orderId)
          .single();

        // Get order items
        const { data: orderItems } = await supabaseAdmin
          .from('boutique_order_items')
          .select('*')
          .eq('order_id', orderId);

        // Update order status to paid
        const { error: updateError } = await supabaseAdmin
          .from('boutique_orders')
          .update({
            status: 'paid',
            payment_intent_id: session.payment_intent as string,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        if (updateError) {
          console.error('Error updating boutique order status:', updateError);
        } else {
          console.log('Successfully marked boutique order as paid:', orderId);
        }

        // Send email receipt
        if (orderData?.user_profiles?.email && orderItems) {
          const receipt = createBoutiqueOrderReceipt(
            orderData.user_profiles.email,
            orderData.user_profiles.username,
            orderItems,
            orderData.shipping_address,
            amount,
            new Date().toISOString()
          );
          
          const { success, error } = await sendEmail(receipt);
          if (success) {
            console.log('Boutique order receipt sent to:', orderData.user_profiles.email);
          } else {
            console.error('Failed to send boutique order receipt:', error);
          }
        }
      }

      if (metadata?.product_type === 'workshop') {
        // Handle workshop booking payment
        const bookingId = metadata.booking_id;
        const classId = metadata.class_id;
        const amount = session.amount_total || 0;

        console.log('Processing workshop payment for booking:', bookingId, 'class:', classId);

        // Get booking and class details
        const { data: bookingData } = await supabaseAdmin
          .from('bookings')
          .select(`
            *,
            class:classes (*),
            user:user_profiles (email, username, push_token)
          `)
          .eq('id', bookingId)
          .single();

        // Update booking status to confirmed
        const { error: updateError } = await supabaseAdmin
          .from('bookings')
          .update({
            status: 'confirmed',
            payment_intent_id: session.payment_intent as string,
          })
          .eq('id', bookingId);

        if (updateError) {
          console.error('Error updating booking status:', updateError);
        } else {
          console.log('Successfully confirmed workshop booking:', bookingId);

          // Increment class participant count
          const { error: classUpdateError } = await supabaseAdmin
            .from('classes')
            .update({
              current_participants: (bookingData?.class?.current_participants || 0) + 1,
            })
            .eq('id', classId);

          if (classUpdateError) {
            console.error('Error updating class participant count:', classUpdateError);
          } else {
            console.log('Successfully incremented participant count for class:', classId);
          }
        }

        // Send email receipt
        if (bookingData?.user?.email && bookingData?.class) {
          const classDate = new Date(bookingData.class.start_time).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
          const classTime = new Date(bookingData.class.start_time).toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
          });

          const receipt = createWorkshopBookingReceipt(
            bookingData.user.email,
            bookingData.user.username,
            bookingData.class.title,
            classDate,
            classTime,
            bookingData.class.location,
            amount,
            new Date().toISOString()
          );
          
          const { success, error } = await sendEmail(receipt);
          if (success) {
            console.log('Workshop receipt sent to:', bookingData.user.email);
          } else {
            console.error('Failed to send workshop receipt:', error);
          }
        }

        // Send push notification for booking confirmation
        if (bookingData?.user?.push_token && bookingData?.class) {
          try {
            const classDate = new Date(bookingData.class.start_time).toLocaleDateString('en', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });
            const classTime = new Date(bookingData.class.start_time).toLocaleTimeString('en', {
              hour: '2-digit',
              minute: '2-digit',
            });

            const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: bookingData.user.push_token,
                sound: 'default',
                title: 'Workshop Booking Confirmed! 🎉',
                body: `You're all set for "${bookingData.class.title}" on ${classDate} at ${classTime}. See you there!`,
                data: {
                  type: 'booking_confirmation',
                  booking_id: bookingId,
                  class_id: classId,
                },
              }),
            });

            if (pushResponse.ok) {
              console.log('Booking confirmation notification sent for booking:', bookingId);
            } else {
              const errorText = await pushResponse.text();
              console.error('Failed to send booking notification:', errorText);
            }
          } catch (pushError) {
            console.error('Error sending booking notification:', pushError);
          }
        }
      }
    }

    // Handle payment_intent.succeeded for Payment Links
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const metadata = paymentIntent.metadata;

      console.log('Payment intent succeeded:', paymentIntent.id, 'Metadata:', metadata);

      if (metadata?.product_type === 'private_lesson') {
        const lessonId = metadata.lesson_id;
        const amount = paymentIntent.amount;

        console.log('Processing private lesson payment via payment intent for lesson:', lessonId);

        // Get lesson details
        const { data: lessonData } = await supabaseAdmin
          .from('private_lessons')
          .select(`
            *,
            user_profiles (email, username)
          `)
          .eq('id', lessonId)
          .single();

        const { error: updateError } = await supabaseAdmin
          .from('private_lessons')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            payment_intent_id: paymentIntent.id,
          })
          .eq('id', lessonId);

        if (updateError) {
          console.error('Error updating private lesson status:', updateError);
        } else {
          console.log('Successfully marked lesson as paid:', lessonId);
        }

        // Send email receipt
        if (lessonData?.user_profiles?.email) {
          const receipt = createPrivateLessonReceipt(
            lessonData.user_profiles.email,
            lessonData.user_profiles.username,
            lessonData.requested_date,
            lessonData.requested_time,
            lessonData.num_participants,
            amount,
            new Date().toISOString()
          );
          
          const { success, error } = await sendEmail(receipt);
          if (success) {
            console.log('Private lesson receipt sent to:', lessonData.user_profiles.email);
          } else {
            console.error('Failed to send private lesson receipt:', error);
          }
        }
      }
    }

    console.log('🎉 Webhook processing completed successfully');
    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('💥 Webhook handler error:', error);
    console.error('💥 Error stack:', error.stack);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
