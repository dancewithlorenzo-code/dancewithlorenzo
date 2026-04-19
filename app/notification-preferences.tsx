import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth, useAlert } from '@/template';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { fetchUserPreferences, updateUserPreferences, NotificationPreferences } from '@/services/notificationPreferencesService';

export default function NotificationPreferencesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await fetchUserPreferences(user.id);
    setLoading(false);

    if (error) {
      showAlert('Error', error);
    } else if (data) {
      setPreferences(data);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
  };

  const handleSave = async () => {
    if (!user || !preferences) return;

    setSaving(true);
    const { success, error } = await updateUserPreferences(user.id, {
      enable_class_promotions: preferences.enable_class_promotions,
      enable_product_promotions: preferences.enable_product_promotions,
      enable_bundle_promotions: preferences.enable_bundle_promotions,
      enable_general_promotions: preferences.enable_general_promotions,
    });
    setSaving(false);

    if (error) {
      showAlert('Error', error);
    } else if (success) {
      showAlert('Success', 'Your notification preferences have been saved!');
    }
  };

  const allDisabled = preferences && 
    !preferences.enable_class_promotions && 
    !preferences.enable_product_promotions && 
    !preferences.enable_bundle_promotions && 
    !preferences.enable_general_promotions;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  if (!preferences) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Notification Preferences</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>Failed to load preferences</Text>
          <Pressable style={styles.retryButton} onPress={loadPreferences}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
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
        <Text style={styles.headerTitle}>Notification Preferences</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Description */}
        <View style={styles.descriptionBox}>
          <MaterialIcons name="notifications-active" size={32} color={colors.primary} />
          <Text style={styles.descriptionTitle}>Customize Your Alerts</Text>
          <Text style={styles.descriptionText}>
            Choose which types of promotions you want to be notified about. You can change these settings anytime.
          </Text>
        </View>

        {/* Warning if all disabled */}
        {allDisabled && (
          <View style={styles.warningBox}>
            <MaterialIcons name="warning" size={24} color={colors.warning} />
            <Text style={styles.warningText}>
              You won't receive any promotion notifications. You might miss exclusive deals and limited-time offers!
            </Text>
          </View>
        )}

        {/* Preferences List */}
        <View style={styles.preferencesSection}>
          <Text style={styles.sectionTitle}>Promotion Types</Text>

          {/* Class Promotions */}
          <PreferenceItem
            icon="event"
            iconColor="#3b82f6"
            title="Class Promotions"
            description="New workshops, special classes, and dance events"
            value={preferences.enable_class_promotions}
            onValueChange={(value) => handleToggle('enable_class_promotions', value)}
          />

          {/* Product Promotions */}
          <PreferenceItem
            icon="store"
            iconColor="#ec4899"
            title="Boutique Products"
            description="New arrivals, restocks, and product launches"
            value={preferences.enable_product_promotions}
            onValueChange={(value) => handleToggle('enable_product_promotions', value)}
          />

          {/* Bundle Promotions */}
          <PreferenceItem
            icon="toll"
            iconColor="#9c27b0"
            title="Bundle Offers"
            description="Token packages and workshop bundle deals"
            value={preferences.enable_bundle_promotions}
            onValueChange={(value) => handleToggle('enable_bundle_promotions', value)}
          />

          {/* General Promotions */}
          <PreferenceItem
            icon="campaign"
            iconColor="#f59e0b"
            title="General Announcements"
            description="News, updates, and community events"
            value={preferences.enable_general_promotions}
            onValueChange={(value) => handleToggle('enable_general_promotions', value)}
          />
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <MaterialIcons name="info-outline" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            These settings only affect promotional push notifications. You'll still receive important notifications about your bookings, orders, and account activity.
          </Text>
        </View>

        {/* Save Button */}
        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <>
              <MaterialIcons name="check-circle" size={24} color={colors.surface} />
              <Text style={styles.saveButtonText}>Save Preferences</Text>
            </>
          )}
        </Pressable>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <Pressable
            style={styles.quickActionButton}
            onPress={() => {
              setPreferences({
                ...preferences,
                enable_class_promotions: true,
                enable_product_promotions: true,
                enable_bundle_promotions: true,
                enable_general_promotions: true,
              });
            }}
          >
            <MaterialIcons name="notifications-active" size={24} color={colors.primary} />
            <View style={styles.quickActionText}>
              <Text style={styles.quickActionTitle}>Enable All</Text>
              <Text style={styles.quickActionSubtitle}>Get all promotion alerts</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textLight} />
          </Pressable>

          <Pressable
            style={styles.quickActionButton}
            onPress={() => {
              setPreferences({
                ...preferences,
                enable_class_promotions: false,
                enable_product_promotions: false,
                enable_bundle_promotions: false,
                enable_general_promotions: false,
              });
            }}
          >
            <MaterialIcons name="notifications-off" size={24} color={colors.error} />
            <View style={styles.quickActionText}>
              <Text style={styles.quickActionTitle}>Disable All</Text>
              <Text style={styles.quickActionSubtitle}>Stop all promotional notifications</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textLight} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function PreferenceItem({ icon, iconColor, title, description, value, onValueChange }: {
  icon: any;
  iconColor: string;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.preferenceItem}>
      <View style={[styles.preferenceIcon, { backgroundColor: iconColor + '20' }]}>
        <MaterialIcons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.preferenceContent}>
        <Text style={styles.preferenceTitle}>{title}</Text>
        <Text style={styles.preferenceDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary + '60' }}
        thumbColor={value ? colors.primary : colors.surface}
      />
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
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  descriptionBox: {
    margin: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  descriptionTitle: {
    ...typography.h3,
    color: colors.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  descriptionText: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.warning + '15',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  warningText: {
    ...typography.body,
    color: colors.warning,
    flex: 1,
    lineHeight: 20,
  },
  preferencesSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  preferenceIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  preferenceContent: {
    flex: 1,
  },
  preferenceTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  preferenceDescription: {
    ...typography.caption,
    color: colors.textLight,
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoText: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.surface,
    fontSize: 16,
  },
  quickActionsSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  quickActionText: {
    flex: 1,
  },
  quickActionTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  quickActionSubtitle: {
    ...typography.caption,
    color: colors.textLight,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
});
