import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAuth, useAlert } from '@/template';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import {
  RECIPIENT_GROUPS,
  RecipientFilter,
  AdminMessage,
  getRecipientsByFilter,
  createDraftMessage,
  sendMessage,
  getAdminMessages,
  deleteDraftMessage,
} from '@/services/adminMessagingService';

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
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.md,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
    flex: 1,
    marginLeft: spacing.md,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    minHeight: 48,
  },
  textArea: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 60,
  },
  filterButtonActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primary + '10',
  },
  filterInfo: {
    flex: 1,
  },
  filterLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  filterDescription: {
    ...typography.caption,
    color: colors.textLight,
  },
  filterCount: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    minWidth: 44,
    alignItems: 'center',
  },
  filterCountText: {
    ...typography.caption,
    color: '#fff',
    fontWeight: '700',
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewLabel: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  previewSubject: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  previewBody: {
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    ...typography.body,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: '#fff',
  },
  secondaryButtonText: {
    color: colors.text,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  historySubject: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
    color: '#fff',
  },
  historyInfo: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  historyStats: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    ...typography.caption,
    color: colors.textLight,
  },
});

type ViewMode = 'compose' | 'history';

export default function AdminMessagingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [viewMode, setViewMode] = React.useState<ViewMode>('compose');
  const [subject, setSubject] = React.useState('');
  const [body, setBody] = React.useState('');
  const [selectedFilter, setSelectedFilter] = React.useState<RecipientFilter>('all');
  const [recipientCount, setRecipientCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [loadingRecipients, setLoadingRecipients] = React.useState(false);
  const [messages, setMessages] = React.useState<AdminMessage[]>([]);

  React.useEffect(() => {
    loadRecipientCount();
  }, [selectedFilter]);

  React.useEffect(() => {
    if (viewMode === 'history') {
      loadMessages();
    }
  }, [viewMode]);

  const loadRecipientCount = async () => {
    setLoadingRecipients(true);
    const recipients = await getRecipientsByFilter(selectedFilter);
    setRecipientCount(recipients.length);
    setLoadingRecipients(false);
  };

  const loadMessages = async () => {
    const { data } = await getAdminMessages();
    setMessages(data);
  };

  const handlePreviewAndSend = () => {
    if (!subject.trim() || !body.trim()) {
      showAlert('Error', 'Subject and message are required');
      return;
    }

    if (recipientCount === 0) {
      showAlert('Error', 'No recipients found for selected filter');
      return;
    }

    Alert.alert(
      'Send Message',
      `Send "${subject}" to ${recipientCount} recipients?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', style: 'default', onPress: handleSend },
      ]
    );
  };

  const handleSend = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Create draft
      const { data: draft, error: draftError } = await createDraftMessage(
        user.id,
        subject.trim(),
        body.trim(),
        selectedFilter
      );

      if (draftError || !draft) {
        showAlert('Error', draftError || 'Failed to create message');
        setLoading(false);
        return;
      }

      // Send message
      const { success, error } = await sendMessage(draft.id);

      if (!success) {
        showAlert('Error', error || 'Failed to send message');
        setLoading(false);
        return;
      }

      showAlert('Success', `Message sent to ${recipientCount} recipients!`);
      
      // Clear form
      setSubject('');
      setBody('');
      setSelectedFilter('all');
      
      // Switch to history view
      setViewMode('history');
    } catch (error: any) {
      console.error('Send error:', error);
      showAlert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDraft = (messageId: string) => {
    Alert.alert(
      'Delete Draft',
      'Delete this draft message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteDraftMessage(messageId);
            loadMessages();
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return colors.success;
      case 'sending': return colors.warning;
      case 'failed': return colors.error;
      default: return colors.textLight;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Admin Messaging</Text>
        <Pressable
          onPress={() => setViewMode(viewMode === 'compose' ? 'history' : 'compose')}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
        >
          <MaterialIcons 
            name={viewMode === 'compose' ? 'history' : 'create'} 
            size={24} 
            color={colors.primary} 
          />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {viewMode === 'compose' ? (
          <>
            {/* Subject */}
            <View style={styles.section}>
              <Text style={styles.label}>Subject</Text>
              <TextInput
                style={styles.input}
                value={subject}
                onChangeText={setSubject}
                placeholder="e.g., New Workshop Announcement"
                placeholderTextColor={colors.textLight}
              />
            </View>

            {/* Message Body */}
            <View style={styles.section}>
              <Text style={styles.label}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={body}
                onChangeText={setBody}
                placeholder="Write your message here..."
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={8}
              />
            </View>

            {/* Recipients Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Recipients</Text>
              {RECIPIENT_GROUPS.map((group) => (
                <Pressable
                  key={group.filter}
                  onPress={() => setSelectedFilter(group.filter)}
                  style={({ pressed }) => [
                    styles.filterButton,
                    selectedFilter === group.filter && styles.filterButtonActive,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.filterInfo}>
                    <Text style={styles.filterLabel}>{group.label}</Text>
                    <Text style={styles.filterDescription}>{group.description}</Text>
                  </View>
                  {selectedFilter === group.filter && (
                    <View style={styles.filterCount}>
                      {loadingRecipients ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.filterCountText}>{recipientCount}</Text>
                      )}
                    </View>
                  )}
                </Pressable>
              ))}
            </View>

            {/* Preview */}
            {subject && body && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Preview</Text>
                <View style={styles.previewCard}>
                  <Text style={styles.previewLabel}>Subject</Text>
                  <Text style={styles.previewSubject}>{subject}</Text>
                  <Text style={styles.previewLabel}>Message</Text>
                  <Text style={styles.previewBody}>{body}</Text>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <Pressable
                onPress={() => {
                  setSubject('');
                  setBody('');
                  setSelectedFilter('all');
                }}
                style={({ pressed }) => [
                  styles.button,
                  styles.secondaryButton,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <MaterialIcons name="clear" size={20} color={colors.text} />
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>Clear</Text>
              </Pressable>
              <Pressable
                onPress={handlePreviewAndSend}
                disabled={loading || !subject.trim() || !body.trim()}
                style={({ pressed }) => [
                  styles.button,
                  styles.primaryButton,
                  (loading || !subject.trim() || !body.trim()) && { opacity: 0.5 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="send" size={20} color="#fff" />
                    <Text style={[styles.buttonText, styles.primaryButtonText]}>
                      Send to {recipientCount}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <>
            {/* Message History */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sent Messages</Text>
              {messages.length === 0 ? (
                <View style={styles.previewCard}>
                  <Text style={[styles.previewBody, { textAlign: 'center', color: colors.textLight }]}>
                    No messages sent yet
                  </Text>
                </View>
              ) : (
                messages.map((message) => (
                  <View key={message.id} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historySubject}>{message.subject}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(message.status) }]}>
                        <Text style={styles.statusText}>{message.status.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.historyInfo}>
                      To: {RECIPIENT_GROUPS.find(g => g.filter === message.recipient_filter)?.label}
                    </Text>
                    <Text style={styles.historyInfo}>
                      {new Date(message.created_at).toLocaleString()}
                    </Text>
                    <View style={styles.historyStats}>
                      <View style={styles.statItem}>
                        <MaterialIcons name="people" size={16} color={colors.textLight} />
                        <Text style={styles.statText}>{message.total_recipients} recipients</Text>
                      </View>
                      {message.status === 'sent' && (
                        <>
                          <View style={styles.statItem}>
                            <MaterialIcons name="check-circle" size={16} color={colors.success} />
                            <Text style={styles.statText}>{message.sent_count} sent</Text>
                          </View>
                          {message.failed_count > 0 && (
                            <View style={styles.statItem}>
                              <MaterialIcons name="error" size={16} color={colors.error} />
                              <Text style={styles.statText}>{message.failed_count} failed</Text>
                            </View>
                          )}
                        </>
                      )}
                    </View>
                    {message.status === 'draft' && (
                      <Pressable
                        onPress={() => handleDeleteDraft(message.id)}
                        style={({ pressed }) => [
                          styles.button,
                          styles.secondaryButton,
                          { marginTop: spacing.md },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <MaterialIcons name="delete" size={20} color={colors.error} />
                        <Text style={[styles.buttonText, { color: colors.error }]}>Delete Draft</Text>
                      </Pressable>
                    )}
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
