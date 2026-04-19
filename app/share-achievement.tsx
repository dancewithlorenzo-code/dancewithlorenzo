import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { socialSharingService } from '@/services/socialSharingService';
import { referralService } from '@/services/referralService';
import { useAuth, useAlert } from '@/template';

export default function ShareAchievementScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const params = useLocalSearchParams();

  const shareCardRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [loadingCode, setLoadingCode] = useState(true);

  // Parse params
  const rank = parseInt(params.rank as string) || 0;
  const badgeName = params.badgeName as string || '';
  const badgeIcon = params.badgeIcon as string || '';
  const generosityScore = parseInt(params.generosityScore as string) || 0;
  const creditsGiven = parseInt(params.creditsGiven as string) || 0;
  const username = params.username as string || 'User';

  React.useEffect(() => {
    loadReferralCode();
  }, [user]);

  const loadReferralCode = async () => {
    if (!user) return;
    
    const { code } = await referralService.getUserReferralCode(user.id);
    if (code) setReferralCode(code);
    setLoadingCode(false);
  };

  const handleShare = async () => {
    if (!shareCardRef.current) return;

    setSharing(true);

    const achievement = socialSharingService.prepareAchievementData(
      rank,
      badgeName,
      badgeIcon,
      generosityScore,
      creditsGiven,
      username
    );

    const { success, error } = await socialSharingService.shareAchievement(
      shareCardRef.current,
      achievement,
      referralCode
    );

    setSharing(false);

    if (!success) {
      showAlert('Share Failed', error || 'Unable to share achievement');
      return;
    }

    showAlert('Shared! 🎉', 'Your achievement has been shared successfully!');
  };

  const handleShareReferralOnly = async () => {
    if (!referralCode) return;

    setSharing(true);

    const { success, error } = await socialSharingService.shareReferralCode(
      referralCode,
      username
    );

    setSharing(false);

    if (!success) {
      showAlert('Share Failed', error || 'Unable to share referral code');
      return;
    }

    showAlert('Shared! 🎉', 'Your referral code has been shared!');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Share Achievement</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Shareable Card Preview */}
        <View style={styles.previewSection}>
          <Text style={styles.previewLabel}>Preview</Text>
          
          <View ref={shareCardRef} style={styles.shareCard} collapsable={false}>
            {/* Branded Header */}
            <View style={styles.cardHeader}>
              <Text style={styles.brandText}>Dance with Lorenzo</Text>
              <Text style={styles.cardSubtitle}>Community Leaderboard</Text>
            </View>

            {/* Achievement Content */}
            <View style={styles.achievementContent}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankLabel}>RANK</Text>
                <Text style={styles.rankNumber}>#{rank}</Text>
              </View>

              <View style={styles.badgeSection}>
                <Text style={styles.badgeIconLarge}>{badgeIcon}</Text>
                <Text style={styles.badgeNameText}>{badgeName}</Text>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <MaterialIcons name="favorite" size={20} color={colors.error} />
                  <Text style={styles.statValue}>{creditsGiven}</Text>
                  <Text style={styles.statLabel}>Credits Given</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <MaterialIcons name="star" size={20} color={colors.warning} />
                  <Text style={styles.statValue}>{generosityScore}</Text>
                  <Text style={styles.statLabel}>Points</Text>
                </View>
              </View>

              <Text style={styles.usernameText}>{username}</Text>
            </View>

            {/* Footer with Referral */}
            {referralCode && (
              <View style={styles.cardFooter}>
                <Text style={styles.footerText}>Join with code:</Text>
                <View style={styles.referralCodeBox}>
                  <Text style={styles.referralCodeText}>{referralCode}</Text>
                </View>
                <Text style={styles.footerReward}>Get 3 FREE workshop credits! 🎁</Text>
              </View>
            )}

            {/* Decorative Elements */}
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
          </View>
        </View>

        {/* Share Buttons */}
        <View style={styles.actionsSection}>
          <Pressable
            style={[styles.shareButton, styles.shareButtonPrimary]}
            onPress={handleShare}
            disabled={sharing || loadingCode}
          >
            {sharing ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <>
                <MaterialIcons name="share" size={24} color={colors.surface} />
                <Text style={styles.shareButtonText}>Share Achievement</Text>
              </>
            )}
          </Pressable>

          {referralCode && (
            <Pressable
              style={[styles.shareButton, styles.shareButtonSecondary]}
              onPress={handleShareReferralOnly}
              disabled={sharing || loadingCode}
            >
              <MaterialIcons name="card-giftcard" size={24} color={colors.primary} />
              <Text style={[styles.shareButtonText, { color: colors.primary }]}>
                Share Referral Code Only
              </Text>
            </Pressable>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <MaterialIcons name="info-outline" size={20} color={colors.accent} />
          <Text style={styles.infoText}>
            Share your achievement on social media and invite friends to join Dance with Lorenzo!
            {referralCode && ' They get 3 free credits, and you earn rewards for each successful referral!'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  previewSection: {
    marginBottom: spacing.xl,
  },
  previewLabel: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  shareCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary + '30',
  },
  brandText: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '900',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  achievementContent: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  rankBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginBottom: spacing.lg,
    borderWidth: 3,
    borderColor: colors.warning,
  },
  rankLabel: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  rankNumber: {
    ...typography.h1,
    color: colors.warning,
    fontWeight: '900',
    fontSize: 36,
    textAlign: 'center',
  },
  badgeSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  badgeIconLarge: {
    fontSize: 64,
    marginBottom: spacing.sm,
  },
  badgeNameText: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 2,
    height: 40,
    backgroundColor: colors.textLight + '30',
    marginHorizontal: spacing.md,
  },
  statValue: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 11,
    marginTop: spacing.xs,
  },
  usernameText: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  cardFooter: {
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 2,
    borderTopColor: colors.primary + '30',
  },
  footerText: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  referralCodeBox: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  referralCodeText: {
    ...typography.h3,
    color: colors.surface,
    fontWeight: '900',
    letterSpacing: 2,
  },
  footerReward: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '700',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.accent + '10',
    top: -50,
    right: -50,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '10',
    bottom: -30,
    left: -30,
  },
  actionsSection: {
    marginBottom: spacing.xl,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  shareButtonPrimary: {
    backgroundColor: colors.primary,
    ...shadows.md,
  },
  shareButtonSecondary: {
    backgroundColor: colors.primary + '20',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  shareButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.accent + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    ...typography.caption,
    color: colors.text,
    lineHeight: 18,
  },
});
