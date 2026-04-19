import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Linking, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth, useAlert } from '@/template';
import { useLanguage } from '@/hooks/useLanguage';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { privateLessonService } from '@/services/privateLessonService';

interface PrivateLesson {
  id: string;
  requested_date: string;
  requested_time: string;
  num_participants: number;
  total_price: number;
  status: string;
  notes: string | null;
  payment_intent_id: string | null;
  created_at: string;
}

export default function PrivateLessonsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { t } = useLanguage();

  const [lessons, setLessons] = useState<PrivateLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentLinks, setPaymentLinks] = useState<Record<string, string>>({});
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    requested_date: '',
    requested_time: '',
    num_participants: '1',
    notes: '',
  });

  useEffect(() => {
    loadLessons();
  }, [user]);

  const loadLessons = async () => {
    if (!user) return;

    const { data, error } = await privateLessonService.getUserLessons(user.id);

    if (error) {
      showAlert(t('error'), error);
    } else {
      setLessons(data || []);
      
      // Fetch payment links for approved lessons
      const approvedLessons = (data || []).filter(l => l.status === 'approved' && l.payment_intent_id);
      for (const lesson of approvedLessons) {
        await fetchPaymentLink(lesson.id, lesson.payment_intent_id);
      }
    }

    setLoading(false);
    setRefreshing(false);
  };

  const fetchPaymentLink = async (lessonId: string, paymentLinkId: string) => {
    try {
      // Payment links are stored in payment_intent_id field
      setPaymentLinks(prev => ({ ...prev, [lessonId]: paymentLinkId }));
    } catch (err) {
      console.error('Error fetching payment link:', err);
    }
  };

  const handleSubmitBooking = async () => {
    if (!user) return;

    // Validation
    if (!formData.requested_date || !formData.requested_time || !formData.num_participants) {
      showAlert(t('error'), 'Please fill in all required fields');
      return;
    }

    const numParticipants = parseInt(formData.num_participants);
    if (isNaN(numParticipants) || numParticipants < 1) {
      showAlert(t('error'), 'Please enter a valid number of participants');
      return;
    }

    setSubmitting(true);

    const { data, error } = await privateLessonService.submitBooking(user.id, {
      requested_date: formData.requested_date,
      requested_time: formData.requested_time,
      num_participants: numParticipants,
      notes: formData.notes,
    });

    setSubmitting(false);

    if (error) {
      showAlert(t('error'), error);
    } else {
      showAlert(t('success'), 'Private lesson request submitted! Lorenzo will review and approve it soon.');
      setShowBookingForm(false);
      setFormData({
        requested_date: '',
        requested_time: '',
        num_participants: '1',
        notes: '',
      });
      loadLessons();
    }
  };

  const calculatePrice = () => {
    const numParticipants = parseInt(formData.num_participants) || 1;
    return privateLessonService.calculatePrice(numParticipants);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadLessons();
  };

  const handlePayNow = (url: string) => {
    Linking.openURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'approved': return colors.success;
      case 'paid': return colors.primary;
      case 'completed': return colors.textLight;
      case 'cancelled': return colors.error;
      default: return colors.textLight;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('private_lesson')}</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => setShowBookingForm(true)}
        >
          <MaterialIcons name="add" size={24} color={colors.surface} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {lessons.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="event-busy" size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>No private lesson requests yet</Text>
            <Pressable style={styles.emptyButton} onPress={() => setShowBookingForm(true)}>
              <Text style={styles.emptyButtonText}>Book Your First Lesson</Text>
            </Pressable>
          </View>
        ) : (
          lessons.map((lesson) => (
            <View key={lesson.id} style={styles.lessonCard}>
              <View style={styles.lessonHeader}>
                <View style={styles.lessonDateContainer}>
                  <MaterialIcons name="event" size={20} color={colors.primary} />
                  <Text style={styles.lessonDate}>{lesson.requested_date}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(lesson.status) }]}>
                  <Text style={styles.statusText}>{lesson.status}</Text>
                </View>
              </View>

              <View style={styles.lessonDetails}>
                <View style={styles.lessonDetail}>
                  <MaterialIcons name="schedule" size={16} color={colors.textLight} />
                  <Text style={styles.lessonDetailText}>{lesson.requested_time}</Text>
                </View>
                <View style={styles.lessonDetail}>
                  <MaterialIcons name="people" size={16} color={colors.textLight} />
                  <Text style={styles.lessonDetailText}>
                    {lesson.num_participants} {lesson.num_participants === 1 ? 'person' : 'people'}
                  </Text>
                </View>
              </View>

              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Total:</Text>
                <Text style={styles.priceValue}>¥{lesson.total_price.toLocaleString()}</Text>
              </View>

              {lesson.notes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>Notes:</Text>
                  <Text style={styles.notesText}>{lesson.notes}</Text>
                </View>
              )}

              {lesson.status === 'approved' && (
                <View style={styles.paymentInstructions}>
                  <MaterialIcons name="payment" size={20} color={colors.success} />
                  <Text style={styles.paymentInstructionsText}>
                    Approved! Pay ¥{lesson.total_price.toLocaleString()} via bank transfer or cash.{' '}
                    Contact Lorenzo to confirm payment.
                  </Text>
                </View>
              )}

              {lesson.status === 'paid' && (
                <View style={styles.paidIndicator}>
                  <MaterialIcons name="check-circle" size={20} color={colors.success} />
                  <Text style={styles.paidText}>Payment confirmed - Lorenzo will contact you soon!</Text>
                </View>
              )}

              {lesson.status === 'pending' && (
                <View style={styles.pendingIndicator}>
                  <MaterialIcons name="hourglass-empty" size={20} color={colors.warning} />
                  <Text style={styles.pendingText}>Awaiting Lorenzo's approval</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Booking Form Modal */}
      <Modal
        visible={showBookingForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBookingForm(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowBookingForm(false)}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </Pressable>
            <Text style={styles.modalTitle}>Book Private Lesson</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.formDescription}>
              Request a private Ori Tahiti dance lesson with Lorenzo. He will review your request and send you a payment link once approved.
            </Text>

            {/* Date Input */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Requested Date *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="YYYY-MM-DD (e.g., 2026-04-15)"
                placeholderTextColor={colors.textLight}
                value={formData.requested_date}
                onChangeText={(text) => setFormData({ ...formData, requested_date: text })}
              />
              <Text style={styles.formHint}>Enter your preferred date</Text>
            </View>

            {/* Time Input */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Requested Time *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="HH:MM (e.g., 14:00)"
                placeholderTextColor={colors.textLight}
                value={formData.requested_time}
                onChangeText={(text) => setFormData({ ...formData, requested_time: text })}
              />
              <Text style={styles.formHint}>Enter your preferred time (24-hour format)</Text>
            </View>

            {/* Number of Participants */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Number of Participants *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="1"
                placeholderTextColor={colors.textLight}
                keyboardType="number-pad"
                value={formData.num_participants}
                onChangeText={(text) => setFormData({ ...formData, num_participants: text })}
              />
              <Text style={styles.formHint}>How many people will attend?</Text>
            </View>

            {/* Notes */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Additional Notes (Optional)</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="Any special requests or information..."
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
              />
            </View>

            {/* Price Display */}
            <View style={styles.priceDisplay}>
              <Text style={styles.priceDisplayLabel}>Total Price:</Text>
              <Text style={styles.priceDisplayValue}>¥{calculatePrice().toLocaleString()}</Text>
            </View>

            <View style={styles.priceNote}>
              <MaterialIcons name="info" size={16} color={colors.primary} />
              <Text style={styles.priceNoteText}>
                Private lessons are ¥40,000 flat rate. Payment will be requested after Lorenzo approves your booking.
              </Text>
            </View>

            {/* Submit Button */}
            <Pressable
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmitBooking}
              disabled={submitting}
            >
              {submitting ? (
                <Text style={styles.submitButtonText}>Submitting...</Text>
              ) : (
                <>
                  <MaterialIcons name="send" size={20} color={colors.surface} />
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
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
  addButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    ...typography.body,
    color: colors.textLight,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  emptyButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  lessonCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  lessonDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  lessonDate: {
    ...typography.h3,
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.surface,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  lessonDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  lessonDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  lessonDetailText: {
    ...typography.caption,
    color: colors.textLight,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.primary + '20',
    marginBottom: spacing.md,
  },
  priceLabel: {
    ...typography.body,
    color: colors.textLight,
  },
  priceValue: {
    ...typography.h2,
    color: colors.accent,
  },
  notesContainer: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  notesLabel: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  notesText: {
    ...typography.body,
    color: colors.text,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    ...shadows.md,
  },
  payButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  paymentInstructions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.success + '20',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  paymentInstructionsText: {
    ...typography.caption,
    color: colors.success,
    flex: 1,
    lineHeight: 18,
  },
  paidIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    gap: spacing.sm,
  },
  paidText: {
    ...typography.caption,
    color: colors.success,
    flex: 1,
  },
  pendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    gap: spacing.sm,
  },
  pendingText: {
    ...typography.caption,
    color: colors.warning,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '20',
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  formDescription: {
    ...typography.body,
    color: colors.textLight,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  formField: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  formInput: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
  },
  formTextArea: {
    minHeight: 100,
    paddingTop: spacing.md,
  },
  formHint: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  priceDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  priceDisplayLabel: {
    ...typography.h3,
    color: colors.text,
  },
  priceDisplayValue: {
    ...typography.h1,
    fontSize: 32,
    color: colors.accent,
  },
  priceNote: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  priceNoteText: {
    ...typography.caption,
    color: colors.primary,
    flex: 1,
    lineHeight: 18,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.md + spacing.xs,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.lg,
    marginBottom: spacing.xxl,
  },
  submitButtonDisabled: {
    backgroundColor: colors.textLight,
    opacity: 0.7,
  },
  submitButtonText: {
    ...typography.button,
    fontSize: 18,
    color: colors.surface,
  },
});
