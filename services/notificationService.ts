import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getSupabaseClient } from '@/template';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type: 'class_reminder' | 'private_lesson_approved' | 'private_lesson_rejected' | 'booking_confirmation' | 'credit_request_received' | 'credit_request_approved' | 'credit_request_rejected' | 'payment_reminder';
  classId?: string;
  bookingId?: string;
  lessonId?: string;
  classTitle?: string;
  location?: string;
  startTime?: string;
  qrCode?: string;
  paymentUrl?: string;
  creditRequestId?: string;
  requesterName?: string;
  creditsRequested?: number;
  deepLink?: string;
  paymentId?: string;
  paymentType?: string;
  amount?: number;
}

export const notificationService = {
  /**
   * Request notification permissions and get push token
   */
  async registerForPushNotifications(): Promise<{ token: string | null; error: string | null }> {
    try {
      // Check if running on a physical device
      if (!Device.isDevice) {
        return { token: null, error: 'Push notifications only work on physical devices' };
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return { token: null, error: 'Permission not granted for push notifications' };
      }

      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id', // This will be auto-configured by Expo
      });

      const token = tokenData.data;

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Class Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B9D',
        });
      }

      return { token, error: null };
    } catch (err) {
      console.error('Error registering for push notifications:', err);
      return { token: null, error: String(err) };
    }
  },

  /**
   * Save push token to user profile
   */
  async savePushToken(userId: string, token: string): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ push_token: token })
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },

  /**
   * Remove push token from user profile (e.g., on logout)
   */
  async removePushToken(userId: string): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ push_token: null })
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },

  /**
   * Set up notification listeners
   */
  setupNotificationListeners() {
    // Handle notification received while app is in foreground
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Handle notification tapped/opened
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      const data = response.notification.request.content.data as NotificationData;
      
      // You can navigate to specific screen based on notification data
      // Example: navigation.navigate('ClassDetails', { classId: data.classId });
    });

    return {
      notificationListener,
      responseListener,
    };
  },

  /**
   * Remove notification listeners on cleanup
   */
  removeNotificationListeners(listeners: {
    notificationListener: Notifications.Subscription;
    responseListener: Notifications.Subscription;
  }) {
    Notifications.removeNotificationSubscription(listeners.notificationListener);
    Notifications.removeNotificationSubscription(listeners.responseListener);
  },

  /**
   * Schedule a local notification (for testing)
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data: NotificationData,
    triggerSeconds: number = 5
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: {
          seconds: triggerSeconds,
        },
      });

      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },

  /**
   * Get notification permission status
   */
  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  },

  /**
   * Get notification history for a user
   */
  async getNotificationHistory(userId: string): Promise<{
    data: NotificationLog[] | null;
    error: string | null;
  }> {
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('notification_logs')
        .select(`
          *,
          booking:bookings!notification_logs_booking_id_fkey(
            id,
            class:classes!bookings_class_id_fkey(
              id,
              title,
              start_time,
              location,
              class_type
            )
          )
        `)
        .eq('user_id', userId)
        .order('sent_at', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data as NotificationLog[], error: null };
    } catch (err) {
      console.error('Error fetching notification history:', err);
      return { data: null, error: String(err) };
    }
  },

  /**
   * Resend a failed notification
   */
  async resendNotification(
    userId: string,
    bookingId: string,
    classTitle: string,
    classLocation: string,
    startTime: string,
    qrCode: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // Get user's push token
      const supabase = getSupabaseClient();
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('push_token')
        .eq('id', userId)
        .single();

      if (userError || !userData?.push_token) {
        return { success: false, error: 'Push token not found. Please enable notifications first.' };
      }

      // Format notification message
      const startDate = new Date(startTime);
      const formattedTime = startDate.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Send push notification via Expo
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          to: userData.push_token,
          sound: 'default',
          title: `Class Reminder: ${classTitle}`,
          body: `Your class starts at ${formattedTime}. Location: ${classLocation}. Don't forget to check in!`,
          data: {
            type: 'class_reminder',
            classId: '',
            bookingId: bookingId,
            classTitle: classTitle,
            location: classLocation,
            startTime: startTime,
            qrCode: qrCode,
          },
        }),
      });

      const result = await response.json();
      const success = result.data?.[0]?.status === 'ok';

      // Log the resend attempt
      await supabase.from('notification_logs').insert({
        user_id: userId,
        booking_id: bookingId,
        notification_type: 'class_reminder',
        success: success,
        error_message: success ? null : (result.data?.[0]?.message || 'Unknown error'),
      });

      if (!success) {
        return { success: false, error: result.data?.[0]?.message || 'Failed to send notification' };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Error resending notification:', err);
      return { success: false, error: String(err) };
    }
  },

  /**
   * Send private lesson approval notification with payment link
   */
  async sendPrivateLessonApprovalNotification(
    userId: string,
    lessonId: string,
    lessonDetails: {
      requestedDate: string;
      requestedTime: string;
      numParticipants: number;
      totalPrice: number;
    },
    paymentUrl?: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // Get user's push token
      const supabase = getSupabaseClient();
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('push_token, email')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        return { success: false, error: userError.message };
      }

      if (!userData?.push_token) {
        console.log('No push token found for user');
        return { success: false, error: 'Push token not found' };
      }

      // Format message
      const lessonDate = new Date(`${lessonDetails.requestedDate}T${lessonDetails.requestedTime}`);
      const formattedDateTime = lessonDate.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const bodyMessage = paymentUrl
        ? `Your private lesson request for ${formattedDateTime} has been approved! Tap to complete payment (¥${lessonDetails.totalPrice.toLocaleString()}).`
        : `Your private lesson request for ${formattedDateTime} has been approved! Lorenzo will contact you soon.`;

      // Send push notification via Expo
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          to: userData.push_token,
          sound: 'default',
          title: '🎉 Private Lesson Approved!',
          body: bodyMessage,
          data: {
            type: 'private_lesson_approved',
            lessonId: lessonId,
            paymentUrl: paymentUrl || '',
            startTime: lessonDate.toISOString(),
          },
        }),
      });

      const result = await response.json();
      const success = result.data?.[0]?.status === 'ok';

      // Log notification attempt (we'll use booking_id as null for private lessons)
      await supabase.from('notification_logs').insert({
        user_id: userId,
        booking_id: lessonId, // Using lesson ID in booking_id field
        notification_type: 'private_lesson_approved',
        success: success,
        error_message: success ? null : (result.data?.[0]?.message || 'Unknown error'),
      });

      if (!success) {
        console.error('Notification send failed:', result.data?.[0]?.message);
        return { success: false, error: result.data?.[0]?.message || 'Failed to send notification' };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Error sending approval notification:', err);
      return { success: false, error: String(err) };
    }
  },

  /**
   * Send booking confirmation notification
   */
  async sendBookingConfirmationNotification(
    userId: string,
    bookingId: string,
    classDetails: {
      classId: string;
      title: string;
      startTime: string;
      location: string | null;
      classType: string;
      qrCode: string | null;
      paymentMethod: 'token' | 'stripe';
      paymentAmount: number;
    }
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // Get user's push token
      const supabase = getSupabaseClient();
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('push_token, email, username')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        return { success: false, error: userError.message };
      }

      if (!userData?.push_token) {
        console.log('No push token found for user');
        return { success: false, error: 'Push token not found' };
      }

      // Format message
      const startDate = new Date(classDetails.startTime);
      const formattedDate = startDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      const formattedTime = startDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const paymentInfo = classDetails.paymentMethod === 'token' 
        ? '1 token' 
        : `¥${classDetails.paymentAmount.toLocaleString()}`;

      const locationInfo = classDetails.location || classDetails.classType;

      const bodyMessage = `Your booking is confirmed for ${formattedDate} at ${formattedTime}. Location: ${locationInfo}. ${classDetails.qrCode ? 'Use QR check-in when you arrive!' : 'See you there!'}`;

      // Send push notification via Expo
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          to: userData.push_token,
          sound: 'default',
          title: `🎉 Booking Confirmed: ${classDetails.title}`,
          body: bodyMessage,
          data: {
            type: 'booking_confirmation',
            classId: classDetails.classId,
            bookingId: bookingId,
            classTitle: classDetails.title,
            location: locationInfo,
            startTime: classDetails.startTime,
            qrCode: classDetails.qrCode || '',
          },
        }),
      });

      const result = await response.json();
      const success = result.data?.[0]?.status === 'ok';

      // Log notification attempt
      await supabase.from('notification_logs').insert({
        user_id: userId,
        booking_id: bookingId,
        notification_type: 'booking_confirmation',
        success: success,
        error_message: success ? null : (result.data?.[0]?.message || 'Unknown error'),
      });

      if (!success) {
        console.error('Notification send failed:', result.data?.[0]?.message);
        return { success: false, error: result.data?.[0]?.message || 'Failed to send notification' };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Error sending booking confirmation:', err);
      return { success: false, error: String(err) };
    }
  },

  /**
   * Send private lesson rejection notification
   */
  async sendPrivateLessonRejectionNotification(
    userId: string,
    lessonId: string,
    lessonDetails: {
      requestedDate: string;
      requestedTime: string;
    }
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // Get user's push token
      const supabase = getSupabaseClient();
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('push_token, email')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        return { success: false, error: userError.message };
      }

      if (!userData?.push_token) {
        console.log('No push token found for user');
        return { success: false, error: 'Push token not found' };
      }

      // Format message
      const lessonDate = new Date(`${lessonDetails.requestedDate}T${lessonDetails.requestedTime}`);
      const formattedDateTime = lessonDate.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Send push notification via Expo
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          to: userData.push_token,
          sound: 'default',
          title: 'Private Lesson Request Update',
          body: `Unfortunately, your private lesson request for ${formattedDateTime} could not be accommodated. Please try a different date or contact Lorenzo.`,
          data: {
            type: 'private_lesson_rejected',
            lessonId: lessonId,
          },
        }),
      });

      const result = await response.json();
      const success = result.data?.[0]?.status === 'ok';

      // Log notification attempt
      await supabase.from('notification_logs').insert({
        user_id: userId,
        booking_id: lessonId, // Using lesson ID in booking_id field
        notification_type: 'private_lesson_rejected',
        success: success,
        error_message: success ? null : (result.data?.[0]?.message || 'Unknown error'),
      });

      if (!success) {
        console.error('Notification send failed:', result.data?.[0]?.message);
        return { success: false, error: result.data?.[0]?.message || 'Failed to send notification' };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Error sending rejection notification:', err);
      return { success: false, error: String(err) };
    }
  },

  /**
   * Send credit request received notification
   */
  async sendCreditRequestReceivedNotification(
    recipientUserId: string,
    requestId: string,
    requesterName: string,
    creditsRequested: number,
    requestMessage?: string | null
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // Get recipient's push token
      const supabase = getSupabaseClient();
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('push_token, username')
        .eq('id', recipientUserId)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        return { success: false, error: userError.message };
      }

      if (!userData?.push_token) {
        console.log('No push token found for recipient');
        return { success: false, error: 'Push token not found' };
      }

      // Format message
      const bodyMessage = requestMessage
        ? `${requesterName} is requesting ${creditsRequested} workshop credits. Message: "${requestMessage}"`
        : `${requesterName} is requesting ${creditsRequested} workshop credits. Tap to respond.`;

      // Send push notification via Expo
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          to: userData.push_token,
          sound: 'default',
          title: `💌 New Credit Request`,
          body: bodyMessage,
          data: {
            type: 'credit_request_received',
            creditRequestId: requestId,
            requesterName: requesterName,
            creditsRequested: creditsRequested,
            deepLink: '/credit-requests',
          },
          badge: 1,
        }),
      });

      const result = await response.json();
      const success = result.data?.[0]?.status === 'ok';

      if (!success) {
        console.error('Notification send failed:', result.data?.[0]?.message);
        return { success: false, error: result.data?.[0]?.message || 'Failed to send notification' };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Error sending credit request notification:', err);
      return { success: false, error: String(err) };
    }
  },

  /**
   * Send credit request approved notification
   */
  async sendCreditRequestApprovedNotification(
    requesterUserId: string,
    requestId: string,
    recipientName: string,
    creditsApproved: number
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // Get requester's push token
      const supabase = getSupabaseClient();
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('push_token, username')
        .eq('id', requesterUserId)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        return { success: false, error: userError.message };
      }

      if (!userData?.push_token) {
        console.log('No push token found for requester');
        return { success: false, error: 'Push token not found' };
      }

      const bodyMessage = `${recipientName} approved your request for ${creditsApproved} workshop credits! The credits have been transferred to your account.`;

      // Send push notification via Expo
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          to: userData.push_token,
          sound: 'default',
          title: `🎉 Credit Request Approved!`,
          body: bodyMessage,
          data: {
            type: 'credit_request_approved',
            creditRequestId: requestId,
            requesterName: recipientName,
            creditsRequested: creditsApproved,
            deepLink: '/credit-requests',
          },
        }),
      });

      const result = await response.json();
      const success = result.data?.[0]?.status === 'ok';

      if (!success) {
        console.error('Notification send failed:', result.data?.[0]?.message);
        return { success: false, error: result.data?.[0]?.message || 'Failed to send notification' };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Error sending credit approval notification:', err);
      return { success: false, error: String(err) };
    }
  },

  /**
   * Send credit request rejected notification
   */
  async sendCreditRequestRejectedNotification(
    requesterUserId: string,
    requestId: string,
    recipientName: string,
    creditsRequested: number
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // Get requester's push token
      const supabase = getSupabaseClient();
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('push_token, username')
        .eq('id', requesterUserId)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        return { success: false, error: userError.message };
      }

      if (!userData?.push_token) {
        console.log('No push token found for requester');
        return { success: false, error: 'Push token not found' };
      }

      const bodyMessage = `${recipientName} declined your request for ${creditsRequested} workshop credits. You can try requesting again or purchase a bundle.`;

      // Send push notification via Expo
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          to: userData.push_token,
          sound: 'default',
          title: `Credit Request Declined`,
          body: bodyMessage,
          data: {
            type: 'credit_request_rejected',
            creditRequestId: requestId,
            requesterName: recipientName,
            creditsRequested: creditsRequested,
            deepLink: '/credit-requests',
          },
        }),
      });

      const result = await response.json();
      const success = result.data?.[0]?.status === 'ok';

      if (!success) {
        console.error('Notification send failed:', result.data?.[0]?.message);
        return { success: false, error: result.data?.[0]?.message || 'Failed to send notification' };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Error sending credit rejection notification:', err);
      return { success: false, error: String(err) };
    }
  },
};

export interface NotificationLog {
  id: string;
  user_id: string;
  booking_id: string;
  notification_type: string;
  sent_at: string;
  success: boolean;
  error_message: string | null;
  booking: {
    id: string;
    class: {
      id: string;
      title: string;
      start_time: string;
      location: string | null;
      class_type: string;
    };
  };
}
