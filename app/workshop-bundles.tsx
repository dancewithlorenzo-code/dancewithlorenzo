import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth, useAlert } from '@/template';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { workshopBundleService, WorkshopBundle } from '@/services/workshopBundleService';
import { seasonalPromotionService, SeasonalPromotion } from '@/services/seasonalPromotionService';
import { stripeService } from '@/services/stripeService';
import * as WebBrowser from 'expo-web-browser';

export default function WorkshopBundlesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [bundles, setBundles] = useState<WorkshopBundle[]>([]);
  const [totalCredits, setTotalCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasing, setPurchasing] = useState<'3_pack' | '5_pack' | '7_pack' | null>(null);
  const [activePromotions, setActivePromotions] = useState<SeasonalPromotion[]>([]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    const { data, totalCredits: total } = await workshopBundleService.getUserBundles(user.id);
    if (data) {
      setBundles(data);
      setTotalCredits(total);
    }

    // Load active promotions
    const { data: promotions } = await seasonalPromotionService.getActivePromotions();
    if (promotions) {
      setActivePromotions(promotions);
    }

    setLoading(false);
    setRefreshing(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePurchaseBundle = async (bundleType: '3_pack' | '5_pack' | '7_pack', promoCode?: string) => {
    if (!user) return;

    setPurchasing(bundleType);

    const { url, credits, savings, error } = await stripeService.createWorkshopBundleCheckout(
      user.id,
      bundleType,
      promoCode
    );

    setPurchasing(null);

    if (error || !url) {
      showAlert('Error', error || 'Failed to create checkout session');
      return;
    }

    const result = await WebBrowser.openBrowserAsync(url);

    if (result.type === 'cancel' || result.type === 'dismiss') {
      loadData();
      showAlert(
        'Bundle Purchase',
        `Workshop bundle checkout created (${credits} credits, saving ¥${savings.toLocaleString()}). Please complete payment to activate.`
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatPromotionDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const threePackPricing = workshopBundleService.getBundlePricing('3_pack');
  const fivePackPricing = workshopBundleService.getBundlePricing('5_pack');
  const sevenPackPricing = workshopBundleService.getBundlePricing('7_pack');

  // Find best promotion for each bundle type
  const threePackPromo = activePromotions.find(p => p.bundle_type === '3_pack' || p.bundle_type === 'any');
  const fivePackPromo = activePromotions.find(p => p.bundle_type === '5_pack' || p.bundle_type === 'any');
  const sevenPackPromo = activePromotions.find(p => p.bundle_type === '7_pack' || p.bundle_type === 'any');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Workshop Bundles</Text>
        <View style={styles.headerActions}>
          <Pressable 
            onPress={() => router.push('/credit-requests')} 
            style={styles.requestButton}
          >
            <MaterialIcons name="question-answer" size={18} color={colors.accent} />
          </Pressable>
          <Pressable 
            onPress={() => router.push('/transfer-credits')} 
            style={styles.transferButton}
          >
            <MaterialIcons name="swap-horiz" size={18} color={colors.primary} />
          </Pressable>
          <Pressable 
            onPress={() => router.push('/gift-cards')} 
            style={styles.giftCardButton}
          >
            <MaterialIcons name="card-giftcard" size={18} color={colors.warning} />
          </Pressable>
          <View style={styles.creditBadge}>
            <MaterialIcons name="confirmation-number" size={16} color={colors.accent} />
            <Text style={styles.creditText}>{totalCredits} credits</Text>
          </View>
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
        {/* Active Promotions Banner */}
        {activePromotions.length > 0 && (
          <View style={styles.promoBanner}>
            <MaterialIcons name="local-offer" size={28} color={colors.warning} />
            <View style={styles.promoContent}>
              <Text style={styles.promoTitle}>🎉 Limited Time Offers!</Text>
              {activePromotions.map((promo) => (
                <View key={promo.id} style={styles.promoItem}>
                  <Text style={styles.promoName}>{promo.name}</Text>
                  <Text style={styles.promoDescription}>{promo.description}</Text>
                  <View style={styles.promoDetails}>
                    <View style={styles.promoCode}>
                      <Text style={styles.promoCodeText}>{promo.promotion_code}</Text>
                    </View>
                    <Text style={styles.promoExpiry}>
                      Until {formatPromotionDate(promo.end_date)}
                    </Text>
                  </View>
                  {promo.max_uses && (
                    <Text style={styles.promoUsage}>
                      {promo.max_uses - promo.current_uses} uses remaining
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <MaterialIcons name="info-outline" size={24} color={colors.accent} />
          <Text style={styles.infoText}>
            Save money by purchasing workshop bundles! Use credits to book any workshop instead of paying per class.
          </Text>
        </View>

        {/* Bundle Offers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Bundles</Text>

          {/* 3-Pack Bundle */}
          <View style={styles.bundleCard}>
            <View style={styles.bundleHeader}>
              <View style={styles.bundleIcon}>
                <MaterialIcons name="confirmation-number" size={32} color={colors.accent} />
                <Text style={styles.bundleIconText}>3</Text>
              </View>
              <View style={styles.bundleInfo}>
                <Text style={styles.bundleName}>3 Workshop Bundle</Text>
                <Text style={styles.bundleDescription}>Perfect for trying out workshops</Text>
              </View>
            </View>

            <View style={styles.pricingContainer}>
              <View style={styles.pricingRow}>
                <Text style={styles.priceLabel}>Original Price:</Text>
                <Text style={styles.originalPrice}>¥{threePackPricing.originalPrice.toLocaleString()}</Text>
              </View>
              <View style={styles.pricingRow}>
                <Text style={styles.priceLabel}>Bundle Price:</Text>
                <Text style={styles.bundlePrice}>¥{threePackPricing.discountedPrice.toLocaleString()}</Text>
              </View>
              <View style={[styles.savingsBadge, { backgroundColor: colors.success + '20' }]}>
                <Text style={[styles.savingsText, { color: colors.success }]}>
                  Save ¥{threePackPricing.savings.toLocaleString()} ({threePackPricing.discountPercent}% off)
                </Text>
              </View>
            </View>

            <Pressable
              style={[styles.purchaseButton, purchasing === '3_pack' && styles.purchaseButtonDisabled]}
              onPress={() => handlePurchaseBundle('3_pack', threePackPromo?.promotion_code)}
              disabled={purchasing === '3_pack'}
            >
              <MaterialIcons name="shopping-cart" size={20} color={colors.surface} />
              <Text style={styles.purchaseButtonText}>
                {purchasing === '3_pack' ? 'Processing...' : 'Purchase 3-Pack'}
              </Text>
            </Pressable>
          </View>

          {/* 5-Pack Bundle */}
          <View style={[styles.bundleCard, !sevenPackPromo && styles.recommendedBundle]}>
            {!sevenPackPromo && (
              <View style={styles.recommendedBadge}>
                <MaterialIcons name="star" size={16} color={colors.warning} />
                <Text style={styles.recommendedText}>Best Value</Text>
              </View>
            )}

            <View style={styles.bundleHeader}>
              <View style={[styles.bundleIcon, { backgroundColor: colors.warning + '20' }]}>
                <MaterialIcons name="confirmation-number" size={32} color={colors.warning} />
                <Text style={[styles.bundleIconText, { color: colors.warning }]}>5</Text>
              </View>
              <View style={styles.bundleInfo}>
                <Text style={styles.bundleName}>5 Workshop Bundle</Text>
                <Text style={styles.bundleDescription}>Maximum savings for regulars</Text>
              </View>
            </View>

            <View style={styles.pricingContainer}>
              <View style={styles.pricingRow}>
                <Text style={styles.priceLabel}>Original Price:</Text>
                <Text style={styles.originalPrice}>¥{fivePackPricing.originalPrice.toLocaleString()}</Text>
              </View>
              <View style={styles.pricingRow}>
                <Text style={styles.priceLabel}>Bundle Price:</Text>
                <Text style={styles.bundlePrice}>¥{fivePackPricing.discountedPrice.toLocaleString()}</Text>
              </View>
              <View style={[styles.savingsBadge, { backgroundColor: colors.success + '20' }]}>
                <Text style={[styles.savingsText, { color: colors.success }]}>
                  Save ¥{fivePackPricing.savings.toLocaleString()} ({fivePackPricing.discountPercent}% off)
                </Text>
              </View>
            </View>

            <Pressable
              style={[
                styles.purchaseButton,
                !sevenPackPromo && { backgroundColor: colors.warning },
                purchasing === '5_pack' && styles.purchaseButtonDisabled
              ]}
              onPress={() => handlePurchaseBundle('5_pack', fivePackPromo?.promotion_code)}
              disabled={purchasing === '5_pack'}
            >
              <MaterialIcons name="shopping-cart" size={20} color={colors.surface} />
              <Text style={styles.purchaseButtonText}>
                {purchasing === '5_pack' ? 'Processing...' : 'Purchase 5-Pack'}
              </Text>
            </Pressable>
          </View>

          {/* 7-Pack Seasonal Bundle (Only when promotion active) */}
          {sevenPackPromo && (
            <View style={[styles.bundleCard, styles.seasonalBundle]}>
              <View style={styles.seasonalBadge}>
                <MaterialIcons name="local-offer" size={18} color={colors.error} />
                <Text style={styles.seasonalText}>LIMITED TIME ONLY</Text>
              </View>

              <View style={styles.bundleHeader}>
                <View style={[styles.bundleIcon, { backgroundColor: colors.error + '20' }]}>
                  <MaterialIcons name="confirmation-number" size={32} color={colors.error} />
                  <Text style={[styles.bundleIconText, { color: colors.error }]}>7</Text>
                </View>
                <View style={styles.bundleInfo}>
                  <Text style={styles.bundleName}>7 Workshop Bundle</Text>
                  <Text style={styles.bundleDescription}>{sevenPackPromo.name}</Text>
                </View>
              </View>

              <View style={styles.pricingContainer}>
                <View style={styles.pricingRow}>
                  <Text style={styles.priceLabel}>Original Price:</Text>
                  <Text style={styles.originalPrice}>¥{sevenPackPricing.originalPrice.toLocaleString()}</Text>
                </View>
                <View style={styles.pricingRow}>
                  <Text style={styles.priceLabel}>Bundle Price:</Text>
                  <Text style={styles.bundlePrice}>¥{sevenPackPricing.discountedPrice.toLocaleString()}</Text>
                </View>
                <View style={[styles.savingsBadge, { backgroundColor: colors.error + '20' }]}>
                  <Text style={[styles.savingsText, { color: colors.error }]}>
                    Save ¥{sevenPackPricing.savings.toLocaleString()} ({sevenPackPricing.discountPercent}% off)
                  </Text>
                </View>
                <View style={styles.promoTimer}>
                  <MaterialIcons name="schedule" size={14} color={colors.error} />
                  <Text style={styles.promoTimerText}>
                    Ends {formatPromotionDate(sevenPackPromo.end_date)}
                  </Text>
                </View>
              </View>

              <Pressable
                style={[
                  styles.purchaseButton,
                  { backgroundColor: colors.error },
                  purchasing === '7_pack' && styles.purchaseButtonDisabled
                ]}
                onPress={() => handlePurchaseBundle('7_pack', sevenPackPromo.promotion_code)}
                disabled={purchasing === '7_pack'}
              >
                <MaterialIcons name="shopping-cart" size={20} color={colors.surface} />
                <Text style={styles.purchaseButtonText}>
                  {purchasing === '7_pack' ? 'Processing...' : 'Purchase 7-Pack'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* My Bundles */}
        {bundles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Workshop Credits</Text>
            {bundles.map((bundle) => (
              <View key={bundle.id} style={styles.ownedBundleCard}>
                <View style={styles.ownedBundleHeader}>
                  <View style={styles.ownedBundleIcon}>
                    <MaterialIcons name="confirmation-number" size={24} color={colors.accent} />
                  </View>
                  <View style={styles.ownedBundleInfo}>
                    <Text style={styles.ownedBundleName}>
                      {bundle.bundle_type === '3_pack' ? '3 Workshop Bundle' : 
                       bundle.bundle_type === '5_pack' ? '5 Workshop Bundle' : '7 Workshop Bundle'}
                    </Text>
                    <Text style={styles.ownedBundleDate}>
                      Purchased {formatDate(bundle.created_at)}
                    </Text>
                  </View>
                </View>

                <View style={styles.creditsProgress}>
                  <View style={styles.creditsBar}>
                    <View
                      style={[
                        styles.creditsBarFill,
                        {
                          width: `${(bundle.remaining_credits / bundle.total_credits) * 100}%`,
                          backgroundColor: bundle.remaining_credits > 0 ? colors.success : colors.textLight
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.creditsText}>
                    {bundle.remaining_credits} of {bundle.total_credits} credits remaining
                  </Text>
                </View>

                <View style={styles.ownedBundleFooter}>
                  <View style={styles.bundleStats}>
                    <MaterialIcons name="shopping-cart" size={14} color={colors.textLight} />
                    <Text style={styles.bundleStatsText}>
                      ¥{bundle.discounted_price.toLocaleString()} ({bundle.discount_percent}% off)
                    </Text>
                  </View>
                  {bundle.remaining_credits === 0 && (
                    <View style={styles.usedBadge}>
                      <Text style={styles.usedBadgeText}>Fully Used</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.instructionsCard}>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>1</Text>
              </View>
              <Text style={styles.instructionText}>
                Purchase a workshop bundle (3, 5, or 7 credits) at discounted price. Watch for seasonal promotions!
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>2</Text>
              </View>
              <Text style={styles.instructionText}>
                When booking a workshop, credits are automatically used instead of charging per class
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>3</Text>
              </View>
              <Text style={styles.instructionText}>
                Use credits for any workshop - no expiration date!
              </Text>
            </View>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  requestButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  transferButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  giftCardButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    ...shadows.sm,
  },
  creditText: {
    ...typography.body,
    color: colors.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
    borderWidth: 2,
    borderColor: colors.warning + '40',
    ...shadows.md,
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    ...typography.h3,
    color: colors.warning,
    marginBottom: spacing.md,
  },
  promoItem: {
    marginBottom: spacing.md,
  },
  promoName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  promoDescription: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  promoDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  promoCode: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  promoCodeText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
  },
  promoExpiry: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 11,
  },
  promoUsage: {
    ...typography.caption,
    color: colors.error,
    fontSize: 11,
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.accent + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    ...typography.caption,
    color: colors.text,
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  bundleCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  recommendedBundle: {
    borderWidth: 2,
    borderColor: colors.warning + '40',
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  recommendedText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '700',
    fontSize: 11,
  },
  seasonalBundle: {
    borderWidth: 3,
    borderColor: colors.error + '50',
    backgroundColor: colors.error + '05',
  },
  seasonalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  seasonalText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  bundleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  bundleIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    position: 'relative',
  },
  bundleIconText: {
    position: 'absolute',
    ...typography.h2,
    color: colors.accent,
    fontWeight: '900',
    bottom: 4,
    right: 8,
  },
  bundleInfo: {
    flex: 1,
  },
  bundleName: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  bundleDescription: {
    ...typography.caption,
    color: colors.textLight,
  },
  pricingContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  priceLabel: {
    ...typography.body,
    color: colors.textLight,
  },
  originalPrice: {
    ...typography.body,
    color: colors.textLight,
    textDecorationLine: 'line-through',
  },
  bundlePrice: {
    ...typography.h2,
    color: colors.accent,
    fontWeight: '700',
  },
  savingsBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  savingsText: {
    ...typography.caption,
    fontWeight: '700',
  },
  promoTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  promoTimerText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
    fontSize: 12,
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    ...shadows.md,
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
  },
  purchaseButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  ownedBundleCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  ownedBundleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  ownedBundleIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  ownedBundleInfo: {
    flex: 1,
  },
  ownedBundleName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  ownedBundleDate: {
    ...typography.caption,
    color: colors.textLight,
  },
  creditsProgress: {
    marginBottom: spacing.md,
  },
  creditsBar: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  creditsBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  creditsText: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 12,
  },
  ownedBundleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bundleStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bundleStatsText: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 12,
  },
  usedBadge: {
    backgroundColor: colors.textLight + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  usedBadgeText: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 11,
    fontWeight: '600',
  },
  instructionsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionNumberText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '700',
  },
  instructionText: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },
});
