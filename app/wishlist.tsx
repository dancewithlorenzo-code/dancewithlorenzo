import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useAuth, useAlert } from '@/template';
import { fetchUserWishlist, removeFromWishlist, WishlistItem } from '@/services/wishlistService';

export default function WishlistScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  useEffect(() => {
    if (user) {
      loadWishlist();
    }
  }, [user]);

  const loadWishlist = async () => {
    if (!user) return;

    const { data, error } = await fetchUserWishlist(user.id);
    
    if (error) {
      showAlert('Error', error);
    } else if (data) {
      setWishlist(data);
    }

    setLoading(false);
    setRefreshing(false);
  };

  const handleRemove = async (productId: string, productName: string) => {
    if (!user) return;

    Alert.alert(
      'Remove from Wishlist',
      `Remove "${productName}" from your wishlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { success, error } = await removeFromWishlist(user.id, productId);
            
            if (error) {
              showAlert('Error', error);
            } else {
              showAlert('Removed', `${productName} removed from wishlist`);
              loadWishlist();
            }
          },
        },
      ]
    );
  };

  const handleViewProduct = (productId: string) => {
    // Navigate to boutique with product highlighted
    router.push('/boutique');
  };

  const getPriceDrop = (item: WishlistItem): number | null => {
    if (!item.last_known_price || item.last_known_price <= item.product.price) {
      return null;
    }
    return item.last_known_price - item.product.price;
  };

  if (!user) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <MaterialIcons name="favorite-border" size={64} color={colors.textLight} />
        <Text style={styles.emptyText}>Please log in to view your wishlist</Text>
        <Pressable style={styles.loginButton} onPress={() => router.push('/auth')}>
          <Text style={styles.loginButtonText}>Log In</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading wishlist...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>My Wishlist</Text>
        <View style={styles.wishlistBadge}>
          <MaterialIcons name="favorite" size={20} color={colors.error} />
          <Text style={styles.wishlistCount}>{wishlist.length}</Text>
        </View>
      </View>

      {wishlist.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="favorite-border" size={80} color={colors.textLight} />
          <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
          <Text style={styles.emptySubtitle}>
            Save your favorite products and get notified when they're back in stock or on sale!
          </Text>
          <Pressable style={styles.browseButton} onPress={() => router.push('/boutique')}>
            <MaterialIcons name="store" size={20} color={colors.surface} />
            <Text style={styles.browseButtonText}>Browse Boutique</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadWishlist(); }} />
          }
        >
          {/* Stats Card */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <MaterialIcons name="favorite" size={24} color={colors.error} />
              <Text style={styles.statValue}>{wishlist.length}</Text>
              <Text style={styles.statLabel}>Saved Items</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialIcons name="shopping-bag" size={24} color={colors.success} />
              <Text style={styles.statValue}>
                {wishlist.filter(item => item.product.stock_quantity > 0).length}
              </Text>
              <Text style={styles.statLabel}>In Stock</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialIcons name="local-offer" size={24} color={colors.primary} />
              <Text style={styles.statValue}>
                {wishlist.filter(item => getPriceDrop(item)).length}
              </Text>
              <Text style={styles.statLabel}>Price Drops</Text>
            </View>
          </View>

          {/* Wishlist Items */}
          {wishlist.map((item) => {
            const priceDrop = getPriceDrop(item);
            const inStock = item.product.stock_quantity > 0;
            const isNew = new Date().getTime() - new Date(item.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;

            return (
              <Pressable
                key={item.id}
                style={styles.wishlistCard}
                onPress={() => handleViewProduct(item.product_id)}
              >
                <Image
                  source={{ uri: item.product.image_url || 'https://via.placeholder.com/120' }}
                  style={styles.productImage}
                  contentFit="cover"
                  transition={200}
                />

                <View style={styles.productInfo}>
                  <View style={styles.productHeader}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {item.product.name}
                    </Text>
                    {isNew && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.productCategory}>{item.product.category}</Text>

                  <View style={styles.priceRow}>
                    <Text style={styles.currentPrice}>
                      ¥{(item.product.price / 100).toLocaleString()}
                    </Text>
                    {priceDrop && (
                      <View style={styles.priceDrop}>
                        <MaterialIcons name="trending-down" size={16} color={colors.success} />
                        <Text style={styles.priceDropText}>
                          -¥{(priceDrop / 100).toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.statusRow}>
                    {inStock ? (
                      <View style={styles.inStockBadge}>
                        <MaterialIcons name="check-circle" size={14} color={colors.success} />
                        <Text style={styles.inStockText}>In Stock</Text>
                      </View>
                    ) : (
                      <View style={styles.outOfStockBadge}>
                        <MaterialIcons name="notifications" size={14} color={colors.warning} />
                        <Text style={styles.outOfStockText}>Notify on Restock</Text>
                      </View>
                    )}

                    <Text style={styles.addedDate}>
                      Added {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.actions}>
                  <Pressable
                    style={styles.removeButton}
                    onPress={() => handleRemove(item.product_id, item.product.name)}
                  >
                    <MaterialIcons name="delete-outline" size={24} color={colors.error} />
                  </Pressable>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
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
    paddingHorizontal: spacing.xl,
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
  title: {
    ...typography.h2,
    color: colors.text,
    flex: 1,
    marginLeft: spacing.md,
  },
  wishlistBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  wishlistCount: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.error,
  },
  loadingText: {
    ...typography.body,
    color: colors.textLight,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textLight,
    marginTop: spacing.lg,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  browseButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
  },
  loginButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  wishlistCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
  },
  productInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  productName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  newBadge: {
    backgroundColor: colors.accent + '30',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  newBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
  },
  productCategory: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.sm,
    textTransform: 'capitalize',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  currentPrice: {
    ...typography.h3,
    color: colors.primary,
  },
  priceDrop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  priceDropText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.success,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  inStockText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.success,
  },
  outOfStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  outOfStockText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.warning,
  },
  addedDate: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 10,
  },
  actions: {
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
