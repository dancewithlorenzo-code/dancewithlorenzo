import { getSupabaseClient } from '@/template';

export interface AdminKPIs {
  total_revenue_this_month: number;
  total_revenue_last_month: number;
  revenue_growth_pct: number;
  new_signups_this_week: number;
  new_signups_last_week: number;
  signup_growth_pct: number;
  total_students: number;
  active_students: number;
  total_bookings_this_month: number;
  total_tokens_sold: number;
  pending_private_lessons: number;
  avg_class_occupancy: number;
}

export interface MonthlyRevenuePoint {
  month: string;   // "Jan", "Feb", ...
  revenue: number; // yen
  tokens: number;
  lessons: number;
}

export interface WeeklySignupsPoint {
  week: string;  // "W1", "W2", ...
  count: number;
}

export interface ClassTypeData {
  label: string;
  count: number;
  color: string;
}

export interface TokenPurchaseTrendPoint {
  month: string;
  packages_sold: number;
  tokens_total: number;
}

export interface AdminAnalyticsData {
  kpis: AdminKPIs;
  monthly_revenue: MonthlyRevenuePoint[];
  weekly_signups: WeeklySignupsPoint[];
  class_type_distribution: ClassTypeData[];
  token_purchase_trend: TokenPurchaseTrendPoint[];
}

