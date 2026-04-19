import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useAuth, useAlert } from '@/template';
import {
  fetchUserOrders,
  fetchOrderItems,
  BoutiqueOrder,
  BoutiqueOrderItem,
} from '@/services/boutiqueService';

interface OrderWithItems extends BoutiqueOrder {
  items?: BoutiqueOrderItem[];
}

export default function OrderHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [user]);

  async function loadOrders() {
    if (!user) return;

    setLoading(true);
    const { data, error } = await fetchUserOrders(user.id);
    
    if (error) {
      showAlert('Error', error);
    } else if (data) {
      // Load items for each order
      const ordersWithItems = await Promise.all(
        data.map(async (order) => {
          const { data: items } = await fetchOrderItems(order.id);
          return { ...order, items: items || [] };
        })
      );
      setOrders(ordersWithItems);
    }
    
    setLoading(false);
    setRefreshing(false);
  }

  function handleRefresh() {
    setRefreshing(true);
    loadOrders();
  }

  function getStatusColor(status: BoutiqueOrder['status']) {
    switch (status) {
      case 'delivered':
        return colors.success;
      case 'shipped':
        return colors.primary;
      case 'processing':
        return colors.accent;
      case 'paid':
        return '#9C27B0';
      case 'cancelled':
        return colors.error;
      default:
        return colors.textLight;
    }
  }

  function getStatusIcon(status: BoutiqueOrder['status']) {
    switch (status) {
      case 'delivered':
        return 'check-circle';
      case 'shipped':
        return 'local-shipping';
      case 'processing':
        return 'hourglass-empty';
      case 'paid':
        return 'payment';
      case 'cancelled':
        return 'cancel';
      default:
        return 'schedule';
    }
  }

  function formatOrderDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function getEstimatedDelivery(order: BoutiqueOrder): string {
    const orderDate = new Date(order.created_at);
    
    if (order.status === 'delivered') {
      return 'Delivered';
    }
    
    if (order.status === 'cancelled') {
      return 'Cancelled';
    }
    
    // Estimate 3-7 business days from order date
    const minDate = new Date(orderDate);
    minDate.setDate(minDate.getDate() + 3);
    
    const maxDate = new Date(orderDate);
    maxDate.setDate(maxDate.getDate() + 7);
    
    return `${minDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })} - ${maxDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}`;
  }

  function renderOrderCard(order: OrderWithItems) {
    const statusColor = getStatusColor(order.status);
    const statusIcon = getStatusIcon(order.status);
    const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

    return (
      <TouchableOpacity
        key={order.id}
        style={styles.orderCard}
        onPress={() => {
          setSelectedOrder(order);
          setShowDetailsModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderLeft}>
            <Text style={styles.orderNumber}>Order #{order.id.slice(0, 8)}</Text>
            <Text style={styles.orderDate}>{formatOrderDate(order.created_at)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <MaterialIcons name={statusIcon} size={16} color={colors.surface} />
            <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.orderSummary}>
          <View style={styles.summaryRow}>
            <MaterialIcons name="shopping-bag" size={18} color={colors.textLight} />
            <Text style={styles.summaryText}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.summaryRow}>
            <MaterialIcons name="payments" size={18} color={colors.textLight} />
            <Text style={styles.summaryAmount}>¥{(order.total_price / 100).toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.deliveryInfo}>
          <MaterialIcons 
            name={order.status === 'delivered' ? 'check-circle' : 'local-shipping'} 
            size={16} 
            color={statusColor} 
          />
          <Text style={[styles.deliveryText, { color: statusColor }]}>
            {getEstimatedDelivery(order)}
          </Text>
        </View>

        {/* Preview items */}
        {order.items && order.items.length > 0 && (
          <View style={styles.itemsPreview}>
            {order.items.slice(0, 3).map((item) => (
              <View key={item.id} style={styles.previewItem}>
                <Text style={styles.previewItemName} numberOfLines={1}>
                  • {item.product_name}
                  {item.selected_size && ` (${item.selected_size})`}
                </Text>
                <Text style={styles.previewItemQuantity}>×{item.quantity}</Text>
              </View>
            ))}
            {order.items.length > 3 && (
              <Text style={styles.moreItems}>+ {order.items.length - 3} more item{order.items.length - 3 !== 1 ? 's' : ''}</Text>
            )}
          </View>
        )}

        <View style={styles.viewDetailsRow}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
        </View>
      </TouchableOpacity>
    );
  }

  function renderDetailsModal() {
    if (!selectedOrder) return null;

    const statusColor = getStatusColor(selectedOrder.status);
    const statusIcon = getStatusIcon(selectedOrder.status);

    return (
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Status Section */}
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Order Status</Text>
                <View style={[styles.statusBadgeLarge, { backgroundColor: statusColor }]}>
                  <MaterialIcons name={statusIcon} size={32} color={colors.surface} />
                  <Text style={styles.statusTextLarge}>{selectedOrder.status.toUpperCase()}</Text>
                </View>
                <View style={styles.deliveryEstimate}>
                  <MaterialIcons name="schedule" size={20} color={colors.textLight} />
                  <Text style={styles.deliveryEstimateText}>
                    Estimated: {getEstimatedDelivery(selectedOrder)}
                  </Text>
                </View>
              </View>

              {/* Order Info Section */}
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Order Information</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Order Number:</Text>
                  <Text style={styles.infoValue}>#{selectedOrder.id.slice(0, 8)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Order Date:</Text>
                  <Text style={styles.infoValue}>{formatOrderDate(selectedOrder.created_at)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Total Amount:</Text>
                  <Text style={[styles.infoValue, styles.totalAmount]}>
                    ¥{(selectedOrder.total_price / 100).toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* Items Section */}
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Items ({selectedOrder.items?.length || 0})</Text>
                {selectedOrder.items?.map((item) => (
                  <View key={item.id} style={styles.itemDetail}>
                    <View style={styles.itemDetailInfo}>
                      <Text style={styles.itemDetailName}>{item.product_name}</Text>
                      {item.selected_size && (
                        <Text style={styles.itemDetailSize}>Size: {item.selected_size}</Text>
                      )}
                      <Text style={styles.itemDetailPrice}>
                        ¥{(item.price_at_purchase / 100).toLocaleString()} × {item.quantity}
                      </Text>
                    </View>
                    <Text style={styles.itemDetailTotal}>
                      ¥{((item.price_at_purchase * item.quantity) / 100).toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Shipping Section */}
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Shipping Address</Text>
                <View style={styles.shippingInfo}>
                  <View style={styles.shippingRow}>
                    <MaterialIcons name="person" size={18} color={colors.textLight} />
                    <Text style={styles.shippingText}>{selectedOrder.shipping_name}</Text>
                  </View>
                  <View style={styles.shippingRow}>
                    <MaterialIcons name="email" size={18} color={colors.textLight} />
                    <Text style={styles.shippingText}>{selectedOrder.shipping_email}</Text>
                  </View>
                  {selectedOrder.shipping_phone && (
                    <View style={styles.shippingRow}>
                      <MaterialIcons name="phone" size={18} color={colors.textLight} />
                      <Text style={styles.shippingText}>{selectedOrder.shipping_phone}</Text>
                    </View>
                  )}
                  <View style={styles.shippingRow}>
                    <MaterialIcons name="location-on" size={18} color={colors.textLight} />
                    <Text style={[styles.shippingText, { flex: 1 }]}>
                      {selectedOrder.shipping_address}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Notes Section */}
              {selectedOrder.notes && (
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>Notes</Text>
                  <Text style={styles.notesText}>{selectedOrder.notes}</Text>
                </View>
              )}

              {/* Receipt Note */}
              <View style={styles.receiptNote}>
                <MaterialIcons name="receipt" size={20} color={colors.primary} />
                <Text style={styles.receiptNoteText}>
                  A detailed receipt has been sent to {selectedOrder.shipping_email}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Order History</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <MaterialIcons name="login" size={64} color={colors.textLight} />
          <Text style={styles.emptyText}>Please log in to view your orders</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Order History</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="shopping-bag" size={64} color={colors.textLight} />
          <Text style={styles.emptyText}>No orders yet</Text>
          <Text style={styles.emptySubtext}>Start shopping to see your orders here</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push('/boutique')}
          >
            <MaterialIcons name="store" size={20} color={colors.surface} />
            <Text style={styles.shopButtonText}>Browse Boutique</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <Text style={styles.orderCount}>{orders.length} Order{orders.length !== 1 ? 's' : ''}</Text>
          {orders.map(renderOrderCard)}
        </ScrollView>
      )}

      {renderDetailsModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '20',
    backgroundColor: colors.surface,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textLight,
    marginTop: spacing.lg,
    fontSize: 18,
  },
  emptySubtext: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  shopButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  orderCount: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.md,
    fontSize: 13,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderNumber: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  orderDate: {
    ...typography.caption,
    color: colors.textLight,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: colors.surface,
  },
  orderSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.primary + '10',
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryText: {
    ...typography.caption,
    color: colors.textLight,
  },
  summaryAmount: {
    ...typography.body,
    fontWeight: '700',
    color: colors.accent,
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  deliveryText: {
    ...typography.caption,
    fontWeight: '600',
  },
  itemsPreview: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  previewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  previewItemName: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
  },
  previewItemQuantity: {
    ...typography.caption,
    color: colors.textLight,
    fontWeight: '600',
  },
  moreItems: {
    ...typography.caption,
    color: colors.textLight,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  viewDetailsText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '20',
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
  },
  modalScroll: {
    maxHeight: '100%',
  },
  detailsSection: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '10',
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  statusTextLarge: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '700',
    color: colors.surface,
  },
  deliveryEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  deliveryEstimateText: {
    ...typography.body,
    color: colors.textLight,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textLight,
  },
  infoValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  totalAmount: {
    color: colors.accent,
    fontSize: 18,
  },
  itemDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '10',
  },
  itemDetailInfo: {
    flex: 1,
  },
  itemDetailName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  itemDetailSize: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  itemDetailPrice: {
    ...typography.caption,
    color: colors.textLight,
  },
  itemDetailTotal: {
    ...typography.body,
    fontWeight: '700',
    color: colors.accent,
  },
  shippingInfo: {
    gap: spacing.md,
  },
  shippingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  shippingText: {
    ...typography.caption,
    color: colors.text,
    lineHeight: 20,
  },
  notesText: {
    ...typography.caption,
    color: colors.text,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  receiptNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  receiptNoteText: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
    lineHeight: 18,
  },
});
