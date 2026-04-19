import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth, useAlert } from '@/template';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { bundleTransferService, BundleTransfer } from '@/services/bundleTransferService';
import { workshopBundleService } from '@/services/workshopBundleService';

export default function TransferCreditsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientUserId, setRecipientUserId] = useState<string | null>(null);
  const [credits, setCredits] = useState('');
  const [message, setMessage] = useState('');
  const [availableCredits, setAvailableCredits] = useState(0);
  const [validatingEmail, setValidatingEmail] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [sentTransfers, setSentTransfers] = useState<BundleTransfer[]>([]);
  const [receivedTransfers, setReceivedTransfers] = useState<BundleTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    // Get available credits
    const { totalCredits } = await workshopBundleService.getUserBundles(user.id);
    setAvailableCredits(totalCredits);

    // Get transfer history
    const { data: sent } = await bundleTransferService.getSentTransfers(user.id);
    const { data: received } = await bundleTransferService.getReceivedTransfers(user.id);
    
    if (sent) setSentTransfers(sent);
    if (received) setReceivedTransfers(received);

    setLoading(false);
  };

  const handleValidateEmail = async () => {
    if (!recipientEmail.trim()) {
      showAlert('Missing Email', 'Please enter recipient\'s email address.');
      return;
    }

    setValidatingEmail(true);

    const { valid, userId, username, error } = await bundleTransferService.validateRecipient(recipientEmail.trim());

    setValidatingEmail(false);

    if (!valid) {
      showAlert('Invalid Recipient', error || 'Please check email and try again.');
      setRecipientUserId(null);
      setRecipientName('');
      return;
    }

    if (userId === user?.id) {
      showAlert('Invalid Recipient', 'You cannot transfer credits to yourself.');
      setRecipientUserId(null);
      setRecipientName('');
      return;
    }

    setRecipientUserId(userId);
    setRecipientName(username || 'User');
    showAlert('Recipient Found', `Ready to transfer credits to ${username || 'this user'}.`);
  };

  const handleTransfer = async () => {
    if (!user || !recipientUserId) return;

    const creditAmount = parseInt(credits);

    if (!credits || creditAmount <= 0) {
      showAlert('Invalid Amount', 'Please enter a valid number of credits to transfer.');
      return;
    }

    if (creditAmount > availableCredits) {
      showAlert('Insufficient Credits', `You only have ${availableCredits} credits available.`);
      return;
    }

    setTransferring(true);

    const { success, error } = await bundleTransferService.transferCredits(
      user.id,
      recipientUserId,
      creditAmount,
      message.trim() || undefined
    );

    setTransferring(false);

    if (!success) {
      showAlert('Transfer Failed', error || 'Unable to transfer credits. Please try again.');
      return;
    }

    showAlert(
      'Transfer Successful! 🎉',
      `You've successfully transferred ${creditAmount} workshop credits to ${recipientName}.`
    );

    // Reset form
    setRecipientEmail('');
    setRecipientName('');
    setRecipientUserId(null);
    setCredits('');
    setMessage('');

    // Reload data
    loadData();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
        <Text style={styles.headerTitle}>Transfer Credits</Text>
        <View style={styles.creditBadge}>
          <MaterialIcons name="confirmation-number" size={16} color={colors.accent} />
          <Text style={styles.creditText}>{availableCredits}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <MaterialIcons name="info-outline" size={24} color={colors.accent} />
          <Text style={styles.infoText}>
            Transfer your unused workshop credits to friends, family, or anyone with an account.
          </Text>
        </View>

        {/* Transfer Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>New Transfer</Text>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Recipient's Email *</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                value={recipientEmail}
                onChangeText={(text) => {
                  setRecipientEmail(text);
                  setRecipientUserId(null);
                  setRecipientName('');
                }}
                placeholder="recipient@example.com"
                placeholderTextColor={colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!transferring}
              />
              <Pressable
                style={[styles.validateButton, validatingEmail && styles.buttonDisabled]}
                onPress={handleValidateEmail}
                disabled={validatingEmail || transferring}
              >
                {validatingEmail ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <MaterialIcons name="search" size={20} color={colors.surface} />
                )}
              </Pressable>
            </View>
            {recipientUserId && (
              <View style={styles.recipientConfirm}>
                <MaterialIcons name="check-circle" size={18} color={colors.success} />
                <Text style={styles.recipientConfirmText}>
                  Ready to transfer to {recipientName}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Number of Credits *</Text>
            <TextInput
              style={styles.input}
              value={credits}
              onChangeText={setCredits}
              placeholder="0"
              placeholderTextColor={colors.textLight}
              keyboardType="number-pad"
              editable={!transferring}
            />
            <Text style={styles.inputHint}>
              Available: {availableCredits} credits
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Message (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={message}
              onChangeText={setMessage}
              placeholder="Add a personal message..."
              placeholderTextColor={colors.textLight}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={200}
              editable={!transferring}
            />
            <Text style={styles.characterCount}>{message.length}/200</Text>
          </View>

          <Pressable
            style={[
              styles.transferButton,
              (!recipientUserId || !credits || transferring) && styles.buttonDisabled
            ]}
            onPress={handleTransfer}
            disabled={!recipientUserId || !credits || transferring}
          >
            {transferring ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <>
                <MaterialIcons name="send" size={20} color={colors.surface} />
                <Text style={styles.transferButtonText}>Transfer Credits</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Transfer History */}
        {(sentTransfers.length > 0 || receivedTransfers.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transfer History</Text>

            {sentTransfers.length > 0 && (
              <View style={styles.historySection}>
                <Text style={styles.historyLabel}>Sent</Text>
                {sentTransfers.map((transfer) => (
                  <View key={transfer.id} style={styles.transferCard}>
                    <View style={styles.transferIcon}>
                      <MaterialIcons name="arrow-upward" size={20} color={colors.error} />
                    </View>
                    <View style={styles.transferInfo}>
                      <Text style={styles.transferAmount}>
                        -{transfer.credits_transferred} credits
                      </Text>
                      <Text style={styles.transferDate}>
                        {formatDate(transfer.transferred_at)}
                      </Text>
                      {transfer.transfer_message && (
                        <Text style={styles.transferMessage}>
                          "{transfer.transfer_message}"
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {receivedTransfers.length > 0 && (
              <View style={styles.historySection}>
                <Text style={styles.historyLabel}>Received</Text>
                {receivedTransfers.map((transfer) => (
                  <View key={transfer.id} style={styles.transferCard}>
                    <View style={[styles.transferIcon, { backgroundColor: colors.success + '20' }]}>
                      <MaterialIcons name="arrow-downward" size={20} color={colors.success} />
                    </View>
                    <View style={styles.transferInfo}>
                      <Text style={[styles.transferAmount, { color: colors.success }]}>
                        +{transfer.credits_transferred} credits
                      </Text>
                      <Text style={styles.transferDate}>
                        {formatDate(transfer.transferred_at)}
                      </Text>
                      {transfer.transfer_message && (
                        <Text style={styles.transferMessage}>
                          "{transfer.transfer_message}"
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* How It Works */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>How It Works</Text>
          <View style={styles.instructionItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.instructionText}>
              Enter the recipient's email address and verify their account
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.instructionText}>
              Specify how many credits you want to transfer
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.instructionText}>
              Add an optional message and confirm the transfer
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <Text style={styles.instructionText}>
              Credits are immediately available in recipient's account
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
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
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
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  formTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.lg,
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
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  inputFlex: {
    flex: 1,
  },
  textArea: {
    minHeight: 80,
    paddingTop: spacing.md,
  },
  inputHint: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  validateButton: {
    backgroundColor: colors.accent,
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  recipientConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  recipientConfirmText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  characterCount: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    ...shadows.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  transferButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  historySection: {
    marginBottom: spacing.lg,
  },
  historyLabel: {
    ...typography.body,
    color: colors.textLight,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1,
  },
  transferCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  transferIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  transferInfo: {
    flex: 1,
  },
  transferAmount: {
    ...typography.body,
    color: colors.error,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  transferDate: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  transferMessage: {
    ...typography.caption,
    color: colors.text,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  instructionsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
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
});
