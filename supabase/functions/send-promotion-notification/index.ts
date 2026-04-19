import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface ExpoPushMessage {
  to: string[];
  title: string;
  body: string;
  data?: any;
  sound?: string;
  priority?: 'default' | 'normal' | 'high';
}

async function sendExpoPushNotifications(messages: ExpoPushMessage[]): Promise<{ success: number; failed: number }> {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Expo push notification error:', errorText);
      return { success: 0, failed: messages.reduce((sum, m) => sum + m.to.length, 0) };
    }

    const result = await response.json();
    console.log('Expo push result:', result);

    const successCount = result.data?.filter((r: any) => r.status === 'ok').length || 0;
    const failedCount = result.data?.length - successCount || 0;

    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error('Error sending Expo push notifications:', error);
    return { success: 0, failed: messages.reduce((sum, m) => sum + m.to.length, 0) };
  }
}

function getTimeRemaining(endDate: string): { days: number; hours: number; minutes: number } {
  const now = new Date().getTime();
  const end = new Date(endDate).getTime();
  const difference = end - now;

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0 };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { promotionId } = await req.json();

    if (!promotionId) {
      throw new Error('promotionId is required');
    }

    console.log('Sending promotion notification for:', promotionId);

    // Fetch promotion details
    const { data: promotion, error: promoError } = await supabase
      .from('flash_promotions')
      .select('*')
      .eq('id', promotionId)
      .single();

    if (promoError) throw new Error(`Failed to fetch promotion: ${promoError.message}`);
    if (!promotion) throw new Error('Promotion not found');

    // Check if promotion is active
    const now = new Date();
    const startDate = new Date(promotion.start_date);
    const endDate = new Date(promotion.end_date);

    if (now < startDate) {
      throw new Error('Promotion has not started yet');
    }

    if (now > endDate) {
      throw new Error('Promotion has already ended');
    }

    // Calculate time remaining
    const timeRemaining = getTimeRemaining(promotion.end_date);
    
    let countdownText = '';
    if (timeRemaining.days > 0) {
      countdownText = `${timeRemaining.days}d ${timeRemaining.hours}h remaining`;
    } else if (timeRemaining.hours > 0) {
      countdownText = `${timeRemaining.hours}h ${timeRemaining.minutes}m remaining`;
    } else {
      countdownText = `${timeRemaining.minutes}m remaining`;
    }

    // Fetch all users with push tokens
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, push_token')
      .not('push_token', 'is', null);

    if (usersError) throw new Error(`Failed to fetch users: ${usersError.message}`);
    if (!users || users.length === 0) {
      console.log('No users with push tokens found');
      return new Response(
        JSON.stringify({ 
          success: true,
          sent: 0,
          message: 'No users to notify',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter users based on their notification preferences
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('user_id, enable_class_promotions, enable_product_promotions, enable_bundle_promotions, enable_general_promotions');

    const preferencesMap = new Map(preferences?.map(p => [p.user_id, p]) || []);

    const filteredUsers = users.filter(user => {
      const userPrefs = preferencesMap.get(user.id);
      
      // If no preferences set, default to sending (opt-in by default)
      if (!userPrefs) return true;

      // Check if user wants this promotion type
      switch (promotion.promotion_type) {
        case 'class':
          return userPrefs.enable_class_promotions;
        case 'product':
          return userPrefs.enable_product_promotions;
        case 'bundle':
          return userPrefs.enable_bundle_promotions;
        case 'general':
          return userPrefs.enable_general_promotions;
        default:
          return true;
      }
    });

    if (filteredUsers.length === 0) {
      console.log('No users opted-in for this promotion type');
      return new Response(
        JSON.stringify({ 
          success: true,
          sent: 0,
          message: 'No users opted-in for this promotion type',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pushTokens = filteredUsers.map(u => u.push_token).filter(Boolean);
    console.log(`Found ${pushTokens.length} push tokens (filtered by preferences from ${users.length} total)`);

    // Determine action URL based on promotion type
    let actionUrl = '/auth'; // Default
    if (promotion.action_url) {
      actionUrl = promotion.action_url;
    } else {
      switch (promotion.promotion_type) {
        case 'class':
          actionUrl = '/(tabs)/classes';
          break;
        case 'product':
          actionUrl = '/boutique';
          break;
        case 'bundle':
          actionUrl = '/(tabs)/tokens';
          break;
        default:
          actionUrl = '/auth';
      }
    }

    // Create push notification message
    const notificationTitle = `🔥 ${promotion.title}`;
    const notificationBody = `${promotion.message}\n⏰ ${countdownText}`;

    // Batch push tokens (max 100 per request)
    const batchSize = 100;
    const batches = [];
    for (let i = 0; i < pushTokens.length; i += batchSize) {
      batches.push(pushTokens.slice(i, i + batchSize));
    }

    let totalSuccess = 0;
    let totalFailed = 0;

    for (const batch of batches) {
      const message: ExpoPushMessage = {
        to: batch,
        title: notificationTitle,
        body: notificationBody,
        data: {
          promotionId: promotion.id,
          type: 'flash_promotion',
          actionUrl,
          endDate: promotion.end_date,
        },
        sound: 'default',
        priority: 'high',
      };

      const { success, failed } = await sendExpoPushNotifications([message]);
      totalSuccess += success;
      totalFailed += failed;

      // Small delay between batches to avoid rate limiting
      if (batches.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Promotion notification sent: ${totalSuccess} success, ${totalFailed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        sent: totalSuccess,
        failed: totalFailed,
        promotion: {
          id: promotion.id,
          title: promotion.title,
          countdown: countdownText,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-promotion-notification:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
