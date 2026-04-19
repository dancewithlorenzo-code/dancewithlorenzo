import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface BookingWithDetails {
  id: string;
  user_id: string;
  class_id: string;
  status: string;
  user: {
    push_token: string | null;
    username: string | null;
    email: string;
  };
  class: {
    id: string;
    title: string;
    location: string | null;
    start_time: string;
    class_type: string;
    qr_code: string | null;
  };
}

interface ExpoPushMessage {
  to: string;
  sound: string;
  title: string;
  body: string;
  data: {
    type: string;
    classId: string;
    bookingId: string;
    classTitle: string;
    location: string;
    startTime: string;
    qrCode: string;
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

    // Calculate time range: 23-25 hours from now (to catch classes starting in ~24 hours)
    const now = new Date();
    const reminderStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const reminderEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    console.log(`Checking for classes between ${reminderStart.toISOString()} and ${reminderEnd.toISOString()}`);

    // Get all confirmed bookings for classes starting in 24 hours
    const { data: bookings, error: bookingsError } = await supabaseClient
      .from('bookings')
      .select(`
        id,
        user_id,
        class_id,
        status,
        user:user_profiles!bookings_user_id_fkey(push_token, username, email),
        class:classes!bookings_class_id_fkey(id, title, location, start_time, class_type, qr_code)
      `)
      .eq('status', 'confirmed')
      .gte('classes.start_time', reminderStart.toISOString())
      .lte('classes.start_time', reminderEnd.toISOString());

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      throw bookingsError;
    }

    if (!bookings || bookings.length === 0) {
      console.log('No bookings found for the next 24 hours');
      return new Response(
        JSON.stringify({ message: 'No reminders to send', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${bookings.length} bookings to notify`);

    // Check which notifications have already been sent
    const bookingIds = bookings.map((b: any) => b.id);
    const { data: sentLogs } = await supabaseClient
      .from('notification_logs')
      .select('booking_id')
      .in('booking_id', bookingIds)
      .eq('notification_type', 'class_reminder');

    const alreadySent = new Set((sentLogs || []).map((log: any) => log.booking_id));

    // Filter out bookings that already have notifications sent
    const bookingsToNotify = (bookings as BookingWithDetails[]).filter(
      (booking) => !alreadySent.has(booking.id) && booking.user.push_token
    );

    console.log(`${bookingsToNotify.length} bookings need notifications (${bookings.length - bookingsToNotify.length} already sent or no push token)`);

    if (bookingsToNotify.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All reminders already sent', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Prepare push notification messages
    const messages: ExpoPushMessage[] = bookingsToNotify.map((booking) => {
      const startTime = new Date(booking.class.start_time);
      const formattedTime = startTime.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      return {
        to: booking.user.push_token!,
        sound: 'default',
        title: `Class Reminder: ${booking.class.title}`,
        body: `Your class starts tomorrow at ${formattedTime}. Location: ${booking.class.location || booking.class.class_type}. Don't forget to check in!`,
        data: {
          type: 'class_reminder',
          classId: booking.class.id,
          bookingId: booking.id,
          classTitle: booking.class.title,
          location: booking.class.location || booking.class.class_type,
          startTime: booking.class.start_time,
          qrCode: booking.class.qr_code || '',
        },
      };
    });

    // Send push notifications via Expo Push Notification service
    const chunkSize = 100; // Expo allows up to 100 notifications per request
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
          const booking = bookingsToNotify[successCount + errorCount + i];
          const ticketData = result.data?.[i];
          const success = ticketData?.status === 'ok';

          await supabaseClient.from('notification_logs').insert({
            user_id: booking.user_id,
            booking_id: booking.id,
            notification_type: 'class_reminder',
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

    console.log(`Sent ${successCount} notifications, ${errorCount} failed`);

    return new Response(
      JSON.stringify({
        message: 'Class reminders processed',
        sent: successCount,
        failed: errorCount,
        total: messages.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in send-class-reminders function:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
