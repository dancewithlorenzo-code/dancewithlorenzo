
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth, useAlert } from '@/template';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { creditRequestService, CreditRequest } from '@/services/creditRequestService';
import { workshopBundleService } from '@/services/workshopBundleService';
import { bundleTransferService } from '@/services/bundleTransferService';

export default function CreditRequestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientUserId, setRecipientUserId] = useState<string | null>(null);
  const [credits, setCredits] = useState('');
  const [message, setMessage] = useState('');
  const [availableCredits, setAvailableCredits] = useState(0);
  const [validatingEmail, setValidatingEmail] = useState(false);
  const [creating, setCreating] = useState(false);

  const [sentRequests, setSentRequests] = useState<CreditRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<CreditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    // Get available credits
    const { totalCredits } = await workshopBundleService.getUserBundles(user.id);
    setAvailableCredits(totalCredits);

    // Get requests
    const { data: sent } = await creditRequestService.getSentRequests(user.id);
    const { data: received } = await creditRequestService.getReceivedRequests(user.id);

    if (sent) setSentRequests(sent);
    if (received) setReceivedRequests(received);

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
      showAlert('Invalid Recipient', 'You cannot request credits from yourself.');
      setRecipientUserId(null);
      setRecipientName('');
      return;
    }

    setRecipientUserId(userId);
    setRecipientName(username || 'User');
    showAlert('Recipient Found', `Ready to request credits from ${username || 'this user'}.`);
  };

  const handleCreateRequest = async () => {
    if (!user || !recipientUserId) return;

    const creditAmount = parseInt(credits);

    if (!credits || creditAmount <= 0) {
      showAlert('Invalid Amount', 'Please enter a valid number of credits to request.');
      return;
    }

    setCreating(true);

    const { success, error } = await creditRequestService.createCreditRequest(
      user.id,
      recipientEmail.trim(),
      creditAmount,
      message.trim() || undefined
    );

    setCreating(false);

    if (!success) {
      showAlert('Request Failed', error || 'Unable to create credit request. Please try again.');
      return;
    }

    showAlert(
      'Request Sent! ✉️',
      `Your credit request has been sent to ${recipientName}. You'll be notified when they respond.`
    );

    // Reset form
    setRecipientEmail('');
    setRecipientName('');
    setRecipientUserId(null);
    setCredits('');
    setMessage('');
    setShowCreateModal(false);

    // Reload data
    loadData();
  };

  const handleApprove = async (requestId: string, credits: number) => {
    if (!user) return;

    if (availableCredits < credits) {
      showAlert(
        'Insufficient Credits',
        `You need ${credits} credits to approve this request, but you only have ${availableCredits} available.`
      );
      return;
    }

    setProcessingRequest(requestId);

    const { success, error } = await creditRequestService.approveRequest(requestId, user.id);

    setProcessingRequest(null);

    if (!success) {
      showAlert('Approval Failed', error || 'Unable to approve request. Please try again.');
      return;
    }

    showAlert('Request Approved! 🎉', 'Credits have been transferred successfully.');
    loadData();
  };

  const handleReject = async (requestId: string) => {
    if (!user) return;

    setProcessingRequest(requestId);

    const { success, error } = await creditRequestService.rejectRequest(requestId, user.id);

    setProcessingRequest(null);

    if (!success) {
      showAlert('Rejection Failed', error || 'Unable to reject request. Please try again.');
      return;
    }

    showAlert('Request Rejected', 'The credit request has been declined.');
    loadData();
  };

  const handleCancel = async (requestId: string) => {
    if (!user) return;

    setProcessingRequest(requestId);

    const { success, error } = await creditRequestService.cancelRequest(requestId, user.id);

    setProcessingRequest(null);

    if (!success) {
      showAlert('Cancellation Failed', error || 'Unable to cancel request. Please try again.');
      return;
    }

    showAlert('Request Cancelled', 'Your credit request has been cancelled.');
    loadData();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: any = {
      pending: { bg: colors.warning + '20', text: colors.warning, label: 'Pending' },
      approved: { bg: colors.success + '20', text: colors.success, label: 'Approved' },
      rejected: { bg: colors.error + '20', text: colors.error, label: 'Rejected' },
      cancelled: { bg: colors.textLight + '20', text: colors.textLight, label: 'Cancelled' },
      expired: { bg: colors.textLight + '20', text: colors.textLight, label: 'Expired' },
    };

    const style = styles[status] || styles.pending;

    return (
      <View style={[localStyles.statusBadge, { backgroundColor: style.bg }]}>
        <Text style={[localStyles.statusText, { color: style.text }]}>{style.label}</Text>
      </View>
    );
  };

  const getExpirationDisplay = (expiresAt: string | null) => {
    if (!expiresAt) return null;

    const timeInfo = creditRequestService.getTimeRemaining(expiresAt);

    if (timeInfo.expired) {
      return (
        <View style={localStyles.expirationBadge}>
          <MaterialIcons name="error" size={14} color={colors.error} />
          <Text style={[localStyles.expirationText, { color: colors.error }]}>Expired</Text>
        </View>
      );
    }

    const isUrgent = timeInfo.hoursRemaining <= 24;

    return (
      <View style={localStyles.expirationBadge}>
        <MaterialIcons 
          name="schedule" 
          size={14} 
          color={isUrgent ? colors.error : colors.warning} 
        />
        <Text style={[
          localStyles.expirationText, 
          { color: isUrgent ? colors.error : colors.warning }
        ]}>
          {timeInfo.displayText}
        </Text>
      </View>
    );
  };

  const pendingReceived = receivedRequests.filter(r => r.status === 'pending');
  const pendingSent = sentRequests.filter(r => r.status === 'pending');

  if (loading) {
    return (
      <View style={[localStyles.container, localStyles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[localStyles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={localStyles.header}>
        <Pressable onPress={() => router.back()} style={localStyles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={localStyles.headerTitle}>Credit Requests</Text>
        <View style={localStyles.headerActions}>
          <Pressable 
            onPress={() => router.push('/credit-analytics')} 
            style={localStyles.analyticsButton}
          >
            <MaterialIcons name="bar-chart" size={18} color={colors.primary} />
          </Pressable>
          <View style={localStyles.creditBadge}>
            <MaterialIcons name="confirmation-number" size={16} color={colors.accent} />
            <Text style={localStyles.creditText}>{availableCredits}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={localStyles.scrollView}
        contentContainerStyle={localStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Create Request Button */}
        <Pressable style={localStyles.createButton} onPress={() => setShowCreateModal(true)}>
          <MaterialIcons name="add-circle" size={24} color={colors.surface} />
          <Text style={localStyles.createButtonText}>Request Credits</Text>
        </Pressable>

        {/* Pending Received Requests */}
        {pendingReceived.length > 0 && (
          <View style={localStyles.section}>
            <Text style={localStyles.sectionTitle}>
              Pending Requests ({pendingReceived.length})
            </Text>
            {pendingReceived.map((request) => {
              const timeInfo = request.expires_at 
                ? creditRequestService.getTimeRemaining(request.expires_at)
                : null;

              return (
              <View key={request.id} style={localStyles.requestCard}>
                <View style={localStyles.requestHeader}>
                  <MaterialIcons name="person" size={24} color={colors.primary} />
                  <View style={localStyles.requestInfo}>
                    <Text style={localStyles.requestTitle}>
                      Requesting {request.credits_requested} credits
                    </Text>
                    <Text style={localStyles.requestDate}>
                      {formatDate(request.created_at)}
                    </Text>
                    {getExpirationDisplay(request.expires_at)}
                  </View>
                </View>

                {request.request_message && (
                  <View style={localStyles.messageBox}>
                    <Text style={localStyles.messageText}>"{request.request_message}"</Text>
                  </View>
                )}

                <View style={localStyles.actionButtons}>
                  <Pressable
                    style={[localStyles.actionButton, localStyles.rejectButton]}
                    onPress={() => handleReject(request.id)}
                    disabled={processingRequest === request.id}
                  >
                    {processingRequest === request.id ? (
                      <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                      <>
                        <MaterialIcons name="close" size={18} color={colors.error} />
                        <Text style={[localStyles.actionButtonText, { color: colors.error }]}>
                          Decline
                        </Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    style={[localStyles.actionButton, localStyles.approveButton]}
                    onPress={() => handleApprove(request.id, request.credits_requested)}
                    disabled={processingRequest === request.id || availableCredits < request.credits_requested}
                  >
                    {processingRequest === request.id ? (
                      <ActivityIndicator size="small" color={colors.surface} />
                    ) : (
                      <>
                        <MaterialIcons name="check" size={18} color={colors.surface} />
                        <Text style={localStyles.actionButtonText}>Approve</Text>
                      </>
                    )}
                  </Pressable>
                </View>

                {availableCredits < request.credits_requested && (
                  <Text style={localStyles.warningText}>
                    ⚠️ You need {request.credits_requested - availableCredits} more credits to approve
                  </Text>
                )}
              </View>
              );
            })}
          </View>
        )}

        {/* Sent Requests */}
        {sentRequests.length > 0 && (
          <View style={localStyles.section}>
            <Text style={localStyles.sectionTitle}>
              My Requests ({pendingSent.length} pending)
            </Text>
            {sentRequests.map((request) => (
              <View key={request.id} style={localStyles.requestCard}>
                <View style={localStyles.requestHeader}>
                  <MaterialIcons name="send" size={24} color={colors.accent} />
                  <View style={localStyles.requestInfo}>
                    <Text style={localStyles.requestTitle}>
                      {request.credits_requested} credits requested
                    </Text>
                    <Text style={localStyles.requestDate}>
                      {formatDate(request.created_at)}
                    </Text>
                    {request.status === 'pending' && getExpirationDisplay(request.expires_at)}
                  </View>
                  {getStatusBadge(request.status)}
                </View>

                {request.request_message && (
                  <View style={localStyles.messageBox}>
                    <Text style={localStyles.messageText}>"{request.request_message}"</Text>
                  </View>
                )}

                {request.status === 'pending' && (
                  <Pressable
                    style={localStyles.cancelButton}
                    onPress={() => handleCancel(request.id)}
                    disabled={processingRequest === request.id}
                  >
                    {processingRequest === request.id ? (
                      <ActivityIndicator size="small" color={colors.textLight} />
                    ) : (
                      <Text style={localStyles.cancelButtonText}>Cancel Request</Text>
                    )}
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {sentRequests.length === 0 && receivedRequests.length === 0 && (
          <View style={localStyles.emptyState}>
            <MaterialIcons name="inbox" size={64} color={colors.textLight} />
            <Text style={localStyles.emptyTitle}>No Credit Requests</Text>
            <Text style={localStyles.emptyText}>
              Request credits from friends or wait for incoming requests
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Create Request Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={localStyles.modalOverlay}>
          <View style={localStyles.modalContainer}>
            <View style={localStyles.modalHeader}>
              <Text style={localStyles.modalTitle}>Request Credits</Text>
              <Pressable onPress={() => setShowCreateModal(false)} style={localStyles.closeButton}>
                <MaterialIcons name="close" size={24} color={colors.textLight} />
              </Pressable>
            </View>

            <ScrollView style={localStyles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={localStyles.formGroup}>
                <Text style={localStyles.formLabel}>Recipient's Email *</Text>
                <View style={localStyles.inputRow}>
                  <TextInput
                    style={[localStyles.input, localStyles.inputFlex]}
                    value={recipientEmail}
                    onChangeText={(text) => {
                      setRecipientEmail(text);
                      setRecipientUserId(null);
                      setRecipientName('');
                    }}
                    placeholder="friend@example.com"
                    placeholderTextColor={colors.textLight}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!creating}
                  />
                  <Pressable
                    style={[localStyles.validateButton, validatingEmail && localStyles.buttonDisabled]}
                    onPress={handleValidateEmail}
                    disabled={validatingEmail || creating}
                  >
                    {validatingEmail ? (
                      <ActivityIndicator size="small" color={colors.surface} />
                    ) : (
                      <MaterialIcons name="search" size={20} color={colors.surface} />
                    )}
                  </Pressable>
                </View>
                {recipientUserId && (
                  <View style={localStyles.recipientConfirm}>
                    <MaterialIcons name="check-circle" size={18} color={colors.success} />
                    <Text style={localStyles.recipientConfirmText}>
                      Ready to request from {recipientName}
                    </Text>
                  </View>
                )}
              </View>

              <View style={localStyles.formGroup}>
                <Text style={localStyles.formLabel}>Number of Credits *</Text>
                <TextInput
                  style={localStyles.input}
                  value={credits}
                  onChangeText={setCredits}
                  placeholder="0"
                  placeholderTextColor={colors.textLight}
                  keyboardType="number-pad"
                  editable={!creating}
                />
              </View>

              <View style={localStyles.formGroup}>
                <Text style={localStyles.formLabel}>Message (Optional)</Text>
                <TextInput
                  style={[localStyles.input, localStyles.textArea]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Why do you need these credits?"
                  placeholderTextColor={colors.textLight}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={200}
                  editable={!creating}
                />
                <Text style={localStyles.characterCount}>{message.length}/200</Text>
              </View>
            </ScrollView>

            <View style={localStyles.modalActions}>
              <Pressable
                style={[localStyles.modalButton, localStyles.modalButtonCancel]}
                onPress={() => setShowCreateModal(false)}
                disabled={creating}
              >
                <Text style={localStyles.modalButtonTextCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  localStyles.modalButton,
                  localStyles.modalButtonConfirm,
                  (!recipientUserId || !credits || creating) && localStyles.buttonDisabled
                ]}
                onPress={handleCreateRequest}
                disabled={!recipientUserId || !credits || creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Text style={localStyles.modalButtonTextConfirm}>Send Request</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const localStyles = StyleSheet.create({
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  analyticsButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '20',
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  createButtonText: {
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
  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  requestInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  requestTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  requestDate: {
    ...typography.caption,
    color: colors.textLight,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  expirationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  expirationText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  messageBox: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginVertical: spacing.sm,
  },
  messageText: {
    ...typography.caption,
    color: colors.text,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  approveButton: {
    backgroundColor: colors.success,
    ...shadows.sm,
  },
  rejectButton: {
    backgroundColor: colors.error + '20',
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  actionButtonText: {
    ...typography.button,
    color: colors.surface,
    fontSize: 14,
  },
  warningText: {
    ...typography.caption,
    color: colors.warning,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.textLight,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textLight,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textLight,
    textAlign: 'center',
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
    maxHeight: 400,
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
  buttonDisabled: {
    opacity: 0.5,
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
    backgroundColor: colors.primary,
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
