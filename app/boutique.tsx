import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';
import { useAuth, useAlert } from '@/template';
import {
  fetchBoutiqueProducts,
  createBoutiqueOrder,
  BoutiqueProduct,
  CartItem,
  ShippingInfo,
  SizeVariant,
} from '@/services/boutiqueService';
import {
  requestStockAlert,
  fetchUserStockAlerts,
  cancelStockAlert,
  StockAlertWithProduct,
} from '@/services/stockAlertService';
import {
  toggleWishlist,
  isInWishlist,
  getWishlistCount,
} from '@/services/wishlistService';
import { getSupabaseClient } from '@/template';

const CATEGORIES = [
  { key: 'all', label: 'All', icon: 'store' },
  { key: 'costume', label: 'Costumes', icon: 'checkroom' },
  { key: 'accessories', label: 'Accessories', icon: 'watch' },
  { key: 'shoes', label: 'Shoes', icon: 'shoe-print' },
  { key: 'jewelry', label: 'Jewelry', icon: 'diamond' },
  { key: 'bags', label: 'Bags', icon: 'shopping-bag' },
];

export default function BoutiqueScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<BoutiqueProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<BoutiqueProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Size selection modal
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [sizeModalProduct, setSizeModalProduct] = useState<BoutiqueProduct | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');

  // Size guide modal
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  // Stock alert modal
  const [showStockAlertModal, setShowStockAlertModal] = useState(false);
  const [stockAlertProduct, setStockAlertProduct] = useState<BoutiqueProduct | null>(null);
  const [stockAlertSize, setStockAlertSize] = useState<string>('');
  const [stockAlertEmail, setStockAlertEmail] = useState('');
  const [stockAlertLoading, setStockAlertLoading] = useState(false);
  const [myStockAlerts, setMyStockAlerts] = useState<StockAlertWithProduct[]>([]);
  const [showMyAlerts, setShowMyAlerts] = useState(false);

  // Wishlist states
  const [wishlistProductIds, setWishlistProductIds] = useState<Set<string>>(new Set());
  const [wishlistCount, setWishlistCount] = useState(0);
  const [togglingWishlist, setTogglingWishlist] = useState<string | null>(null);

  // Shipping form
  const [shippingName, setShippingName] = useState('');
  const [shippingEmail, setShippingEmail] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadProducts();
    if (user) {
      loadMyStockAlerts();
      loadWishlistData();
    }
  }, [user]);

  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(p => p.category === selectedCategory));
    }
  }, [selectedCategory, products]);

  async function loadProducts() {
    setLoading(true);
    const { data, error } = await fetchBoutiqueProducts();
    if (error) {
      showAlert('Error', error);
    } else {
      setProducts(data || []);
      setFilteredProducts(data || []);
    }
    setLoading(false);
  }

  async function loadMyStockAlerts() {
    if (!user) return;
    const { data } = await fetchUserStockAlerts(user.id);
    if (data) {
      setMyStockAlerts(data);
    }
  }

  async function loadWishlistData() {
    if (!user) return;

    // Load wishlist product IDs
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('wishlists')
      .select('product_id')
      .eq('user_id', user.id);

    if (data) {
      setWishlistProductIds(new Set(data.map(item => item.product_id)));
    }

    // Load wishlist count
    const count = await getWishlistCount(user.id);
    setWishlistCount(count);
  }

  async function handleToggleWishlist(product: BoutiqueProduct) {
    if (!user) {
      showAlert('Login Required', 'Please log in to save items to your wishlist');
      return;
    }

    setTogglingWishlist(product.id);
    const { success, isInWishlist: nowInWishlist, error } = await toggleWishlist(
      user.id,
      product.id,
      product.price
    );

    setTogglingWishlist(null);

    if (error) {
      showAlert('Error', error);
    } else if (success) {
      // Update local state
      const newSet = new Set(wishlistProductIds);
      if (nowInWishlist) {
        newSet.add(product.id);
        showAlert('Added to Wishlist', `${product.name} saved to your wishlist!`);
      } else {
        newSet.delete(product.id);
        showAlert('Removed', `${product.name} removed from wishlist`);
      }
      setWishlistProductIds(newSet);
      setWishlistCount(nowInWishlist ? wishlistCount + 1 : wishlistCount - 1);
    }
  }

  function handleAddToCart(product: BoutiqueProduct) {
    // Check if product has sizes
    if (product.sizes && product.sizes.length > 0) {
      // Show size selection modal
      setSizeModalProduct(product);
      setSelectedSize('');
      setShowSizeModal(true);
    } else {
      // Add directly to cart
      addToCartDirect(product);
    }
  }

  function addToCartDirect(product: BoutiqueProduct, size?: string) {
    const existing = cart.find(item => 
      item.product.id === product.id && item.selectedSize === size
    );
    
    if (existing) {
      setCart(cart.map(item =>
        (item.product.id === product.id && item.selectedSize === size)
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1, selectedSize: size }]);
    }
    
    const sizeText = size ? ` (Size ${size})` : '';
    showAlert('Added to cart', `${product.name}${sizeText} added!`);
  }

  function confirmSizeSelection() {
    if (!selectedSize || !sizeModalProduct) return;
    
    addToCartDirect(sizeModalProduct, selectedSize);
    setShowSizeModal(false);
    setSizeModalProduct(null);
    setSelectedSize('');
  }

  function handleNotifyMe(product: BoutiqueProduct) {
    if (!user) {
      showAlert('Login Required', 'Please log in to request stock notifications');
      return;
    }

    // Check if product has sizes
    if (product.sizes && product.sizes.length > 0) {
      // Show size selection for stock alert
      setStockAlertProduct(product);
      setStockAlertSize('');
      setStockAlertEmail(user.email);
      setShowStockAlertModal(true);
    } else {
      // No sizes, directly request alert
      requestAlert(product.id, user.email);
    }
  }

  async function requestAlert(productId: string, email: string, size?: string) {
    if (!user) return;

    setStockAlertLoading(true);
    const { success, error } = await requestStockAlert(user.id, productId, email, size);

    if (success) {
      showAlert('Alert Set!', `We'll notify you at ${email} when this item is back in stock.`);
      setShowStockAlertModal(false);
      loadMyStockAlerts();
    } else {
      showAlert('Error', error || 'Failed to set stock alert');
    }

    setStockAlertLoading(false);
  }

  async function handleCancelAlert(alertId: string) {
    const { success, error } = await cancelStockAlert(alertId);
    if (success) {
      showAlert('Alert Cancelled', 'Stock notification has been cancelled');
      loadMyStockAlerts();
    } else {
      showAlert('Error', error || 'Failed to cancel alert');
    }
  }

  function removeFromCart(productId: string, size?: string) {
    setCart(cart.filter(item => 
      !(item.product.id === productId && item.selectedSize === size)
    ));
  }

  function updateQuantity(productId: string, quantity: number, size?: string) {
    if (quantity < 1) {
      removeFromCart(productId, size);
      return;
    }
    setCart(cart.map(item =>
      (item.product.id === productId && item.selectedSize === size) 
        ? { ...item, quantity } 
        : item
    ));
  }

  function getCartTotal() {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  }

  function getCartItemCount() {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  async function handleCheckout() {
    if (!user) {
      showAlert('Login Required', 'Please log in to checkout');
      return;
    }

    if (cart.length === 0) {
      showAlert('Empty Cart', 'Your cart is empty');
      return;
    }

    if (!shippingName || !shippingEmail || !shippingAddress) {
      showAlert('Missing Information', 'Please fill in all shipping details');
      return;
    }

    setCheckoutLoading(true);

    const shippingInfo: ShippingInfo = {
      name: shippingName,
      email: shippingEmail,
      phone: shippingPhone,
      address: shippingAddress,
      notes,
    };

    // Create order
    const { orderId, error: orderError } = await createBoutiqueOrder(
      user.id,
      cart,
      shippingInfo
    );

    if (orderError || !orderId) {
      showAlert('Error', orderError || 'Failed to create order');
      setCheckoutLoading(false);
      return;
    }

    // Create Stripe checkout
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.functions.invoke('create-boutique-checkout', {
        body: { orderId },
      });

      if (error) throw error;

      // Clear cart and show success
      setCart([]);
      setShowCheckout(false);
      setShowCart(false);
      
      showAlert(
        'Order Placed!',
        `Order created. Total: ¥${(getCartTotal() / 100).toLocaleString()}. Please complete payment at the provided link.`
      );

      // TODO: Open Stripe checkout URL in browser
      // Linking.openURL(data.url);
    } catch (err: any) {
      console.error('Checkout error:', err);
      showAlert('Error', err.message || 'Failed to create checkout');
    }

    setCheckoutLoading(false);
  }

  function renderProduct(product: BoutiqueProduct) {
    const inStock = product.stock_quantity > 0;
    const hasSizes = product.sizes && product.sizes.length > 0;
    const inWishlist = wishlistProductIds.has(product.id);
    const isToggling = togglingWishlist === product.id;

    return (
      <View key={product.id} style={styles.productCard}>
        <Image
          source={{ uri: product.image_url || 'https://via.placeholder.com/300' }}
          style={styles.productImage}
        />
        
        {/* Wishlist Heart Button */}
        <TouchableOpacity
          style={styles.wishlistHeartButton}
          onPress={() => handleToggleWishlist(product)}
          disabled={isToggling}
        >
          {isToggling ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <MaterialIcons
              name={inWishlist ? 'favorite' : 'favorite-border'}
              size={24}
              color={inWishlist ? colors.error : '#fff'}
            />
          )}
        </TouchableOpacity>

        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productDescription} numberOfLines={2}>
            {product.description}
          </Text>
          <View style={styles.productFooter}>
            <Text style={styles.productPrice}>¥{(product.price / 100).toLocaleString()}</Text>
            {inStock ? (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => handleAddToCart(product)}
              >
                <MaterialIcons name="add-shopping-cart" size={20} color="#fff" />
                <Text style={styles.addButtonText}>
                  {hasSizes ? 'Select Size' : 'Add'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.notifyButton}
                onPress={() => handleNotifyMe(product)}
              >
                <MaterialIcons name="notifications" size={18} color={colors.primary} />
                <Text style={styles.notifyButtonText}>Notify Me</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  function renderSizeModal() {
    if (!sizeModalProduct) return null;

    const sizes = sizeModalProduct.sizes || [];
    const isCoconutBra = sizeModalProduct.name.toLowerCase().includes('coconut bra');
    const isPareo = sizeModalProduct.name.toLowerCase().includes('pareo');

    return (
      <Modal visible={showSizeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.sizeModal}>
            <View style={styles.sizeHeader}>
              <Text style={styles.sizeTitle}>Select Size</Text>
              <TouchableOpacity onPress={() => setShowSizeModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sizeProductName}>{sizeModalProduct.name}</Text>

            <View style={styles.sizeOptions}>
              {sizes.map((variant: SizeVariant) => {
                const isAvailable = variant.stock > 0;
                const isSelected = selectedSize === variant.size;

                return (
                  <TouchableOpacity
                    key={variant.size}
                    style={[
                      styles.sizeButton,
                      isSelected && styles.sizeButtonActive,
                      !isAvailable && styles.sizeButtonDisabled,
                    ]}
                    onPress={() => isAvailable && setSelectedSize(variant.size)}
                    disabled={!isAvailable}
                  >
                    <Text
                      style={[
                        styles.sizeButtonText,
                        isSelected && styles.sizeButtonTextActive,
                        !isAvailable && styles.sizeButtonTextDisabled,
                      ]}
                    >
                      {variant.size}
                    </Text>
                    {!isAvailable && (
                      <Text style={styles.sizeOutOfStock}>Out</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedSize && sizes.find(s => s.size === selectedSize) && (
              <View style={styles.sizeMeasurements}>
                {isCoconutBra && (
                  <>
                    <Text style={styles.measurementText}>
                      📏 Bust: {sizes.find(s => s.size === selectedSize)?.bust_cm} cm
                    </Text>
                    <Text style={styles.measurementText}>
                      📐 ({sizes.find(s => s.size === selectedSize)?.bust_in} inches)
                    </Text>
                  </>
                )}
                {isPareo && (
                  <>
                    <Text style={styles.measurementText}>
                      📏 Length: {sizes.find(s => s.size === selectedSize)?.length_cm} cm × Width: {sizes.find(s => s.size === selectedSize)?.width_cm} cm
                    </Text>
                  </>
                )}
              </View>
            )}

            <TouchableOpacity 
              style={styles.sizeGuideLink}
              onPress={() => {
                setShowSizeModal(false);
                setShowSizeGuide(true);
              }}
            >
              <MaterialIcons name="straighten" size={20} color={colors.primary} />
              <Text style={styles.sizeGuideLinkText}>View Size Guide</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmSizeButton,
                !selectedSize && styles.confirmSizeButtonDisabled,
              ]}
              onPress={confirmSizeSelection}
              disabled={!selectedSize}
            >
              <Text style={styles.confirmSizeButtonText}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function renderSizeGuideModal() {
    return (
      <Modal visible={showSizeGuide} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.sizeGuideModal}>
            <View style={styles.sizeGuideHeader}>
              <Text style={styles.sizeGuideTitle}>Size Guide</Text>
              <TouchableOpacity onPress={() => setShowSizeGuide(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sizeGuideContent}>
              {/* Coconut Bra Size Guide */}
              <View style={styles.guideSection}>
                <Text style={styles.guideSectionTitle}>🥥 Coconut Bra Sizes</Text>
                
                <View style={styles.guideTable}>
                  <View style={styles.guideTableHeader}>
                    <Text style={[styles.guideTableHeaderText, { flex: 1 }]}>Size</Text>
                    <Text style={[styles.guideTableHeaderText, { flex: 2 }]}>Bust (cm)</Text>
                    <Text style={[styles.guideTableHeaderText, { flex: 2 }]}>Bust (inches)</Text>
                  </View>
                  <View style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, { flex: 1 }]}>XS</Text>
                    <Text style={[styles.guideTableCell, { flex: 2 }]}>76-81</Text>
                    <Text style={[styles.guideTableCell, { flex: 2 }]}>30-32</Text>
                  </View>
                  <View style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, { flex: 1 }]}>S</Text>
                    <Text style={[styles.guideTableCell, { flex: 2 }]}>81-86</Text>
                    <Text style={[styles.guideTableCell, { flex: 2 }]}>32-34</Text>
                  </View>
                  <View style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, { flex: 1 }]}>M</Text>
                    <Text style={[styles.guideTableCell, { flex: 2 }]}>86-91</Text>
                    <Text style={[styles.guideTableCell, { flex: 2 }]}>34-36</Text>
                  </View>
                  <View style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, { flex: 1 }]}>L</Text>
                    <Text style={[styles.guideTableCell, { flex: 2 }]}>91-97</Text>
                    <Text style={[styles.guideTableCell, { flex: 2 }]}>36-38</Text>
                  </View>
                </View>

                <Text style={styles.guideNote}>
                  💡 Tip: Measure around the fullest part of your bust with a soft measuring tape.
                </Text>
              </View>

              {/* Pareo Size Guide */}
              <View style={styles.guideSection}>
                <Text style={styles.guideSectionTitle}>👗 Pareo Sizes</Text>
                
                <View style={styles.guideTable}>
                  <View style={styles.guideTableHeader}>
                    <Text style={[styles.guideTableHeaderText, { flex: 1 }]}>Size</Text>
                    <Text style={[styles.guideTableHeaderText, { flex: 2 }]}>Length (cm)</Text>
                    <Text style={[styles.guideTableHeaderText, { flex: 2 }]}>Width (cm)</Text>
                  </View>
                  <View style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, { flex: 1 }]}>S</Text>
                    <Text style={[styles.guideTableCell, { flex: 2 }]}>170</Text>
                    <Text style={[styles.guideTableCell, { flex: 2 }]}>110</Text>
                  </View>
                  <View style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, { flex: 1 }]}>M</Text>
                    <Text style={[styles.guideTableCell, { flex: 2 }]}>180</Text>
                    <Text style={[styles.guideTableCell, { flex: 2 }]}>120</Text>
                  </View>
                  <View style={styles.guideTableRow}>
                    <Text style={[styles.guideTableCell, { flex: 1 }]}>L</Text>
                    <Text style={[styles.guideTableCell, { flex: 2 }]}>185</Text>
                    <Text style={[styles.guideTableCell, { flex: 2 }]}>125</Text>
                  </View>
                </View>

                <Text style={styles.guideNote}>
                  💡 Tip: Choose larger sizes for taller dancers or those who prefer more fabric for wrapping styles.
                </Text>
              </View>

              {/* Measurement Tips */}
              <View style={styles.guideSection}>
                <Text style={styles.guideSectionTitle}>📐 How to Measure</Text>
                
                <View style={styles.measurementTip}>
                  <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                  <Text style={styles.measurementTipText}>
                    <Text style={{ fontWeight: '700' }}>Bust:</Text> Measure around the fullest part of your chest, keeping the tape parallel to the floor.
                  </Text>
                </View>

                <View style={styles.measurementTip}>
                  <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                  <Text style={styles.measurementTipText}>
                    <Text style={{ fontWeight: '700' }}>Fit:</Text> For coconut bras, choose snug fit for dance movement. For pareos, select based on preferred wrap style.
                  </Text>
                </View>

                <View style={styles.measurementTip}>
                  <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                  <Text style={styles.measurementTipText}>
                    <Text style={{ fontWeight: '700' }}>Need help?</Text> Contact Lorenzo for personalized sizing advice at dancewithlorenzo@gmail.com
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  function renderCartModal() {
    return (
      <Modal visible={showCart} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.cartModal}>
            <View style={styles.cartHeader}>
              <Text style={styles.cartTitle}>Shopping Cart</Text>
              <TouchableOpacity onPress={() => setShowCart(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.cartItems}>
              {cart.length === 0 ? (
                <Text style={styles.emptyCart}>Your cart is empty</Text>
              ) : (
                cart.map((item, index) => (
                  <View key={`${item.product.id}-${item.selectedSize || 'nosize'}-${index}`} style={styles.cartItem}>
                    <Image
                      source={{ uri: item.product.image_url || 'https://via.placeholder.com/80' }}
                      style={styles.cartItemImage}
                    />
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.cartItemName}>
                        {item.product.name}
                        {item.selectedSize && ` (${item.selectedSize})`}
                      </Text>
                      <Text style={styles.cartItemPrice}>
                        ¥{(item.product.price / 100).toLocaleString()} × {item.quantity}
                      </Text>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedSize)}
                        >
                          <MaterialIcons name="remove" size={18} color={colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedSize)}
                        >
                          <MaterialIcons name="add" size={18} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeFromCart(item.product.id, item.selectedSize)}
                    >
                      <MaterialIcons name="delete" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.cartFooter}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalAmount}>¥{(getCartTotal() / 100).toLocaleString()}</Text>
              </View>
              <TouchableOpacity
                style={[styles.checkoutButton, cart.length === 0 && styles.checkoutButtonDisabled]}
                onPress={() => {
                  setShowCart(false);
                  setShowCheckout(true);
                }}
                disabled={cart.length === 0}
              >
                <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  function renderCheckoutModal() {
    return (
      <Modal visible={showCheckout} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.checkoutModal}>
            <View style={styles.checkoutHeader}>
              <Text style={styles.checkoutTitle}>Shipping Information</Text>
              <TouchableOpacity onPress={() => setShowCheckout(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.checkoutForm}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={shippingName}
                onChangeText={setShippingName}
                placeholder="Enter your full name"
              />

              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                value={shippingEmail}
                onChangeText={setShippingEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={shippingPhone}
                onChangeText={setShippingPhone}
                placeholder="+81-90-XXXX-XXXX"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Shipping Address *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={shippingAddress}
                onChangeText={setShippingAddress}
                placeholder="Street address, city, postal code"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Special delivery instructions..."
                multiline
                numberOfLines={2}
              />

              <View style={styles.orderSummary}>
                <Text style={styles.summaryTitle}>Order Summary</Text>
                {cart.map((item, index) => (
                  <View key={`${item.product.id}-${item.selectedSize || 'nosize'}-${index}`} style={styles.summaryItem}>
                    <Text style={styles.summaryItemName}>
                      {item.product.name}
                      {item.selectedSize && ` (${item.selectedSize})`} × {item.quantity}
                    </Text>
                    <Text style={styles.summaryItemPrice}>
                      ¥{((item.product.price * item.quantity) / 100).toLocaleString()}
                    </Text>
                  </View>
                ))}
                <View style={styles.summaryTotal}>
                  <Text style={styles.summaryTotalLabel}>Total:</Text>
                  <Text style={styles.summaryTotalAmount}>
                    ¥{(getCartTotal() / 100).toLocaleString()}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.placeOrderButton, checkoutLoading && styles.placeOrderButtonDisabled]}
              onPress={handleCheckout}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.placeOrderButtonText}>Place Order</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function renderStockAlertModal() {
    if (!stockAlertProduct) return null;

    const sizes = stockAlertProduct.sizes || [];
    const hasSizes = sizes.length > 0;

    return (
      <Modal visible={showStockAlertModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.stockAlertModal}>
            <View style={styles.stockAlertHeader}>
              <Text style={styles.stockAlertTitle}>Stock Notification</Text>
              <TouchableOpacity onPress={() => setShowStockAlertModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.stockAlertProductName}>{stockAlertProduct.name}</Text>
            <Text style={styles.stockAlertSubtext}>Get notified when this item is back in stock</Text>

            {hasSizes && (
              <View style={styles.stockAlertSizeSection}>
                <Text style={styles.stockAlertSizeLabel}>Select Size (Optional):</Text>
                <View style={styles.sizeOptions}>
                  <TouchableOpacity
                    style={[
                      styles.sizeButton,
                      stockAlertSize === '' && styles.sizeButtonActive,
                    ]}
                    onPress={() => setStockAlertSize('')}
                  >
                    <Text
                      style={[
                        styles.sizeButtonText,
                        stockAlertSize === '' && styles.sizeButtonTextActive,
                      ]}
                    >
                      Any
                    </Text>
                  </TouchableOpacity>
                  {sizes.map((variant: SizeVariant) => (
                    <TouchableOpacity
                      key={variant.size}
                      style={[
                        styles.sizeButton,
                        stockAlertSize === variant.size && styles.sizeButtonActive,
                      ]}
                      onPress={() => setStockAlertSize(variant.size)}
                    >
                      <Text
                        style={[
                          styles.sizeButtonText,
                          stockAlertSize === variant.size && styles.sizeButtonTextActive,
                        ]}
                      >
                        {variant.size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.stockAlertEmailSection}>
              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput
                style={styles.input}
                value={stockAlertEmail}
                onChangeText={setStockAlertEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.stockAlertButton, stockAlertLoading && styles.stockAlertButtonDisabled]}
              onPress={() => requestAlert(stockAlertProduct.id, stockAlertEmail, stockAlertSize || undefined)}
              disabled={stockAlertLoading || !stockAlertEmail}
            >
              {stockAlertLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="notifications-active" size={20} color="#fff" />
                  <Text style={styles.stockAlertButtonText}>Notify Me</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function renderMyAlertsModal() {
    return (
      <Modal visible={showMyAlerts} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.myAlertsModal}>
            <View style={styles.myAlertsHeader}>
              <Text style={styles.myAlertsTitle}>My Stock Alerts</Text>
              <TouchableOpacity onPress={() => setShowMyAlerts(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.alertsList}>
              {myStockAlerts.length === 0 ? (
                <Text style={styles.emptyAlerts}>No active stock alerts</Text>
              ) : (
                myStockAlerts.map(alert => (
                  <View key={alert.id} style={styles.alertItem}>
                    <Image
                      source={{ uri: alert.product_image_url || 'https://via.placeholder.com/60' }}
                      style={styles.alertItemImage}
                    />
                    <View style={styles.alertItemInfo}>
                      <Text style={styles.alertItemName}>
                        {alert.product_name}
                        {alert.requested_size && ` (${alert.requested_size})`}
                      </Text>
                      <Text style={styles.alertItemEmail}>📧 {alert.email}</Text>
                      <Text style={styles.alertItemDate}>
                        Requested: {new Date(alert.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.cancelAlertButton}
                      onPress={() => handleCancelAlert(alert.id)}
                    >
                      <MaterialIcons name="cancel" size={24} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Boutique</Text>
        <View style={styles.headerActions}>
          {user && myStockAlerts.length > 0 && (
            <TouchableOpacity onPress={() => setShowMyAlerts(true)} style={styles.alertsButton}>
              <MaterialIcons name="notifications" size={24} color={colors.primary} />
              <View style={styles.alertsBadge}>
                <Text style={styles.alertsBadgeText}>{myStockAlerts.length}</Text>
              </View>
            </TouchableOpacity>
          )}
          {user && wishlistCount > 0 && (
            <TouchableOpacity onPress={() => router.push('/wishlist')} style={styles.wishlistButton}>
              <MaterialIcons name="favorite" size={24} color={colors.error} />
              <View style={styles.wishlistBadge}>
                <Text style={styles.wishlistBadgeText}>{wishlistCount}</Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowCart(true)} style={styles.cartButton}>
            <MaterialIcons name="shopping-cart" size={24} color={colors.text} />
            {getCartItemCount() > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{getCartItemCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.categoryButton,
              selectedCategory === cat.key && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <MaterialIcons
              name={cat.icon as any}
              size={20}
              color={selectedCategory === cat.key ? '#fff' : colors.primary}
            />
            <Text
              style={[
                styles.categoryButtonText,
                selectedCategory === cat.key && styles.categoryButtonTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Products */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.productsScroll} contentContainerStyle={styles.productsContent}>
          {filteredProducts.length === 0 ? (
            <Text style={styles.emptyText}>No products available</Text>
          ) : (
            filteredProducts.map(renderProduct)
          )}
        </ScrollView>
      )}

      {renderSizeModal()}
      {renderSizeGuideModal()}
      {renderStockAlertModal()}
      {renderMyAlertsModal()}
      {renderCartModal()}
      {renderCheckoutModal()}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '20',
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertsButton: {
    position: 'relative',
  },
  alertsBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  alertsBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  wishlistButton: {
    position: 'relative',
  },
  wishlistBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.error,
  },
  wishlistBadgeText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '700',
  },
  cartButton: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryScroll: {
    maxHeight: 60,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: '#fff',
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productsScroll: {
    flex: 1,
  },
  productsContent: {
    padding: 16,
    gap: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textLight,
    fontSize: 16,
    marginTop: 40,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.surface,
  },
  wishlistHeartButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  notifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: '#fff',
  },
  notifyButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  
  // SIZE SELECTION MODAL
  sizeModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  sizeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  sizeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  sizeProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 16,
  },
  sizeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sizeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: '#fff',
    minWidth: 60,
    alignItems: 'center',
  },
  sizeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  sizeButtonDisabled: {
    borderColor: colors.surface,
    backgroundColor: colors.surface,
    opacity: 0.5,
  },
  sizeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sizeButtonTextActive: {
    color: colors.primary,
  },
  sizeButtonTextDisabled: {
    color: colors.textLight,
  },
  sizeOutOfStock: {
    fontSize: 10,
    color: colors.error,
    marginTop: 2,
  },
  sizeMeasurements: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  measurementText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  sizeGuideLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sizeGuideLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  confirmSizeButton: {
    margin: 16,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmSizeButtonDisabled: {
    opacity: 0.5,
  },
  confirmSizeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // SIZE GUIDE MODAL
  sizeGuideModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  sizeGuideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  sizeGuideTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  sizeGuideContent: {
    padding: 16,
  },
  guideSection: {
    marginBottom: 24,
  },
  guideSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  guideTable: {
    borderWidth: 1,
    borderColor: colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  guideTableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    padding: 10,
  },
  guideTableHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  guideTableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  guideTableCell: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  guideNote: {
    fontSize: 13,
    color: colors.textLight,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  measurementTip: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  measurementTipText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  
  // CART MODAL
  cartModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  cartTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  cartItems: {
    maxHeight: 400,
  },
  emptyCart: {
    textAlign: 'center',
    color: colors.textLight,
    fontSize: 16,
    paddingVertical: 40,
  },
  cartItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  cartItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  cartItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  cartItemPrice: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 4,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    padding: 8,
  },
  cartFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  checkoutButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonDisabled: {
    opacity: 0.5,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // CHECKOUT MODAL
  checkoutModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  checkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  checkoutTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  checkoutForm: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  orderSummary: {
    marginTop: 20,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryItemName: {
    fontSize: 14,
    color: colors.textLight,
  },
  summaryItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.primary + '20',
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  summaryTotalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  placeOrderButton: {
    margin: 16,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  placeOrderButtonDisabled: {
    opacity: 0.5,
  },
  placeOrderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // STOCK ALERT MODAL
  stockAlertModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  stockAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  stockAlertTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  stockAlertProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  stockAlertSubtext: {
    fontSize: 14,
    color: colors.textLight,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  stockAlertSizeSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  stockAlertSizeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  stockAlertEmailSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  stockAlertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 16,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
  },
  stockAlertButtonDisabled: {
    opacity: 0.5,
  },
  stockAlertButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // MY ALERTS MODAL
  myAlertsModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  myAlertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  myAlertsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  alertsList: {
    maxHeight: 500,
  },
  emptyAlerts: {
    textAlign: 'center',
    color: colors.textLight,
    fontSize: 16,
    paddingVertical: 40,
  },
  alertItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  alertItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  alertItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  alertItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  alertItemEmail: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  alertItemDate: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
  cancelAlertButton: {
    padding: 8,
  },
});
