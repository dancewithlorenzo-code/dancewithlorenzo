import { getSupabaseClient } from '@/template';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface MonthlyRevenue {
  month: string; // YYYY-MM format
  token_revenue: number;
  private_lesson_revenue: number;
  total_revenue: number;
  token_packages_sold: number;
  private_lessons_completed: number;
}

export interface RevenueSourceBreakdown {
  source: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface WeeklyRevenue {
  week: string; // YYYY-Www format
  week_start: string;
  token_revenue: number;
  private_lesson_revenue: number;
  total_revenue: number;
}

export interface YearOverYearComparison {
  month: string;
  current_year_revenue: number;
  previous_year_revenue: number;
  growth_percentage: number;
}

export interface StudentAcquisitionFunnel {
  stage: string;
  count: number;
  percentage: number;
  conversion_rate: number;
}

export interface TokenUsagePattern {
  period: string;
  tokens_purchased: number;
  tokens_used: number;
  tokens_remaining: number;
  usage_rate: number;
}

export interface RevenueForecast {
  period: string;
  forecasted_revenue: number;
  confidence_level: 'low' | 'medium' | 'high';
}

export interface DetailedRevenueAnalytics {
  // Overview
  total_revenue: number;
  token_revenue: number;
  private_lesson_revenue: number;
  
  // Trends
  monthly_trends: MonthlyRevenue[];
  current_month_revenue: number;
  previous_month_revenue: number;
  growth_percentage: number;
  
  // Breakdown by source
  revenue_by_source: RevenueSourceBreakdown[];
  
  // Token metrics
  total_tokens_sold: number;
  total_tokens_used: number;
  token_utilization_rate: number;
  average_tokens_per_user: number;
  
  // Private lesson metrics
  total_private_lessons: number;
  completed_private_lessons: number;
  pending_private_lessons: number;
  average_participants_per_lesson: number;
  
  // Student metrics
  total_students: number;
  active_students: number; // Students with tokens or bookings
  
  // Class metrics
  total_classes: number;
  total_bookings: number;
  average_class_occupancy: number;
  
