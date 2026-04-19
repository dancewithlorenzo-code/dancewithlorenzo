import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth, useAlert } from '@/template';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { analyticsService, StudentAnalytics } from '@/services/analyticsService';

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [user]);

  const loadAnalytics = async () => {
    if (!user) return;

    const { data, error } = await analyticsService.getStudentAnalytics(user.id);
    
    if (error) {
      showAlert('Error', error);
    } else if (data) {
      setAnalytics(data);
    }

    setLoading(false);
    setRefreshing(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en', { month: 'short' });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'attendance': return 'check-circle';
      case 'booking': return 'event';
      case 'cancellation': return 'cancel';
      case 'token_purchase': return 'toll';
      default: return 'circle';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'attendance': return colors.success;
      case 'booking': return colors.primary;
      case 'cancellation': return colors.error;
      case 'token_purchase': return colors.accent;
      default: return colors.textLight;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>No analytics data available</Text>
      </View>
    );
  }

  const maxBookings = Math.max(...analytics.booking_trends.map(t => t.total_bookings), 5);
  const maxWeekdayBookings = Math.max(...analytics.weekly_booking_pattern.map(d => d.count), 1);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>My Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Attendance Rate Card */}
        <View style={[styles.card, styles.attendanceCard]}>
          <Text style={styles.attendanceLabel}>Attendance Rate</Text>
          <Text style={styles.attendanceValue}>{analytics.attendance_rate.toFixed(1)}%</Text>
          <View style={styles.attendanceBar}>
            <View 
              style={[
                styles.attendanceBarFill,
                { width: `${analytics.attendance_rate}%` }
              ]} 
            />
          </View>
          <View style={styles.attendanceStats}>
            <View style={styles.attendanceStat}>
              <MaterialIcons name="check-circle" size={16} color={colors.surface} />
              <Text style={styles.attendanceStatText}>{analytics.total_attended} attended</Text>
            </View>
            <View style={styles.attendanceStat}>
              <MaterialIcons name="event" size={16} color={colors.surface} />
              <Text style={styles.attendanceStatText}>{analytics.total_bookings} total</Text>
            </View>
          </View>
        </View>

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <MaterialIcons name="event-available" size={28} color={colors.success} />
            <Text style={styles.metricValue}>{analytics.total_attended}</Text>
            <Text style={styles.metricLabel}>Classes Attended</Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialIcons name="toll" size={28} color={colors.accent} />
            <Text style={styles.metricValue}>{analytics.total_tokens_used}</Text>
            <Text style={styles.metricLabel}>Tokens Used</Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialIcons name="cancel" size={28} color={colors.error} />
            <Text style={styles.metricValue}>{analytics.total_cancelled}</Text>
            <Text style={styles.metricLabel}>Cancelled</Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialIcons name="trending-up" size={28} color={colors.primary} />
            <Text style={styles.metricValue}>
              {analytics.token_usage_rate.toFixed(0)}%
            </Text>
            <Text style={styles.metricLabel}>Token Usage</Text>
          </View>
        </View>

        {/* Favorites Card */}
        {(analytics.favorite_class_type || analytics.most_attended_class_title) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Favorites</Text>
            
            {analytics.most_attended_class_title && (
              <View style={styles.favoriteRow}>
                <MaterialIcons name="star" size={20} color={colors.accent} />
                <View style={styles.favoriteInfo}>
                  <Text style={styles.favoriteLabel}>Most Attended Class</Text>
                  <Text style={styles.favoriteValue}>{analytics.most_attended_class_title}</Text>
                </View>
              </View>
            )}
            
            {analytics.favorite_class_type && (
              <View style={styles.favoriteRow}>
                <MaterialIcons name="location-on" size={20} color={colors.primary} />
                <View style={styles.favoriteInfo}>
                  <Text style={styles.favoriteLabel}>Preferred Location</Text>
                  <Text style={styles.favoriteValue}>{analytics.favorite_class_type}</Text>
                </View>
              </View>
            )}
            
            {analytics.favorite_class_category && (
              <View style={styles.favoriteRow}>
                <MaterialIcons name="category" size={20} color={colors.success} />
                <View style={styles.favoriteInfo}>
                  <Text style={styles.favoriteLabel}>Favorite Category</Text>
                  <Text style={styles.favoriteValue}>
                    {analytics.favorite_class_category === 'become_my_dancers' 
                      ? 'Become my Dancers' 
                      : 'Workshop'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Booking Trends Chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Booking Trends (Last 6 Months)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trendChart}>
            {analytics.booking_trends.map((trend) => (
              <View key={trend.month} style={styles.trendBar}>
                <View style={styles.trendBarContainer}>
                  <View 
                    style={[
                      styles.trendBarSegment,
                      { 
                        height: Math.max((trend.attended / maxBookings) * 80, trend.attended > 0 ? 4 : 0),
                        backgroundColor: colors.success 
                      }
                    ]} 
                  />
                  <View 
                    style={[
                      styles.trendBarSegment,
                      { 
                        height: Math.max((trend.cancelled / maxBookings) * 80, trend.cancelled > 0 ? 4 : 0),
                        backgroundColor: colors.error,
                        marginTop: 2
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.trendBarLabel}>{formatMonth(trend.month)}</Text>
                {trend.total_bookings > 0 && (
                  <Text style={styles.trendBarValue}>{trend.total_bookings}</Text>
                )}
              </View>
            ))}
          </ScrollView>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: colors.success }]} />
              <Text style={styles.legendText}>Attended</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: colors.error }]} />
              <Text style={styles.legendText}>Cancelled</Text>
            </View>
          </View>
        </View>

        {/* Class Type Distribution */}
        {analytics.class_type_distribution.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Class Type Distribution</Text>
            {analytics.class_type_distribution.map((type) => (
              <View key={type.class_type} style={styles.distributionRow}>
                <View style={styles.distributionLabel}>
                  <Text style={styles.distributionType}>{type.class_type}</Text>
                  <Text style={styles.distributionCount}>{type.count} classes</Text>
                </View>
                <View style={styles.distributionBarContainer}>
                  <View 
                    style={[
                      styles.distributionBar,
                      { width: `${type.percentage}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.distributionPercentage}>{type.percentage.toFixed(0)}%</Text>
              </View>
            ))}
          </View>
        )}

        {/* Weekly Booking Pattern */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Weekly Booking Pattern</Text>
          <View style={styles.weekdayChart}>
            {analytics.weekly_booking_pattern.map((day) => (
              <View key={day.day_of_week} style={styles.weekdayBar}>
                <View style={styles.weekdayBarContainer}>
                  <View 
                    style={[
                      styles.weekdayBarFill,
                      { 
                        height: Math.max((day.count / maxWeekdayBookings) * 60, day.count > 0 ? 4 : 0),
                        backgroundColor: day.count > 0 ? colors.primary : colors.textLight + '40'
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.weekdayLabel}>{day.day_of_week.slice(0, 3)}</Text>
                {day.count > 0 && (
                  <Text style={styles.weekdayValue}>{day.count}</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        {analytics.recent_activity.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Activity</Text>
            {analytics.recent_activity.map((activity, index) => (
              <View key={index} style={styles.activityRow}>
                <View style={[
                  styles.activityIcon,
                  { backgroundColor: getActivityColor(activity.type) + '20' }
                ]}>
                  <MaterialIcons 
                    name={getActivityIcon(activity.type)} 
                    size={20} 
                    color={getActivityColor(activity.type)} 
                  />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityDescription}>{activity.description}</Text>
                  {activity.class_title && (
                    <Text style={styles.activityClass}>{activity.class_title}</Text>
                  )}
                  <Text style={styles.activityDate}>
                    {new Date(activity.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Insights Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Insights</Text>
          
          {analytics.attendance_rate >= 80 && (
            <View style={styles.insightRow}>
              <MaterialIcons name="emoji-events" size={24} color={colors.success} />
              <Text style={styles.insightText}>
                Excellent attendance! You're attending {analytics.attendance_rate.toFixed(0)}% of your bookings.
              </Text>
            </View>
          )}
          
          {analytics.attendance_rate < 50 && analytics.total_bookings > 2 && (
            <View style={styles.insightRow}>
              <MaterialIcons name="info-outline" size={24} color={colors.warning} />
              <Text style={styles.insightText}>
                Your attendance rate is {analytics.attendance_rate.toFixed(0)}%. Try to attend more classes!
              </Text>
            </View>
          )}
          
          {analytics.token_usage_rate < 30 && analytics.total_tokens_purchased > 0 && (
            <View style={styles.insightRow}>
              <MaterialIcons name="notifications-active" size={24} color={colors.accent} />
              <Text style={styles.insightText}>
                You have {analytics.total_tokens_purchased - analytics.total_tokens_used} tokens remaining. Book more classes!
              </Text>
            </View>
          )}
          
          {analytics.total_bookings === 0 && (
            <View style={styles.insightRow}>
              <MaterialIcons name="celebration" size={24} color={colors.primary} />
              <Text style={styles.insightText}>
                Welcome! Book your first class to start your dance journey with Lorenzo.
              </Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    color: colors.textLight,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  attendanceCard: {
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  attendanceLabel: {
    ...typography.caption,
    color: colors.surface,
    opacity: 0.9,
    marginBottom: spacing.xs,
  },
  attendanceValue: {
    ...typography.h1,
    fontSize: 48,
    color: colors.surface,
    marginBottom: spacing.md,
  },
  attendanceBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.surface + '30',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  attendanceBarFill: {
    height: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
  },
  attendanceStats: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  attendanceStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  attendanceStatText: {
    ...typography.caption,
    color: colors.surface,
    opacity: 0.9,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  metricValue: {
    ...typography.h2,
    color: colors.text,
    marginVertical: spacing.xs,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'center',
    fontSize: 11,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '10',
  },
  favoriteInfo: {
    flex: 1,
  },
  favoriteLabel: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 11,
  },
  favoriteValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginTop: 2,
  },
  trendChart: {
    marginBottom: spacing.md,
  },
  trendBar: {
    alignItems: 'center',
    marginRight: spacing.md,
    width: 36,
  },
  trendBarContainer: {
    height: 80,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  trendBarSegment: {
    width: 24,
    borderRadius: borderRadius.sm,
  },
  trendBarLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textLight,
    marginBottom: 2,
  },
  trendBarValue: {
    ...typography.caption,
    fontSize: 10,
    color: colors.text,
    fontWeight: '600',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.primary + '20',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.sm,
  },
  legendText: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 11,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  distributionLabel: {
    width: 80,
  },
  distributionType: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  distributionCount: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textLight,
  },
  distributionBarContainer: {
    flex: 1,
    height: 24,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  distributionBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  distributionPercentage: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  weekdayChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekdayBar: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayBarContainer: {
    height: 60,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  weekdayBarFill: {
    width: 16,
    borderRadius: borderRadius.sm,
  },
  weekdayLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textLight,
    marginBottom: 2,
  },
  weekdayValue: {
    ...typography.caption,
    fontSize: 10,
    color: colors.text,
    fontWeight: '600',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '10',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityDescription: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  activityClass: {
    ...typography.caption,
    color: colors.primary,
    marginTop: 2,
  },
  activityDate: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '10',
  },
  insightText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
});
