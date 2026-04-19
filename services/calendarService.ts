import { getSupabaseClient } from '@/template';

export interface CalendarClass {
  id: string;
  title: string;
  class_type: string;
  location: string;
  start_time: string;
  end_time: string;
  fee_per_person: number;
  max_participants: number;
  current_participants: number;
  photo_urls?: string[];
  is_booked?: boolean;
  booking_id?: string;
}

export interface DateStats {
  classCount: number;
  totalSpots: number;
  bookedSpots: number;
  availableSpots: number;
  hasBookedClass: boolean;
}

export interface MarkedDates {
  [date: string]: {
    marked: boolean;
    dotColor: string;
    selected?: boolean;
    selectedColor?: string;
    classes: CalendarClass[];
    stats: DateStats;
  };
}

/**
 * Get all classes for calendar view with user's booking status
 */
export async function getCalendarClasses(userId: string): Promise<{
  classes: CalendarClass[];
  markedDates: MarkedDates;
  error: string | null;
}> {
  try {
    const supabase = getSupabaseClient();

    // Get all active classes
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('*')
      .eq('is_active', true)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (classesError) throw classesError;

    // Get user's bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, class_id')
      .eq('user_id', userId)
      .in('status', ['confirmed', 'checked_in']);

    if (bookingsError) throw bookingsError;

    // Create booking map for quick lookup
    const bookingMap = new Map();
    bookings?.forEach(booking => {
      bookingMap.set(booking.class_id, booking.id);
    });

    // Process classes with booking status
    const processedClasses: CalendarClass[] = (classes || []).map(cls => ({
      ...cls,
      is_booked: bookingMap.has(cls.id),
      booking_id: bookingMap.get(cls.id),
    }));

    // Create marked dates object
    const markedDates: MarkedDates = {};
    processedClasses.forEach(cls => {
      // Use local date parts so timezone offsets don't shift the day
      const d = new Date(cls.start_time);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      if (!markedDates[date]) {
        markedDates[date] = {
          marked: true,
          dotColor: cls.is_booked ? '#10b981' : '#3b82f6',
          classes: [],
          stats: {
            classCount: 0,
            totalSpots: 0,
            bookedSpots: 0,
            availableSpots: 0,
            hasBookedClass: false,
          },
        };
      }
      
      markedDates[date].classes.push(cls);
      markedDates[date].stats.classCount += 1;
      markedDates[date].stats.totalSpots += cls.max_participants;
      markedDates[date].stats.availableSpots += Math.max(0, cls.max_participants - cls.current_participants);
      markedDates[date].stats.bookedSpots = markedDates[date].stats.totalSpots - markedDates[date].stats.availableSpots;
      
      // If any class is booked on this date, prioritize booked color
      if (cls.is_booked) {
        markedDates[date].dotColor = '#10b981';
        markedDates[date].stats.hasBookedClass = true;
      }
    });

    return {
      classes: processedClasses,
      markedDates,
      error: null,
    };
  } catch (error: any) {
    console.error('Get calendar classes error:', error);
    return {
      classes: [],
      markedDates: {},
      error: error.message || 'Failed to load calendar',
    };
  }
}

/**
 * Get classes for a specific date
 */
export function getClassesForDate(date: string, markedDates: MarkedDates): CalendarClass[] {
  return markedDates[date]?.classes || [];
}

/**
 * Format date for display (e.g., "March 29, 2026")
 */
export function formatDateLong(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format time for display (e.g., "21:00 - 22:30")
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  const startStr = start.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  const endStr = end.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  return `${startStr} - ${endStr}`;
}
