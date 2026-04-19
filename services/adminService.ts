import { getSupabaseClient } from '@/template';
import { stripeService } from './stripeService';

export interface StudentWithTokens {
  id: string;
  email: string;
  username: string | null;
  language: string;
  tokens: {
    total_tokens: number;
    used_tokens: number;
    remaining_tokens: number;
  } | null;
}

export interface PrivateLessonRequest {
  id: string;
  user_id: string;
  requested_date: string;
  requested_time: string;
  num_participants: number;
  total_price: number;
  status: string;
  notes: string | null;
  created_at: string;
  user: {
    email: string;
    username: string | null;
  };
}

export interface RevenueAnalytics {
  total_revenue: number;
  token_revenue: number;
  private_lesson_revenue: number;
  total_students: number;
  total_tokens_sold: number;
  total_classes: number;
  pending_requests: number;
}

export interface PendingPayment {
  id: string;
  type: 'bundle' | 'private_lesson' | 'workshop' | 'music';
  user: {
    email: string;
    username: string | null;
  };
  amount: number;
  description: string;
  created_at: string;
}

export const adminService = {
  // Check if user is admin
  async checkIsAdmin(userId: string): Promise<{ isAdmin: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return { isAdmin: data?.is_admin || false, error: null };
    } catch (err) {
      return { isAdmin: false, error: String(err) };
    }
  },

  // Get all students with token balances
  async getAllStudents(): Promise<{ data: StudentWithTokens[] | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, email, username, language')
        .eq('is_admin', false)
        .order('email');

      if (usersError) throw usersError;

      // Get token balances for each user
      const studentsWithTokens = await Promise.all(
        (users || []).map(async (user) => {
          const { data: tokenData } = await supabase
            .from('tokens')
            .select('total_tokens, used_tokens, remaining_tokens')
            .eq('user_id', user.id)
            .single();

          return {
            ...user,
            tokens: tokenData || { total_tokens: 0, used_tokens: 0, remaining_tokens: 0 },
          };
        })
      );

      return { data: studentsWithTokens, error: null };
    } catch (err) {
      return { data: null, error: String(err) };
    }
  },

  // Get pending private lesson requests
  async getPrivateLessonRequests(status?: string): Promise<{ data: PrivateLessonRequest[] | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      let query = supabase
        .from('private_lessons')
        .select(`
          id,
          user_id,
          requested_date,
          requested_time,
          num_participants,
          total_price,
          status,
          notes,
          created_at,
          user_profiles (email, username)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      const requests = (data || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        requested_date: item.requested_date,
        requested_time: item.requested_time,
        num_participants: item.num_participants,
        total_price: item.total_price,
        status: item.status,
        notes: item.notes,
        created_at: item.created_at,
        user: {
          email: item.user_profiles.email,
          username: item.user_profiles.username,
        },
      }));

      return { data: requests, error: null };
    } catch (err) {
      return { data: null, error: String(err) };
    }
  },

  // Approve private lesson request
  async approvePrivateLesson(lessonId: string): Promise<{ error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      // Update status to approved
      const { error: updateError } = await supabase
        .from('private_lessons')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', lessonId);

      if (updateError) throw updateError;

      return { error: null };
    } catch (err) {
      return { error: String(err) };
    }
  },

  // Reject private lesson request
  async rejectPrivateLesson(lessonId: string): Promise<{ error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      const { error } = await supabase
        .from('private_lessons')
        .update({ status: 'cancelled' })
        .eq('id', lessonId);

      if (error) throw error;

      return { error: null };
    } catch (err) {
      return { error: String(err) };
    }
  },

  // Create new class
  async createClass(classData: {
    title: string;
    description?: string;
    class_type: string;
    location?: string;
    start_time: string;
    end_time: string;
    max_participants: number;
  }): Promise<{ data: any; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      const qrCode = `DWLT-${Date.now()}`;
      
      const { data, error } = await supabase
        .from('classes')
        .insert({
          ...classData,
          qr_code: qrCode,
        })
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      return { data: null, error: String(err) };
    }
  },

  // Update class QR code
  async updateClassQR(classId: string): Promise<{ qrCode: string | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      const newQRCode = `DWLT-${Date.now()}`;
      
      const { error } = await supabase
        .from('classes')
        .update({ qr_code: newQRCode })
        .eq('id', classId);

      if (error) throw error;

      return { qrCode: newQRCode, error: null };
    } catch (err) {
      return { qrCode: null, error: String(err) };
    }
  },

  // Delete class
  async deleteClass(classId: string): Promise<{ error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      if (error) throw error;

      return { error: null };
    } catch (err) {
      return { error: String(err) };
    }
  },

  // Upload class photo
  async uploadClassPhoto(
    classId: string,
    file: { uri: string; name: string; type: string }
  ): Promise<{ url: string | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${classId}/${Date.now()}.${fileExt}`;

      // Create FormData for React Native
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);

      // Upload using fetch with FormData (works on React Native)
      const uploadUrl = `${supabase.storage.from('class-media').getPublicUrl('').data.publicUrl.replace('/object/public/class-media/', '/object/class-media/')}`;
      const authToken = (await supabase.auth.getSession()).data.session?.access_token;

      const uploadResponse = await fetch(`https://ctvkeqwytarocihhctvk.backend.onspace.ai/storage/v1/object/class-media/${fileName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('class-media')
        .getPublicUrl(fileName);

      // Update class with new photo URL
      const { data: classData } = await supabase
        .from('classes')
        .select('photo_urls')
        .eq('id', classId)
        .single();

      const currentPhotos = classData?.photo_urls || [];
      const updatedPhotos = [...currentPhotos, urlData.publicUrl];

      const { error: updateError } = await supabase
        .from('classes')
        .update({ photo_urls: updatedPhotos })
        .eq('id', classId);

      if (updateError) throw updateError;

      return { url: urlData.publicUrl, error: null };
    } catch (err) {
      console.error('Photo upload error:', err);
      return { url: null, error: String(err) };
    }
  },

  // Upload class video
  async uploadClassVideo(
    classId: string,
    file: { uri: string; name: string; type: string }
  ): Promise<{ url: string | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${classId}/video-${Date.now()}.${fileExt}`;

      // Create FormData for React Native
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);

      // Upload using fetch with FormData (works on React Native)
      const authToken = (await supabase.auth.getSession()).data.session?.access_token;

      const uploadResponse = await fetch(`https://ctvkeqwytarocihhctvk.backend.onspace.ai/storage/v1/object/class-media/${fileName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('class-media')
        .getPublicUrl(fileName);

      // Update class with video URL
      const { error: updateError } = await supabase
        .from('classes')
        .update({ video_url: urlData.publicUrl })
        .eq('id', classId);

      if (updateError) throw updateError;

      return { url: urlData.publicUrl, error: null };
    } catch (err) {
      console.error('Video upload error:', err);
      return { url: null, error: String(err) };
    }
  },

  // Delete class photo
  async deleteClassPhoto(
    classId: string,
    photoUrl: string
  ): Promise<{ error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      // Extract file path from URL
      const urlParts = photoUrl.split('/class-media/');
      if (urlParts.length < 2) {
        throw new Error('Invalid photo URL');
      }
      const filePath = urlParts[1];

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('class-media')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      // Remove URL from class record
      const { data: classData } = await supabase
        .from('classes')
        .select('photo_urls')
        .eq('id', classId)
        .single();

      const currentPhotos = classData?.photo_urls || [];
      const updatedPhotos = currentPhotos.filter((url: string) => url !== photoUrl);

      const { error: updateError } = await supabase
        .from('classes')
        .update({ photo_urls: updatedPhotos })
        .eq('id', classId);

      if (updateError) throw updateError;

      return { error: null };
    } catch (err) {
      console.error('Photo delete error:', err);
      return { error: String(err) };
    }
  },

  // Delete class video
  async deleteClassVideo(classId: string): Promise<{ error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      const { data: classData } = await supabase
        .from('classes')
        .select('video_url')
        .eq('id', classId)
        .single();

      if (!classData?.video_url) {
        return { error: null };
      }

      // Extract file path from URL
      const urlParts = classData.video_url.split('/class-media/');
      if (urlParts.length < 2) {
        throw new Error('Invalid video URL');
      }
      const filePath = urlParts[1];

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('class-media')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      // Remove URL from class record
      const { error: updateError } = await supabase
        .from('classes')
        .update({ video_url: null })
        .eq('id', classId);

      if (updateError) throw updateError;

      return { error: null };
    } catch (err) {
      console.error('Video delete error:', err);
      return { error: String(err) };
    }
  },

  /**
   * Upload music audio file to storage
   */
  async uploadMusicAudio(file: { uri: string; name: string; type: string }): Promise<{ url: string | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      const fileName = `music/audio-${Date.now()}-${file.name}`;
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);

      const authToken = (await supabase.auth.getSession()).data.session?.access_token;

      const uploadResponse = await fetch(`https://ctvkeqwytarocihhctvk.backend.onspace.ai/storage/v1/object/class-media/${fileName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('class-media')
        .getPublicUrl(fileName);

      return { url: publicUrl, error: null };
    } catch (err) {
      console.error('Error uploading audio:', err);
      return { url: null, error: String(err) };
    }
  },

  /**
   * Upload music cover image to storage
   */
  async uploadMusicCover(file: { uri: string; name: string; type: string }): Promise<{ url: string | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      const fileName = `music/cover-${Date.now()}.jpg`;
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);

      const authToken = (await supabase.auth.getSession()).data.session?.access_token;

      const uploadResponse = await fetch(`https://ctvkeqwytarocihhctvk.backend.onspace.ai/storage/v1/object/class-media/${fileName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('class-media')
        .getPublicUrl(fileName);

      return { url: publicUrl, error: null };
    } catch (err) {
      console.error('Error uploading cover:', err);
      return { url: null, error: String(err) };
    }
  },

  // Get revenue analytics
  async getRevenueAnalytics(): Promise<{ data: RevenueAnalytics | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      // Get total students
      const { count: studentCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_admin', false);

      // Get total tokens sold
      const { data: tokensData } = await supabase
        .from('tokens')
        .select('total_tokens');

      const totalTokensSold = (tokensData || []).reduce((sum, t) => sum + t.total_tokens, 0);
      const tokenRevenue = (totalTokensSold / 4) * 30000; // Each package is 4 tokens for ¥30,000

      // Get paid private lessons
      const { data: privateLessons } = await supabase
        .from('private_lessons')
        .select('total_price')
        .eq('status', 'paid');

      const privateLessonRevenue = (privateLessons || []).reduce((sum, p) => sum + p.total_price, 0);

      // Get total classes
      const { count: classCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get pending requests
      const { count: pendingCount } = await supabase
        .from('private_lessons')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const analytics: RevenueAnalytics = {
        total_revenue: tokenRevenue + privateLessonRevenue,
        token_revenue: tokenRevenue,
        private_lesson_revenue: privateLessonRevenue,
        total_students: studentCount || 0,
        total_tokens_sold: totalTokensSold,
        total_classes: classCount || 0,
        pending_requests: pendingCount || 0,
      };

      return { data: analytics, error: null };
    } catch (err) {
      return { data: null, error: String(err) };
    }
  },

  // Mark private lesson as paid (manual confirmation)
  async markPrivateLessonPaid(lessonId: string): Promise<{ error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      const { error } = await supabase
        .from('private_lessons')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', lessonId);

      if (error) throw error;

      return { error: null };
    } catch (err) {
      return { error: String(err) };
    }
  },

  // Mark workshop booking as paid (manual confirmation)
  async markBookingPaid(bookingId: string): Promise<{ error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);

      if (error) throw error;

      return { error: null };
    } catch (err) {
      return { error: String(err) };
    }
  },

  // Get pending payment bookings
  async getPendingPayments(): Promise<{ data: any[] | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          class_id,
          payment_amount,
          payment_method,
          created_at,
          user_profiles (email, username),
          classes (title, start_time)
        `)
        .eq('status', 'pending_payment')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      return { data: null, error: String(err) };
    }
  },

  /**
   * Get ALL pending payments across all payment types
   * Returns a unified list of pending payments from bundles, private lessons, workshops, and music
   */
  async getAllPendingPayments(): Promise<{ data: PendingPayment[] | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      const allPayments: PendingPayment[] = [];

      // 1. Workshop Bundles (no payment_intent_id means manual payment pending)
      const { data: bundles } = await supabase
        .from('workshop_bundles')
        .select(`
          id,
          user_id,
          bundle_type,
          discounted_price,
          created_at,
          user_profiles (email, username)
        `)
        .is('payment_intent_id', null)
        .order('created_at', { ascending: false });

      if (bundles) {
        bundles.forEach((bundle: any) => {
          allPayments.push({
            id: bundle.id,
            type: 'bundle',
            user: {
              email: bundle.user_profiles.email,
              username: bundle.user_profiles.username,
            },
            amount: bundle.discounted_price,
            description: `${bundle.bundle_type} Workshop Bundle`,
            created_at: bundle.created_at,
          });
        });
      }

      // 2. Private Lessons (approved status = awaiting payment)
      const { data: lessons } = await supabase
        .from('private_lessons')
        .select(`
          id,
          user_id,
          requested_date,
          requested_time,
          num_participants,
          total_price,
          created_at,
          user_profiles (email, username)
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (lessons) {
        lessons.forEach((lesson: any) => {
          allPayments.push({
            id: lesson.id,
            type: 'private_lesson',
            user: {
              email: lesson.user_profiles.email,
              username: lesson.user_profiles.username,
            },
            amount: lesson.total_price,
            description: `Private Lesson - ${lesson.requested_date} at ${lesson.requested_time} (${lesson.num_participants} people)`,
            created_at: lesson.created_at,
          });
        });
      }

      // 3. Workshop Bookings (pending_payment status)
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          payment_amount,
          created_at,
          user_profiles (email, username),
          classes (title, start_time)
        `)
        .eq('status', 'pending_payment')
        .order('created_at', { ascending: false });

      if (bookings) {
        bookings.forEach((booking: any) => {
          const classDate = new Date(booking.classes.start_time).toLocaleDateString('ja-JP');
          allPayments.push({
            id: booking.id,
            type: 'workshop',
            user: {
              email: booking.user_profiles.email,
              username: booking.user_profiles.username,
            },
            amount: booking.payment_amount,
            description: `${booking.classes.title} - ${classDate}`,
            created_at: booking.created_at,
          });
        });
      }

      // 4. Music Purchases (pending payment status)
      const { data: musicPurchases } = await supabase
        .from('music_purchases')
        .select(`
          id,
          user_id,
          purchase_price,
          created_at,
          user_profiles (email, username),
          music_products (title, product_type)
        `)
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: false });

      if (musicPurchases) {
        musicPurchases.forEach((purchase: any) => {
          allPayments.push({
            id: purchase.id,
            type: 'music',
            user: {
              email: purchase.user_profiles.email,
              username: purchase.user_profiles.username,
            },
            amount: purchase.purchase_price,
            description: `${purchase.music_products.product_type.toUpperCase()}: ${purchase.music_products.title}`,
            created_at: purchase.created_at,
          });
        });
      }

      // Sort all payments by created_at (newest first)
      allPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return { data: allPayments, error: null };
    } catch (err) {
      console.error('Error fetching pending payments:', err);
      return { data: null, error: String(err) };
    }
  },

  /**
   * Confirm payment for any type and generate receipt
   */
  async confirmPayment(paymentId: string, paymentType: string): Promise<{ error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      // Update payment status in database
      switch (paymentType) {
        case 'bundle':
          // Update workshop bundle with dummy payment_intent_id to mark as paid
          const { error: bundleError } = await supabase
            .from('workshop_bundles')
            .update({ payment_intent_id: `manual_${Date.now()}` })
            .eq('id', paymentId);
          if (bundleError) throw bundleError;
          break;

        case 'private_lesson':
          const { error: lessonError } = await supabase
            .from('private_lessons')
            .update({ 
              status: 'paid',
              paid_at: new Date().toISOString(),
            })
            .eq('id', paymentId);
          if (lessonError) throw lessonError;
          break;

        case 'workshop':
          const { error: bookingError } = await supabase
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', paymentId);
          if (bookingError) throw bookingError;
          break;

        case 'music':
          const { error: musicError } = await supabase
            .from('music_purchases')
            .update({ 
              payment_status: 'confirmed',
              payment_confirmed_at: new Date().toISOString(),
            })
            .eq('id', paymentId);
          if (musicError) throw musicError;
          break;

        default:
          throw new Error(`Unknown payment type: ${paymentType}`);
      }

      // Generate and send receipt via Edge Function
      let receiptWarning: string | null = null;
      try {
        const { data, error: receiptError } = await supabase.functions.invoke('generate-receipt', {
          body: { paymentId, paymentType },
        });

        if (receiptError) {
          console.error('Failed to generate receipt:', receiptError);
          receiptWarning = `⚠️ Payment confirmed, but receipt email failed: ${receiptError.message || String(receiptError)}`;
        } else {
          console.log('Receipt generated and sent successfully:', data);
        }
      } catch (receiptErr) {
        console.error('Receipt generation error:', receiptErr);
        receiptWarning = `⚠️ Payment confirmed, but receipt email failed: ${String(receiptErr)}`;
      }

      return { error: receiptWarning };
    } catch (err) {
      console.error('Error confirming payment:', err);
      return { error: String(err) };
    }
  },
};
