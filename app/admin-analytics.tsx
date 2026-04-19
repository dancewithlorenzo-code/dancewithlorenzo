import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  LineChart,
  BarChart,
  PieChart,
} from 'react-native-chart-kit';

import { useAuth } from '@/template';
import { useAlert } from '@/template';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import {
  getAdminAnalytics,
  AdminAnalyticsData,
} from '@/services/adminAnalyticsService';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - spacing.lg * 2 - spacing.md * 2; // paddings

const CHART_CONFIG = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  backgroundGradientFromOpacity: 1,
  backgroundGradientToOpacity: 1,
  color: (opacity = 1) => `rgba(15, 76, 129, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.6,
  useShadowColorFromDataset: false,
  decimalPlaces: 0,
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: colors.primary,
  },
};

const ACCENT_CHART_CONFIG = {
  ...CHART_CONFIG,
  color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: colors.accent,
  },
};

function KPICard({
  icon,
  iconColor,
  label,
  value,
  sub,
  trend,
}: {
  icon: string;
  iconColor: string;
  label: string;
  value: string;
  sub?: string;
  trend?: { pct: number; label: string };
}) {
  const isPositive = (trend?.pct ?? 0) >= 0;
  return (
    <View style={kpiStyles.card}>
      <View style={[kpiStyles.iconBg, { backgroundColor: iconColor + '18' }]}>
        <MaterialIcons name={icon as any} size={22} color={iconColor} />
      </View>
      <Text style={kpiStyles.value}>{value}</Text>
      <Text style={kpiStyles.label}>{label}</Text>
      {trend != null && (
        <View style={kpiStyles.trendRow}>
          <MaterialIcons
            name={isPositive ? 'trending-up' : 'trending-down'}
            size={14}
            color={isPositive ? colors.success : colors.error}
          />
          <Text style={[kpiStyles.trendText, { color: isPositive ? colors.success : colors.error }]}>
            {Math.abs(trend.pct).toFixed(1)}% {trend.label}
          </Text>
        </View>
      )}
      {sub != null && <Text style={kpiStyles.sub}>{sub}</Text>}
    </View>
  );
}

const kpiStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
    alignItems: 'flex-start',
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '500',
    lineHeight: 16,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sub: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 4,
  },
});

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={sStyles.row}>
      <MaterialIcons name={icon as any} size={20} color={colors.primary} />
      <Text style={sStyles.title}>{title}</Text>
    </View>
  );
}
const sStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, marginTop: spacing.lg },
  title: { ...typography.h3, color: colors.text, fontSize: 17 },
});

export default function AdminAnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data: d, error } = await getAdminAnalytics();
    if (error) showAlert('Error', error);
    else setData(d);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  // ── Derived chart datasets ─────────────────────────────────────────────────
  const revenueLabels = data?.monthly_revenue.map(p => p.month) ?? [];
  const revenueValues = data?.monthly_revenue.map(p => Math.round(p.revenue / 1000)) ?? []; // k¥

  const signupLabels = data?.weekly_signups.map(p => p.week) ?? [];
  const signupValues = data?.weekly_signups.map(p => p.count) ?? [];

  const tokenLabels = data?.token_purchase_trend.map(p => p.month) ?? [];
  const tokenValues = data?.token_purchase_trend.map(p => p.packages_sold) ?? [];

  const pieData = (data?.class_type_distribution ?? []).slice(0, 5).map(d => ({
    name: d.label.length > 12 ? d.label.slice(0, 12) + '…' : d.label,
    population: d.count,
    color: d.color,
    legendFontColor: colors.textLight,
    legendFontSize: 12,
  }));

  const maxRevenue = Math.max(...revenueValues, 1);
  const maxSignup = Math.max(...signupValues, 1);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading analytics…</Text>
      </View>
    );
  }

  const k = data!.kpis;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Admin Analytics</Text>
        <Pressable onPress={onRefresh} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="refresh" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >

        {/* ── KPI Grid ───────────────────────────────────────────────────────── */}
        <SectionTitle icon="dashboard" title="Key Metrics" />
        <View style={styles.kpiGrid}>
          <KPICard
            icon="attach-money"
            iconColor={colors.success}
            label="Revenue This Month"
            value={`¥${k.total_revenue_this_month.toLocaleString()}`}
            trend={{ pct: k.revenue_growth_pct, label: 'vs last month' }}
          />
          <KPICard
            icon="person-add"
            iconColor={colors.primary}
            label="New Signups This Week"
            value={String(k.new_signups_this_week)}
            trend={{ pct: k.signup_growth_pct, label: 'vs last week' }}
          />
          <KPICard
            icon="people"
            iconColor={colors.accent}
            label="Total Students"
            value={String(k.total_students)}
            sub={`${k.active_students} with tokens`}
          />
          <KPICard
            icon="toll"
            iconColor="#FFB800"
            label="Tokens Sold (All Time)"
            value={String(k.total_tokens_sold)}
            sub={`${Math.floor(k.total_tokens_sold / 4)} packages`}
          />
          <KPICard
            icon="event"
            iconColor={colors.success}
            label="Bookings This Month"
            value={String(k.total_bookings_this_month)}
          />
          <KPICard
            icon="event-available"
            iconColor="#9C27B0"
            label="Class Occupancy"
            value={`${k.avg_class_occupancy.toFixed(1)}%`}
            sub={`${k.pending_private_lessons} lessons pending`}
          />
        </View>

        {/* ── Revenue Trend (Line Chart) ─────────────────────────────────────── */}
        <SectionTitle icon="show-chart" title="Monthly Revenue (k¥)" />
        <View style={styles.chartCard}>
          {revenueValues.some(v => v > 0) ? (
            <LineChart
              data={{
                labels: revenueLabels,
                datasets: [{ data: revenueValues.length > 0 ? revenueValues : [0], color: () => colors.primary }],
              }}
              width={CHART_WIDTH}
              height={200}
              chartConfig={CHART_CONFIG}
              bezier
              style={styles.chartStyle}
              yAxisSuffix="k"
              fromZero
              withInnerLines={false}
              withOuterLines
              withHorizontalLabels
              withVerticalLabels
            />
          ) : (
            <EmptyChart label="No revenue data yet" />
          )}
          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendText}>Revenue (thousands ¥)</Text>
          </View>
          {/* Source breakdown bars */}
          {data!.monthly_revenue.some(p => p.revenue > 0) && (
            <View style={styles.breakdownGrid}>
              {data!.monthly_revenue.map(p => (
                <View key={p.month} style={styles.breakdownCol}>
                  <Text style={styles.breakdownMonth}>{p.month}</Text>
                  <View style={styles.breakdownBar}>
                    <View style={[
                      styles.breakdownFill,
                      { height: Math.max((p.tokens / (maxRevenue * 1000)) * 56, p.tokens > 0 ? 3 : 0), backgroundColor: colors.primary }
                    ]} />
                    <View style={[
                      styles.breakdownFill,
                      { height: Math.max((p.lessons / (maxRevenue * 1000)) * 56, p.lessons > 0 ? 3 : 0), backgroundColor: colors.accent, marginTop: 1 }
                    ]} />
                  </View>
                </View>
              ))}
              <View style={[styles.legendRow, { marginTop: spacing.sm, paddingHorizontal: 0 }]}>
                <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.legendText}>Tokens</Text>
                <View style={[styles.legendDot, { backgroundColor: colors.accent, marginLeft: spacing.md }]} />
                <Text style={styles.legendText}>Lessons</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Weekly New Signups (Bar Chart) ────────────────────────────────── */}
        <SectionTitle icon="person-add" title="New Signups (Last 8 Weeks)" />
        <View style={styles.chartCard}>
          {signupValues.some(v => v > 0) ? (
            <BarChart
              data={{
                labels: signupLabels,
                datasets: [{ data: signupValues.length > 0 ? signupValues : [0] }],
              }}
              width={CHART_WIDTH}
              height={200}
              chartConfig={{
                ...CHART_CONFIG,
                color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
              }}
              style={styles.chartStyle}
              fromZero
              withInnerLines={false}
              showBarTops={false}
              yAxisLabel=""
              yAxisSuffix=""
            />
          ) : (
            <EmptyChart label="No signup data yet" />
          )}
        </View>

        {/* ── Class Type Distribution (Pie Chart) ───────────────────────────── */}
        <SectionTitle icon="pie-chart" title="Most Popular Class Types" />
        <View style={styles.chartCard}>
          {pieData.length > 0 ? (
            <>
              <PieChart
                data={pieData}
                width={CHART_WIDTH}
                height={180}
                chartConfig={CHART_CONFIG}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="12"
                style={styles.chartStyle}
                absolute
              />
              {/* Full breakdown table */}
              <View style={styles.pieTable}>
                {data!.class_type_distribution.map(item => (
                  <View key={item.label} style={styles.pieRow}>
                    <View style={[styles.pieDot, { backgroundColor: item.color }]} />
                    <Text style={styles.pieLabel} numberOfLines={1}>{item.label}</Text>
                    <Text style={styles.pieCount}>{item.count} classes</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <EmptyChart label="No class data yet" />
          )}
        </View>

        {/* ── Token Purchase Trend (Bar Chart) ─────────────────────────────── */}
        <SectionTitle icon="toll" title="Token Package Sales Trend" />
        <View style={styles.chartCard}>
          {tokenValues.some(v => v > 0) ? (
            <BarChart
              data={{
                labels: tokenLabels,
                datasets: [{ data: tokenValues.length > 0 ? tokenValues : [0] }],
              }}
              width={CHART_WIDTH}
              height={200}
              chartConfig={{
                ...CHART_CONFIG,
                color: (opacity = 1) => `rgba(255, 184, 0, ${opacity})`,
              }}
              style={styles.chartStyle}
              fromZero
              withInnerLines={false}
              showBarTops={false}
              yAxisLabel=""
              yAxisSuffix=" pkg"
            />
          ) : (
            <EmptyChart label="No token sales data yet" />
          )}
          <Text style={styles.chartNote}>Each package = 4 tokens · ¥33,000</Text>
        </View>

        {/* ── Revenue This Month Detail ─────────────────────────────────────── */}
        <SectionTitle icon="receipt" title="Revenue This Month Breakdown" />
        <View style={styles.chartCard}>
          {(() => {
            const current = data!.monthly_revenue[data!.monthly_revenue.length - 1];
            const total = current.revenue;
            return (
              <View style={styles.revenueBreakdown}>
                <View style={styles.revItem}>
                  <View style={[styles.revIconBg, { backgroundColor: colors.primary + '20' }]}>
                    <MaterialIcons name="toll" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.revInfo}>
                    <Text style={styles.revLabel}>Token Packages</Text>
                    <Text style={styles.revValue}>¥{current.tokens.toLocaleString()}</Text>
                  </View>
                  <Text style={styles.revPct}>
                    {total > 0 ? ((current.tokens / total) * 100).toFixed(0) : '0'}%
                  </Text>
                </View>
                <View style={styles.revDivider} />
                <View style={styles.revItem}>
                  <View style={[styles.revIconBg, { backgroundColor: colors.accent + '20' }]}>
                    <MaterialIcons name="event-available" size={20} color={colors.accent} />
                  </View>
                  <View style={styles.revInfo}>
                    <Text style={styles.revLabel}>Private Lessons</Text>
                    <Text style={styles.revValue}>¥{current.lessons.toLocaleString()}</Text>
                  </View>
                  <Text style={styles.revPct}>
                    {total > 0 ? ((current.lessons / total) * 100).toFixed(0) : '0'}%
                  </Text>
                </View>
                <View style={styles.revDivider} />
                <View style={styles.revItem}>
                  <View style={[styles.revIconBg, { backgroundColor: colors.success + '20' }]}>
                    <MaterialIcons name="attach-money" size={20} color={colors.success} />
                  </View>
                  <View style={styles.revInfo}>
                    <Text style={[styles.revLabel, { fontWeight: '700' }]}>Total</Text>
                    <Text style={[styles.revValue, { color: colors.success, fontSize: 20 }]}>¥{total.toLocaleString()}</Text>
                  </View>
                  {k.revenue_growth_pct !== 0 && (
                    <View style={[
                      styles.growthBadge,
                      { backgroundColor: k.revenue_growth_pct >= 0 ? colors.success + '20' : colors.error + '20' }
                    ]}>
                      <MaterialIcons
                        name={k.revenue_growth_pct >= 0 ? 'trending-up' : 'trending-down'}
                        size={14}
                        color={k.revenue_growth_pct >= 0 ? colors.success : colors.error}
                      />
                      <Text style={[
                        styles.growthText,
                        { color: k.revenue_growth_pct >= 0 ? colors.success : colors.error }
                      ]}>
                        {Math.abs(k.revenue_growth_pct).toFixed(1)}%
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })()}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <View style={emptyStyles.container}>
      <MaterialIcons name="bar-chart" size={36} color={colors.textLight + '60'} />
      <Text style={emptyStyles.text}>{label}</Text>
    </View>
  );
}
const emptyStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 40 },
  text: { color: colors.textLight, marginTop: 8, fontSize: 14 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...typography.body, color: colors.textLight, marginTop: spacing.md },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '20',
  },
  backBtn: {
    width: 40, height: 40,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { ...typography.h2, color: colors.text, fontSize: 20 },

  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
    overflow: 'hidden',
  },
  chartStyle: {
    borderRadius: borderRadius.md,
    marginLeft: -spacing.sm,
  },

  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  legendDot: {
    width: 10, height: 10, borderRadius: 5,
  },
  legendText: {
    fontSize: 12, color: colors.textLight,
  },

  breakdownGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  breakdownCol: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownMonth: {
    fontSize: 10,
    color: colors.textLight,
    marginBottom: 4,
  },
  breakdownBar: {
    width: 24,
    height: 60,
    justifyContent: 'flex-end',
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  breakdownFill: {
    width: '100%',
    borderRadius: 2,
  },

  chartNote: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  pieTable: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  pieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  pieDot: {
    width: 10, height: 10, borderRadius: 5,
  },
  pieLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  pieCount: {
    fontSize: 13,
    color: colors.textLight,
    fontWeight: '600',
  },

  revenueBreakdown: { gap: 0 },
  revItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  revIconBg: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  revInfo: { flex: 1 },
  revLabel: {
    fontSize: 13, color: colors.textLight, marginBottom: 2,
  },
  revValue: {
    fontSize: 18, fontWeight: '700', color: colors.text,
  },
  revPct: {
    fontSize: 14, fontWeight: '700', color: colors.textLight,
  },
  revDivider: {
    height: 1, backgroundColor: colors.border, marginHorizontal: 0,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  growthText: {
    fontSize: 12, fontWeight: '700',
  },
});
