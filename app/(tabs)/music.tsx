import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Audio } from 'expo-av';
import { useAuth, useAlert } from '@/template';
import { useLanguage } from '@/hooks/useLanguage';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { musicService, MusicProduct, MusicPurchase } from '@/services/musicService';

export default function MusicScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { t } = useLanguage();

  const [products, setProducts] = useState<MusicProduct[]>([]);
  const [purchases, setPurchases] = useState<MusicPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<MusicProduct | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    loadData();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    const [productsResult, purchasesResult] = await Promise.all([
      musicService.getActiveProducts(),
      musicService.getUserPurchases(user.id),
    ]);

    if (productsResult.data) setProducts(productsResult.data);
    if (purchasesResult.data) setPurchases(purchasesResult.data);

    setLoading(false);
    setRefreshing(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePlayPreview = async (product: MusicProduct) => {
    if (!product.preview_audio_url) {
      showAlert('Preview Not Available', 'This music does not have a preview');
      return;
    }

    try {
      // Stop current sound if playing
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        if (playingPreview === product.id) {
          setPlayingPreview(null);
          return;
        }
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: product.preview_audio_url },
        { shouldPlay: true }
      );

      setSound(newSound);
      setPlayingPreview(product.id);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingPreview(null);
        }
      });
    } catch (err) {
      console.error('Error playing preview:', err);
      showAlert(t('error'), 'Failed to play preview');
    }
  };

  const handleBuyNow = (product: MusicProduct) => {
    // Check if already purchased
    const existingPurchase = purchases.find(
      p => p.product_id === product.id && p.payment_status !== 'cancelled'
    );

    if (existingPurchase) {
      if (existingPurchase.payment_status === 'confirmed') {
        showAlert('Already Owned', 'You already own this music');
      } else {
        showAlert('Pending Payment', 'You have a pending purchase for this music. Please complete the payment.');
      }
      return;
    }

    setSelectedProduct(product);
    setShowPurchaseModal(true);
  };

  const confirmPurchase = async () => {
    if (!user || !selectedProduct) return;

    setPurchasing(selectedProduct.id);

    const { data, error } = await musicService.createPurchase(
      user.id,
      selectedProduct.id,
      selectedProduct.price
    );

    setPurchasing(null);
    setShowPurchaseModal(false);

    if (error) {
      showAlert(t('error'), error);
    } else {
      showAlert(
        'Purchase Created!',
        `Music reserved!\n\nPlease pay ¥${selectedProduct.price.toLocaleString()} via:\n💳 Bank transfer\n💴 Cash at class\n\nContact Lorenzo to confirm payment and receive your download link.`
      );
      loadData();
    }

    setSelectedProduct(null);
  };

  const isPurchased = (productId: string) => {
    return purchases.some(
      p => p.product_id === productId && p.payment_status === 'confirmed'
    );
  };

  const isPending = (productId: string) => {
    return purchases.some(
      p => p.product_id === productId && p.payment_status === 'pending'
    );
  };

  const getProductTypeIcon = (type: string) => {
    switch (type) {
      case 'album': return 'album';
      case 'single': return 'music-note';
      case 'ep': return 'library-music';
      default: return 'music-note';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  const confirmedPurchases = purchases.filter(p => p.payment_status === 'confirmed');
  const pendingPurchases = purchases.filter(p => p.payment_status === 'pending');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Music by Lorenzo</Text>
          <Text style={styles.headerSubtitle}>Original Compositions & Performances</Text>
        </View>
        <MaterialIcons name="music-note" size={32} color={colors.primary} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* My Music Section */}
        {confirmedPurchases.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Music</Text>
            {confirmedPurchases.map((purchase) => (
              <View key={purchase.id} style={styles.purchaseCard}>
                <View style={styles.purchaseIcon}>
                  <MaterialIcons name="check-circle" size={24} color={colors.success} />
                </View>
                <View style={styles.purchaseInfo}>
                  <Text style={styles.purchaseTitle}>{purchase.product?.title}</Text>
                  <Text style={styles.purchaseArtist}>{purchase.product?.artist}</Text>
                  {purchase.download_sent ? (
                    <View style={styles.downloadSentBadge}>
                      <MaterialIcons name="cloud-download" size={14} color={colors.success} />
                      <Text style={styles.downloadSentText}>Download link sent</Text>
                    </View>
                  ) : (
                    <Text style={styles.purchasePending}>Awaiting download link from Lorenzo</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Pending Purchases */}
        {pendingPurchases.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Payments</Text>
            {pendingPurchases.map((purchase) => (
              <View key={purchase.id} style={[styles.purchaseCard, styles.pendingCard]}>
                <View style={styles.purchaseIcon}>
                  <MaterialIcons name="hourglass-empty" size={24} color={colors.warning} />
                </View>
                <View style={styles.purchaseInfo}>
                  <Text style={styles.purchaseTitle}>{purchase.product?.title}</Text>
                  <Text style={styles.purchasePrice}>¥{purchase.purchase_price.toLocaleString()}</Text>
                  <Text style={styles.purchasePending}>Complete payment to receive download link</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Available Music */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Music</Text>
          {products.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="music-off" size={64} color={colors.textLight} />
              <Text style={styles.emptyText}>No music available yet</Text>
            </View>
          ) : (
            products.map((product) => (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productCover}>
                  {product.cover_image_url ? (
                    <Image
                      source={{ uri: product.cover_image_url }}
                      style={styles.coverImage}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <View style={styles.placeholderCover}>
                      <MaterialIcons name="album" size={48} color={colors.textLight} />
                    </View>
                  )}
                  <View style={[styles.typeBadge, { backgroundColor: colors.primary }]}>
                    <MaterialIcons
                      name={getProductTypeIcon(product.product_type)}
                      size={14}
                      color={colors.surface}
                    />
                  </View>
                </View>

                <View style={styles.productInfo}>
                  <Text style={styles.productTitle}>{product.title}</Text>
                  <Text style={styles.productArtist}>{product.artist}</Text>
                  {product.description && (
                    <Text style={styles.productDescription} numberOfLines={2}>
                      {product.description}
                    </Text>
                  )}
                  <View style={styles.productMeta}>
                    {product.track_count && (
                      <View style={styles.metaItem}>
                        <MaterialIcons name="queue-music" size={14} color={colors.textLight} />
                        <Text style={styles.metaText}>{product.track_count} tracks</Text>
                      </View>
                    )}
                    {product.release_date && (
                      <View style={styles.metaItem}>
                        <MaterialIcons name="event" size={14} color={colors.textLight} />
                        <Text style={styles.metaText}>
                          {new Date(product.release_date).getFullYear()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.productActions}>
                    {product.preview_audio_url && (
                      <Pressable
                        style={styles.previewButton}
                        onPress={() => handlePlayPreview(product)}
                      >
                        <MaterialIcons
                          name={playingPreview === product.id ? 'stop' : 'play-arrow'}
                          size={20}
                          color={colors.primary}
                        />
                        <Text style={styles.previewButtonText}>
                          {playingPreview === product.id ? 'Stop' : 'Preview'}
                        </Text>
                      </Pressable>
                    )}

                    <View style={styles.priceAndBuy}>
                      <Text style={styles.productPrice}>¥{product.price.toLocaleString()}</Text>
                      <Pressable
                        style={[
                          styles.buyButton,
                          (isPurchased(product.id) || isPending(product.id)) &&
                            styles.buyButtonDisabled,
                        ]}
                        onPress={() => handleBuyNow(product)}
                        disabled={isPurchased(product.id) || isPending(product.id)}
                      >
                        <MaterialIcons
                          name={
                            isPurchased(product.id)
                              ? 'check-circle'
                              : isPending(product.id)
                              ? 'hourglass-empty'
                              : 'shopping-cart'
                          }
                          size={18}
                          color={colors.surface}
                        />
                        <Text style={styles.buyButtonText}>
                          {isPurchased(product.id)
                            ? 'Owned'
                            : isPending(product.id)
                            ? 'Pending'
                            : 'Buy Now'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Purchase Confirmation Modal */}
      <Modal
        visible={showPurchaseModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowPurchaseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="shopping-cart" size={32} color={colors.primary} />
              <Text style={styles.modalTitle}>Confirm Purchase</Text>
            </View>

            {selectedProduct && (
              <>
                <View style={styles.modalContent}>
                  <Text style={styles.modalProductTitle}>{selectedProduct.title}</Text>
                  <Text style={styles.modalProductArtist}>{selectedProduct.artist}</Text>

                  <View style={styles.modalPrice}>
                    <Text style={styles.modalPriceLabel}>Price:</Text>
                    <Text style={styles.modalPriceValue}>
                      ¥{selectedProduct.price.toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.paymentInstructions}>
                    <MaterialIcons name="info-outline" size={20} color={colors.primary} />
                    <Text style={styles.paymentInstructionsText}>
                      After confirmation, you'll receive payment instructions. Once Lorenzo confirms your
                      payment, he'll send you the download link via email.
                    </Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <Pressable
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => {
                      setShowPurchaseModal(false);
                      setSelectedProduct(null);
                    }}
                    disabled={!!purchasing}
                  >
                    <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalButton, styles.modalButtonConfirm]}
                    onPress={confirmPurchase}
                    disabled={!!purchasing}
                  >
                    {purchasing ? (
                      <Text style={styles.modalButtonTextConfirm}>Processing...</Text>
                    ) : (
                      <Text style={styles.modalButtonTextConfirm}>Confirm Purchase</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  purchaseCard: {
    flexDirection: 'row',
    backgroundColor: colors.success + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  pendingCard: {
    backgroundColor: colors.warning + '10',
    borderColor: colors.warning + '30',
  },
  purchaseIcon: {
    marginRight: spacing.md,
  },
  purchaseInfo: {
    flex: 1,
  },
  purchaseTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  purchaseArtist: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  purchasePrice: {
    ...typography.body,
    color: colors.accent,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  purchasePending: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 11,
  },
  downloadSentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  downloadSentText: {
    ...typography.caption,
    color: colors.success,
    fontSize: 11,
    fontWeight: '600',
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  productCover: {
    width: 100,
    height: 100,
    marginRight: spacing.md,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  productArtist: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  productDescription: {
    ...typography.caption,
    color: colors.textLight,
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  productMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textLight,
  },
  productActions: {
    gap: spacing.sm,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  previewButtonText: {
    ...typography.button,
    fontSize: 13,
    color: colors.primary,
  },
  priceAndBuy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productPrice: {
    ...typography.h3,
    color: colors.accent,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  buyButtonDisabled: {
    backgroundColor: colors.textLight,
    opacity: 0.6,
  },
  buyButtonText: {
    ...typography.button,
    fontSize: 13,
    color: colors.surface,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    ...typography.body,
    color: colors.textLight,
    marginTop: spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: 400,
    ...shadows.xl,
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '20',
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.sm,
  },
  modalContent: {
    padding: spacing.lg,
  },
  modalProductTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  modalProductArtist: {
    ...typography.body,
    color: colors.textLight,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalPrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  modalPriceLabel: {
    ...typography.body,
    color: colors.textLight,
  },
  modalPriceValue: {
    ...typography.h2,
    color: colors.accent,
  },
  paymentInstructions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  paymentInstructionsText: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.primary + '20',
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.textLight + '40',
  },
  modalButtonConfirm: {
    backgroundColor: colors.success,
    ...shadows.md,
  },
  modalButtonTextCancel: {
    ...typography.button,
    color: colors.text,
  },
  modalButtonTextConfirm: {
    ...typography.button,
    color: colors.surface,
  },
});
