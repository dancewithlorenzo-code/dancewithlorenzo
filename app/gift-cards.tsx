import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth, useAlert } from '@/template';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { stripeService } from '@/services/stripeService';
import { giftCardService } from '@/services/giftCardService';
import * as WebBrowser from 'expo-web-browser';

export default function GiftCardsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [selectedBundle, setSelectedBundle] = useState<'3_pack' | '5_pack' | '7_pack' | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const openPurchaseModal = (bundleType: '3_pack' | '5_pack' | '7_pack') => {
    setSelectedBundle(bundleType);
    setShowPurchaseModal(true);
  };

  const handlePurchaseGiftCard = async () => {
    if (!user || !selectedBundle) return;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail.trim())) {
      showAlert('Invalid Email', 'Please enter a valid recipient email address.');
      return;
    }

    if (!recipientName.trim()) {
      showAlert('Missing Name', 'Please enter the recipient\'s name.');
      return;
    }

    setPurchasing(true);

    const { url, error } = await stripeService.createGiftCardCheckout(
      user.id,
      recipientEmail.trim(),
      recipientName.trim(),
      selectedBundle,
      customMessage.trim() || null
    );

    setPurchasing(false);

    if (error || !url) {
      showAlert('Error', error || 'Failed to create checkout session');
      return;
    }

    setShowPurchaseModal(false);
    setRecipientEmail('');
    setRecipientName('');
    setCustomMessage('');
    setSelectedBundle(null);

    const result = await WebBrowser.openBrowserAsync(url);

    if (result.type === 'cancel' || result.type === 'dismiss') {
      showAlert(
        'Gift Card Purchase',
        'Gift card checkout created. Complete payment to send the gift card to the recipient.'
      );
    }
  };

  const threePackPricing = giftCardService.getBundlePricing('3_pack');
  const fivePackPricing = giftCardService.getBundlePricing('5_pack');
  const sevenPackPricing = giftCardService.getBundlePricing('7_pack');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Gift Cards</Text>
        <Pressable onPress={() => router.push('/redeem-gift-card')} style={styles.redeemButton}>
          <MaterialIcons name="redeem" size={20} color={colors.warning} />
          <Text style={styles.redeemButtonText}>Redeem</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroIcon}>🎁</Text>
          <Text style={styles.heroTitle}>Give the Gift of Dance</Text>
          <Text style={styles.heroSubtitle}>
            Share the joy of Ori Tahiti with friends and family. Purchase workshop bundle credits as digital gift cards with personalized messages.
          </Text>
        </View>

        {/* Gift Card Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose a Gift Card</Text>

          {/* 3-Pack Gift Card */}
          <View style={styles.giftCardOption}>
            <View style={styles.giftCardHeader}>
              <View style={styles.giftCardIcon}>
                <MaterialIcons name="card-giftcard" size={32} color={colors.warning} />
              </View>
              <View style={styles.giftCardInfo}>
                <Text style={styles.giftCardName}>{threePackPricing.bundleName}</Text>
                <Text style={styles.giftCardDescription}>{threePackPricing.credits} workshop credits</Text>
              </View>
            </View>

            <View style={styles.pricingRow}>
              <Text style={styles.priceLabel}>Gift Card Value:</Text>
              <Text style={styles.priceValue}>¥{threePackPricing.price.toLocaleString()}</Text>
            </View>

            <Pressable
              style={styles.selectButton}
              onPress={() => openPurchaseModal('3_pack')}
            >
              <Text style={styles.selectButtonText}>Select Gift Card</Text>
            </Pressable>
          </View>

          {/* 5-Pack Gift Card */}
          <View style={[styles.giftCardOption, styles.recommendedCard]}>
            <View style={styles.recommendedBadge}>
              <MaterialIcons name="star" size={14} color={colors.warning} />
              <Text style={styles.recommendedText}>Popular Choice</Text>
            </View>

            <View style={styles.giftCardHeader}>
              <View style={[styles.giftCardIcon, { backgroundColor: colors.accent + '20' }]}>
                <MaterialIcons name="card-giftcard" size={32} color={colors.accent} />
              </View>
              <View style={styles.giftCardInfo}>
                <Text style={styles.giftCardName}>{fivePackPricing.bundleName}</Text>
                <Text style={styles.giftCardDescription}>{fivePackPricing.credits} workshop credits</Text>
              </View>
            </View>

            <View style={styles.pricingRow}>
              <Text style={styles.priceLabel}>Gift Card Value:</Text>
              <Text style={styles.priceValue}>¥{fivePackPricing.price.toLocaleString()}</Text>
            </View>

            <Pressable
              style={[styles.selectButton, { backgroundColor: colors.accent }]}
              onPress={() => openPurchaseModal('5_pack')}
            >
              <Text style={styles.selectButtonText}>Select Gift Card</Text>
            </Pressable>
          </View>

          {/* 7-Pack Gift Card */}
          <View style={styles.giftCardOption}>
            <View style={styles.giftCardHeader}>
              <View style={[styles.giftCardIcon, { backgroundColor: colors.primary + '20' }]}>
                <MaterialIcons name="card-giftcard" size={32} color={colors.primary} />
              </View>
              <View style={styles.giftCardInfo}>
                <Text style={styles.giftCardName}>{sevenPackPricing.bundleName}</Text>
                <Text style={styles.giftCardDescription}>{sevenPackPricing.credits} workshop credits</Text>
              </View>
            </View>

            <View style={styles.pricingRow}>
              <Text style={styles.priceLabel}>Gift Card Value:</Text>
              <Text style={styles.priceValue}>¥{sevenPackPricing.price.toLocaleString()}</Text>
            </View>

            <Pressable
              style={[styles.selectButton, { backgroundColor: colors.primary }]}
              onPress={() => openPurchaseModal('7_pack')}
            >
              <Text style={styles.selectButtonText}>Select Gift Card</Text>
            </Pressable>
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.instructionsCard}>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>1</Text>
              </View>
              <Text style={styles.instructionText}>
                Choose a gift card amount and add a personalized message for your recipient
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>2</Text>
              </View>
              <Text style={styles.instructionText}>
                Complete your purchase securely through Stripe payment
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>3</Text>
              </View>
              <Text style={styles.instructionText}>
                Recipient receives email with unique redemption code and your message
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>4</Text>
              </View>
              <Text style={styles.instructionText}>
                They redeem the code in the app and start booking workshops immediately!
              </Text>
            </View>
          </View>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <View style={styles.featureItem}>
            <MaterialIcons name="email" size={24} color={colors.accent} />
            <Text style={styles.featureText}>Instant email delivery</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="edit" size={24} color={colors.accent} />
            <Text style={styles.featureText}>Custom message included</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="event-available" size={24} color={colors.accent} />
            <Text style={styles.featureText}>Valid for 1 year</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="schedule" size={24} color={colors.accent} />
            <Text style={styles.featureText}>No expiration hassle</Text>
          </View>
        </View>
      </ScrollView>

      {/* Purchase Modal */}
      <Modal
        visible={showPurchaseModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPurchaseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="card-giftcard" size={32} color={colors.warning} />
              <Text style={styles.modalTitle}>Purchase Gift Card</Text>
              <Pressable
                onPress={() => setShowPurchaseModal(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color={colors.textLight} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {selectedBundle && (
                <View style={styles.selectedBundleInfo}>
                  <Text style={styles.selectedBundleText}>
                    {selectedBundle === '3_pack' ? '3 Workshop Bundle' : selectedBundle === '5_pack' ? '5 Workshop Bundle' : '7 Workshop Bundle'}
                  </Text>
                  <Text style={styles.selectedBundlePrice}>
                    ¥{giftCardService.getBundlePricing(selectedBundle).price.toLocaleString()}
                  </Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Recipient's Name *</Text>
                <TextInput
                  style={styles.input}
                  value={recipientName}
                  onChangeText={setRecipientName}
                  placeholder="Enter recipient's name"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Recipient's Email *</Text>
                <TextInput
                  style={styles.input}
                  value={recipientEmail}
                  onChangeText={setRecipientEmail}
                  placeholder="recipient@example.com"
                  placeholderTextColor={colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Personal Message (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={customMessage}
                  onChangeText={setCustomMessage}
                  placeholder="Add a personalized message for your recipient..."
                  placeholderTextColor={colors.textLight}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                />
                <Text style={styles.characterCount}>{customMessage.length}/500</Text>
              </View>

              <View style={styles.infoBox}>
                <MaterialIcons name="info-outline" size={20} color={colors.accent} />
                <Text style={styles.infoText}>
                  Gift card will be sent immediately to the recipient's email with a unique redemption code valid for 1 year.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowPurchaseModal(false)}
                disabled={purchasing}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handlePurchaseGiftCard}
                disabled={purchasing}
              >
                {purchasing ? (
                  <Text style={styles.modalButtonTextConfirm}>Processing...</Text>
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>Purchase Gift Card</Text>
                )}
              </Pressable>
            </View>
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
  redeemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  redeemButtonText: {
    ...typography.button,
    color: colors.warning,
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  heroSection: {
    alignItems: 'center',
    backgroundColor: colors.warning + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  heroIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  heroTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  giftCardOption: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  recommendedCard: {
    borderWidth: 2,
    borderColor: colors.accent + '40',
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
  giftCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  giftCardIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  giftCardInfo: {
    flex: 1,
  },
  giftCardName: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  giftCardDescription: {
    ...typography.caption,
    color: colors.textLight,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  priceLabel: {
    ...typography.body,
    color: colors.textLight,
  },
  priceValue: {
    ...typography.h3,
    color: colors.accent,
    fontWeight: '700',
  },
  selectButton: {
    backgroundColor: colors.warning,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.md,
  },
  selectButtonText: {
    ...typography.button,
    color: colors.surface,
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
    backgroundColor: colors.warning,
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
  featuresSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  featureText: {
    ...typography.body,
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    ...shadows.xl,
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '20',
    position: 'relative',
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.sm,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
  },
  modalContent: {
    padding: spacing.lg,
    maxHeight: 500,
  },
  selectedBundleInfo: {
    backgroundColor: colors.warning + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  selectedBundleText: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  selectedBundlePrice: {
    ...typography.h2,
    color: colors.warning,
    fontWeight: '700',
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.textLight + '40',
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.md,
  },
  characterCount: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  infoBox: {
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
    backgroundColor: colors.warning,
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