  // Advanced analytics
  weekly_breakdown: WeeklyRevenue[];
  year_over_year: YearOverYearComparison[];
  student_funnel: StudentAcquisitionFunnel[];
  token_usage_patterns: TokenUsagePattern[];
  revenue_forecast: RevenueForecast[];
}

export const revenueService = {
  /**
   * Get comprehensive revenue analytics
   */
  async getDetailedAnalytics(): Promise<{ data: DetailedRevenueAnalytics | null; error: string | null }> {
    const supabase = getSupabaseClient();
    
    try {
      // Fetch all required data in parallel
      const [
        studentsResult,
        tokensResult,
        privateLessonsResult,
        classesResult,
        bookingsResult
      ] = await Promise.all([
        supabase.from('user_profiles').select('id').eq('is_admin', false),
        supabase.from('tokens').select('*'),
        supabase.from('private_lessons').select('*'),
        supabase.from('classes').select('*').eq('is_active', true),
        supabase.from('bookings').select('*')
      ]);

      const students = studentsResult.data || [];
      const tokens = tokensResult.data || [];
      const privateLessons = privateLessonsResult.data || [];
      const classes = classesResult.data || [];
      const bookings = bookingsResult.data || [];

      // Calculate token metrics
      const totalTokensSold = tokens.reduce((sum, t) => sum + t.total_tokens, 0);
      const totalTokensUsed = tokens.reduce((sum, t) => sum + t.used_tokens, 0);
      const tokenRevenue = (totalTokensSold / 4) * 33000; // ¥33,000 per 4-token package
      const tokenUtilizationRate = totalTokensSold > 0 ? (totalTokensUsed / totalTokensSold) * 100 : 0;
      const averageTokensPerUser = students.length > 0 ? totalTokensSold / students.length : 0;

      // Calculate private lesson metrics
      const completedLessons = privateLessons.filter(l => l.status === 'paid' || l.status === 'completed');
      const pendingLessons = privateLessons.filter(l => l.status === 'pending');
      const privateLessonRevenue = completedLessons.reduce((sum, l) => sum + l.total_price, 0);
      const averageParticipants = completedLessons.length > 0
        ? completedLessons.reduce((sum, l) => sum + l.num_participants, 0) / completedLessons.length
        : 0;

      // Calculate class metrics
      const totalBookings = bookings.length;
      const totalCapacity = classes.reduce((sum, c) => sum + c.max_participants, 0);
      const averageOccupancy = totalCapacity > 0 ? (totalBookings / totalCapacity) * 100 : 0;

      // Calculate active students (those with tokens or bookings)
      const activeStudentIds = new Set([
        ...tokens.filter(t => t.remaining_tokens > 0).map(t => t.user_id),
        ...bookings.map(b => b.user_id),
        ...privateLessons.filter(l => l.status !== 'cancelled').map(l => l.user_id)
      ]);

      // Calculate monthly trends (last 6 months)
      const monthlyTrends = this.calculateMonthlyTrends(tokens, privateLessons);

      // Calculate growth percentage
      const currentMonth = monthlyTrends[monthlyTrends.length - 1];
      const previousMonth = monthlyTrends[monthlyTrends.length - 2];
      const growthPercentage = previousMonth && previousMonth.total_revenue > 0
        ? ((currentMonth.total_revenue - previousMonth.total_revenue) / previousMonth.total_revenue) * 100
        : 0;

      // Calculate revenue by source
      const tokenPackagesSold = Math.floor(totalTokensSold / 4);
      const revenueBySource: RevenueSourceBreakdown[] = [
        {
          source: 'Token Packages',
          amount: tokenRevenue,
          percentage: tokenRevenue / (tokenRevenue + privateLessonRevenue) * 100 || 0,
          count: tokenPackagesSold,
        },
        {
          source: 'Private Lessons',
          amount: privateLessonRevenue,
          percentage: privateLessonRevenue / (tokenRevenue + privateLessonRevenue) * 100 || 0,
          count: completedLessons.length,
        },
      ];

      // Calculate advanced analytics
      const weeklyBreakdown = this.calculateWeeklyBreakdown(tokens, privateLessons);
      const yearOverYear = this.calculateYearOverYear(tokens, privateLessons);
      const studentFunnel = await this.calculateStudentFunnel(supabase);
      const tokenUsagePatterns = this.calculateTokenUsagePatterns(tokens);
      const revenueForecast = this.calculateRevenueForecast(monthlyTrends);

      const analytics: DetailedRevenueAnalytics = {
        // Overview
        total_revenue: tokenRevenue + privateLessonRevenue,
        token_revenue: tokenRevenue,
        private_lesson_revenue: privateLessonRevenue,
        
        // Trends
        monthly_trends: monthlyTrends,
        current_month_revenue: currentMonth.total_revenue,
        previous_month_revenue: previousMonth?.total_revenue || 0,
        growth_percentage: growthPercentage,
        
        // Breakdown
        revenue_by_source: revenueBySource,
        
        // Token metrics
        total_tokens_sold: totalTokensSold,
        total_tokens_used: totalTokensUsed,
        token_utilization_rate: tokenUtilizationRate,
        average_tokens_per_user: averageTokensPerUser,
        
        // Private lesson metrics
        total_private_lessons: privateLessons.length,
        completed_private_lessons: completedLessons.length,
        pending_private_lessons: pendingLessons.length,
        average_participants_per_lesson: averageParticipants,
        
        // Student metrics
        total_students: students.length,
        active_students: activeStudentIds.size,
        
        // Class metrics
        total_classes: classes.length,
        total_bookings: totalBookings,
        average_class_occupancy: averageOccupancy,
        
        // Advanced analytics
        weekly_breakdown: weeklyBreakdown,
        year_over_year: yearOverYear,
        student_funnel: studentFunnel,
        token_usage_patterns: tokenUsagePatterns,
        revenue_forecast: revenueForecast,
      };

      return { data: analytics, error: null };
    } catch (err) {
      console.error('Revenue analytics error:', err);
      return { data: null, error: String(err) };
    }
  },

  /**
   * Calculate monthly revenue trends
   */
  calculateMonthlyTrends(tokens: any[], privateLessons: any[]): MonthlyRevenue[] {
    const monthlyData: Record<string, MonthlyRevenue> = {};

    // Get last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = {
        month: monthKey,
        token_revenue: 0,
        private_lesson_revenue: 0,
        total_revenue: 0,
        token_packages_sold: 0,
        private_lessons_completed: 0,
      };
    }

