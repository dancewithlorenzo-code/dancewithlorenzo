import { getSupabaseClient } from '@/template';

export interface CheckIn {
  id: string;
  user_id: string;
  class_id: string;
  booking_id: string | null;
  check_in_method: 'qr_code' | 'manual';
  created_at: string;
}

export const checkinService = {
  /**
   * Verify QR code and check in to class
   */
  async checkInWithQRCode(
    userId: string,
    qrData: string
  ): Promise<{ success: boolean; className?: string; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      // QR code format should match database qr_code field directly
      // Format: "DWLT-{timestamp}" (set during class creation)
      
      if (!qrData || !qrData.startsWith('DWLT-')) {
        return { success: false, error: 'Invalid QR code format' };
      }

      // Find class by QR code
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('qr_code', qrData)
        .maybeSingle();

      if (classError || !classData) {
        return { success: false, error: 'QR code not recognized. Please ensure you are scanning the correct code displayed by the instructor.' };
      }

      // Check if class is today (within 2 hours before or after start time)
      const classStartTime = new Date(classData.start_time);
      const now = new Date();
      const timeDiff = Math.abs(now.getTime() - classStartTime.getTime());
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (hoursDiff > 2) {
        return { 
          success: false, 
          error: `This class is scheduled for ${classStartTime.toLocaleDateString()}. You can only check in within 2 hours of the class start time.` 
        };
      }

      // Check if user has a confirmed booking for this class
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .eq('class_id', classData.id)
        .eq('status', 'confirmed')
        .maybeSingle();

      if (bookingError || !booking) {
        return { 
          success: false, 
          error: 'You do not have a confirmed booking for this class. Please book the class first.' 
        };
      }

      // Check if already checked in
      const { data: existingCheckIn } = await supabase
        .from('check_ins')
        .select('id')
        .eq('user_id', userId)
        .eq('class_id', classData.id)
        .maybeSingle();

      if (existingCheckIn) {
        return { 
          success: false, 
          error: 'You have already checked in to this class' 
        };
      }

      // Create check-in record
      const { error: checkInError } = await supabase
        .from('check_ins')
        .insert({
          user_id: userId,
          class_id: classData.id,
          booking_id: booking.id,
          check_in_method: 'qr_code',
        });

      if (checkInError) {
        return { success: false, error: 'Failed to record check-in' };
      }

      // Update booking status
      await supabase
        .from('bookings')
        .update({ 
          status: 'attended',
          checked_in_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      return { 
        success: true, 
        className: classData.title,
        error: null 
      };
    } catch (err) {
      console.error('Check-in error:', err);
      return { success: false, error: String(err) };
    }
  },

  /**
   * Get user's check-in history
   */
  async getUserCheckIns(userId: string): Promise<{ 
    data: (CheckIn & { class: any })[] | null; 
    error: string | null 
  }> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('check_ins')
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

  /**
   * Generate QR code data for a class (Admin only)
   * Returns format: DWLT-{timestamp}
   */
  generateQRCodeData(): string {
    // Simple timestamp-based format that matches database qr_code field
    const timestamp = Date.now();
    return `DWLT-${timestamp}`;
  },

  /**
   * Update class QR code (Admin only)
   */
  async updateClassQRCode(
    classId: string,
    qrCodeData: string
  ): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('classes')
      .update({ qr_code: qrCodeData })
      .eq('id', classId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  },
};
