import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth, useAlert } from '@/template';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { notificationService, NotificationLog } from '@/services/notificationService';

export default function NotificationHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    const { data, error } = await notificationService.getNotificationHistory(user.id);
    
    if (error) {
      showAlert('Error', error);
    } else if (data) {
      setNotifications(data);
    }

    setLoading(false);
    setRefreshing(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleResend = async (notification: NotificationLog) => {
    if (!user) return;

    setResendingId(notification.id);

    const { success, error } = await notificationService.resendNotification(
      user.id,
      notification.booking.id,
      notification.booking.class.title,
      notification.booking.class.location || notification.booking.class.class_type,
      notification.booking.class.start_time,
      '' // QR code would need to be fetched separately if needed
    );

    setResendingId(null);

    if (error) {
      showAlert('Error', error);
    } else {
      showAlert('Success', 'Notification resent successfully!');
      loadNotifications();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const formatFullTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const failedNotifications = notifications.filter(n => !n.success);
  const successfulNotifications = notifications.filter(n => n.success);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Notification History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <MaterialIcons name="notifications" size={24} color={colors.primary} />
          <Text style={styles.summaryValue}>{notifications.length}</Text>
          <Text style={styles.summaryLabel}>Total Sent</Text>
        </View>
        <View style={styles.summaryItem}>
          <MaterialIcons name="check-circle" size={24} color={colors.success} />
          <Text style={styles.summaryValue}>{successfulNotifications.length}</Text>
          <Text style={styles.summaryLabel}>Delivered</Text>
        </View>
        <View style={styles.summaryItem}>
          <MaterialIcons name="error" size={24} color={colors.error} />
          <Text style={styles.summaryValue}>{failedNotifications.length}</Text>
          <Text style={styles.summaryLabel}>Failed</Text>
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
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="notifications-none" size={64} color={colors.textLight} />
            <Text style={styles.emptyTitle}>No Notifications Yet</Text>
            <Text style={styles.emptyText}>
              Class reminders will appear here once you book classes and enable notifications
            </Text>
          </View>
        ) : (
          <>
            {/* Failed Notifications Section */}
            {failedNotifications.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="warning" size={20} color={colors.error} />
                  <Text style={styles.sectionTitle}>Failed ({failedNotifications.length})</Text>
                </View>
                {failedNotifications.map((notification) => (
                  <View key={notification.id} style={[styles.notificationCard, styles.failedCard]}>
                    <View style={styles.notificationHeader}>
                      <View style={styles.notificationIcon}>
                        <MaterialIcons name="error-outline" size={24} color={colors.error} />
                      </View>
                      <View style={styles.notificationInfo}>
                        <Text style={styles.notificationTitle}>
                          {notification.booking.class.title}
                        </Text>
                        <Text style={styles.notificationTimestamp}>
                          {formatTimestamp(notification.sent_at)}
                        </Text>
                        <Text style={styles.notificationFullDate}>
                          {formatFullTimestamp(notification.sent_at)}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, styles.failedBadge]}>
                        <Text style={styles.statusText}>FAILED</Text>
                      </View>
                    </View>

                    <View style={styles.notificationBody}>
                      <View style={styles.notificationDetail}>
                        <MaterialIcons name="event" size={16} color={colors.textLight} />
                        <Text style={styles.notificationDetailText}>
                          {new Date(notification.booking.class.start_time).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                      <View style={styles.notificationDetail}>
                        <MaterialIcons name="location-on" size={16} color={colors.textLight} />
                        <Text style={styles.notificationDetailText}>
                          {notification.booking.class.location || notification.booking.class.class_type}
                        </Text>
                      </View>
                      {notification.error_message && (
                        <View style={styles.errorContainer}>
                          <MaterialIcons name="info-outline" size={14} color={colors.error} />
                          <Text style={styles.errorText}>{notification.error_message}</Text>
                        </View>
                      )}
                    </View>

                    <Pressable
                      style={[
                        styles.resendButton,
                        resendingId === notification.id && styles.resendButtonDisabled,
                      ]}
                      onPress={() => handleResend(notification)}
                      disabled={resendingId === notification.id}
                    >
                      {resendingId === notification.id ? (
                        <ActivityIndicator size="small" color={colors.surface} />
                      ) : (
                        <>
                          <MaterialIcons name="refresh" size={16} color={colors.surface} />
                          <Text style={styles.resendButtonText}>Resend Notification</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Successful Notifications Section */}
            {successfulNotifications.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="check-circle" size={20} color={colors.success} />
                  <Text style={styles.sectionTitle}>Delivered ({successfulNotifications.length})</Text>
                </View>
                {successfulNotifications.map((notification) => (
                  <View key={notification.id} style={styles.notificationCard}>
                    <View style={styles.notificationHeader}>
                      <View style={styles.notificationIcon}>
                        <MaterialIcons name="notifications-active" size={24} color={colors.success} />
                      </View>
                      <View style={styles.notificationInfo}>
                        <Text style={styles.notificationTitle}>
                          {notification.booking.class.title}
                        </Text>
                        <Text style={styles.notificationTimestamp}>
                          {formatTimestamp(notification.sent_at)}
                        </Text>
                        <Text style={styles.notificationFullDate}>
                          {formatFullTimestamp(notification.sent_at)}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, styles.successBadge]}>
                        <Text style={styles.statusText}>SENT</Text>
                      </View>
                    </View>

                    <View style={styles.notificationBody}>
                      <View style={styles.notificationDetail}>
                        <MaterialIcons name="event" size={16} color={colors.textLight} />
                        <Text style={styles.notificationDetailText}>
                          {new Date(notification.booking.class.start_time).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                      <View style={styles.notificationDetail}>
                        <MaterialIcons name="location-on" size={16} color={colors.textLight} />
                        <Text style={styles.notificationDetailText}>
                          {notification.booking.class.location || notification.booking.class.class_type}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
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
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    ...typography.h2,
    color: colors.text,
    marginVertical: spacing.xs,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 11,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
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
    paddingHorizontal: spacing.xl,
    lineHeight: 22,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  notificationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  failedCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  notificationTimestamp: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  notificationFullDate: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textLight,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  successBadge: {
    backgroundColor: colors.success,
  },
  failedBadge: {
    backgroundColor: colors.error,
  },
  statusText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: colors.surface,
  },
  notificationBody: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  notificationDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  notificationDetailText: {
    ...typography.caption,
    color: colors.textLight,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.error + '10',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.error,
    flex: 1,
    lineHeight: 16,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  resendButtonDisabled: {
    backgroundColor: colors.textLight,
    opacity: 0.6,
  },
  resendButtonText: {
    ...typography.button,
    fontSize: 14,
    color: colors.surface,
  },
});
