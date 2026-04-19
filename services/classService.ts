import { getSupabaseClient } from '@/template';
import { notificationService } from './notificationService';

export interface Class {
  id: string;
  title: string;
  description: string | null;
  class_type: 'tokyo' | 'yokohama' | 'online' | 'private';
  class_category: 'become_my_dancers' | 'workshop';
  location: string | null;
  start_time: string;
  end_time: string;
  max_participants: number;
  current_participants: number;
  fee_per_person: number;
  qr_code: string | null;
  is_active: boolean;
  created_at: string;
  photo_urls: string[] | null;
  video_url: string | null;
}

export interface Booking {
  id: string;
  user_id: string;
  class_id: string;
  status: 'confirmed' | 'cancelled' | 'attended';
  payment_method: 'token' | 'stripe';
  payment_amount: number;
  payment_intent_id: string | null;
  checked_in_at: string | null;
  created_at: string;
}

export const classService = {
  async getUpcomingClasses(): Promise<{ data: Class[] | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('is_active', true)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  },

  async getUserBookings(userId: string): Promise<{ data: (Booking & { class: Class })[] | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        class:classes(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as any, error: null };
  },

  async bookClass(
    userId: string,
    classId: string,
    paymentMethod: 'token' | 'stripe' | 'manual' | 'bundle' = 'token',
    paymentAmount: number = 0,
    paymentIntentId?: string
  ): Promise<{ data: Booking | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      // Check if already booked
      const { data: existing } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', userId)
        .eq('class_id', classId)
        .eq('status', 'confirmed')
        .maybeSingle();

      if (existing) {
        return { data: null, error: 'You have already booked this class' };
      }

      // Get class details to check capacity
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('current_participants, max_participants, title, class_category, start_time, location, class_type, qr_code')
        .eq('id', classId)
        .single();

      if (classError) {
        return { data: null, error: 'Class not found' };
      }

      // Check capacity
      if (classData.current_participants >= classData.max_participants) {
        return { data: null, error: 'This class is fully booked' };
      }

      // Create booking
      // Manual/bundle payments start as "pending_payment", tokens are "confirmed"
      const status = paymentMethod === 'manual' ? 'pending_payment' : 'confirmed';
      
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          user_id: userId,
          class_id: classId,
          status: status,
          payment_method: paymentMethod,
          payment_amount: paymentAmount,
          payment_intent_id: paymentIntentId || null,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      // Update class participant count
      const { error: updateError } = await supabase
        .from('classes')
        .update({ current_participants: classData.current_participants + 1 })
        .eq('id', classId);

      if (updateError) {
        console.error('Failed to update participant count:', updateError);
      }

      // Send booking confirmation notification
      const { success: notificationSuccess } = await notificationService.sendBookingConfirmationNotification(
        userId,
        data.id,
        {
          classId: classId,
          title: classData.title,
          startTime: classData.start_time,
          location: classData.location,
          classType: classData.class_type,
          qrCode: classData.qr_code,
          paymentMethod: paymentMethod,
          paymentAmount: paymentAmount,
        }
      );

      if (!notificationSuccess) {
        console.log('Booking confirmation notification failed, but booking was successful');
      }

      return { data, error: null };
    } catch (err) {
      console.error('Booking error:', err);
      return { data: null, error: String(err) };
    }
  },

  async cancelBooking(bookingId: string, classId: string): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      // Update booking status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // Decrement class participant count
      const { data: classData } = await supabase
        .from('classes')
        .select('current_participants')
        .eq('id', classId)
        .single();

      if (classData && classData.current_participants > 0) {
        await supabase
          .from('classes')
          .update({ current_participants: classData.current_participants - 1 })
          .eq('id', classId);
      }

      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },
};
