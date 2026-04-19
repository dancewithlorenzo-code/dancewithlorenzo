import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAlert } from '@/template';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import {
  AutoTuneAnalysis,
  ThresholdRecommendation,
  generateRecommendations,
  applyRecommendation,
  rollbackRecommendation,
  getPendingRecommendations,
  getRecommendationHistory,
} from '@/services/thresholdAutoTuneService';

type ViewMode = 'pending' | 'history';

export default function AutoTuneThresholdsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useAlert();

  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('pending');

  const [analysis, setAnalysis] = useState<AutoTuneAnalysis | null>(null);
  const [pendingRecs, setPendingRecs] = useState<ThresholdRecommendation[]>([]);
  const [history, setHistory] = useState<ThresholdRecommendation[]>([]);

  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [viewMode]);

  const loadData = async () => {
    if (viewMode === 'pending') {
      await loadPendingRecommendations();
    } else {
      await loadHistory();
    }
    setRefreshing(false);
  };

  const loadPendingRecommendations = async () => {
    setLoading(true);
    const { data, error } = await getPendingRecommendations();
    setLoading(false);

    if (error) {
      showAlert('Error', error);
    } else if (data) {
      setPendingRecs(data);
    }
  };

  const loadHistory = async () => {
    setLoading(true);
    const { data, error } = await getRecommendationHistory();
    setLoading(false);

    if (error) {
      showAlert('Error', error);
    } else if (data) {
      setHistory(data);
    }
  };

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    const { data, error } = await generateRecommendations();
    setAnalyzing(false);

    if (error) {
      showAlert('Error', error);
    } else if (data) {
      setAnalysis(data);
      setPendingRecs(data.recommendations);
      showAlert(
        'Analysis Complete',
        `Generated ${data.summary.recommended_changes} recommendations (${data.summary.high_confidence_changes} high confidence)`
      );
    }
  };

  const handleApply = async (recommendationId: string) => {
    setApplyingId(recommendationId);
    const { data, error } = await applyRecommendation(recommendationId);
    setApplyingId(null);

    if (error) {
      showAlert('Error', error);
    } else if (data) {
      showAlert('Success', 'Threshold updated successfully! Changes take effect immediately.');
      await loadPendingRecommendations();
    }
  };

  const handleRollback = async (recommendationId: string) => {
    setRollingBackId(recommendationId);
    const { data, error } = await rollbackRecommendation(recommendationId);
    setRollingBackId(null);

    if (error) {
      showAlert('Error', error);
    } else if (data) {
      showAlert('Success', 'Threshold rolled back to previous value!');
      await loadHistory();
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'increase':
        return { icon: 'trending-up', color: '#FFB800' };
      case 'decrease':
        return { icon: 'trending-down', color: colors.primary };
      case 'no_change':
        return { icon: 'check-circle', color: colors.success };
      default:
        return { icon: 'help', color: colors.textLight };
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 85) return colors.success;
    if (score >= 70) return '#FFB800';
    return colors.error;
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 85) return { label: 'High', emoji: '🟢' };
    if (score >= 70) return { label: 'Medium', emoji: '🟡' };
    return { label: 'Low', emoji: '🔴' };
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading recommendations...</Text>
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
        <Text style={styles.headerTitle}>Auto-Tune Thresholds</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, viewMode === 'pending' && styles.tabActive]}
          onPress={() => setViewMode('pending')}
        >
          <Text style={[styles.tabText, viewMode === 'pending' && styles.tabTextActive]}>
            Pending ({pendingRecs.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, viewMode === 'history' && styles.tabActive]}
          onPress={() => setViewMode('history')}
        >
          <Text style={[styles.tabText, viewMode === 'history' && styles.tabTextActive]}>
            History
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
        {viewMode === 'pending' && (
          <>
            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <MaterialIcons name="auto-awesome" size={24} color={colors.primary} />
              <Text style={styles.infoBannerText}>
                AI-powered analysis of 30 days historical data to optimize alert sensitivity.
                Reduce noise and catch real issues faster.
              </Text>
            </View>

            {/* Run Analysis Button */}
            <Pressable
              style={[styles.analyzeButton, analyzing && styles.analyzeButtonDisabled]}
              onPress={handleRunAnalysis}
              disabled={analyzing}
            >
              {analyzing ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <>
                  <MaterialIcons name="psychology" size={24} color={colors.surface} />
                  <Text style={styles.analyzeButtonText}>
                    {pendingRecs.length > 0 ? 'Re-analyze Thresholds' : 'Run ML Analysis'}
                  </Text>
                </>
              )}
            </Pressable>

            {/* Summary Card */}
            {analysis && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>📊 Analysis Summary</Text>
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{analysis.summary.total_thresholds}</Text>
                    <Text style={styles.summaryLabel}>Analyzed</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: colors.accent }]}>
                      {analysis.summary.recommended_changes}
                    </Text>
                    <Text style={styles.summaryLabel}>Changes</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: colors.success }]}>
                      {analysis.summary.high_confidence_changes}
                    </Text>
                    <Text style={styles.summaryLabel}>High Conf.</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: colors.primary }]}>
                      {analysis.summary.avg_confidence_score}%
                    </Text>
                    <Text style={styles.summaryLabel}>Avg Conf.</Text>
                  </View>
                </View>
                <Text style={styles.summaryFooter}>
                  Based on {analysis.summary.analysis_period_days} days of data
                </Text>
              </View>
            )}

            {/* Recommendations List */}
            {pendingRecs.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>
                  💡 Recommended Changes ({pendingRecs.length})
                </Text>
                {pendingRecs.map((rec) => {
                  const recIcon = getRecommendationIcon(rec.recommendation_type);
                  const confBadge = getConfidenceBadge(rec.confidence_score);
                  const isApplying = applyingId === rec.id;

                  return (
                    <View key={rec.id} style={styles.recommendationCard}>
                      {/* Header */}
                      <View style={styles.recHeader}>
                        <View style={styles.recHeaderLeft}>
                          <MaterialIcons
                            name={recIcon.icon as any}
                            size={24}
                            color={recIcon.color}
                          />
                          <View style={{ flex: 1, marginLeft: spacing.sm }}>
                            <Text style={styles.recName}>
                              {rec.threshold_name?.replace(/_/g, ' ').toUpperCase()}
                            </Text>
                            <Text style={styles.recCategory}>{rec.category}</Text>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.confidenceBadge,
                            { backgroundColor: getConfidenceColor(rec.confidence_score) + '20' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.confidenceBadgeText,
                              { color: getConfidenceColor(rec.confidence_score) },
                            ]}
                          >
                            {confBadge.emoji} {confBadge.label} ({rec.confidence_score}%)
                          </Text>
                        </View>
                      </View>

                      {/* Values Comparison */}
                      <View style={styles.valuesContainer}>
                        <View style={styles.valueBox}>
                          <Text style={styles.valueLabel}>Current</Text>
                          <Text style={styles.currentValue}>
                            {rec.current_value}
                            <Text style={styles.valueUnit}> {rec.threshold_unit}</Text>
                          </Text>
                        </View>
                        <MaterialIcons
                          name="arrow-forward"
                          size={24}
                          color={recIcon.color}
                          style={{ marginHorizontal: spacing.md }}
                        />
                        <View style={styles.valueBox}>
                          <Text style={styles.valueLabel}>Recommended</Text>
                          <Text style={[styles.recommendedValue, { color: recIcon.color }]}>
                            {rec.recommended_value}
                            <Text style={styles.valueUnit}> {rec.threshold_unit}</Text>
                          </Text>
                        </View>
                      </View>

                      {/* Reasoning */}
                      <View style={styles.reasoningBox}>
                        <Text style={styles.reasoningText}>{rec.reasoning}</Text>
                      </View>

                      {/* Metrics */}
                      <View style={styles.metricsRow}>
                        <View style={styles.metricItem}>
                          <Text style={styles.metricLabel}>Alert Frequency</Text>
                          <Text style={styles.metricValue}>{rec.alert_frequency} times</Text>
                        </View>
                        {rec.false_positive_rate !== undefined && rec.false_positive_rate > 0 && (
                          <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>False Positives</Text>
                            <Text style={[styles.metricValue, { color: colors.error }]}>
                              {rec.false_positive_rate.toFixed(0)}%
                            </Text>
                          </View>
                        )}
                        {rec.missed_issue_rate !== undefined && rec.missed_issue_rate > 0 && (
                          <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>Missed Issues</Text>
                            <Text style={[styles.metricValue, { color: '#FFB800' }]}>
                              {rec.missed_issue_rate.toFixed(0)}%
                            </Text>
                          </View>
                        )}
                        <View style={styles.metricItem}>
                          <Text style={styles.metricLabel}>Data Points</Text>
                          <Text style={styles.metricValue}>{rec.data_points_analyzed}</Text>
                        </View>
                      </View>

                      {/* Actions */}
                      {rec.recommendation_type !== 'no_change' && (
                        <Pressable
                          style={[
                            styles.applyButton,
                            isApplying && styles.applyButtonDisabled,
                          ]}
                          onPress={() => handleApply(rec.id)}
                          disabled={isApplying}
                        >
                          {isApplying ? (
                            <ActivityIndicator size="small" color={colors.surface} />
                          ) : (
                            <>
                              <MaterialIcons name="check-circle" size={20} color={colors.surface} />
                              <Text style={styles.applyButtonText}>Apply This Change</Text>
                            </>
                          )}
                        </Pressable>
                      )}

                      {rec.recommendation_type === 'no_change' && (
                        <View style={styles.noChangeBox}>
                          <MaterialIcons name="thumb-up" size={20} color={colors.success} />
                          <Text style={styles.noChangeText}>Threshold is well-calibrated ✓</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="science" size={64} color={colors.textLight} />
                <Text style={styles.emptyTitle}>No Recommendations Yet</Text>
                <Text style={styles.emptyText}>
                  Click "Run ML Analysis" to analyze 30 days of data and get optimization recommendations.
                </Text>
              </View>
            )}
          </>
        )}

        {viewMode === 'history' && (
          <>
            {history.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>📜 Applied Changes ({history.length})</Text>
                {history.map((rec) => {
                  const recIcon = getRecommendationIcon(rec.recommendation_type);
                  const isRollingBack = rollingBackId === rec.id;
                  const canRollback = rec.status === 'applied';

                  return (
                    <View
                      key={rec.id}
                      style={[
                        styles.historyCard,
                        rec.status === 'rolled_back' && styles.historyCardRolledBack,
                      ]}
                    >
                      <View style={styles.historyHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.historyName}>
                            {rec.threshold_name?.replace(/_/g, ' ').toUpperCase()}
                          </Text>
                          <Text style={styles.historyDate}>
                            {rec.status === 'applied' ? 'Applied' : 'Rolled back'}{' '}
                            {new Date(
                              rec.status === 'applied'
                                ? rec.applied_at || rec.created_at
                                : rec.rolled_back_at || rec.created_at
                            ).toLocaleDateString()}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor:
                                rec.status === 'applied'
                                  ? colors.success + '20'
                                  : colors.textLight + '20',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              {
                                color: rec.status === 'applied' ? colors.success : colors.textLight,
                              },
                            ]}
                          >
                            {rec.status === 'applied' ? '✅ Applied' : '↩️ Rolled Back'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.historyValues}>
                        <Text style={styles.historyValueText}>
                          {rec.previous_value || rec.current_value} → {rec.recommended_value}{' '}
                          {rec.threshold_unit}
                        </Text>
                        <MaterialIcons name={recIcon.icon as any} size={16} color={recIcon.color} />
                      </View>

                      <Text style={styles.historyReasoning}>{rec.reasoning}</Text>

                      {canRollback && (
                        <Pressable
                          style={[
                            styles.rollbackButton,
                            isRollingBack && styles.rollbackButtonDisabled,
                          ]}
                          onPress={() => handleRollback(rec.id)}
                          disabled={isRollingBack}
                        >
                          {isRollingBack ? (
                            <ActivityIndicator size="small" color={colors.surface} />
                          ) : (
                            <>
                              <MaterialIcons name="undo" size={18} color={colors.surface} />
                              <Text style={styles.rollbackButtonText}>
                                Rollback to {rec.previous_value}
                              </Text>
                            </>
                          )}
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </>
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="history" size={64} color={colors.textLight} />
                <Text style={styles.emptyTitle}>No History Yet</Text>
                <Text style={styles.emptyText}>
                  Applied threshold changes will appear here with rollback options.
                </Text>
              </View>
            )}
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
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    ...shadows.lg,
  },
  analyzeButtonDisabled: {
    backgroundColor: colors.textLight,
    opacity: 0.6,
  },
  analyzeButtonText: {
    ...typography.button,
    color: colors.surface,
    fontSize: 16,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  summaryTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    ...typography.h2,
    color: colors.text,
    fontSize: 28,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: spacing.xs,
    fontSize: 11,
  },
  summaryFooter: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  recommendationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  recHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  recName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  recCategory: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 11,
    marginTop: 2,
  },
  confidenceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  confidenceBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  valuesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  valueBox: {
    alignItems: 'center',
  },
  valueLabel: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 11,
    marginBottom: spacing.xs,
  },
  currentValue: {
    ...typography.h3,
    color: colors.text,
    fontSize: 24,
  },
  recommendedValue: {
    ...typography.h3,
    fontSize: 24,
    fontWeight: '700',
  },
  valueUnit: {
    ...typography.caption,
    fontSize: 14,
  },
  reasoningBox: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  reasoningText: {
    ...typography.caption,
    color: colors.text,
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metricItem: {
    flex: 1,
    minWidth: '45%',
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 10,
    marginBottom: spacing.xs,
  },
  metricValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  applyButtonDisabled: {
    backgroundColor: colors.textLight,
    opacity: 0.6,
  },
  applyButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  noChangeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success + '15',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  noChangeText: {
    ...typography.body,
    color: colors.success,
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
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  historyCardRolledBack: {
    opacity: 0.7,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  historyName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  historyDate: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  historyValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  historyValueText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  historyReasoning: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  rollbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  rollbackButtonDisabled: {
    backgroundColor: colors.textLight,
    opacity: 0.6,
  },
  rollbackButtonText: {
    ...typography.button,
    fontSize: 13,
    color: colors.surface,
  },
});
