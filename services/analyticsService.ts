import { getSupabaseClient } from '@/template';

export interface StudentAnalytics {
  // Overall stats
  total_bookings: number;
  total_attended: number;
  attendance_rate: number;
  total_cancelled: number;
  
  // Tokens
  total_tokens_purchased: number;
  total_tokens_used: number;
  token_usage_rate: number;
  
  // Favorite class insights
  favorite_class_type: string | null;
  favorite_class_category: string | null;
  most_attended_class_title: string | null;
  
  // Trends
  booking_trends: MonthlyBookingTrend[];
  token_usage_trends: MonthlyTokenTrend[];
  class_type_distribution: ClassTypeStats[];
  weekly_booking_pattern: WeekdayStats[];
  recent_activity: RecentActivity[];
}

export interface MonthlyBookingTrend {
  month: string;
  total_bookings: number;
  attended: number;
  cancelled: number;
}

export interface MonthlyTokenTrend {
  month: string;
  tokens_purchased: number;
  tokens_used: number;
  remaining: number;
}

export interface ClassTypeStats {
  class_type: string;
  count: number;
  percentage: number;
}

export interface WeekdayStats {
  day_of_week: string;
  count: number;
}

export interface RecentActivity {
  date: string;
  type: 'booking' | 'attendance' | 'token_purchase' | 'cancellation';
  description: string;
  class_title?: string;
}

