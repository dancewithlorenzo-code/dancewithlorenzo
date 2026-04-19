import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth, useAlert } from '@/template';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { giftCardService } from '@/services/giftCardService';

export default function RedeemGiftCardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [redemptionCode, setRedemptionCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [validatedGiftCard, setValidatedGiftCard] = useState<any>(null);

  const handleValidateCode = async () => {
    if (!redemptionCode.trim()) {
      showAlert('Missing Code', 'Please enter a redemption code.');
      return;
    }

    setValidating(true);

    const { valid, giftCard, error } = await giftCardService.validateRedemptionCode(redemptionCode.trim());

    setValidating(false);

    if (!valid || !giftCard) {
      showAlert('Invalid Code', error || 'Please check your code and try again.');
      setValidatedGiftCard(null);
      return;
    }

    setValidatedGiftCard(giftCard);
  };

  const handleRedeemGiftCard = async () => {
    if (!user || !redemptionCode.trim()) return;

    setRedeeming(true);

    const { success, credits, error } = await giftCardService.redeemGiftCard(
      redemptionCode.trim(),
      user.id
    );

    setRedeeming(false);

    if (!success) {
      showAlert('Redemption Failed', error || 'Unable to redeem gift card. Please try again.');
      return;
    }

    showAlert(
      'Gift Card Redeemed! 🎉',
      `You've successfully redeemed ${credits} workshop credits! You can now book workshops using these credits.`
    );

    // Reset form and navigate to workshop bundles or classes
    setRedemptionCode('');
    setValidatedGiftCard(null);
    router.replace('/workshop-bundles');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Redeem Gift Card</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroIcon}>🎁</Text>
          <Text style={styles.heroTitle}>Have a Gift Card?</Text>
          <Text style={styles.heroSubtitle}>
            Enter your redemption code below to add workshop credits to your account
          </Text>
        </View>

        {/* Redemption Form */}
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Redemption Code</Text>
          <TextInput
            style={styles.input}
            value={redemptionCode}
            onChangeText={(text) => {
              setRedemptionCode(text.toUpperCase());
              setValidatedGiftCard(null);
            }}
            placeholder="XXXX-XXXX-XXXX"
            placeholderTextColor={colors.textLight}
            autoCapitalize="characters"
            maxLength={14}
          />
          <Text style={styles.inputHint}>Enter the 12-character code from your gift card email</Text>

          {!validatedGiftCard ? (
            <Pressable
              style={[styles.validateButton, validating && styles.buttonDisabled]}
              onPress={handleValidateCode}
              disabled={validating}
            >
              <MaterialIcons name="check-circle" size={20} color={colors.surface} />
              <Text style={styles.buttonText}>
                {validating ? 'Validating...' : 'Validate Code'}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.validatedCard}>
              <View style={styles.validatedHeader}>
                <MaterialIcons name="verified" size={32} color={colors.success} />
                <Text style={styles.validatedTitle}>Valid Gift Card!</Text>
              </View>

              <View style={styles.giftCardDetails}>
                <View style={styles.detailRow}>
                  <MaterialIcons name="confirmation-number" size={20} color={colors.accent} />
                  <Text style={styles.detailLabel}>Credits:</Text>
                  <Text style={styles.detailValue}>{validatedGiftCard.credits} workshops</Text>
                </View>

                <View style={styles.detailRow}>
                  <MaterialIcons name="local-offer" size={20} color={colors.accent} />
                  <Text style={styles.detailLabel}>Bundle:</Text>
                  <Text style={styles.detailValue}>
                    {validatedGiftCard.bundle_type === '3_pack' ? '3 Workshop Bundle' : 
                     validatedGiftCard.bundle_type === '5_pack' ? '5 Workshop Bundle' : '7 Workshop Bundle'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <MaterialIcons name="schedule" size={20} color={colors.accent} />
                  <Text style={styles.detailLabel}>Valid Until:</Text>
                  <Text style={styles.detailValue}>{formatDate(validatedGiftCard.expires_at)}</Text>
                </View>

                {validatedGiftCard.custom_message && (
                  <View style={styles.messageBox}>
                    <Text style={styles.messageLabel}>Message:</Text>
                    <Text style={styles.messageText}>"{validatedGiftCard.custom_message}"</Text>
                  </View>
                )}
              </View>

              <Pressable
                style={[styles.redeemButton, redeeming && styles.buttonDisabled]}
                onPress={handleRedeemGiftCard}
                disabled={redeeming}
              >
                <MaterialIcons name="redeem" size={20} color={colors.surface} />
                <Text style={styles.buttonText}>
                  {redeeming ? 'Redeeming...' : 'Redeem Gift Card'}
                </Text>
              </Pressable>

              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setRedemptionCode('');
                  setValidatedGiftCard(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <Text style={styles.instructionsTitle}>How to Redeem</Text>
          <View style={styles.instructionItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.instructionText}>
              Check your email for the gift card with your unique redemption code
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.instructionText}>
              Enter the code exactly as shown (format: XXXX-XXXX-XXXX)
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.instructionText}>
              Tap "Validate Code" to verify your gift card
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <Text style={styles.instructionText}>
              Review the details and tap "Redeem" to add credits to your account
            </Text>
          </View>
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <MaterialIcons name="help-outline" size={24} color={colors.accent} />
          <View style={styles.helpContent}>
            <Text style={styles.helpTitle}>Need Help?</Text>
            <Text style={styles.helpText}>
              If you're having trouble redeeming your gift card, please contact us at support@dancelorenzotokyo.com
            </Text>
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
  heroSection: {
    alignItems: 'center',
    backgroundColor: colors.success + '10',
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
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
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
    ...typography.h3,
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.accent + '40',
    textAlign: 'center',
    letterSpacing: 2,
  },
  inputHint: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    ...shadows.md,
  },
  redeemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...typography.button,
    color: colors.surface,
  },
  validatedCard: {
    marginTop: spacing.lg,
  },
  validatedHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  validatedTitle: {
    ...typography.h3,
    color: colors.success,
    marginTop: spacing.sm,
  },
  giftCardDetails: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  detailLabel: {
    ...typography.body,
    color: colors.textLight,
    flex: 1,
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  messageBox: {
    backgroundColor: colors.accent + '10',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  messageLabel: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  messageText: {
    ...typography.body,
    color: colors.text,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.textLight,
  },
  instructionsSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  instructionsTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
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
  helpSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.accent + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  helpText: {
    ...typography.caption,
    color: colors.textLight,
    lineHeight: 18,
  },
});
