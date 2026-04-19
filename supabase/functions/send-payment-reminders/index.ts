import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface PendingPayment {
  id: string;
  type: 'bundle' | 'private_lesson' | 'workshop' | 'music';
  user_id: string;
  amount: number;
  description: string;
  created_at: string;
  user: {
    push_token: string | null;
    username: string | null;
    email: string;
    language: string;
  };
}

interface ExpoPushMessage {
  to: string;
  sound: string;
  title: string;
  body: string;
  data: {
    type: string;
    paymentId: string;
    paymentType: string;
    amount: number;
    deepLink: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting payment reminder check...');

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const allPendingPayments: PendingPayment[] = [];

    // 1. Workshop Bundles (no payment_intent_id = manual payment pending)
    const { data: bundles } = await supabaseClient
      .from('workshop_bundles')
      .select(`
        id,
        user_id,
        bundle_type,
        discounted_price,
        created_at,
        user:user_profiles!workshop_bundles_user_id_fkey(push_token, username, email, language)
      `)
      .is('payment_intent_id', null)
      .lte('created_at', threeDaysAgo.toISOString());

    if (bundles) {
      bundles.forEach((bundle: any) => {
        allPendingPayments.push({
          id: bundle.id,
          type: 'bundle',
          user_id: bundle.user_id,
          amount: bundle.discounted_price,
          description: `${bundle.bundle_type} Workshop Bundle`,
          created_at: bundle.created_at,
          user: bundle.user,
        });
      });
    }

    // 2. Private Lessons (approved status = awaiting payment)
    const { data: lessons } = await supabaseClient
      .from('private_lessons')
      .select(`
        id,
        user_id,
        requested_date,
        requested_time,
        num_participants,
        total_price,
        created_at,
        user:user_profiles!private_lessons_user_id_fkey(push_token, username, email, language)
      `)
      .eq('status', 'approved')
      .lte('created_at', threeDaysAgo.toISOString());

    if (lessons) {
      lessons.forEach((lesson: any) => {
        allPendingPayments.push({
          id: lesson.id,
          type: 'private_lesson',
          user_id: lesson.user_id,
          amount: lesson.total_price,
          description: `Private Lesson - ${lesson.requested_date} at ${lesson.requested_time}`,
          created_at: lesson.created_at,
          user: lesson.user,
        });
      });
    }

    // 3. Workshop Bookings (pending_payment status)
    const { data: bookings } = await supabaseClient
      .from('bookings')
      .select(`
        id,
        user_id,
        payment_amount,
        created_at,
        user:user_profiles!bookings_user_id_fkey(push_token, username, email, language),
        class:classes!bookings_class_id_fkey(title, start_time)
      `)
      .eq('status', 'pending_payment')
      .lte('created_at', threeDaysAgo.toISOString());

    if (bookings) {
      bookings.forEach((booking: any) => {
        const classDate = new Date(booking.class.start_time).toLocaleDateString('ja-JP');
        allPendingPayments.push({
          id: booking.id,
          type: 'workshop',
          user_id: booking.user_id,
          amount: booking.payment_amount,
          description: `${booking.class.title} - ${classDate}`,
          created_at: booking.created_at,
          user: booking.user,
        });
      });
    }

    // 4. Music Purchases (pending payment status)
    const { data: musicPurchases } = await supabaseClient
      .from('music_purchases')
      .select(`
        id,
        user_id,
        purchase_price,
        created_at,
        user:user_profiles!music_purchases_user_id_fkey(push_token, username, email, language),
        product:music_products!music_purchases_product_id_fkey(title, product_type)
      `)
      .eq('payment_status', 'pending')
      .lte('created_at', threeDaysAgo.toISOString());

    if (musicPurchases) {
      musicPurchases.forEach((purchase: any) => {
        allPendingPayments.push({
          id: purchase.id,
          type: 'music',
          user_id: purchase.user_id,
          amount: purchase.purchase_price,
          description: `${purchase.product.product_type.toUpperCase()}: ${purchase.product.title}`,
          created_at: purchase.created_at,
          user: purchase.user,
        });
      });
    }

    console.log(`Found ${allPendingPayments.length} pending payments`);

    if (allPendingPayments.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending payments found', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check which reminders have already been sent
    const paymentsToRemind: Array<{ payment: PendingPayment; reminderDay: 3 | 7 }> = [];

    for (const payment of allPendingPayments) {
      if (!payment.user.push_token) continue;

      const createdAt = new Date(payment.created_at);
      const daysOld = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      // Check if 3-day reminder should be sent
      if (daysOld >= 3 && daysOld < 7) {
        const { data: existingReminder } = await supabaseClient
          .from('payment_reminder_logs')
          .select('id')
          .eq('payment_id', payment.id)
          .eq('payment_type', payment.type)
          .eq('reminder_day', 3)
          .single();

        if (!existingReminder) {
          paymentsToRemind.push({ payment, reminderDay: 3 });
        }
      }

      // Check if 7-day reminder should be sent
      if (daysOld >= 7) {
        const { data: existingReminder } = await supabaseClient
          .from('payment_reminder_logs')
          .select('id')
          .eq('payment_id', payment.id)
          .eq('payment_type', payment.type)
          .eq('reminder_day', 7)
          .single();

        if (!existingReminder) {
          paymentsToRemind.push({ payment, reminderDay: 7 });
        }
      }
    }

    console.log(`${paymentsToRemind.length} reminders to send`);

    if (paymentsToRemind.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All reminders already sent', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Bank transfer details
    const bankDetails = {
      en: '🏦 Bank Transfer Details:\nBank: [Your Bank Name]\nAccount: [Account Number]\nName: Lorenzo\n\n💴 Or pay cash at class',
      ja: '🏦 銀行振込詳細:\n銀行: [銀行名]\n口座: [口座番号]\n名義: Lorenzo\n\n💴 またはクラスで現金払い',
    };

    // Prepare push notification messages
    const messages: ExpoPushMessage[] = paymentsToRemind.map(({ payment, reminderDay }) => {
      const isJapanese = payment.user.language === 'ja';
      
      const title = isJapanese 
        ? `💳 お支払いのリマインダー (${reminderDay}日経過)`
        : `💳 Payment Reminder (${reminderDay} days)`;

      const bodyLines = [
        isJapanese 
          ? `未払い: ¥${payment.amount.toLocaleString()}`
          : `Outstanding payment: ¥${payment.amount.toLocaleString()}`,
        payment.description,
        '',
        bankDetails[isJapanese ? 'ja' : 'en'],
        '',
        isJapanese
          ? 'ご質問はロレンゾまでご連絡ください'
          : 'Contact Lorenzo with any questions',
      ];

      return {
        to: payment.user.push_token!,
        sound: 'default',
        title,
        body: bodyLines.join('\n'),
        data: {
          type: 'payment_reminder',
          paymentId: payment.id,
          paymentType: payment.type,
          amount: payment.amount,
          deepLink: '/profile', // Deep link to profile where they can contact Lorenzo
        },
      };
    });

    // Send push notifications via Expo
    const chunkSize = 100;
    const chunks = [];
    for (let i = 0; i < messages.length; i += chunkSize) {
      chunks.push(messages.slice(i, i + chunkSize));
    }

    let successCount = 0;
    let errorCount = 0;

    for (const chunk of chunks) {
      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(chunk),
        });

        const result = await response.json();
        console.log('Expo push result:', result);

        // Log each notification
        for (let i = 0; i < chunk.length; i++) {
          const { payment, reminderDay } = paymentsToRemind[successCount + errorCount + i];
          const ticketData = result.data?.[i];
          const success = ticketData?.status === 'ok';

          await supabaseClient.from('payment_reminder_logs').insert({
            payment_id: payment.id,
            payment_type: payment.type,
            reminder_day: reminderDay,
            user_id: payment.user_id,
            success,
            error_message: success ? null : (ticketData?.message || 'Unknown error'),
          });

          if (success) {
            successCount++;
          } else {
            errorCount++;
          }
        }
      } catch (err) {
        console.error('Error sending push notifications chunk:', err);
        errorCount += chunk.length;
      }
    }

    console.log(`Sent ${successCount} reminders, ${errorCount} failed`);

    return new Response(
      JSON.stringify({
        message: 'Payment reminders processed',
        sent: successCount,
        failed: errorCount,
        total: messages.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in send-payment-reminders function:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
