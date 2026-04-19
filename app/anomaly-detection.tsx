import React, { useEffect, useState } from 'react';
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
import { useAlert } from '@/template';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import {
  AnomalyDetection,
  AnomalyBaseline,
  getRecentAnomalies,
  getAllBaselines,
  resolveAnomaly,
  getAnomalyStats,
} from '@/services/anomalyDetectionService';

type ViewMode = 'detections' | 'baselines' | 'stats';

export default function AnomalyDetectionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useAlert();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('detections');

  const [detections, setDetections] = useState<AnomalyDetection[]>([]);
  const [baselines, setBaselines] = useState<AnomalyBaseline[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [viewMode]);

  const loadData = async () => {
    if (viewMode === 'detections') {
      await loadDetections();
    } else if (viewMode === 'baselines') {
      await loadBaselines();
    } else {
      await loadStats();
    }
    setRefreshing(false);
  };

  const loadDetections = async () => {
    setLoading(true);
    const { data, error } = await getRecentAnomalies(50);
    setLoading(false);

    if (error) {
      showAlert('Error', error);
    } else if (data) {
      setDetections(data);
    }
  };

  const loadBaselines = async () => {
    setLoading(true);
    const { data, error } = await getAllBaselines();
    setLoading(false);

    if (error) {
      showAlert('Error', error);
    } else if (data) {
      setBaselines(data);
    }
  };

  const loadStats = async () => {
    setLoading(true);
    const { data, error } = await getAnomalyStats(30);
    setLoading(false);

    if (error) {
      showAlert('Error', error);
    } else if (data) {
      setStats(data);
    }
  };

  const handleResolve = async (anomalyId: string, status: 'resolved' | 'false_positive') => {
    setResolvingId(anomalyId);
    const { error } = await resolveAnomaly(anomalyId, status);
    setResolvingId(null);

    if (error) {
      showAlert('Error', error);
    } else {
      showAlert('Success', `Anomaly marked as ${status.replace('_', ' ')}`);
      await loadDetections();
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return colors.error;
      case 'warning': return '#FFB800';
      default: return colors.primary;
    }
  };

  const getAnomalyIcon = (type: string) => {
    switch (type) {
      case 'spike': return 'trending-up';
      case 'drop': return 'trending-down';
      case 'trend_change': return 'show-chart';
      case 'volatility': return 'waves';
      default: return 'analytics';
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading anomaly detection...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Anomaly Detection</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, viewMode === 'detections' && styles.tabActive]}
          onPress={() => setViewMode('detections')}
        >
          <Text style={[styles.tabText, viewMode === 'detections' && styles.tabTextActive]}>
            Detections
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, viewMode === 'baselines' && styles.tabActive]}
          onPress={() => setViewMode('baselines')}
        >
          <Text style={[styles.tabText, viewMode === 'baselines' && styles.tabTextActive]}>
            Baselines
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, viewMode === 'stats' && styles.tabActive]}
          onPress={() => setViewMode('stats')}
        >
          <Text style={[styles.tabText, viewMode === 'stats' && styles.tabTextActive]}>
            Statistics
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {viewMode === 'detections' && (
          <>
            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <MaterialIcons name="analytics" size={24} color={colors.primary} />
              <Text style={styles.infoBannerText}>
                Statistical anomaly detection using Z-score analysis. Detects unusual patterns before they breach thresholds.
              </Text>
            </View>

            {detections.length > 0 ? (
              detections.map((detection) => {
                const severityColor = getSeverityColor(detection.severity);
                const anomalyIcon = getAnomalyIcon(detection.anomaly_type);
                const isResolving = resolvingId === detection.id;

                return (
                  <View
                    key={detection.id}
                    style={[
                      styles.detectionCard,
                      detection.status !== 'new' && styles.detectionCardResolved,
                      { borderLeftColor: severityColor, borderLeftWidth: 4 },
                    ]}
                  >
                    {/* Header */}
                    <View style={styles.detectionHeader}>
                      <View style={styles.detectionHeaderLeft}>
                        <MaterialIcons name={anomalyIcon} size={24} color={severityColor} />
                        <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                          <Text style={styles.detectionMetric}>
                            {detection.metric_name.replace(/_/g, ' ').toUpperCase()}
                          </Text>
                          <Text style={styles.detectionDate}>
                            {new Date(detection.detected_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.severityBadge,
                          { backgroundColor: severityColor + '20' },
                        ]}
                      >
                        <Text style={[styles.severityBadgeText, { color: severityColor }]}>
                          {detection.severity.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* Values Comparison */}
                    <View style={styles.valuesRow}>
                      <View style={styles.valueBox}>
                        <Text style={styles.valueLabel}>Actual</Text>
                        <Text style={[styles.actualValue, { color: severityColor }]}>
                          {detection.actual_value.toFixed(0)}
                        </Text>
                      </View>
                      <MaterialIcons name="arrow-forward" size={20} color={colors.textLight} />
                      <View style={styles.valueBox}>
                        <Text style={styles.valueLabel}>Expected</Text>
                        <Text style={styles.expectedValue}>
                          {detection.expected_value.toFixed(0)}
                        </Text>
                      </View>
                      <View style={styles.valueBox}>
                        <Text style={styles.valueLabel}>Deviation</Text>
                        <Text style={[styles.deviationValue, { color: severityColor }]}>
                          {detection.deviation_percent > 0 ? '+' : ''}
                          {detection.deviation_percent.toFixed(1)}%
                        </Text>
                      </View>
                    </View>

                    {/* Statistical Analysis */}
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Z-Score</Text>
                        <Text style={styles.statValue}>{detection.z_score.toFixed(2)}σ</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Confidence</Text>
                        <Text style={styles.statValue}>{detection.confidence_level.toFixed(1)}%</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Type</Text>
                        <Text style={styles.statValue}>
                          {detection.anomaly_type.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>

                    {/* Historical Comparison Graph */}
                    {detection.historical_comparison?.last_7_days && (
                      <View style={styles.chartSection}>
                        <Text style={styles.chartTitle}>Last 7 Days Trend</Text>
                        <View style={styles.chart}>
                          {detection.historical_comparison.last_7_days.map((value, index) => {
                            const maxValue = Math.max(...detection.historical_comparison.last_7_days, detection.actual_value);
                            const height = (value / maxValue) * 60;
                            const isToday = index === detection.historical_comparison.last_7_days.length - 1;

                            return (
                              <View key={index} style={styles.chartBar}>
                                <View
                                  style={[
                                    styles.chartBarFill,
                                    {
                                      height: height || 2,
                                      backgroundColor: isToday ? severityColor : colors.primary + '40',
                                    },
                                  ]}
                                />
                                <Text style={styles.chartBarLabel}>{value.toFixed(0)}</Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* Contributing Factors */}
                    {detection.contributing_factors && detection.contributing_factors.length > 0 && (
                      <View style={styles.factorsSection}>
                        <Text style={styles.factorsTitle}>💡 Contributing Factors:</Text>
                        {detection.contributing_factors.map((factor, index) => (
                          <Text key={index} style={styles.factorText}>• {factor}</Text>
                        ))}
                      </View>
                    )}

                    {/* Actions */}
                    {detection.status === 'new' && (
                      <View style={styles.actionRow}>
                        <Pressable
                          style={[styles.actionButton, styles.falsePositiveButton]}
                          onPress={() => handleResolve(detection.id, 'false_positive')}
                          disabled={isResolving}
                        >
                          {isResolving ? (
                            <ActivityIndicator size="small" color={colors.surface} />
                          ) : (
                            <>
                              <MaterialIcons name="cancel" size={18} color={colors.surface} />
                              <Text style={styles.actionButtonText}>False Positive</Text>
                            </>
                          )}
                        </Pressable>
                        <Pressable
                          style={[styles.actionButton, styles.resolveButton]}
                          onPress={() => handleResolve(detection.id, 'resolved')}
                          disabled={isResolving}
                        >
                          {isResolving ? (
                            <ActivityIndicator size="small" color={colors.surface} />
                          ) : (
                            <>
                              <MaterialIcons name="check-circle" size={18} color={colors.surface} />
                              <Text style={styles.actionButtonText}>Mark Resolved</Text>
                            </>
                          )}
                        </Pressable>
                      </View>
                    )}

                    {detection.status !== 'new' && (
                      <View style={styles.statusRow}>
                        <MaterialIcons
                          name={detection.status === 'resolved' ? 'check-circle' : 'cancel'}
                          size={16}
                          color={detection.status === 'resolved' ? colors.success : colors.textLight}
                        />
                        <Text style={styles.statusText}>
                          {detection.status === 'resolved' ? 'Resolved' : 'False Positive'}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="check-circle" size={64} color={colors.success} />
                <Text style={styles.emptyTitle}>No Anomalies Detected</Text>
                <Text style={styles.emptyText}>
                  All metrics are within normal variance. The system is learning patterns and will alert you to unusual activity.
                </Text>
              </View>
            )}
          </>
        )}

        {viewMode === 'baselines' && (
          <>
            <Text style={styles.sectionTitle}>Statistical Baselines</Text>
            <Text style={styles.sectionSubtitle}>
              These baselines are automatically updated using 30-day historical data
            </Text>

            {baselines.map((baseline) => (
              <View key={baseline.id} style={styles.baselineCard}>
                <View style={styles.baselineHeader}>
                  <Text style={styles.baselineName}>
                    {baseline.metric_name.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                  <View
                    style={[
                      styles.categoryBadge,
                      {
                        backgroundColor:
                          baseline.metric_category === 'business'
                            ? colors.success + '20'
                            : baseline.metric_category === 'technical'
                            ? colors.accent + '20'
                            : colors.primary + '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryBadgeText,
                        {
                          color:
                            baseline.metric_category === 'business'
                              ? colors.success
                              : baseline.metric_category === 'technical'
                              ? colors.accent
                              : colors.primary,
                        },
                      ]}
                    >
                      {baseline.metric_category.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.baselineStats}>
                  <View style={styles.baselineStat}>
                    <Text style={styles.baselineStatLabel}>7-Day Avg</Text>
                    <Text style={styles.baselineStatValue}>
                      {baseline.moving_average_7d.toFixed(1)}
                    </Text>
                  </View>
                  <View style={styles.baselineStat}>
                    <Text style={styles.baselineStatLabel}>30-Day Avg</Text>
                    <Text style={styles.baselineStatValue}>
                      {baseline.moving_average_30d.toFixed(1)}
                    </Text>
                  </View>
                  <View style={styles.baselineStat}>
                    <Text style={styles.baselineStatLabel}>Std Dev</Text>
                    <Text style={styles.baselineStatValue}>
                      {baseline.standard_deviation.toFixed(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.baselineRange}>
                  <Text style={styles.baselineRangeText}>
                    Range: {baseline.min_value.toFixed(0)} - {baseline.max_value.toFixed(0)}
                  </Text>
                  <Text style={styles.baselineDataPoints}>
                    {baseline.data_points_count} data points
                  </Text>
                </View>

                <View style={styles.thresholdRow}>
                  <View style={styles.thresholdItem}>
                    <Text style={styles.thresholdLabel}>Warning (Z-score)</Text>
                    <Text style={styles.thresholdValue}>{baseline.z_score_warning.toFixed(1)}σ</Text>
                  </View>
                  <View style={styles.thresholdItem}>
                    <Text style={styles.thresholdLabel}>Critical (Z-score)</Text>
                    <Text style={styles.thresholdValue}>{baseline.z_score_critical.toFixed(1)}σ</Text>
                  </View>
                </View>

                {baseline.has_weekly_pattern && (
                  <View style={styles.patternBadge}>
                    <MaterialIcons name="event-repeat" size={14} color={colors.primary} />
                    <Text style={styles.patternText}>Weekly pattern detected</Text>
                  </View>
                )}

                <Text style={styles.baselineUpdated}>
                  Updated: {new Date(baseline.last_calculated_at).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </>
        )}

        {viewMode === 'stats' && stats && (
          <>
            <Text style={styles.sectionTitle}>30-Day Statistics</Text>

            {/* Summary Cards */}
            <View style={styles.statsGrid}>
              <View style={[styles.statsCard, { backgroundColor: colors.error + '15' }]}>
                <MaterialIcons name="error" size={32} color={colors.error} />
                <Text style={[styles.statsCardValue, { color: colors.error }]}>
                  {stats.critical_count}
                </Text>
                <Text style={styles.statsCardLabel}>Critical</Text>
              </View>
              <View style={[styles.statsCard, { backgroundColor: '#FFB800' + '15' }]}>
                <MaterialIcons name="warning" size={32} color="#FFB800" />
                <Text style={[styles.statsCardValue, { color: '#FFB800' }]}>
                  {stats.warning_count}
                </Text>
                <Text style={styles.statsCardLabel}>Warnings</Text>
              </View>
              <View style={[styles.statsCard, { backgroundColor: colors.success + '15' }]}>
                <MaterialIcons name="check-circle" size={32} color={colors.success} />
                <Text style={[styles.statsCardValue, { color: colors.success }]}>
                  {stats.resolved_count}
                </Text>
                <Text style={styles.statsCardLabel}>Resolved</Text>
              </View>
              <View style={[styles.statsCard, { backgroundColor: colors.textLight + '15' }]}>
                <MaterialIcons name="block" size={32} color={colors.textLight} />
                <Text style={[styles.statsCardValue, { color: colors.textLight }]}>
                  {stats.false_positive_count}
                </Text>
                <Text style={styles.statsCardLabel}>False Positives</Text>
              </View>
            </View>

            {/* Key Metrics */}
            <View style={styles.keyMetricsCard}>
              <Text style={styles.keyMetricsTitle}>Key Metrics</Text>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Total Anomalies</Text>
                <Text style={styles.metricValue}>{stats.total_anomalies}</Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Avg Resolution Time</Text>
                <Text style={styles.metricValue}>
                  {stats.avg_resolution_time_hours.toFixed(1)}h
                </Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Most Frequent Metric</Text>
                <Text style={styles.metricValue}>
                  {stats.most_frequent_metric.replace(/_/g, ' ')}
                </Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Anomaly Trend</Text>
                <View style={styles.trendBadge}>
                  <MaterialIcons
                    name={
                      stats.anomaly_trend === 'increasing'
                        ? 'trending-up'
                        : stats.anomaly_trend === 'decreasing'
                        ? 'trending-down'
                        : 'trending-flat'
                    }
                    size={16}
                    color={
                      stats.anomaly_trend === 'increasing'
                        ? colors.error
                        : stats.anomaly_trend === 'decreasing'
                        ? colors.success
                        : colors.textLight
                    }
                  />
                  <Text
                    style={[
                      styles.trendText,
                      {
                        color:
                          stats.anomaly_trend === 'increasing'
                            ? colors.error
                            : stats.anomaly_trend === 'decreasing'
                            ? colors.success
                            : colors.textLight,
                      },
                    ]}
                  >
                    {stats.anomaly_trend.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textLight,
    marginTop: spacing.md,
  },
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '20',
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    color: colors.textLight,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  infoBannerText: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
    lineHeight: 18,
  },
  detectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  detectionCardResolved: {
    opacity: 0.7,
  },
  detectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  detectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detectionMetric: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  detectionDate: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 11,
    marginTop: 2,
  },
  severityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  severityBadgeText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
  },
  valuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  valueBox: {
    alignItems: 'center',
  },
  valueLabel: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 10,
    marginBottom: spacing.xs,
  },
  actualValue: {
    ...typography.h3,
    fontSize: 20,
    fontWeight: '700',
  },
  expectedValue: {
    ...typography.h3,
    fontSize: 20,
    color: colors.text,
  },
  deviationValue: {
    ...typography.h3,
    fontSize: 20,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 10,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  chartSection: {
    marginBottom: spacing.md,
  },
  chartTitle: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.sm,
    fontSize: 11,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 80,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  chartBar: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
    marginHorizontal: 2,
  },
  chartBarFill: {
    width: '100%',
    borderRadius: borderRadius.xs,
    marginBottom: spacing.xs,
  },
  chartBarLabel: {
    ...typography.caption,
    fontSize: 8,
    color: colors.textLight,
  },
  factorsSection: {
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  factorsTitle: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  factorText: {
    ...typography.caption,
    color: colors.text,
    fontSize: 11,
    lineHeight: 16,
    marginTop: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  falsePositiveButton: {
    backgroundColor: colors.textLight,
  },
  resolveButton: {
    backgroundColor: colors.success,
  },
  actionButtonText: {
    ...typography.button,
    fontSize: 12,
    color: colors.surface,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  statusText: {
    ...typography.caption,
    color: colors.textLight,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textLight,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  baselineCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  baselineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  baselineName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  categoryBadgeText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
  },
  baselineStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  baselineStat: {
    alignItems: 'center',
  },
  baselineStatLabel: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 10,
    marginBottom: spacing.xs,
  },
  baselineStatValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  baselineRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  baselineRangeText: {
    ...typography.caption,
    color: colors.textLight,
  },
  baselineDataPoints: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 11,
  },
  thresholdRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  thresholdItem: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  thresholdLabel: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 10,
    marginBottom: spacing.xs,
  },
  thresholdValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  patternBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  patternText: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  baselineUpdated: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 10,
    fontStyle: 'italic',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statsCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  statsCardValue: {
    ...typography.h1,
    fontSize: 36,
    marginVertical: spacing.sm,
  },
  statsCardLabel: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 11,
  },
  keyMetricsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  keyMetricsTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '10',
  },
  metricLabel: {
    ...typography.body,
    color: colors.textLight,
  },
  metricValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trendText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
});
