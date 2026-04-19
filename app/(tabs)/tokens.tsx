
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth, useAlert } from '@/template';
import { useLanguage } from '@/hooks/useLanguage';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { tokenService, TokenBalance } from '@/services/tokenService';
import { stripeService } from '@/services/stripeService';

export default function TokensScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { t } = useLanguage();

  const [tokens, setTokens] = useState<TokenBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user) return;

    const { data } = await tokenService.getUserTokens(user.id);
    if (data) setTokens(data);

    setLoading(false);
    setRefreshing(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePurchaseTokens = async () => {
    if (!user || purchasing) return;

    showAlert(
      'Manual Payment Required',
      'To purchase tokens, please pay ¥33,000 via:\n\n' +
      '💳 Bank Transfer\n' +
      '💴 Cash at class\n\n' +
      'After payment, contact Lorenzo to activate your tokens.'
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  const remaining = tokens?.remaining_tokens || 0;
  const total = tokens?.total_tokens || 0;
  const used = tokens?.used_tokens || 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Become my Dancers Tokens</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Test Payment Button (Development/Testing) */}
        <Pressable 
          style={styles.testPaymentBanner}
          onPress={() => router.push('/test-payment')}
        >
          <MaterialIcons name="science" size={24} color={colors.warning} />
          <View style={styles.testPaymentContent}>
            <Text style={styles.testPaymentTitle}>🧪 Test Live Mode</Text>
            <Text style={styles.testPaymentText}>
              Verify Stripe with ¥100 test payment before real purchase
            </Text>
          </View>
          <MaterialIcons name="arrow-forward" size={20} color={colors.warning} />
        </Pressable>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <MaterialIcons name="info-outline" size={20} color={colors.primary} />
          <Text style={styles.infoBannerText}>
            These tokens are exclusively for "Become my Dancers" classes. Workshops and private lessons use separate payment methods.
          </Text>
        </View>

        {/* Current Balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t('tokens_remaining')}</Text>
          <View style={styles.balanceDisplay}>
            <Text style={styles.balanceNumber}>{remaining}</Text>
            <Text style={styles.balanceTotal}>/ {total}</Text>
          </View>

          <View style={styles.tokenGauge}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.tokenDot,
                  { backgroundColor: i < remaining ? colors.primary : colors.tokenInactive }
                ]}
              />
            ))}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialIcons name="check-circle" size={20} color={colors.success} />
              <Text style={styles.statLabel}>Used</Text>
              <Text style={styles.statValue}>{used}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <MaterialIcons name="event-available" size={20} color={colors.primary} />
              <Text style={styles.statLabel}>Available</Text>
              <Text style={styles.statValue}>{remaining}</Text>
            </View>
          </View>
        </View>

        {/* Token Package */}
        <View style={styles.packageCard}>
          <View style={styles.packageHeader}>
            <MaterialIcons name="toll" size={32} color={colors.primary} />
            <Text style={styles.packageTitle}>Become my Dancers Package</Text>
          </View>

          <View style={styles.packageContent}>
            <View style={styles.packageDetail}>
              <MaterialIcons name="check" size={20} color={colors.success} />
              <Text style={styles.packageText}>4 Class Tokens</Text>
            </View>
            <View style={styles.packageDetail}>
              <MaterialIcons name="check" size={20} color={colors.success} />
              <Text style={styles.packageText}>Only for "Become my Dancers" classes</Text>
            </View>
            <View style={styles.packageDetail}>
              <MaterialIcons name="check" size={20} color={colors.success} />
              <Text style={styles.packageText}>Tokyo, Yokohama, Online</Text>
            </View>
            <View style={styles.packageDetail}>
              <MaterialIcons name="check" size={20} color={colors.success} />
              <Text style={styles.packageText}>Refundable if you cancel</Text>
            </View>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Package Price</Text>
            <Text style={styles.priceValue}>¥33,000</Text>
            <Text style={styles.pricePerToken}>(¥8,250 per token)</Text>
          </View>

          <Pressable 
            style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
            onPress={handlePurchaseTokens}
            disabled={purchasing}
          >
            <MaterialIcons name="shopping-cart" size={20} color={colors.surface} />
            <Text style={styles.purchaseButtonText}>
              {purchasing ? t('loading') : t('checkout')}
            </Text>
          </Pressable>
        </View>

        {/* Workshop & Private Lessons Info */}
        <View style={styles.otherOptionsCard}>
          <Text style={styles.otherOptionsTitle}>Other Class Options</Text>
          
          <View style={styles.otherOption}>
            <View style={styles.otherOptionHeader}>
              <MaterialIcons name="payments" size={24} color={colors.accent} />
              <Text style={styles.otherOptionName}>Workshops</Text>
            </View>
            <Text style={styles.otherOptionPrice}>¥15,000 (&lt;5 people) / ¥12,000 (5+ people)</Text>
            <Text style={styles.otherOptionDesc}>Pay per workshop. Check the Classes tab for available workshops.</Text>
          </View>

          <View style={styles.otherOption}>
            <View style={styles.otherOptionHeader}>
              <MaterialIcons name="event-available" size={24} color={colors.tropicalPink} />
              <Text style={styles.otherOptionName}>Private Lessons</Text>
            </View>
            <Text style={styles.otherOptionPrice}>¥40,000 per lesson</Text>
            <Text style={styles.otherOptionDesc}>Personalized 1-on-1 or small group lessons. Request via the Private Lessons tab.</Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How Tokens Work</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoNumber}>1</Text>
            <Text style={styles.infoText}>Purchase 4 tokens for ¥33,000</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoNumber}>2</Text>
            <Text style={styles.infoText}>Book "Become my Dancers" classes</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoNumber}>3</Text>
            <Text style={styles.infoText}>Check-in with QR code at the studio</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoNumber}>4</Text>
            <Text style={styles.infoText}>1 token is used per class attended</Text>
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
  loadingText: {
    ...typography.body,
    color: colors.textLight,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '20',
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
  testPaymentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
    borderWidth: 2,
    borderColor: colors.warning + '30',
    ...shadows.sm,
  },
  testPaymentContent: {
    flex: 1,
  },
  testPaymentTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.warning,
    marginBottom: spacing.xs,
  },
  testPaymentText: {
    ...typography.caption,
    color: colors.text,
    lineHeight: 18,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoBannerText: {
    flex: 1,
    ...typography.caption,
    color: colors.text,
    lineHeight: 18,
  },
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  balanceLabel: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  balanceDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.lg,
  },
  balanceNumber: {
    ...typography.h1,
    fontSize: 48,
    color: colors.primary,
  },
  balanceTotal: {
    ...typography.h2,
    color: colors.textLight,
    marginLeft: spacing.sm,
  },
  tokenGauge: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tokenDot: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textLight,
  },
  statValue: {
    ...typography.h3,
    color: colors.text,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: colors.textLight + '40',
  },
  packageCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  packageTitle: {
    ...typography.h2,
    color: colors.text,
    fontSize: 18,
  },
  packageContent: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  packageDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  packageText: {
    ...typography.body,
    color: colors.text,
  },
  priceContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.textLight + '20',
    marginBottom: spacing.lg,
  },
  priceLabel: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  priceValue: {
    ...typography.h1,
    color: colors.primary,
  },
  pricePerToken: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    ...shadows.md,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  otherOptionsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  otherOptionsTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  otherOption: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    paddingLeft: spacing.md,
    marginBottom: spacing.lg,
  },
  otherOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  otherOptionName: {
    ...typography.h3,
    fontSize: 16,
    color: colors.text,
  },
  otherOptionPrice: {
    ...typography.body,
    color: colors.accent,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  otherOptionDesc: {
    ...typography.caption,
    color: colors.textLight,
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  infoTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  infoNumber: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    color: colors.surface,
    textAlign: 'center',
    lineHeight: 32,
    fontWeight: '700',
  },
  infoText: {
    flex: 1,
    ...typography.body,
    color: colors.text,
  },
});
