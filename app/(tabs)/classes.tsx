import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Modal, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { VideoPreview } from '@/components/VideoPreview';
import { useAuth, useAlert } from '@/template';
import { useLanguage } from '@/hooks/useLanguage';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { classService, Class, Booking } from '@/services/classService';
import { tokenService } from '@/services/tokenService';
import { workshopBundleService } from '@/services/workshopBundleService';
import { stripeService } from '@/services/stripeService';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.lg * 3) / 2;

type BookingWithClass = Booking & { class: Class };

export default function ClassesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { t, language } = useLanguage();

  const [classes, setClasses] = useState<Class[]>([]);
  const [bookings, setBookings] = useState<BookingWithClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [remainingTokens, setRemainingTokens] = useState(0);
  const [workshopCredits, setWorkshopCredits] = useState(0);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const router = useRouter();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewClass, setPreviewClass] = useState<Class | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const photoScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    // Load classes
    const { data: classData } = await classService.getUpcomingClasses();
    if (classData) setClasses(classData);

    // Load user bookings
    const { data: bookingData } = await classService.getUserBookings(user.id);
    if (bookingData) setBookings(bookingData);

    // Load token balance (only for "Become my Dancers" classes)
    const { data: tokenData } = await tokenService.getUserTokens(user.id);
    if (tokenData) setRemainingTokens(tokenData.remaining_tokens);

    // Load workshop bundle credits
    const { totalCredits } = await workshopBundleService.getUserBundles(user.id);
    setWorkshopCredits(totalCredits);

    setLoading(false);
    setRefreshing(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const openClassPreview = (classItem: Class) => {
    setPreviewClass(classItem);
    setCurrentPhotoIndex(0);
    setShowPreviewModal(true);
  };

  const openBookingConfirmation = (classItem: Class) => {
    // Different validation based on class category
    if (classItem.class_category === 'become_my_dancers') {
      // Token-based booking
      if (remainingTokens === 0) {
        showAlert(t('error'), 'You have no tokens remaining. Please purchase a "Become my Dancers" token package first.');
        return;
      }
    }

    // Check capacity
    if (classItem.current_participants >= classItem.max_participants) {
      showAlert(t('error'), 'Sorry, this class is fully booked.');
      return;
    }

    // Check if already booked
    const alreadyBooked = bookings.some(
      b => b.class_id === classItem.id && b.status === 'confirmed'
    );
    if (alreadyBooked) {
      showAlert(t('error'), 'You have already booked this class.');
      return;
    }

    setSelectedClass(classItem);
    setShowConfirmModal(true);
  };

  const handlePhotoScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setCurrentPhotoIndex(index);
  };

  const confirmBooking = async () => {
    if (!user || !selectedClass) return;

    setBookingInProgress(true);

    if (selectedClass.class_category === 'become_my_dancers') {
      // Token-based booking
      // Use 1 token
      const { success: tokenSuccess, error: tokenError } = await tokenService.useToken(user.id);
      if (tokenError || !tokenSuccess) {
        setBookingInProgress(false);
        showAlert(t('error'), tokenError || 'Failed to deduct token');
        return;
      }

      // Create booking
      const { data, error } = await classService.bookClass(user.id, selectedClass.id, 'token', 0);
      
      setBookingInProgress(false);
      setShowConfirmModal(false);
      setSelectedClass(null);

      if (error) {
        showAlert(t('error'), error);
        // Refund the token on booking failure
        await tokenService.addTokens(user.id, 1);
        return;
      }

      showAlert(
        t('success'), 
        `Successfully booked "${selectedClass.title}"! 1 token has been deducted. You now have ${remainingTokens - 1} tokens remaining.`
      );
      loadData();
    } else if (selectedClass.class_category === 'workshop') {
      // Check if user has workshop credits
      if (workshopCredits > 0) {
        // Use workshop credit
        const { success: creditSuccess, error: creditError } = await workshopBundleService.useCredit(user.id);
        if (creditError || !creditSuccess) {
          setBookingInProgress(false);
          showAlert(t('error'), creditError || 'Failed to use workshop credit');
          return;
        }

        // Create booking with bundle credit
        const { data, error } = await classService.bookClass(user.id, selectedClass.id, 'bundle', 0);
        
        setBookingInProgress(false);
        setShowConfirmModal(false);
        setSelectedClass(null);

        if (error) {
          showAlert(t('error'), error);
          return;
        }

        showAlert(
          t('success'), 
          `Successfully booked "${selectedClass.title}" using 1 workshop credit! You have ${workshopCredits - 1} credits remaining.`
        );
        loadData();
        return;
      }

      // Workshop booking with manual payment
      const amount = stripeService.getWorkshopPrice(selectedClass.current_participants);
      
      // Create booking with "pending_payment" status
      const { data, error } = await classService.bookClass(
        user.id,
        selectedClass.id,
        'manual',
        amount
      );
      
      setBookingInProgress(false);
      setShowConfirmModal(false);
      setSelectedClass(null);

      if (error) {
        showAlert(t('error'), error);
        return;
      }

      showAlert(
        'Booking Created!',
        `Workshop reserved!\n\nPlease pay ¥${amount.toLocaleString()} via:\n💳 Bank transfer\n💴 Cash at class\n\nContact Lorenzo to confirm payment.`
      );
      
      loadData();
    }
  };

  const handleCancelBooking = async (booking: BookingWithClass) => {
    if (!user) return;

    const { success, error } = await classService.cancelBooking(booking.id, booking.class_id);
    
    if (error) {
      showAlert(t('error'), error);
      return;
    }

    // Refund based on payment method
    if (booking.payment_method === 'token' && booking.class.class_category === 'become_my_dancers') {
      await tokenService.addTokens(user.id, 1);
      showAlert(t('success'), 'Booking cancelled. 1 token has been refunded.');
    } else {
      showAlert(t('success'), 'Booking cancelled.');
    }
    
    loadData();
  };

  const getClassTypeIcon = (type: string) => {
    switch (type) {
      case 'tokyo': return 'location-city';
      case 'yokohama': return 'place';
      case 'online': return 'videocam';
      case 'private': return 'person';
      default: return 'event';
    }
  };

  const getClassCategoryBadge = (category: string) => {
    if (category === 'become_my_dancers') {
      return { label: 'Become my Dancers', color: colors.primary, icon: 'toll' };
    } else {
      return { label: 'Workshop', color: colors.accent, icon: 'payments' };
    }
  };

  const getAvailabilityColor = (current: number, max: number) => {
    const ratio = current / max;
    if (ratio >= 1) return colors.error;
    if (ratio >= 0.8) return colors.warning;
    return colors.success;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(language, { weekday: 'short', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' }),
    };
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const becomeDancersClasses = classes.filter(c => c.class_category === 'become_my_dancers');
  const workshopClasses = classes.filter(c => c.class_category === 'workshop');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{t('classes')}</Text>
          <Pressable 
            style={styles.searchIconButton}
            onPress={() => router.push('/search')}
          >
            <MaterialIcons name="search" size={22} color={colors.primary} />
          </Pressable>
        </View>
        <View style={styles.headerBadges}>
          {workshopCredits > 0 && (
            <Pressable 
              style={[styles.badgeButton, { backgroundColor: colors.accent + '20' }]}
              onPress={() => router.push('/workshop-bundles')}
            >
              <MaterialIcons name="confirmation-number" size={14} color={colors.accent} />
              <Text style={[styles.badgeText, { color: colors.accent }]}>{workshopCredits}</Text>
            </Pressable>
          )}
          <View style={styles.tokenBadge}>
            <MaterialIcons name="toll" size={16} color={colors.primary} />
            <Text style={styles.tokenText}>{remainingTokens}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* My Bookings Section */}
        {confirmedBookings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Bookings</Text>
            {confirmedBookings.map((booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <View style={styles.bookingIcon}>
                    <MaterialIcons name="check-circle" size={24} color={colors.success} />
                  </View>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingTitle}>{booking.class.title}</Text>
                    <View style={styles.paymentBadgeSmall}>
                      <MaterialIcons 
                        name={booking.payment_method === 'token' ? 'toll' : 'payment'} 
                        size={12} 
                        color={colors.textLight} 
                      />
                      <Text style={styles.paymentBadgeText}>
                        {booking.payment_method === 'token' ? '1 token' : `¥${booking.payment_amount.toLocaleString()}`}
                      </Text>
                    </View>
                    <Text style={styles.bookingSubtitle}>
                      {formatDateTime(booking.class.start_time).date} at {formatDateTime(booking.class.start_time).time}
                    </Text>
                  </View>
                </View>

                <View style={styles.bookingDetails}>
                  {booking.class.location && (
                    <View style={styles.bookingDetail}>
                      <MaterialIcons name="place" size={14} color={colors.textLight} />
                      <Text style={styles.bookingDetailText}>{booking.class.location}</Text>
                    </View>
                  )}
                </View>

                <Pressable
                  style={styles.cancelButton}
                  onPress={() => handleCancelBooking(booking)}
                >
                  <MaterialIcons name="cancel" size={16} color={colors.error} />
                  <Text style={styles.cancelButtonText}>Cancel Booking</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Become my Dancers Classes */}
        {becomeDancersClasses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Become my Dancers</Text>
              <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '20' }]}>
                <MaterialIcons name="toll" size={14} color={colors.primary} />
                <Text style={[styles.categoryBadgeText, { color: colors.primary }]}>Uses Tokens</Text>
              </View>
            </View>
            <View style={styles.classGrid}>
              {becomeDancersClasses.map((classItem) => renderClassCard(classItem))}
            </View>
          </View>
        )}

        {/* Workshop Classes */}
        {workshopClasses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Workshops</Text>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                {workshopCredits === 0 && (
                  <Pressable
                    style={[styles.bundleBadge, { backgroundColor: colors.warning + '20' }]}
                    onPress={() => router.push('/workshop-bundles')}
                  >
                    <MaterialIcons name="local-offer" size={12} color={colors.warning} />
                    <Text style={[styles.categoryBadgeText, { color: colors.warning }]}>Bundles Available</Text>
                  </Pressable>
                )}
                <View style={[styles.categoryBadge, { backgroundColor: colors.accent + '20' }]}>
                  <MaterialIcons name="payments" size={14} color={colors.accent} />
                  <Text style={[styles.categoryBadgeText, { color: colors.accent }]}>
                    {workshopCredits > 0 ? 'Uses Credits' : 'Direct Payment'}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.classGrid}>
              {workshopClasses.map((classItem) => renderClassCard(classItem))}
            </View>
          </View>
        )}

        {classes.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="event-busy" size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>No upcoming classes available</Text>
          </View>
        )}
      </ScrollView>

      {/* Class Preview Modal */}
      <Modal
        visible={showPreviewModal}
        animationType="slide"
        onRequestClose={() => setShowPreviewModal(false)}
      >
        <View style={styles.previewContainer}>
          {previewClass && (
            <>
              {/* Header */}
              <View style={[styles.previewHeader, { paddingTop: insets.top }]}>
                <Pressable
                  style={styles.previewCloseButton}
                  onPress={() => setShowPreviewModal(false)}
                >
                  <MaterialIcons name="close" size={28} color={colors.surface} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.previewScrollView}
                contentContainerStyle={styles.previewScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Photo Carousel */}
                {previewClass.photo_urls && previewClass.photo_urls.length > 0 ? (
                  <View style={styles.carouselContainer}>
                    <ScrollView
                      ref={photoScrollRef}
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      onScroll={handlePhotoScroll}
                      scrollEventThrottle={16}
                    >
                      {previewClass.photo_urls.map((photoUrl, index) => (
                        <Image
                          key={index}
                          source={{ uri: photoUrl }}
                          style={styles.carouselImage}
                          contentFit="cover"
                          transition={200}
                        />
                      ))}
                    </ScrollView>

                    {/* Pagination Dots */}
                    {previewClass.photo_urls.length > 1 && (
                      <View style={styles.paginationDots}>
                        {previewClass.photo_urls.map((_, index) => (
                          <View
                            key={index}
                            style={[
                              styles.paginationDot,
                              currentPhotoIndex === index && styles.paginationDotActive
                            ]}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                ) : (
                  <Image
                    source={require('@/assets/images/tahitian-dance-performance.jpg')}
                    style={styles.carouselImage}
                    contentFit="cover"
                    transition={200}
                  />
                )}

                {/* Video Preview */}
                {previewClass.video_url && (
                  <View style={styles.videoContainer}>
                    <VideoPreview videoUrl={previewClass.video_url} />
                  </View>
                )}

                {/* Content */}
                <View style={styles.previewContent}>
                  {/* Title & Category */}
                  <View style={styles.previewTitleRow}>
                    <Text style={styles.previewTitle}>{previewClass.title}</Text>
                    <View
                      style={[
                        styles.previewCategoryBadge,
                        { backgroundColor: getClassCategoryBadge(previewClass.class_category).color }
                      ]}
                    >
                      <MaterialIcons
                        name={getClassCategoryBadge(previewClass.class_category).icon}
                        size={16}
                        color={colors.surface}
                      />
                    </View>
                  </View>

                  {/* Description */}
                  {previewClass.description && (
                    <View style={styles.descriptionSection}>
                      <Text style={styles.descriptionTitle}>About This Class</Text>
                      <Text style={styles.descriptionText}>{previewClass.description}</Text>
                    </View>
                  )}

                  {/* Details Grid */}
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailCard}>
                      <MaterialIcons name="event" size={24} color={colors.primary} />
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>
                        {formatDateTime(previewClass.start_time).date}
                      </Text>
                    </View>

                    <View style={styles.detailCard}>
                      <MaterialIcons name="schedule" size={24} color={colors.primary} />
                      <Text style={styles.detailLabel}>Time</Text>
                      <Text style={styles.detailValue}>
                        {formatDateTime(previewClass.start_time).time}
                      </Text>
                    </View>

                    {previewClass.location && (
                      <View style={[styles.detailCard, { width: '100%' }]}>
                        <MaterialIcons name="place" size={24} color={colors.primary} />
                        <Text style={styles.detailLabel}>Location</Text>
                        <Text style={styles.detailValue}>{previewClass.location}</Text>
                      </View>
                    )}

                    <View style={styles.detailCard}>
                      <MaterialIcons name="people" size={24} color={colors.primary} />
                      <Text style={styles.detailLabel}>Participants</Text>
                      <Text style={[
                        styles.detailValue,
                        { color: getAvailabilityColor(previewClass.current_participants, previewClass.max_participants) }
                      ]}>
                        {previewClass.current_participants}/{previewClass.max_participants}
                      </Text>
                    </View>

                    <View style={styles.detailCard}>
                      <MaterialIcons name="payments" size={24} color={colors.primary} />
                      <Text style={styles.detailLabel}>Cost</Text>
                      <Text style={styles.detailValue}>
                        {previewClass.class_category === 'become_my_dancers'
                          ? '1 token'
                          : workshopCredits > 0
                          ? '1 credit'
                          : `¥${stripeService.getWorkshopPrice(previewClass.current_participants).toLocaleString()}`}
                      </Text>
                    </View>
                  </View>

                  {/* Type Badge */}
                  <View style={styles.previewTypeBadge}>
                    <MaterialIcons
                      name={getClassTypeIcon(previewClass.class_type)}
                      size={20}
                      color={colors.textLight}
                    />
                    <Text style={styles.previewTypeText}>
                      {previewClass.class_type.charAt(0).toUpperCase() + previewClass.class_type.slice(1)} Class
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Book Button */}
              <View style={[styles.previewFooter, { paddingBottom: insets.bottom + spacing.md }]}>
                <Pressable
                  style={[
                    styles.previewBookButton,
                    (bookings.some(b => b.class_id === previewClass.id && b.status === 'confirmed') ||
                      previewClass.current_participants >= previewClass.max_participants) &&
                      styles.previewBookButtonDisabled
                  ]}
                  onPress={() => {
                    setShowPreviewModal(false);
                    setTimeout(() => openBookingConfirmation(previewClass), 300);
                  }}
                  disabled={
                    bookings.some(b => b.class_id === previewClass.id && b.status === 'confirmed') ||
                    previewClass.current_participants >= previewClass.max_participants
                  }
                >
                  <MaterialIcons name="event-available" size={24} color={colors.surface} />
                  <Text style={styles.previewBookButtonText}>
                    {bookings.some(b => b.class_id === previewClass.id && b.status === 'confirmed')
                      ? 'Already Booked'
                      : previewClass.current_participants >= previewClass.max_participants
                      ? 'Class Full'
                      : 'Book This Class'}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Booking Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="event-available" size={32} color={colors.primary} />
              <Text style={styles.modalTitle}>Confirm Booking</Text>
            </View>

            {selectedClass && (
              <>
                <View style={styles.modalContent}>
                  <Text style={styles.modalClassTitle}>{selectedClass.title}</Text>
                  
                  <View style={[styles.categoryBadgeLarge, { 
                    backgroundColor: getClassCategoryBadge(selectedClass.class_category).color + '20' 
                  }]}>
                    <MaterialIcons 
                      name={getClassCategoryBadge(selectedClass.class_category).icon} 
                      size={20} 
                      color={getClassCategoryBadge(selectedClass.class_category).color} 
                    />
                    <Text style={[styles.categoryBadgeTextLarge, { 
                      color: getClassCategoryBadge(selectedClass.class_category).color 
                    }]}>
                      {getClassCategoryBadge(selectedClass.class_category).label}
                    </Text>
                  </View>

                  <View style={styles.modalDetails}>
                    <View style={styles.modalDetailRow}>
                      <MaterialIcons name="event" size={18} color={colors.textLight} />
                      <Text style={styles.modalDetailText}>
                        {formatDateTime(selectedClass.start_time).date}
                      </Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <MaterialIcons name="schedule" size={18} color={colors.textLight} />
                      <Text style={styles.modalDetailText}>
                        {formatDateTime(selectedClass.start_time).time}
                      </Text>
                    </View>
                    {selectedClass.location && (
                      <View style={styles.modalDetailRow}>
                        <MaterialIcons name="place" size={18} color={colors.textLight} />
                        <Text style={styles.modalDetailText}>{selectedClass.location}</Text>
                      </View>
                    )}
                  </View>

                  {selectedClass.class_category === 'become_my_dancers' ? (
                    <>
                      <View style={styles.tokenCost}>
                        <MaterialIcons name="toll" size={24} color={colors.primary} />
                        <Text style={styles.tokenCostText}>1 token will be deducted</Text>
                      </View>

                      <View style={styles.balanceInfo}>
                        <Text style={styles.balanceLabel}>Current Balance:</Text>
                        <Text style={styles.balanceValue}>{remainingTokens} tokens</Text>
                      </View>
                      <View style={styles.balanceInfo}>
                        <Text style={styles.balanceLabel}>After Booking:</Text>
                        <Text style={styles.balanceValue}>{remainingTokens - 1} tokens</Text>
                      </View>
                    </>
                  ) : workshopCredits > 0 ? (
                    <>
                      <View style={[styles.tokenCost, { backgroundColor: colors.accent + '15' }]}>
                        <MaterialIcons name="confirmation-number" size={24} color={colors.accent} />
                        <Text style={[styles.tokenCostText, { color: colors.accent }]}>1 workshop credit will be used</Text>
                      </View>

                      <View style={styles.balanceInfo}>
                        <Text style={styles.balanceLabel}>Current Credits:</Text>
                        <Text style={styles.balanceValue}>{workshopCredits} credits</Text>
                      </View>
                      <View style={styles.balanceInfo}>
                        <Text style={styles.balanceLabel}>After Booking:</Text>
                        <Text style={styles.balanceValue}>{workshopCredits - 1} credits</Text>
                      </View>

                      <Pressable
                        style={styles.bundleLinkButton}
                        onPress={() => {
                          setShowConfirmModal(false);
                          setSelectedClass(null);
                          router.push('/workshop-bundles');
                        }}
                      >
                        <Text style={styles.bundleLinkText}>View my bundles →</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <View style={styles.workshopPricing}>
                        <MaterialIcons name="payments" size={24} color={colors.accent} />
                        <View style={styles.workshopPricingText}>
                          <Text style={styles.workshopPriceAmount}>
                            ¥{stripeService.getWorkshopPrice(selectedClass.current_participants).toLocaleString()}
                          </Text>
                          <Text style={styles.workshopPriceTier}>
                            {selectedClass.current_participants < 5 ? '(Less than 5 people)' : '(5+ people)'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.pricingNote}>
                        <MaterialIcons name="info-outline" size={16} color={colors.textLight} />
                        <Text style={styles.pricingNoteText}>
                          Price adjusts automatically: ¥15,000 for {'<'}5 participants, ¥12,000 for 5+
                        </Text>
                      </View>

                      <Pressable
                        style={styles.bundleLinkButton}
                        onPress={() => {
                          setShowConfirmModal(false);
                          setSelectedClass(null);
                          router.push('/workshop-bundles');
                        }}
                      >
                        <MaterialIcons name="local-offer" size={16} color={colors.warning} />
                        <Text style={styles.bundleLinkText}>Save money with workshop bundles →</Text>
                      </Pressable>
                    </>
                  )}
                </View>

                <View style={styles.modalActions}>
                  <Pressable
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => {
                      setShowConfirmModal(false);
                      setSelectedClass(null);
                    }}
                    disabled={bookingInProgress}
                  >
                    <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalButton, styles.modalButtonConfirm]}
                    onPress={confirmBooking}
                    disabled={bookingInProgress}
                  >
                    {bookingInProgress ? (
                      <Text style={styles.modalButtonTextConfirm}>Booking...</Text>
                    ) : (
                      <Text style={styles.modalButtonTextConfirm}>Confirm</Text>
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

  function renderClassCard(classItem: Class) {
    const isBooked = bookings.some(
      b => b.class_id === classItem.id && b.status === 'confirmed'
    );
    const isFull = classItem.current_participants >= classItem.max_participants;
    const availabilityColor = getAvailabilityColor(
      classItem.current_participants,
      classItem.max_participants
    );
    const { date, time } = formatDateTime(classItem.start_time);
    const categoryBadge = getClassCategoryBadge(classItem.class_category);

    const canBook = classItem.class_category === 'become_my_dancers' 
      ? remainingTokens > 0 && !isFull && !isBooked
      : !isFull && !isBooked;

    // Use first photo or fallback image
    const imageSource = classItem.photo_urls && classItem.photo_urls.length > 0
      ? { uri: classItem.photo_urls[0] }
      : require('@/assets/images/tahitian-dance-performance.jpg');

    return (
      <Pressable 
        key={classItem.id} 
        style={styles.classCard}
        onPress={() => openClassPreview(classItem)}
      >
        {/* Photo */}
        <View style={styles.cardImageContainer}>
          <Image
            source={imageSource}
            style={styles.cardImage}
            contentFit="cover"
            transition={200}
          />
          
          {/* Category Badge Overlay */}
          <View style={[styles.cardCategoryBadge, { backgroundColor: categoryBadge.color }]}>
            <MaterialIcons name={categoryBadge.icon} size={14} color={colors.surface} />
          </View>

          {/* Booked/Full Badge Overlay */}
          {isBooked ? (
            <View style={styles.cardStatusBadge}>
              <MaterialIcons name="check-circle" size={16} color={colors.success} />
              <Text style={styles.cardStatusText}>Booked</Text>
            </View>
          ) : isFull ? (
            <View style={[styles.cardStatusBadge, { backgroundColor: colors.error }]}>
              <MaterialIcons name="event-busy" size={16} color={colors.surface} />
              <Text style={styles.cardStatusText}>Full</Text>
            </View>
          ) : null}
        </View>

        {/* Info */}
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>{classItem.title}</Text>
          
          <View style={styles.cardMeta}>
            <View style={styles.cardMetaRow}>
              <MaterialIcons name="event" size={14} color={colors.textLight} />
              <Text style={styles.cardMetaText} numberOfLines={1}>{date}</Text>
            </View>
            <View style={styles.cardMetaRow}>
              <MaterialIcons name="schedule" size={14} color={colors.textLight} />
              <Text style={styles.cardMetaText} numberOfLines={1}>{time}</Text>
            </View>
          </View>

          {classItem.location && (
            <View style={styles.cardMetaRow}>
              <MaterialIcons name="place" size={12} color={colors.textLight} />
              <Text style={[styles.cardMetaText, { fontSize: 11 }]} numberOfLines={1}>
                {classItem.location}
              </Text>
            </View>
          )}

          {/* Availability */}
          <View style={styles.cardFooter}>
            <View style={styles.cardSpots}>
              <MaterialIcons name="people" size={14} color={availabilityColor} />
              <Text style={[styles.cardSpotsText, { color: availabilityColor }]}>
                {classItem.current_participants}/{classItem.max_participants}
              </Text>
            </View>
            
            {!isBooked && !isFull && (
              <View style={[styles.cardPriceBadge, { backgroundColor: categoryBadge.color + '20' }]}>
                <MaterialIcons name={categoryBadge.icon} size={12} color={categoryBadge.color} />
                <Text style={[styles.cardPriceText, { color: categoryBadge.color }]}>
                  {classItem.class_category === 'become_my_dancers' ? '1 token' : 'Book'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  }
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  searchIconButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  badgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 4,
    ...shadows.sm,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 12,
  },
  tokenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    ...shadows.sm,
  },
  tokenText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  bundleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  categoryBadgeText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  categoryBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  categoryBadgeTextLarge: {
    ...typography.body,
    fontWeight: '600',
  },
  bookingCard: {
    backgroundColor: colors.success + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bookingIcon: {
    marginRight: spacing.md,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  paymentBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  paymentBadgeText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '600',
  },
  bookingSubtitle: {
    ...typography.caption,
    color: colors.textLight,
  },
  bookingDetails: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  bookingDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bookingDetailText: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 12,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.error,
    fontSize: 14,
  },
  classGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  classCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.lg,
  },
  cardImageContainer: {
    width: '100%',
    height: CARD_WIDTH * 1.2,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardCategoryBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  cardStatusBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: 4,
    ...shadows.md,
  },
  cardStatusText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: colors.surface,
  },
  cardContent: {
    padding: spacing.sm,
  },
  cardTitle: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  cardMeta: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMetaText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textLight,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  cardSpots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardSpotsText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  cardPriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    gap: 3,
  },
  cardPriceText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  classHeaderInfo: {
    flex: 1,
  },
  classTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  classDescription: {
    ...typography.caption,
    color: colors.textLight,
  },
  classDetails: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  detailText: {
    ...typography.caption,
    color: colors.textLight,
  },
  classFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.textLight + '20',
  },
  availabilityContainer: {
    gap: spacing.xs,
  },
  participantsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  participantsText: {
    ...typography.caption,
    fontWeight: '600',
  },
  availabilityText: {
    ...typography.caption,
    color: colors.textLight,
    fontSize: 11,
  },
  bookedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  bookedText: {
    ...typography.button,
    color: colors.success,
    fontSize: 14,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    ...shadows.sm,
  },
  bookButtonDisabled: {
    opacity: 0.5,
  },
  bookButtonText: {
    ...typography.button,
    color: colors.surface,
    fontSize: 14,
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
  modalClassTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalDetails: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalDetailText: {
    ...typography.body,
    color: colors.textLight,
  },
  tokenCost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tokenCostText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  balanceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  balanceLabel: {
    ...typography.body,
    color: colors.textLight,
  },
  balanceValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  workshopPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  workshopPricingText: {
    alignItems: 'center',
  },
  workshopPriceAmount: {
    ...typography.h2,
    color: colors.accent,
    fontWeight: '700',
  },
  workshopPriceTier: {
    ...typography.caption,
    color: colors.accent,
    fontSize: 11,
    marginTop: spacing.xs,
  },
  pricingNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  pricingNoteText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textLight,
    flex: 1,
    lineHeight: 16,
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
  bundleLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  bundleLinkText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  previewHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  previewCloseButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.text + 'CC',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  previewScrollView: {
    flex: 1,
  },
  previewScrollContent: {
    paddingBottom: 100,
  },
  carouselContainer: {
    height: 400,
    position: 'relative',
  },
  carouselImage: {
    width: width,
    height: 400,
  },
  paginationDots: {
    position: 'absolute',
    bottom: spacing.lg,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface + '60',
  },
  paginationDotActive: {
    backgroundColor: colors.surface,
    width: 24,
  },
  videoContainer: {
    height: 250,
    backgroundColor: colors.text,
  },
  previewContent: {
    padding: spacing.lg,
  },
  previewTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  previewTitle: {
    ...typography.h1,
    fontSize: 26,
    color: colors.text,
    flex: 1,
    marginRight: spacing.md,
  },
  previewCategoryBadge: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  descriptionSection: {
    marginBottom: spacing.xl,
  },
  descriptionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  descriptionText: {
    ...typography.body,
    color: colors.textLight,
    lineHeight: 24,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  detailCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  detailValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  previewTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    gap: spacing.xs,
  },
  previewTypeText: {
    ...typography.caption,
    color: colors.textLight,
    fontWeight: '600',
  },
  previewFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.primary + '20',
    ...shadows.xl,
  },
  previewBookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.lg,
  },
  previewBookButtonDisabled: {
    backgroundColor: colors.textLight,
    opacity: 0.6,
  },
  previewBookButtonText: {
    ...typography.button,
    fontSize: 18,
    color: colors.surface,
  },
});
