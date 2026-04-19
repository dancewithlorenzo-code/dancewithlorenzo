import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify admin access
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messageId } = await req.json();

    if (!messageId) {
      return new Response(JSON.stringify({ error: 'Message ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get message details
    const { data: message, error: messageError } = await supabaseClient
      .from('admin_messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      return new Response(JSON.stringify({ error: 'Message not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update status to sending
    await supabaseClient
      .from('admin_messages')
      .update({ status: 'sending' })
      .eq('id', messageId);

    console.log(`Sending admin message to ${message.recipient_emails.length} recipients`);

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Send emails to all recipients
    for (const email of message.recipient_emails) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'Dance with Lorenzo <noreply@dancelorenzo.com>',
            to: [email],
            subject: message.subject,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
                  .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
                  .message { white-space: pre-wrap; margin: 20px 0; }
                  .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0; font-size: 24px;">Dance with Lorenzo</h1>
                  </div>
                  <div class="content">
                    <div class="message">${message.body.replace(/\n/g, '<br>')}</div>
                    <div class="footer">
                      <p>This message was sent by Dance with Lorenzo admin.</p>
                      <p style="margin-top: 10px;">
                        <a href="https://dancelorenzo.com" style="color: #10b981; text-decoration: none;">Visit our website</a>
                      </p>
                    </div>
                  </div>
                </div>
              </body>
              </html>
            `,
          }),
        });

        if (emailResponse.ok) {
          sentCount++;
          console.log(`✓ Email sent to ${email}`);
        } else {
          failedCount++;
          const errorData = await emailResponse.text();
          errors.push(`${email}: ${errorData}`);
          console.error(`✗ Failed to send to ${email}:`, errorData);
        }
      } catch (error) {
        failedCount++;
        errors.push(`${email}: ${error.message}`);
        console.error(`✗ Error sending to ${email}:`, error);
      }
    }

    // Update message status
    const finalStatus = failedCount === 0 ? 'sent' : (sentCount === 0 ? 'failed' : 'sent');
    await supabaseClient
      .from('admin_messages')
      .update({
        status: finalStatus,
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: new Date().toISOString(),
        error_message: errors.length > 0 ? errors.slice(0, 5).join('; ') : null,
      })
      .eq('id', messageId);

    console.log(`Message sent: ${sentCount} successful, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent_count: sentCount,
        failed_count: failedCount,
        errors: errors.slice(0, 5),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Send admin message error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
