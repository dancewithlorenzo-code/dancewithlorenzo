import { getSupabaseClient } from '@/template';

export interface PrivateLessonBooking {
  requested_date: string;
  requested_time: string;
  num_participants: number;
  notes?: string;
}

export const privateLessonService = {
  // Calculate price for private lesson (¥40,000 per participant)
  calculatePrice(numParticipants: number): number {
    return 40000 * numParticipants; // ¥40,000 per participant
  },

  // Submit private lesson booking request
  async submitBooking(
    userId: string,
    booking: PrivateLessonBooking
  ): Promise<{ data: any; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      const totalPrice = this.calculatePrice(booking.num_participants);

      const { data, error } = await supabase
        .from('private_lessons')
        .insert({
          user_id: userId,
          requested_date: booking.requested_date,
          requested_time: booking.requested_time,
          num_participants: booking.num_participants,
          total_price: totalPrice,
          notes: booking.notes || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      console.error('Private lesson booking error:', err);
      return { data: null, error: String(err) };
    }
  },

  // Get user's private lesson requests
  async getUserLessons(userId: string): Promise<{ data: any[] | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      const { data, error } = await supabase
        .from('private_lessons')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      return { data: null, error: String(err) };
    }
  },
};
