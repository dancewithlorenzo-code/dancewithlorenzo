import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth, useAlert } from '@/template';
import { useLanguage } from '@/hooks/useLanguage';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { tokenService, TokenBalance } from '@/services/tokenService';
import { classService, Booking, Class } from '@/services/classService';
import { useRouter } from 'expo-router';
import { getSupabaseClient } from '@/template';
import { notificationService, NotificationData } from '@/services/notificationService';
import { creditRequestService } from '@/services/creditRequestService';
import * as Notifications from 'expo-notifications';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();
  const { t, language, setLanguage } = useLanguage();

  const [tokens, setTokens] = useState<TokenBalance | null>(null);
  const [bookings, setBookings] = useState<(Booking & { class: Class })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [pendingCreditRequests, setPendingCreditRequests] = useState(0);

  useEffect(() => {
    loadData();
    checkAdmin();
    setupNotifications();
    loadPendingCreditRequests();
  }, [user]);

  const setupNotifications = async () => {
    if (!user) return;

    // Check current permission status
    const status = await notificationService.getPermissionStatus();
    setNotificationsEnabled(status === 'granted');

    // If already granted, ensure token is registered
    if (status === 'granted') {
      const { token, error } = await notificationService.registerForPushNotifications();
      if (token && !error) {
        await notificationService.savePushToken(user.id, token);
      }
    }

    // Set up notification listeners with deep linking
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // Reload pending requests count when credit request notification received
      const data = notification.request.content.data as NotificationData;
      if (data.type?.includes('credit_request')) {
        loadPendingCreditRequests();
      }
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      const data = response.notification.request.content.data as NotificationData;
      
      // Handle deep linking based on notification type
      if (data.type?.includes('credit_request') && data.deepLink) {
        router.push(data.deepLink as any);
      } else if (data.classId) {
        router.push(`/class-details?id=${data.classId}`);
      }
    });

    // Cleanup on unmount
    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  };

  const loadPendingCreditRequests = async () => {
    if (!user) return;
    
    const { data } = await creditRequestService.getReceivedRequests(user.id);
    if (data) {
      const pending = data.filter(r => r.status === 'pending').length;
      setPendingCreditRequests(pending);
    }
  };

  const handleEnableNotifications = async () => {
    if (!user) return;

    const { token, error } = await notificationService.registerForPushNotifications();
    
    if (error) {
      showAlert('Notification Setup', error);
      return;
    }

    if (token) {
      const { success, error: saveError } = await notificationService.savePushToken(user.id, token);
      
      if (saveError) {
        showAlert('Error', saveError);
      } else {
        setNotificationsEnabled(true);
        showAlert('Success', 'Push notifications enabled! You\'ll receive reminders 24 hours before your classes.');
      }
    }
  };

  const loadData = async () => {
    if (!user) return;

    const { data: tokenData } = await tokenService.getUserTokens(user.id);
    if (tokenData) setTokens(tokenData);

    const { data: bookingData } = await classService.getUserBookings(user.id);
    if (bookingData) setBookings(bookingData);

    setLoading(false);
    setRefreshing(false);
  };

  const checkAdmin = async () => {
    if (!user) return;
    
    const { data, error } = await getSupabaseClient()
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    
    if (!error && data) {
      setIsAdmin(data.is_admin || false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleLogout = async () => {
    if (user) {
      // Remove push token on logout
      await notificationService.removePushToken(user.id);
    }
    
    const { error } = await logout();
    if (error) {
      showAlert(t('error'), error);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ja' ? 'en' : 'ja');
  };

  const renderTokenGauge = () => {
    const total = tokens?.total_tokens || 0;
    const remaining = tokens?.remaining_tokens || 0;

    return (
      <View style={styles.tokenCard}>
        <Text style={styles.tokenTitle}>{t('tokens_remaining')}</Text>
        <Text style={styles.tokenCount}>{remaining} / {total}</Text>
        
        <View style={styles.tokenGaugeContainer}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.tokenDot,
                { backgroundColor: i < remaining ? colors.tokenActive : colors.tokenInactive }
              ]}
            />
          ))}
        </View>

        {remaining === 0 && (
          <Pressable 
            style={styles.buyButton}
            onPress={() => router.push('/(tabs)/tokens')}
          >
            <Text style={styles.buyButtonText}>{t('buy_tokens')}</Text>
          </Pressable>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {language === 'ja' ? 'こんにちは' : 'Hello'}
          </Text>
          <Text style={styles.userName}>{user?.username || user?.email}</Text>
        </View>
        
        <View style={styles.headerActions}>
          <Pressable style={styles.iconButton} onPress={() => router.push('/landing')}>
            <MaterialIcons name="home" size={24} color={colors.primary} />
          </Pressable>
          {isAdmin && (
            <Pressable style={styles.iconButton} onPress={() => router.push('/admin')}>
              <MaterialIcons name="admin-panel-settings" size={24} color={colors.accent} />
            </Pressable>
          )}
          <Pressable style={styles.iconButton} onPress={() => router.push('/profile')}>
            <MaterialIcons name="person" size={24} color={colors.primary} />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={handleLogout}>
            <MaterialIcons name="logout" size={24} color={colors.textLight} />
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
        {/* Notification Banner */}
        {!notificationsEnabled && (
          <Pressable style={styles.notificationBanner} onPress={handleEnableNotifications}>
            <View style={styles.notificationIcon}>
              <MaterialIcons name="notifications-active" size={24} color={colors.accent} />
            </View>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>Enable Class Reminders</Text>
              <Text style={styles.notificationText}>
                Get notified 24 hours before your classes with location and QR code
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textLight} />
          </Pressable>
        )}

        {/* Token Gauge */}
        {renderTokenGauge()}

        {/* Credit Requests Badge */}
        {pendingCreditRequests > 0 && (
          <Pressable 
            style={styles.creditRequestBanner} 
            onPress={() => router.push('/credit-requests')}
          >
            <View style={styles.creditRequestIcon}>
              <MaterialIcons name="money" size={24} color={colors.success} />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCreditRequests}</Text>
              </View>
            </View>
            <View style={styles.creditRequestContent}>
              <Text style={styles.creditRequestTitle}>
                {pendingCreditRequests} Pending Credit {pendingCreditRequests === 1 ? 'Request' : 'Requests'}
              </Text>
              <Text style={styles.creditRequestText}>
                Friends are waiting for your response
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textLight} />
          </Pressable>
        )}

        {/* Boutique Banner */}
        <Pressable 
          style={styles.boutiqueBanner} 
          onPress={() => router.push('/boutique')}
        >
          <View style={styles.boutiqueIcon}>
            <MaterialIcons name="store" size={24} color={colors.primary} />
          </View>
          <View style={styles.boutiqueContent}>
            <Text style={styles.boutiqueTitle}>
              {language === 'ja' ? 'ブティック' : 'Boutique'}
            </Text>
            <Text style={styles.boutiqueText}>
              {language === 'ja' 
                ? 'ダンス用品とアクセサリーを購入' 
                : 'Shop dance costumes & accessories'}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.textLight} />
        </Pressable>

        {/* Support Us Banner */}
        <Pressable 
          style={styles.supportBanner} 
          onPress={() => router.push('/donate')}
        >
          <View style={styles.supportIcon}>
            <MaterialIcons name="favorite" size={24} color={colors.accent} />
          </View>
          <View style={styles.supportContent}>
            <Text style={styles.supportTitle}>
              {language === 'ja' ? 'コミュニティを支援' : 'Support Our Community'}
            </Text>
            <Text style={styles.supportText}>
              {language === 'ja' 
                ? '寄付を通じてオリタヒチ文化を保存する手助けをしてください' 
                : 'Help preserve Ori Tahiti culture through donations'}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.textLight} />
        </Pressable>

        {/* Upcoming Classes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('upcoming_classes')}</Text>
          {bookings.length > 0 ? (
            bookings.slice(0, 3).map((booking) => (
              <View key={booking.id} style={styles.classCard}>
                <View style={styles.classIcon}>
                  <MaterialIcons name="event" size={24} color={colors.primary} />
                </View>
                <View style={styles.classInfo}>
                  <Text style={styles.classTitle}>{booking.class.title}</Text>
                  <Text style={styles.classDetails}>
                    {new Date(booking.class.start_time).toLocaleDateString(language)}
                  </Text>
                  <Text style={styles.classLocation}>
                    {booking.class.location || t(`class_type_${booking.class.class_type}`)}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: booking.status === 'attended' ? colors.success : colors.primary }
                ]}>
                  <Text style={styles.statusText}>
                    {booking.status === 'attended' ? '✓' : '•'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="event-busy" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>No upcoming classes</Text>
              <Pressable 
                style={styles.browseButton}
                onPress={() => router.push('/(tabs)/classes')}
              >
                <Text style={styles.browseButtonText}>Browse Classes</Text>
              </Pressable>
            </View>
          )}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '20',
  },
  greeting: {
    ...typography.caption,
    color: colors.textLight,
  },
  userName: {
    ...typography.h3,
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  tokenCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '15',
    ...shadows.lg,
  },
  tokenTitle: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  tokenCount: {
    ...typography.h1,
    fontSize: 48,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: spacing.md,
    letterSpacing: -1,
  },
  tokenGaugeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tokenDot: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.full,
    ...shadows.md,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  buyButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    ...shadows.lg,
  },
  buyButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '10',
    ...shadows.md,
  },
  classIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  classInfo: {
    flex: 1,
  },
  classTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  classDetails: {
    ...typography.caption,
    color: colors.textLight,
  },
  classLocation: {
    ...typography.caption,
    color: colors.primary,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: colors.surface,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textLight,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  browseButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  browseButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.accent + '40',
    ...shadows.md,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  notificationText: {
    ...typography.caption,
    color: colors.textLight,
    lineHeight: 18,
  },
  creditRequestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.success + '40',
    ...shadows.md,
  },
  creditRequestIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: borderRadius.full,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 11,
    fontWeight: '700',
  },
  creditRequestContent: {
    flex: 1,
  },
  creditRequestTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  creditRequestText: {
    ...typography.caption,
    color: colors.textLight,
    lineHeight: 18,
  },
  supportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.accent + '40',
    ...shadows.md,
  },
  supportIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  supportContent: {
    flex: 1,
  },
  supportTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  supportText: {
    ...typography.caption,
    color: colors.textLight,
    lineHeight: 18,
  },
  boutiqueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary + '40',
    ...shadows.md,
  },
  boutiqueIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  boutiqueContent: {
    flex: 1,
  },
  boutiqueTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  boutiqueText: {
    ...typography.caption,
    color: colors.textLight,
    lineHeight: 18,
  },
});