const CLASS_TYPE_COLORS = [
  '#0F4C81', '#FF6B35', '#06D6A0', '#FFB800',
  '#FF6B9D', '#9C27B0', '#2196F3', '#FF5757',
];

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function shortMonth(isoMonth: string): string {
  const [y, m] = isoMonth.split('-');
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short' });
}

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export async function getAdminAnalytics(): Promise<{ data: AdminAnalyticsData | null; error: string | null }> {
  const supabase = getSupabaseClient();

  try {
    const now = new Date();
    const currentMonthKey = monthKey(now);
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKey = monthKey(prevMonthDate);

    // Week boundaries (ISO Monday-based)
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // Mon=1 … Sun=7
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - dayOfWeek + 1);
    thisWeekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);

    // ─── Parallel fetch ───────────────────────────────────────────────────────
    const [
      studentsRes,
      tokensRes,
      lessonsRes,
      bookingsRes,
      classesRes,
    ] = await Promise.all([
      supabase.from('user_profiles').select('id, created_at').eq('is_admin', false),
      supabase.from('tokens').select('user_id, total_tokens, used_tokens, remaining_tokens, created_at, updated_at'),
      supabase.from('private_lessons').select('id, status, total_price, paid_at, created_at'),
      supabase.from('bookings').select('id, class_id, created_at'),
      supabase.from('classes').select('id, class_type, max_participants, current_participants, is_active'),
    ]);

    const students = studentsRes.data ?? [];
    const tokens = tokensRes.data ?? [];
    const lessons = lessonsRes.data ?? [];
    const bookings = bookingsRes.data ?? [];
    const classes = classesRes.data ?? [];

    // ─── Revenue calculation ──────────────────────────────────────────────────
    // Tokens: ¥33,000 per 4-token package
    const tokenRevByMonth: Record<string, number> = {};
    tokens.forEach(t => {
      const d = new Date(t.updated_at ?? t.created_at);
      const mk = monthKey(d);
      const rev = Math.floor(t.total_tokens / 4) * 33000;
      tokenRevByMonth[mk] = (tokenRevByMonth[mk] ?? 0) + rev;
    });

    // Private lessons
    const lessonRevByMonth: Record<string, number> = {};
    lessons.forEach(l => {
      if ((l.status !== 'paid' && l.status !== 'completed') || !l.paid_at) return;
      const mk = monthKey(new Date(l.paid_at));
      lessonRevByMonth[mk] = (lessonRevByMonth[mk] ?? 0) + (l.total_price ?? 0);
    });

    const thisMonthRev = (tokenRevByMonth[currentMonthKey] ?? 0) + (lessonRevByMonth[currentMonthKey] ?? 0);
    const lastMonthRev = (tokenRevByMonth[prevMonthKey] ?? 0) + (lessonRevByMonth[prevMonthKey] ?? 0);
    const revenueGrowthPct = lastMonthRev > 0 ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100 : 0;

    // ─── Signups ──────────────────────────────────────────────────────────────
    const thisWeekSignups = students.filter(s => new Date(s.created_at) >= thisWeekStart).length;
    const lastWeekSignups = students.filter(s => {
      const d = new Date(s.created_at);
      return d >= lastWeekStart && d < thisWeekStart;
    }).length;
    const signupGrowthPct = lastWeekSignups > 0 ? ((thisWeekSignups - lastWeekSignups) / lastWeekSignups) * 100 : 0;

    // ─── Misc KPIs ────────────────────────────────────────────────────────────
    const totalTokensSold = tokens.reduce((s, t) => s + (t.total_tokens ?? 0), 0);

    const activeStudentIds = new Set([
      ...tokens.filter(t => (t.remaining_tokens ?? 0) > 0).map(t => t.user_id),
      ...bookings.map(b => b.class_id), // approximation — we don't have user_id on bookings join
    ]);

    const pendingLessons = lessons.filter(l => l.status === 'pending').length;

    const activeClasses = classes.filter(c => c.is_active);
    const totalCapacity = activeClasses.reduce((s, c) => s + (c.max_participants ?? 0), 0);
    const totalOccupied = activeClasses.reduce((s, c) => s + (c.current_participants ?? 0), 0);
    const avgOccupancy = totalCapacity > 0 ? (totalOccupied / totalCapacity) * 100 : 0;

    const bookingsThisMonth = bookings.filter(b => monthKey(new Date(b.created_at)) === currentMonthKey).length;

    // ─── Monthly revenue (last 6 months) ─────────────────────────────────────
    const monthlyRevenue: MonthlyRevenuePoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mk = monthKey(d);
      const tRev = tokenRevByMonth[mk] ?? 0;
      const lRev = lessonRevByMonth[mk] ?? 0;
      monthlyRevenue.push({
        month: shortMonth(mk),
        revenue: tRev + lRev,
        tokens: tRev,
        lessons: lRev,
      });
    }

    // ─── Weekly signups (last 8 weeks) ────────────────────────────────────────
    const signupsByWeek: Record<string, number> = {};
    students.forEach(s => {
      const d = new Date(s.created_at);
      const wk = `${d.getFullYear()}-W${String(isoWeek(d)).padStart(2, '0')}`;
      signupsByWeek[wk] = (signupsByWeek[wk] ?? 0) + 1;
    });

    const weeklySignups: WeeklySignupsPoint[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const wk = `${d.getFullYear()}-W${String(isoWeek(d)).padStart(2, '0')}`;
      weeklySignups.push({
        week: `W${isoWeek(d)}`,
        count: signupsByWeek[wk] ?? 0,
      });
    }

    // ─── Class type distribution ──────────────────────────────────────────────
    const typeCount: Record<string, number> = {};
    classes.forEach(c => {
      const t = c.class_type ?? 'unknown';
      typeCount[t] = (typeCount[t] ?? 0) + 1;
    });
    const classTypeDistribution: ClassTypeData[] = Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count], i) => ({
        label,
        count,
        color: CLASS_TYPE_COLORS[i % CLASS_TYPE_COLORS.length],
      }));

    // ─── Token purchase trend (last 6 months) ────────────────────────────────
    const tokensByMonth: Record<string, { packages: number; tokens: number }> = {};
    tokens.forEach(t => {
      const mk = monthKey(new Date(t.updated_at ?? t.created_at));
      if (!tokensByMonth[mk]) tokensByMonth[mk] = { packages: 0, tokens: 0 };
      tokensByMonth[mk].packages += Math.floor((t.total_tokens ?? 0) / 4);
      tokensByMonth[mk].tokens += t.total_tokens ?? 0;
    });

    const tokenPurchaseTrend: TokenPurchaseTrendPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mk = monthKey(d);
      tokenPurchaseTrend.push({
        month: shortMonth(mk),
        packages_sold: tokensByMonth[mk]?.packages ?? 0,
        tokens_total: tokensByMonth[mk]?.tokens ?? 0,
      });
    }

    // ─── Compose result ───────────────────────────────────────────────────────
    const kpis: AdminKPIs = {
      total_revenue_this_month: thisMonthRev,
      total_revenue_last_month: lastMonthRev,
      revenue_growth_pct: revenueGrowthPct,
      new_signups_this_week: thisWeekSignups,
      new_signups_last_week: lastWeekSignups,
      signup_growth_pct: signupGrowthPct,
      total_students: students.length,
      active_students: tokens.filter(t => (t.remaining_tokens ?? 0) > 0).length,
      total_bookings_this_month: bookingsThisMonth,
      total_tokens_sold: totalTokensSold,
      pending_private_lessons: pendingLessons,
      avg_class_occupancy: avgOccupancy,
    };

    return {
      data: {
        kpis,
        monthly_revenue: monthlyRevenue,
        weekly_signups: weeklySignups,
        class_type_distribution: classTypeDistribution,
        token_purchase_trend: tokenPurchaseTrend,
      },
      error: null,
    };
  } catch (err: any) {
    console.error('getAdminAnalytics error:', err);
    return { data: null, error: String(err?.message ?? err) };
  }
}
