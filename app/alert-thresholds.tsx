import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAlert } from '@/template';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import {
  AlertThreshold,
  ThresholdPreview,
  getAllThresholds,
  updateThreshold,
  resetToDefaults,
  getThresholdPreview,
} from '@/services/alertThresholdService';

export default function AlertThresholdsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useAlert();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [thresholds, setThresholds] = useState<AlertThreshold[]>([]);
  const [previews, setPreviews] = useState<ThresholdPreview[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [updating, setUpdating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadThresholds(), loadPreview()]);
    setRefreshing(false);
  };

  const loadThresholds = async () => {
    const { data, error } = await getAllThresholds();
    setLoading(false);
    
    if (error) {
      showAlert('Error', error);
    } else if (data) {
      setThresholds(data);
    }
  };

  const loadPreview = async () => {
    setPreviewLoading(true);
    const { data, error } = await getThresholdPreview();
    setPreviewLoading(false);
    
    if (error) {
      console.error('Failed to load preview:', error);
    } else if (data) {
      setPreviews(data);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleEdit = (threshold: AlertThreshold) => {
    setEditingId(threshold.id);
    setEditValue(threshold.threshold_value.toString());
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleSave = async (id: string) => {
    const value = parseFloat(editValue);
    if (isNaN(value) || value < 0) {
      showAlert('Error', 'Please enter a valid positive number');
      return;
    }

    setUpdating(true);
    const { error } = await updateThreshold(id, { threshold_value: value });
    setUpdating(false);

    if (error) {
      showAlert('Error', error);
    } else {
      showAlert('Success', 'Threshold updated successfully!');
      setEditingId(null);
      setEditValue('');
      await loadData(); // Reload to update preview
    }
  };

  const handleToggleActive = async (threshold: AlertThreshold) => {
    setUpdating(true);
    const { error } = await updateThreshold(threshold.id, { is_active: !threshold.is_active });
    setUpdating(false);

    if (error) {
      showAlert('Error', error);
    } else {
      showAlert('Success', `Threshold ${!threshold.is_active ? 'activated' : 'deactivated'}`);
      await loadData();
    }
  };

  const handleResetToDefaults = async () => {
    setResetting(true);
    const { error } = await resetToDefaults();
    setResetting(false);

    if (error) {
      showAlert('Error', error);
    } else {
      showAlert('Success', 'All thresholds reset to default values!');
      await loadData();
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'database': return 'storage';
      case 'stripe': return 'payment';
      case 'edge_function': return 'functions';
      case 'business': return 'trending-up';
      default: return 'settings';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'database': return '#2196F3';
      case 'stripe': return '#9C27B0';
      case 'edge_function': return '#FF9800';
      case 'business': return '#4CAF50';
      default: return colors.textLight;
    }
  };

  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return colors.error;
      case 'warning': return '#ffb800';
      case 'info': return colors.primary;
      default: return colors.textLight;
    }
  };

  const getAlertLevelIcon = (level: string) => {
    switch (level) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '✅';
    }
  };

  const groupedThresholds = thresholds.reduce((acc, threshold) => {
    if (!acc[threshold.category]) {
      acc[threshold.category] = [];
    }
    acc[threshold.category].push(threshold);
    return acc;
  }, {} as Record<string, AlertThreshold[]>);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading thresholds...</Text>
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
        <Text style={styles.headerTitle}>Alert Thresholds</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push('/auto-tune-thresholds')}
            style={styles.autoTuneButton}
          >
            <MaterialIcons name="auto-awesome" size={18} color={colors.surface} />
          </Pressable>
          <Pressable
            onPress={handleResetToDefaults}
            style={[styles.resetButton, resetting && styles.resetButtonDisabled]}
            disabled={resetting}
          >
            {resetting ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <MaterialIcons name="restore" size={20} color={colors.surface} />
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <MaterialIcons name="info-outline" size={24} color={colors.primary} />
          <Text style={styles.infoBannerText}>
            Customize monitoring alert sensitivity. Changes take effect immediately for next monitoring run.
          </Text>
        </View>

        {/* Real-Time Preview Section */}
        <View style={styles.previewSection}>
          <View style={styles.previewHeader}>
            <Text style={styles.sectionTitle}>🔍 Real-Time Preview</Text>
            <Pressable
              onPress={loadPreview}
              style={styles.refreshButton}
              disabled={previewLoading}
            >
              {previewLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MaterialIcons name="refresh" size={20} color={colors.primary} />
              )}
            </Pressable>
          </View>
          <Text style={styles.previewSubtitle}>
            Based on current thresholds and last 24-hour system data
          </Text>

          {previews.length > 0 ? (
            previews.map((preview, index) => (
              <View
                key={index}
                style={[
                  styles.previewCard,
                  preview.would_trigger && {
                    borderLeftWidth: 4,
                    borderLeftColor: getAlertLevelColor(preview.alert_level),
                  },
                ]}
              >
                <View style={styles.previewCardHeader}>
                  <Text style={styles.previewName}>
                    {preview.threshold_name.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                  {preview.would_trigger && (
                    <View
                      style={[
                        styles.alertBadge,
                        { backgroundColor: getAlertLevelColor(preview.alert_level) + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.alertBadgeText,
                          { color: getAlertLevelColor(preview.alert_level) },
                        ]}
                      >
                        {getAlertLevelIcon(preview.alert_level)} {preview.alert_level.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.previewScenario}>{preview.sample_scenario}</Text>
                <View style={styles.previewMetrics}>
                  <Text style={styles.previewMetricLabel}>
                    Current: <Text style={styles.previewMetricValue}>{preview.current_value}</Text>
                  </Text>
                  <Text style={styles.previewMetricLabel}>
                    Threshold: <Text style={styles.previewMetricValue}>{preview.threshold_value}</Text>
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyPreview}>
              <MaterialIcons name="hourglass-empty" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>No preview data available</Text>
            </View>
          )}
        </View>

        {/* Threshold Configuration */}
        {Object.entries(groupedThresholds).map(([category, categoryThresholds]) => (
          <View key={category} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <MaterialIcons
                name={getCategoryIcon(category)}
                size={24}
                color={getCategoryColor(category)}
              />
              <Text style={[styles.categoryTitle, { color: getCategoryColor(category) }]}>
                {category.replace(/_/g, ' ').toUpperCase()}
              </Text>
            </View>

            {categoryThresholds.map((threshold) => {
              const isEditing = editingId === threshold.id;

              return (
                <View
                  key={threshold.id}
                  style={[
                    styles.thresholdCard,
                    !threshold.is_active && styles.thresholdCardInactive,
                  ]}
                >
                  <View style={styles.thresholdHeader}>
                    <View style={styles.thresholdInfo}>
                      <Text style={styles.thresholdName}>
                        {threshold.threshold_name.replace(/_/g, ' ')}
                      </Text>
                      {threshold.description && (
                        <Text style={styles.thresholdDescription}>{threshold.description}</Text>
                      )}
                    </View>
                    <Pressable
                      onPress={() => handleToggleActive(threshold)}
                      disabled={updating}
                      style={styles.toggleButton}
                    >
                      <MaterialIcons
                        name={threshold.is_active ? 'visibility' : 'visibility-off'}
                        size={20}
                        color={threshold.is_active ? colors.success : colors.textLight}
                      />
                    </Pressable>
                  </View>

                  {threshold.is_active && (
                    <View style={styles.thresholdBody}>
                      {isEditing ? (
                        <View style={styles.editRow}>
                          <TextInput
                            style={styles.editInput}
                            value={editValue}
                            onChangeText={setEditValue}
                            keyboardType="numeric"
                            placeholder="Enter value"
                            placeholderTextColor={colors.textLight}
                            autoFocus
                          />
                          <Text style={styles.unitText}>{threshold.threshold_unit}</Text>
                          <View style={styles.editActions}>
                            <Pressable
                              onPress={handleCancelEdit}
                              style={[styles.editButton, styles.cancelButton]}
                            >
                              <MaterialIcons name="close" size={18} color={colors.surface} />
                            </Pressable>
                            <Pressable
                              onPress={() => handleSave(threshold.id)}
                              style={[styles.editButton, styles.saveButton]}
                              disabled={updating}
                            >
                              {updating ? (
                                <ActivityIndicator size="small" color={colors.surface} />
                              ) : (
                                <MaterialIcons name="check" size={18} color={colors.surface} />
                              )}
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.valueRow}>
                          <View style={styles.valueDisplay}>
                            <Text style={styles.valueNumber}>{threshold.threshold_value}</Text>
                            <Text style={styles.valueUnit}>{threshold.threshold_unit}</Text>
                          </View>
                          <Pressable
                            onPress={() => handleEdit(threshold)}
                            style={styles.editIconButton}
                          >
                            <MaterialIcons name="edit" size={18} color={colors.primary} />
                            <Text style={styles.editIconButtonText}>Edit</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        {/* Footer Info */}
        <View style={styles.footerInfo}>
          <MaterialIcons name="lightbulb-outline" size={20} color={colors.textLight} />
          <Text style={styles.footerInfoText}>
            Tip: Start with default values and adjust based on your app's normal behavior patterns.
            Monitor alerts for the first week before making significant changes.
          </Text>
        </View>
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
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  autoTuneButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  resetButton: {
    backgroundColor: colors.accent,
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  resetButtonDisabled: {
    backgroundColor: colors.textLight,
    opacity: 0.6,
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
  previewSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  refreshButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewSubtitle: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.lg,
  },
  previewCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  previewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  previewName: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
    fontSize: 11,
    flex: 1,
  },
  alertBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  alertBadgeText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
  },
  previewScenario: {
    ...typography.caption,
    color: colors.text,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  previewMetrics: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  previewMetricLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textLight,
  },
  previewMetricValue: {
    fontWeight: '700',
    color: colors.text,
  },
  emptyPreview: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: spacing.sm,
  },
  categorySection: {
    marginBottom: spacing.xl,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryTitle: {
    ...typography.h3,
    fontWeight: '700',
  },
  thresholdCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  thresholdCardInactive: {
    opacity: 0.5,
  },
  thresholdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  thresholdInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  thresholdName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    textTransform: 'capitalize',
    marginBottom: spacing.xs,
  },
  thresholdDescription: {
    ...typography.caption,
    color: colors.textLight,
    lineHeight: 18,
  },
  toggleButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thresholdBody: {
    marginTop: spacing.md,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  valueNumber: {
    ...typography.h2,
    fontSize: 32,
    color: colors.primary,
    fontWeight: '700',
  },
  valueUnit: {
    ...typography.body,
    color: colors.textLight,
  },
  editIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  editIconButtonText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  editInput: {
    flex: 1,
    ...typography.h3,
    color: colors.text,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  unitText: {
    ...typography.body,
    color: colors.textLight,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.textLight,
  },
  saveButton: {
    backgroundColor: colors.success,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  footerInfoText: {
    ...typography.caption,
    color: colors.textLight,
    flex: 1,
    lineHeight: 18,
  },
});