export const analyticsService = {
  async getStudentAnalytics(userId: string): Promise<{ data: StudentAnalytics | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      // Get all bookings with class details
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          class:classes(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      const totalBookings = bookings?.length || 0;
      const totalAttended = bookings?.filter(b => b.status === 'attended').length || 0;
      const totalCancelled = bookings?.filter(b => b.status === 'cancelled').length || 0;
      const attendanceRate = totalBookings > 0 ? (totalAttended / totalBookings) * 100 : 0;

      // Get token data
      const { data: tokenData, error: tokenError } = await supabase
        .from('tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('token_type', 'become_my_dancers')
        .maybeSingle();

      if (tokenError && tokenError.code !== 'PGRST116') throw tokenError;

      const totalTokensPurchased = tokenData?.total_tokens || 0;
      const totalTokensUsed = tokenData?.used_tokens || 0;
      const tokenUsageRate = totalTokensPurchased > 0 ? (totalTokensUsed / totalTokensPurchased) * 100 : 0;

      // Calculate favorite class type
      const classTypeCounts: Record<string, number> = {};
      const classCategoryCounts: Record<string, number> = {};
      const classTitleCounts: Record<string, number> = {};

      bookings?.forEach(booking => {
        if (booking.class && booking.status === 'attended') {
          const type = booking.class.class_type;
          const category = booking.class.class_category;
          const title = booking.class.title;
          
          classTypeCounts[type] = (classTypeCounts[type] || 0) + 1;
          classCategoryCounts[category] = (classCategoryCounts[category] || 0) + 1;
          classTitleCounts[title] = (classTitleCounts[title] || 0) + 1;
        }
      });

      const favoriteClassType = Object.keys(classTypeCounts).length > 0
        ? Object.keys(classTypeCounts).reduce((a, b) => classTypeCounts[a] > classTypeCounts[b] ? a : b)
        : null;

      const favoriteClassCategory = Object.keys(classCategoryCounts).length > 0
        ? Object.keys(classCategoryCounts).reduce((a, b) => classCategoryCounts[a] > classCategoryCounts[b] ? a : b)
        : null;

      const mostAttendedClassTitle = Object.keys(classTitleCounts).length > 0
        ? Object.keys(classTitleCounts).reduce((a, b) => classTitleCounts[a] > classTitleCounts[b] ? a : b)
        : null;

      // Calculate monthly booking trends (last 6 months)
      const monthlyTrends: Record<string, { total: number; attended: number; cancelled: number }> = {};
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = month.toISOString().slice(0, 7); // YYYY-MM
        monthlyTrends[monthKey] = { total: 0, attended: 0, cancelled: 0 };
      }

      bookings?.forEach(booking => {
        const monthKey = booking.created_at.slice(0, 7);
        if (monthlyTrends[monthKey]) {
          monthlyTrends[monthKey].total++;
          if (booking.status === 'attended') monthlyTrends[monthKey].attended++;
          if (booking.status === 'cancelled') monthlyTrends[monthKey].cancelled++;
        }
      });

      const bookingTrends: MonthlyBookingTrend[] = Object.keys(monthlyTrends)
        .sort()
        .map(month => ({
          month,
          total_bookings: monthlyTrends[month].total,
          attended: monthlyTrends[month].attended,
          cancelled: monthlyTrends[month].cancelled,
        }));

      // Calculate token usage trends (last 6 months)
      // Note: For now we'll use cumulative data as we don't track token history by month
      const tokenUsageTrends: MonthlyTokenTrend[] = Object.keys(monthlyTrends)
        .sort()
        .map(month => ({
          month,
          tokens_purchased: totalTokensPurchased,
          tokens_used: totalTokensUsed,
          remaining: totalTokensPurchased - totalTokensUsed,
        }));

      // Calculate class type distribution
      const totalClassTypeBookings = Object.values(classTypeCounts).reduce((a, b) => a + b, 0);
      const classTypeDistribution: ClassTypeStats[] = Object.keys(classTypeCounts).map(type => ({
        class_type: type,
        count: classTypeCounts[type],
        percentage: totalClassTypeBookings > 0 ? (classTypeCounts[type] / totalClassTypeBookings) * 100 : 0,
      })).sort((a, b) => b.count - a.count);

      // Calculate weekly booking pattern
      const weekdayCounts: Record<number, number> = {};
      bookings?.forEach(booking => {
        if (booking.class) {
          const dayOfWeek = new Date(booking.class.start_time).getDay();
          weekdayCounts[dayOfWeek] = (weekdayCounts[dayOfWeek] || 0) + 1;
        }
      });

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const weeklyBookingPattern: WeekdayStats[] = dayNames.map((day, index) => ({
        day_of_week: day,
        count: weekdayCounts[index] || 0,
      }));

      // Recent activity (last 10 actions)
      const recentActivity: RecentActivity[] = [];
      
      bookings?.slice(0, 10).forEach(booking => {
        if (booking.status === 'attended') {
          recentActivity.push({
            date: booking.checked_in_at || booking.created_at,
            type: 'attendance',
            description: 'Attended class',
            class_title: booking.class?.title,
          });
        } else if (booking.status === 'cancelled') {
          recentActivity.push({
            date: booking.created_at,
            type: 'cancellation',
            description: 'Cancelled booking',
            class_title: booking.class?.title,
          });
        } else {
          recentActivity.push({
            date: booking.created_at,
            type: 'booking',
            description: 'Booked class',
            class_title: booking.class?.title,
          });
        }
      });

      const analytics: StudentAnalytics = {
        total_bookings: totalBookings,
        total_attended: totalAttended,
        attendance_rate: attendanceRate,
        total_cancelled: totalCancelled,
        total_tokens_purchased: totalTokensPurchased,
        total_tokens_used: totalTokensUsed,
        token_usage_rate: tokenUsageRate,
        favorite_class_type: favoriteClassType,
        favorite_class_category: favoriteClassCategory,
        most_attended_class_title: mostAttendedClassTitle,
        booking_trends: bookingTrends,
        token_usage_trends: tokenUsageTrends,
        class_type_distribution: classTypeDistribution,
        weekly_booking_pattern: weeklyBookingPattern,
        recent_activity: recentActivity,
      };

      return { data: analytics, error: null };
    } catch (err) {
      console.error('Error getting student analytics:', err);
      return { data: null, error: String(err) };
    }
  },
};
