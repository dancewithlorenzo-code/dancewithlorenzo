import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { sendExpirationEmail, sendReminderEmail } from '../_shared/email.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting credit request expiration check...');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    // Step 1: Find and expire overdue requests
    const { data: expiredRequests, error: expiredError } = await supabaseAdmin
      .from('credit_requests')
      .select(`
        *,
        requester:requester_id(email, username),
        recipient:recipient_id(email, username)
      `)
      .eq('status', 'pending')
      .lt('expires_at', now.toISOString());

    if (expiredError) {
      console.error('Error fetching expired requests:', expiredError);
    } else if (expiredRequests && expiredRequests.length > 0) {
      console.log(`Found ${expiredRequests.length} expired requests`);

      for (const request of expiredRequests) {
        // Update status to expired
        const { error: updateError } = await supabaseAdmin
          .from('credit_requests')
          .update({
            status: 'expired',
            expired_at: now.toISOString(),
          })
          .eq('id', request.id);

        if (updateError) {
          console.error(`Error expiring request ${request.id}:`, updateError);
          continue;
        }

        // Send expiration emails
        const requesterEmail = request.requester?.email;
        const recipientEmail = request.recipient?.email;
        const requesterName = request.requester?.username || 'User';
        const recipientName = request.recipient?.username || 'User';

        if (requesterEmail) {
          await sendExpirationEmail(
            requesterEmail,
            requesterName,
            recipientName,
            request.credits_requested,
            'requester'
          );
        }

        if (recipientEmail) {
          await sendExpirationEmail(
            recipientEmail,
            recipientName,
            requesterName,
            request.credits_requested,
            'recipient'
          );
        }

        console.log(`Expired request ${request.id} and sent notifications`);
      }
    }

    // Step 2: Send 1-day reminders
    const { data: oneDayReminders, error: oneDayError } = await supabaseAdmin
      .from('credit_requests')
      .select(`
        *,
        requester:requester_id(email, username),
        recipient:recipient_id(email, username)
      `)
      .eq('status', 'pending')
      .lt('expires_at', oneDayFromNow.toISOString())
      .gt('expires_at', now.toISOString())
      .or('last_reminder_sent.is.null,last_reminder_sent.lt.' + new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString());

    if (oneDayError) {
      console.error('Error fetching 1-day reminders:', oneDayError);
    } else if (oneDayReminders && oneDayReminders.length > 0) {
      console.log(`Found ${oneDayReminders.length} requests needing 1-day reminder`);

      for (const request of oneDayReminders) {
        const expiresAt = new Date(request.expires_at);
        const hoursRemaining = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));

        // Only send if less than 30 hours remaining
        if (hoursRemaining > 30) continue;

        const recipientEmail = request.recipient?.email;
        const requesterName = request.requester?.username || 'User';
        const recipientName = request.recipient?.username || 'User';

        if (recipientEmail) {
          await sendReminderEmail(
            recipientEmail,
            recipientName,
            requesterName,
            request.credits_requested,
            hoursRemaining,
            request.request_message
          );

          // Update last_reminder_sent
          await supabaseAdmin
            .from('credit_requests')
            .update({ last_reminder_sent: now.toISOString() })
            .eq('id', request.id);

          console.log(`Sent 1-day reminder for request ${request.id}`);
        }
      }
    }

    // Step 3: Send 5-day reminders
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    const { data: fiveDayReminders, error: fiveDayError } = await supabaseAdmin
      .from('credit_requests')
      .select(`
        *,
        requester:requester_id(email, username),
        recipient:recipient_id(email, username)
      `)
      .eq('status', 'pending')
      .lt('created_at', twoDaysAgo.toISOString())
      .or('last_reminder_sent.is.null');

    if (fiveDayError) {
      console.error('Error fetching 5-day reminders:', fiveDayError);
    } else if (fiveDayReminders && fiveDayReminders.length > 0) {
      console.log(`Found ${fiveDayReminders.length} requests needing 5-day reminder`);

      for (const request of fiveDayReminders) {
        const expiresAt = new Date(request.expires_at);
        const hoursRemaining = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));

        // Only send if between 2-5 days remaining (48-120 hours)
        if (hoursRemaining > 120 || hoursRemaining < 48) continue;

        // Skip if reminder already sent
        if (request.last_reminder_sent) continue;

        const recipientEmail = request.recipient?.email;
        const requesterName = request.requester?.username || 'User';
        const recipientName = request.recipient?.username || 'User';

        if (recipientEmail) {
          await sendReminderEmail(
            recipientEmail,
            recipientName,
            requesterName,
            request.credits_requested,
            hoursRemaining,
            request.request_message
          );

          // Update last_reminder_sent
          await supabaseAdmin
            .from('credit_requests')
            .update({ last_reminder_sent: now.toISOString() })
            .eq('id', request.id);

          console.log(`Sent 5-day reminder for request ${request.id}`);
        }
      }
    }

    console.log('Credit request expiration check completed');

    return new Response(
      JSON.stringify({
        success: true,
        expired: expiredRequests?.length || 0,
        oneDayReminders: oneDayReminders?.length || 0,
        fiveDayReminders: fiveDayReminders?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Error in check-expired-requests:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
