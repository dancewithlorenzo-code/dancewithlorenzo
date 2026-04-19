import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useAlert } from '@/template';
import { useLanguage } from '@/hooks/useLanguage';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { Class } from '@/services/classService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ClassDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showAlert } = useAlert();
  const { t } = useLanguage();

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);

  // Parse class data from params
  const classData: Class = params.classData 
    ? JSON.parse(params.classData as string) 
    : null;

  // Always call hook unconditionally — pass empty string when no URL
  const videoPlayer = useVideoPlayer(classData?.video_url ?? '', (player) => {
    player.loop = false;
    player.muted = false;
  });

  if (!classData) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Class not found</Text>
      </View>
    );
  }

  const photos = classData.photo_urls || [];
  const hasMedia = photos.length > 0 || classData.video_url;

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en', { 
        hour: '2-digit', 
        minute: '2-digit'
      }),
    };
  };

  const startDateTime = formatDateTime(classData.start_time);
  const endTime = new Date(classData.end_time).toLocaleTimeString('en', { 
    hour: '2-digit', 
    minute: '2-digit'
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {classData.title}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Gallery */}
        {photos.length > 0 && (
          <View style={styles.gallerySection}>
            <Image
              source={{ uri: photos[selectedPhotoIndex] }}
              style={styles.mainPhoto}
              contentFit="cover"
              transition={200}
            />
            {photos.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.thumbnailScroll}
                contentContainerStyle={styles.thumbnailContainer}
              >
                {photos.map((photo, index) => (
                  <Pressable
                    key={index}
                    onPress={() => setSelectedPhotoIndex(index)}
                    style={[
                      styles.thumbnail,
                      selectedPhotoIndex === index && styles.thumbnailActive
                    ]}
                  >
                    <Image
                      source={{ uri: photo }}
                      style={styles.thumbnailImage}
                      contentFit="cover"
                    />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Video section — always rendered */}
        <View style={styles.videoSection}>
          <View style={styles.videoHeader}>
            <MaterialIcons name="videocam" size={22} color={colors.primary} />
            <Text style={styles.videoTitle}>Class Video</Text>
          </View>

          {classData.video_url ? (
            <View style={styles.videoWrapper}>
              <VideoView
                player={videoPlayer}
                style={styles.video}
                nativeControls={true}
                allowsFullscreen={true}
                allowsPictureInPicture={true}
              />
              {/* Tap-to-play overlay shown before first play */}
              {!videoPlaying && (
                <Pressable
                  style={styles.videoOverlay}
                  onPress={() => {
                    videoPlayer.play();
                    setVideoPlaying(true);
                  }}
                >
                  <View style={styles.playCircle}>
                    <MaterialIcons name="play-arrow" size={40} color="#fff" />
                  </View>
                  <Text style={styles.tapToPlayText}>Tap to play</Text>
                </Pressable>
              )}
            </View>
          ) : (
            /* No-video placeholder */
            <View style={styles.videoPlaceholder}>
              <MaterialIcons name="videocam-off" size={48} color={colors.textLight + '80'} />
              <Text style={styles.placeholderTitle}>No video available</Text>
              <Text style={styles.placeholderSub}>A demo video will be added soon</Text>
            </View>
          )}
        </View>

        {/* Class Info */}
        <View style={styles.infoCard}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {classData.class_category === 'become_my_dancers' ? 'Become my Dancers' : 'Workshop'}
            </Text>
          </View>

          <Text style={styles.classTitle}>{classData.title}</Text>

          {classData.description && (
            <Text style={styles.description}>{classData.description}</Text>
          )}

          <View style={styles.detailsGrid}>
            <View style={styles.detailRow}>
              <MaterialIcons name="event" size={20} color={colors.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{startDateTime.date}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <MaterialIcons name="schedule" size={20} color={colors.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{startDateTime.time} - {endTime}</Text>
              </View>
            </View>

            {classData.location && (
              <View style={styles.detailRow}>
                <MaterialIcons name="place" size={20} color={colors.primary} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{classData.location}</Text>
                </View>
              </View>
            )}

            <View style={styles.detailRow}>
              <MaterialIcons name="people" size={20} color={colors.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Capacity</Text>
                <Text style={styles.detailValue}>
                  {classData.current_participants}/{classData.max_participants} students
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <MaterialIcons name="payments" size={20} color={colors.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Payment</Text>
                <Text style={styles.detailValue}>
                  {classData.class_category === 'become_my_dancers' 
                    ? '1 Token per class' 
                    : `¥${classData.fee_per_person.toLocaleString()} per person`}
                </Text>
              </View>
            </View>
          </View>
        </View>


      </ScrollView>

      {/* Book Button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable 
          style={styles.bookButton}
          onPress={() => router.back()}
        >
          <Text style={styles.bookButtonText}>Back to Classes</Text>
        </Pressable>
      </View>
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
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  gallerySection: {
    marginBottom: spacing.lg,
  },
  mainPhoto: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
    backgroundColor: colors.surface,
  },
  thumbnailScroll: {
    marginTop: spacing.md,
  },
  thumbnailContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: colors.primary,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  videoSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  videoTitle: {
    ...typography.h3,
    color: colors.text,
  },
  videoWrapper: {
    width: '100%',
    height: 220,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
    ...shadows.md,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  playCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  tapToPlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  videoPlaceholder: {
    width: '100%',
    height: 180,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  placeholderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textLight,
  },
  placeholderSub: {
    fontSize: 13,
    color: colors.textLight,
    opacity: 0.7,
  },
  infoCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  categoryText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  classTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.textLight,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  detailsGrid: {
    gap: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },

  bottomBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.primary + '20',
    ...shadows.lg,
  },
  bookButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.md,
  },
  bookButtonText: {
    ...typography.button,
    color: colors.surface,
  },
});
