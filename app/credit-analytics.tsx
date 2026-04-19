import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth, useAlert } from '@/template';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import {
  creditAnalyticsService,
  AnalyticsStats,
  CreditFlowStats,
  GenerousUser,
  CommunityStats,
  ResponseTimeStats,
} from '@/services/creditAnalyticsService';
import { referralService } from '@/services/referralService';

export default function CreditAnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [requestStats, setRequestStats] = useState<AnalyticsStats | null>(null);
  const [flowStats, setFlowStats] = useState<CreditFlowStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<GenerousUser[]>([]);
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(null);
  const [responseTimeStats, setResponseTimeStats] = useState<ResponseTimeStats | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [referralStats, setReferralStats] = useState<any | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [user]);

  const loadAnalytics = async () => {
    if (!user) return;

    // Load all analytics data in parallel
    const [requests, flow, leaders, community, responseTime, rank, refStats] = await Promise.all([
      creditAnalyticsService.getRequestStats(),
      creditAnalyticsService.getCreditFlowStats(),
      creditAnalyticsService.getGenerousUsersLeaderboard(10),
      creditAnalyticsService.getCommunityStats(),
      creditAnalyticsService.getResponseTimeStats(),
      creditAnalyticsService.getUserRank(user.id),
      referralService.getReferralStats(user.id),
    ]);

    if (requests.data) setRequestStats(requests.data);
    if (flow.data) setFlowStats(flow.data);
    if (leaders.data) setLeaderboard(leaders.data);
    if (community.data) setCommunityStats(community.data);
    if (responseTime.data) setResponseTimeStats(responseTime.data);
    if (rank.rank) setUserRank(rank.rank);
    if (refStats.data) setReferralStats(refStats.data);

    setLoading(false);
    setRefreshing(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const handleShareAchievement = () => {
    if (!user || !userRank) return;

    const currentUser = leaderboard.find(u => u.userId === user.id);
    if (!currentUser) {
      showAlert('Not Found', 'You need to be on the leaderboard to share your achievement');
      return;
    }

    const badge = creditAnalyticsService.getBadge(currentUser.generosityScore);

    router.push({
      pathname: '/share-achievement',
      params: {
        rank: userRank,
        badgeName: badge.name,
        badgeIcon: badge.icon,
        generosityScore: currentUser.generosityScore,
        creditsGiven: currentUser.creditsGiven,
        username: currentUser.username || 'User',
      },
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Community Analytics</Text>
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
        {/* Your Rank Card with Share Button */}
        {userRank && (
          <View style={styles.rankCard}>
            <View style={styles.rankIcon}>
              <MaterialIcons name="emoji-events" size={40} color={colors.warning} />
            </View>
            <View style={styles.rankInfo}>
              <Text style={styles.rankLabel}>Your Rank</Text>
              <Text style={styles.rankValue}>#{userRank}</Text>
            </View>
            <View style={styles.rankActions}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankBadgeText}>
                  {leaderboard.find(u => u.userId === user?.id) 
                    ? creditAnalyticsService.getBadge(leaderboard.find(u => u.userId === user?.id)!.generosityScore).icon 
                    : '✨'}
                </Text>
              </View>
              <Pressable style={styles.shareRankButton} onPress={handleShareAchievement}>
                <MaterialIcons name="share" size={20} color={colors.surface} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Referral Stats */}
        {referralStats && (
          <View style={styles.referralCard}>
            <View style={styles.referralHeader}>
              <MaterialIcons name="card-giftcard" size={32} color={colors.success} />
              <Text style={styles.referralTitle}>Your Referral Stats</Text>
            </View>
            <View style={styles.referralStats}>
              <View style={styles.referralStatItem}>
                <Text style={styles.referralStatValue}>{referralStats.completedReferrals}</Text>
                <Text style={styles.referralStatLabel}>Friends Joined</Text>
              </View>
              <View style={styles.referralStatItem}>
                <Text style={styles.referralStatValue}>{referralStats.creditsEarned}</Text>
                <Text style={styles.referralStatLabel}>Credits Earned</Text>
              </View>
              <View style={styles.referralStatItem}>
                <Text style={styles.referralStatValue}>{referralStats.pendingReferrals}</Text>
                <Text style={styles.referralStatLabel}>Pending</Text>
              </View>
            </View>
            <View style={styles.referralCodeSection}>
              <Text style={styles.referralCodeLabel}>Your Referral Code:</Text>
              <View style={styles.referralCodeBox}>
                <Text style={styles.referralCodeText}>{referralStats.referralCode}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Community Overview */}
        {communityStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Community Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <MaterialIcons name="people" size={32} color={colors.primary} />
                <Text style={styles.statValue}>{communityStats.activeUsers}</Text>
                <Text style={styles.statLabel}>Active Users</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialIcons name="confirmation-number" size={32} color={colors.accent} />
                <Text style={styles.statValue}>{communityStats.totalCommunityCredits}</Text>
                <Text style={styles.statLabel}>Total Credits</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialIcons name="volunteer-activism" size={32} color={colors.success} />
                <Text style={styles.statValue}>{communityStats.sharingRate}%</Text>
                <Text style={styles.statLabel}>Sharing Rate</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialIcons name="average" size={32} color={colors.warning} />
                <Text style={styles.statValue}>{communityStats.averageCreditsPerUser}</Text>
                <Text style={styles.statLabel}>Avg Credits/User</Text>
              </View>
            </View>
          </View>
        )}

        {/* Request Statistics */}
        {requestStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Request Statistics</Text>
            <View style={styles.metricsCard}>
              <View style={styles.metricRow}>
                <View style={styles.metricInfo}>
                  <MaterialIcons name="check-circle" size={24} color={colors.success} />
                  <Text style={styles.metricLabel}>Success Rate</Text>
                </View>
                <Text style={[styles.metricValue, { color: colors.success }]}>
                  {requestStats.successRate}%
                </Text>
              </View>

              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${requestStats.successRate}%`,
                      backgroundColor: colors.success 
                    }
                  ]} 
                />
              </View>

              <View style={styles.breakdownRow}>
                <View style={styles.breakdownItem}>
                  <View style={[styles.dot, { backgroundColor: colors.success }]} />
                  <Text style={styles.breakdownText}>
                    Approved: {requestStats.approvedRequests}
                  </Text>
                </View>
                <View style={styles.breakdownItem}>
                  <View style={[styles.dot, { backgroundColor: colors.error }]} />
                  <Text style={styles.breakdownText}>
                    Rejected: {requestStats.rejectedRequests}
                  </Text>
                </View>
              </View>

              <View style={styles.breakdownRow}>
                <View style={styles.breakdownItem}>
                  <View style={[styles.dot, { backgroundColor: colors.warning }]} />
                  <Text style={styles.breakdownText}>
                    Pending: {requestStats.pendingRequests}
                  </Text>
                </View>
                <View style={styles.breakdownItem}>
                  <View style={[styles.dot, { backgroundColor: colors.textLight }]} />
                  <Text style={styles.breakdownText}>
                    Cancelled: {requestStats.cancelledRequests}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Response Time */}
        {responseTimeStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Response Time</Text>
            <View style={styles.timeCard}>
              <View style={styles.timeRow}>
                <MaterialIcons name="schedule" size={24} color={colors.accent} />
                <View style={styles.timeInfo}>
                  <Text style={styles.timeLabel}>Average</Text>
                  <Text style={styles.timeValue}>
                    {requestStats?.averageResponseTimeHours || 0}h
                  </Text>
                </View>
              </View>

              <View style={styles.timeStats}>
                <View style={styles.timeStatItem}>
                  <Text style={styles.timeStatLabel}>Fastest</Text>
                  <Text style={styles.timeStatValue}>
                    {responseTimeStats.fastest}h
                  </Text>
                </View>
                <View style={styles.timeStatItem}>
                  <Text style={styles.timeStatLabel}>Median</Text>
                  <Text style={styles.timeStatValue}>
                    {responseTimeStats.median}h
                  </Text>
                </View>
                <View style={styles.timeStatItem}>
                  <Text style={styles.timeStatLabel}>Slowest</Text>
                  <Text style={styles.timeStatValue}>
                    {responseTimeStats.slowest}h
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Credit Flow */}
        {flowStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Credit Flow</Text>
            <View style={styles.flowCard}>
              <View style={styles.flowHeader}>
                <MaterialIcons name="swap-horiz" size={40} color={colors.primary} />
                <View style={styles.flowTotal}>
                  <Text style={styles.flowTotalValue}>
                    {flowStats.totalCreditsTransferred}
                  </Text>
                  <Text style={styles.flowTotalLabel}>Total Credits Shared</Text>
                </View>
              </View>

              <View style={styles.flowStats}>
                <View style={styles.flowStatItem}>
                  <MaterialIcons name="trending-up" size={20} color={colors.accent} />
                  <Text style={styles.flowStatLabel}>Total Transfers</Text>
                  <Text style={styles.flowStatValue}>{flowStats.totalTransfers}</Text>
                </View>
                <View style={styles.flowStatItem}>
                  <MaterialIcons name="show-chart" size={20} color={colors.accent} />
                  <Text style={styles.flowStatLabel}>Avg Transfer</Text>
                  <Text style={styles.flowStatValue}>
                    {flowStats.averageTransferAmount} credits
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏆 Most Generous Users</Text>
            {leaderboard.map((leader, index) => {
              const badge = creditAnalyticsService.getBadge(leader.generosityScore);
              const isCurrentUser = leader.userId === user?.id;

              return (
                <View 
                  key={leader.userId} 
                  style={[
                    styles.leaderCard,
                    isCurrentUser && styles.currentUserCard
                  ]}
                >
                  <View style={styles.leaderRank}>
                    {index < 3 ? (
                      <Text style={styles.medalIcon}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </Text>
                    ) : (
                      <Text style={styles.rankNumber}>#{index + 1}</Text>
                    )}
                  </View>

                  <View style={styles.leaderInfo}>
                    <View style={styles.leaderHeader}>
                      <Text style={styles.leaderName}>
                        {leader.username || 'Anonymous'}
                        {isCurrentUser && ' (You)'}
                      </Text>
                      <View 
                        style={[
                          styles.badgeChip,
                          { backgroundColor: badge.color + '20' }
                        ]}
                      >
                        <Text style={styles.badgeIcon}>{badge.icon}</Text>
                        <Text style={[styles.badgeName, { color: badge.color }]}>
                          {badge.name}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.leaderStats}>
                      <View style={styles.leaderStatItem}>
                        <MaterialIcons name="favorite" size={14} color={colors.error} />
                        <Text style={styles.leaderStatText}>
                          {leader.creditsGiven} credits given
                        </Text>
                      </View>
                      <View style={styles.leaderStatItem}>
                        <MaterialIcons name="swap-horiz" size={14} color={colors.primary} />
                        <Text style={styles.leaderStatText}>
                          {leader.transferCount} transfers
                        </Text>
                      </View>
                      <View style={styles.leaderStatItem}>
                        <MaterialIcons name="check-circle" size={14} color={colors.success} />
                        <Text style={styles.leaderStatText}>
                          {leader.requestsApproved} approved
                        </Text>
                      </View>
                    </View>

                    <View style={styles.scoreBar}>
                      <View style={styles.scoreBarBackground}>
                        <View 
                          style={[
                            styles.scoreBarFill,
                            { 
                              width: `${Math.min((leader.generosityScore / 500) * 100, 100)}%`,
                              backgroundColor: badge.color 
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.scoreText}>{leader.generosityScore} pts</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Badge Legend */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badge Tiers</Text>
          <View style={styles.badgeLegend}>
            {[
              { min: 500, badge: creditAnalyticsService.getBadge(500) },
              { min: 300, badge: creditAnalyticsService.getBadge(300) },
              { min: 150, badge: creditAnalyticsService.getBadge(150) },
              { min: 50, badge: creditAnalyticsService.getBadge(50) },
              { min: 10, badge: creditAnalyticsService.getBadge(10) },
              { min: 0, badge: creditAnalyticsService.getBadge(0) },
            ].map((tier) => (
              <View key={tier.min} style={styles.badgeLegendItem}>
                <Text style={styles.badgeLegendIcon}>{tier.badge.icon}</Text>
                <View style={styles.badgeLegendInfo}>
                  <Text style={styles.badgeLegendName}>{tier.badge.name}</Text>
                  <Text style={styles.badgeLegendDesc}>{tier.badge.description}</Text>
                </View>
                <Text style={styles.badgeLegendPoints}>
                  {tier.min}+ pts
                </Text>
              </View>
            ))}
          </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
    flex: 1,
    marginLeft: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.warning + '40',
    ...shadows.md,
  },
  rankIcon: {
    marginRight: spacing.md,
  },
  rankInfo: {
    flex: 1,
  },
  rankLabel: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  rankValue: {
    ...typography.h1,
    color: colors.warning,
    fontWeight: '900',
  },
  rankActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rankBadge: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  rankBadgeText: {
    fontSize: 32,
  },
  shareRankButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  referralCard: {
    backgroundColor: colors.success + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.success + '40',
    ...shadows.md,
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.success + '30',
  },
  referralTitle: {
    ...typography.h3,
    color: colors.success,
    fontWeight: '700',
  },
  referralStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  referralStatItem: {
    alignItems: 'center',
  },
  referralStatValue: {
    ...typography.h2,
    color: colors.success,
    fontWeight: '900',
    marginBottom: spacing.xs,
  },
  referralStatLabel: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 11,
  },
  referralCodeSection: {
    alignItems: 'center',
  },
  referralCodeLabel: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  referralCodeBox: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  referralCodeText: {
    ...typography.h3,
    color: colors.surface,
    fontWeight: '900',
    letterSpacing: 2,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  metricsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  metricInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metricLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  metricValue: {
    ...typography.h2,
    fontWeight: '700',
  },
  progressBar: {
    height: 12,
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  breakdownText: {
    ...typography.caption,
    color: colors.textLight,
  },
  timeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  timeInfo: {
    marginLeft: spacing.md,
  },
  timeLabel: {
    ...typography.caption,
    color: colors.textLight,
  },
  timeValue: {
    ...typography.h2,
    color: colors.accent,
    fontWeight: '700',
  },
  timeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeStatItem: {
    alignItems: 'center',
  },
  timeStatLabel: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  timeStatValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  flowCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  flowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  flowTotal: {
    marginLeft: spacing.md,
  },
  flowTotalValue: {
    ...typography.h1,
    color: colors.primary,
    fontWeight: '900',
  },
  flowTotalLabel: {
    ...typography.caption,
    color: colors.textLight,
  },
  flowStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flowStatItem: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  flowStatLabel: {
    ...typography.caption,
    color: colors.textLight,
    marginVertical: spacing.xs,
    textAlign: 'center',
  },
  flowStatValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  leaderCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  currentUserCard: {
    borderWidth: 2,
    borderColor: colors.primary + '40',
    backgroundColor: colors.primary + '05',
  },
  leaderRank: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  medalIcon: {
    fontSize: 32,
  },
  rankNumber: {
    ...typography.h3,
    color: colors.textLight,
    fontWeight: '700',
  },
  leaderInfo: {
    flex: 1,
  },
  leaderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  leaderName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  badgeIcon: {
    fontSize: 14,
  },
  badgeName: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 10,
  },
  leaderStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  leaderStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  leaderStatText: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 11,
  },
  scoreBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scoreBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  scoreText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    fontSize: 11,
  },
  badgeLegend: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.md,
  },
  badgeLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  badgeLegendIcon: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  badgeLegendInfo: {
    flex: 1,
  },
  badgeLegendName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  badgeLegendDesc: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 11,
  },
  badgeLegendPoints: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '700',
  },
});