    // Aggregate token revenue (using updated_at as purchase date approximation)
    tokens.forEach(token => {
      if (!token.updated_at) return;
      const date = new Date(token.updated_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData[monthKey]) {
        const revenue = (token.total_tokens / 4) * 33000;
        monthlyData[monthKey].token_revenue += revenue;
        monthlyData[monthKey].token_packages_sold += Math.floor(token.total_tokens / 4);
      }
    });

    // Aggregate private lesson revenue
    privateLessons.forEach(lesson => {
      if (lesson.status !== 'paid' && lesson.status !== 'completed') return;
      if (!lesson.paid_at) return;
      
      const date = new Date(lesson.paid_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].private_lesson_revenue += lesson.total_price;
        monthlyData[monthKey].private_lessons_completed += 1;
      }
    });

    // Calculate totals
    Object.keys(monthlyData).forEach(key => {
      monthlyData[key].total_revenue = 
        monthlyData[key].token_revenue + monthlyData[key].private_lesson_revenue;
    });

    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  },

  /**
   * Calculate weekly revenue breakdown (last 12 weeks)
   */
  calculateWeeklyBreakdown(tokens: any[], privateLessons: any[]): WeeklyRevenue[] {
    const weeklyData: Record<string, WeeklyRevenue> = {};

    // Get last 12 weeks
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const year = date.getFullYear();
      const week = this.getWeekNumber(date);
      const weekKey = `${year}-W${String(week).padStart(2, '0')}`;
      const weekStart = this.getWeekStart(date);
      
      weeklyData[weekKey] = {
        week: weekKey,
        week_start: weekStart.toISOString().split('T')[0],
        token_revenue: 0,
        private_lesson_revenue: 0,
        total_revenue: 0,
      };
    }

    // Aggregate token revenue
    tokens.forEach(token => {
      if (!token.updated_at) return;
      const date = new Date(token.updated_at);
      const year = date.getFullYear();
      const week = this.getWeekNumber(date);
      const weekKey = `${year}-W${String(week).padStart(2, '0')}`;
      
      if (weeklyData[weekKey]) {
        const revenue = (token.total_tokens / 4) * 33000;
        weeklyData[weekKey].token_revenue += revenue;
      }
    });

    // Aggregate private lesson revenue
    privateLessons.forEach(lesson => {
      if (lesson.status !== 'paid' && lesson.status !== 'completed') return;
      if (!lesson.paid_at) return;
      
      const date = new Date(lesson.paid_at);
      const year = date.getFullYear();
      const week = this.getWeekNumber(date);
      const weekKey = `${year}-W${String(week).padStart(2, '0')}`;
      
      if (weeklyData[weekKey]) {
        weeklyData[weekKey].private_lesson_revenue += lesson.total_price;
      }
    });

    // Calculate totals
    Object.keys(weeklyData).forEach(key => {
      weeklyData[key].total_revenue = 
        weeklyData[key].token_revenue + weeklyData[key].private_lesson_revenue;
    });

    return Object.values(weeklyData).sort((a, b) => a.week.localeCompare(b.week));
  },

  /**
   * Calculate year-over-year comparison (last 12 months)
   */
  calculateYearOverYear(tokens: any[], privateLessons: any[]): YearOverYearComparison[] {
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    const yearData: Record<string, YearOverYearComparison> = {};

    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const monthKey = `${month}`;
      
      yearData[monthKey] = {
        month: date.toLocaleDateString('en', { month: 'short' }),
        current_year_revenue: 0,
        previous_year_revenue: 0,
        growth_percentage: 0,
      };
    }

    // Aggregate revenue by year
    const processRevenue = (items: any[], revenueField: string, dateField: string) => {
      items.forEach(item => {
        if (!item[dateField]) return;
        const date = new Date(item[dateField]);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        
        if (yearData[month]) {
          const revenue = revenueField === 'token' 
            ? (item.total_tokens / 4) * 33000 
            : item.total_price;
          
          if (year === currentYear) {
            yearData[month].current_year_revenue += revenue;
          } else if (year === previousYear) {
            yearData[month].previous_year_revenue += revenue;
          }
        }
      });
    };

    processRevenue(tokens, 'token', 'updated_at');
    processRevenue(
      privateLessons.filter((l: any) => l.status === 'paid' || l.status === 'completed'),
      'lesson',
      'paid_at'
    );

    // Calculate growth percentage
    Object.keys(yearData).forEach(key => {
      const current = yearData[key].current_year_revenue;
      const previous = yearData[key].previous_year_revenue;
      yearData[key].growth_percentage = previous > 0 
        ? ((current - previous) / previous) * 100 
        : current > 0 ? 100 : 0;
    });

    return Object.values(yearData);
  },

  /**
   * Calculate student acquisition funnel
   */
  async calculateStudentFunnel(supabase: any): Promise<StudentAcquisitionFunnel[]> {
    try {
      const { data: allStudents } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('is_admin', false);

      const { data: studentsWithTokens } = await supabase
        .from('tokens')
        .select('user_id')
        .gt('total_tokens', 0);

      const { data: studentsWithBookings } = await supabase
        .from('bookings')
        .select('user_id')
        .eq('status', 'confirmed');

      const { data: studentsAttended } = await supabase
        .from('check_ins')
        .select('user_id');

      const totalStudents = allStudents?.length || 0;
      const purchasedTokens = new Set(studentsWithTokens?.map(t => t.user_id) || []).size;
      const bookedClasses = new Set(studentsWithBookings?.map(b => b.user_id) || []).size;
      const attendedClasses = new Set(studentsAttended?.map(c => c.user_id) || []).size;

      return [
        {
          stage: 'Signed Up',
          count: totalStudents,
          percentage: 100,
          conversion_rate: 100,
        },
        {
          stage: 'Purchased Tokens',
          count: purchasedTokens,
          percentage: totalStudents > 0 ? (purchasedTokens / totalStudents) * 100 : 0,
          conversion_rate: totalStudents > 0 ? (purchasedTokens / totalStudents) * 100 : 0,
        },
        {
          stage: 'Booked Classes',
          count: bookedClasses,
          percentage: totalStudents > 0 ? (bookedClasses / totalStudents) * 100 : 0,
          conversion_rate: purchasedTokens > 0 ? (bookedClasses / purchasedTokens) * 100 : 0,
        },
        {
          stage: 'Attended Classes',
          count: attendedClasses,
          percentage: totalStudents > 0 ? (attendedClasses / totalStudents) * 100 : 0,
          conversion_rate: bookedClasses > 0 ? (attendedClasses / bookedClasses) * 100 : 0,
        },
      ];
    } catch (err) {
      console.error('Funnel calculation error:', err);
      return [];
    }
  },

  /**
   * Calculate token usage patterns over time
   */
  calculateTokenUsagePatterns(tokens: any[]): TokenUsagePattern[] {
    const patternData: Record<string, TokenUsagePattern> = {};

    // Get last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en', { month: 'short', year: '2-digit' });
      
      patternData[monthKey] = {
        period: monthName,
        tokens_purchased: 0,
        tokens_used: 0,
        tokens_remaining: 0,
        usage_rate: 0,
      };
    }

    // Aggregate token data (simplified - using current state)
    tokens.forEach(token => {
      if (!token.updated_at) return;
      const date = new Date(token.updated_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (patternData[monthKey]) {
        patternData[monthKey].tokens_purchased += token.total_tokens;
        patternData[monthKey].tokens_used += token.used_tokens;
        patternData[monthKey].tokens_remaining += token.remaining_tokens;
      }
    });

    // Calculate usage rate
    Object.keys(patternData).forEach(key => {
      const purchased = patternData[key].tokens_purchased;
      const used = patternData[key].tokens_used;
      patternData[key].usage_rate = purchased > 0 ? (used / purchased) * 100 : 0;
    });

    return Object.values(patternData);
  },

  /**
   * Calculate revenue forecast (next 3 months using linear regression)
   */
  calculateRevenueForecast(monthlyTrends: MonthlyRevenue[]): RevenueForecast[] {
    if (monthlyTrends.length < 3) {
      return [];
    }

    // Simple linear regression
    const revenues = monthlyTrends.map(m => m.total_revenue);
    const n = revenues.length;
    const xValues = Array.from({ length: n }, (_, i) => i);
    
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = revenues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * revenues[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate variance for confidence level
    const avgRevenue = sumY / n;
    const variance = revenues.reduce((sum, r) => sum + Math.pow(r - avgRevenue, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = (stdDev / avgRevenue) * 100;

    const getConfidenceLevel = (cv: number): 'low' | 'medium' | 'high' => {
      if (cv > 50) return 'low';
      if (cv > 25) return 'medium';
      return 'high';
    };

    const forecasts: RevenueForecast[] = [];
    const lastMonth = new Date(monthlyTrends[monthlyTrends.length - 1].month + '-01');
    
    for (let i = 1; i <= 3; i++) {
      const forecastDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + i, 1);
      const monthName = forecastDate.toLocaleDateString('en', { month: 'short', year: '2-digit' });
      const forecastedRevenue = Math.max(0, intercept + slope * (n + i - 1));
      
      forecasts.push({
        period: monthName,
        forecasted_revenue: Math.round(forecastedRevenue),
        confidence_level: getConfidenceLevel(coefficientOfVariation),
      });
    }

    return forecasts;
  },

  /**
   * Helper: Get ISO week number
   */
  getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  },

  /**
   * Helper: Get week start date (Monday)
   */
  getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  },

  /**
   * Export revenue data as CSV
   */
  async exportRevenueReport(analytics: DetailedRevenueAnalytics): Promise<{ success: boolean; error: string | null }> {
    try {
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        return { success: false, error: 'Sharing is not available on this device' };
      }

      // Generate CSV content
      let csv = 'Dance with Lorenzo Tokyo - Revenue Report\n\n';
      
      // Overview section
      csv += 'OVERVIEW\n';
      csv += 'Metric,Value\n';
      csv += `Total Revenue,¥${analytics.total_revenue.toLocaleString()}\n`;
      csv += `Token Sales Revenue,¥${analytics.token_revenue.toLocaleString()}\n`;
      csv += `Private Lesson Revenue,¥${analytics.private_lesson_revenue.toLocaleString()}\n`;
      csv += `Growth (Month-over-Month),${analytics.growth_percentage.toFixed(2)}%\n\n`;
      
      // Monthly trends
      csv += 'MONTHLY TRENDS\n';
      csv += 'Month,Token Revenue,Private Lesson Revenue,Total Revenue,Packages Sold,Lessons Completed\n';
      analytics.monthly_trends.forEach(m => {
        csv += `${m.month},¥${m.token_revenue.toLocaleString()},¥${m.private_lesson_revenue.toLocaleString()},¥${m.total_revenue.toLocaleString()},${m.token_packages_sold},${m.private_lessons_completed}\n`;
      });
      csv += '\n';
      
      // Revenue by source
      csv += 'REVENUE BY SOURCE\n';
      csv += 'Source,Amount,Percentage,Count\n';
      analytics.revenue_by_source.forEach(s => {
        csv += `${s.source},¥${s.amount.toLocaleString()},${s.percentage.toFixed(2)}%,${s.count}\n`;
      });
      csv += '\n';
      
      // Metrics
      csv += 'KEY METRICS\n';
      csv += 'Metric,Value\n';
      csv += `Total Students,${analytics.total_students}\n`;
      csv += `Active Students,${analytics.active_students}\n`;
      csv += `Total Tokens Sold,${analytics.total_tokens_sold}\n`;
      csv += `Total Tokens Used,${analytics.total_tokens_used}\n`;
      csv += `Token Utilization Rate,${analytics.token_utilization_rate.toFixed(2)}%\n`;
      csv += `Average Tokens per Student,${analytics.average_tokens_per_user.toFixed(2)}\n`;
      csv += `Total Classes,${analytics.total_classes}\n`;
      csv += `Total Bookings,${analytics.total_bookings}\n`;
      csv += `Average Class Occupancy,${analytics.average_class_occupancy.toFixed(2)}%\n`;
      csv += `Total Private Lessons,${analytics.total_private_lessons}\n`;
      csv += `Completed Private Lessons,${analytics.completed_private_lessons}\n`;
      csv += `Pending Private Lessons,${analytics.pending_private_lessons}\n`;
      csv += `Average Participants per Lesson,${analytics.average_participants_per_lesson.toFixed(2)}\n`;
      
      // Save to file
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `revenue-report-${timestamp}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      // Share the file
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Revenue Report',
        UTI: 'public.comma-separated-values-text',
      });
      
      return { success: true, error: null };
    } catch (err) {
      console.error('Export error:', err);
      return { success: false, error: String(err) };
    }
  },
};
