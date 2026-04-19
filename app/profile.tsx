import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, ActionSheetIOS, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth, useAlert } from '@/template';
import { useLanguage } from '@/hooks/useLanguage';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { profileService, UserProfile, ProfileStats } from '@/services/profileService';
import { classService, Booking, Class } from '@/services/classService';
import { Image } from 'expo-image';
import { pickAndUploadImage } from '@/services/imageUploadService';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();
  const { t, language, setLanguage } = useLanguage();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [bookings, setBookings] = useState<(Booking & { class: Class })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [editedUsername, setEditedUsername] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    const { data: profileData } = await profileService.getUserProfile(user.id);
    if (profileData) {
      setProfile(profileData);
      setEditedUsername(profileData.username || '');
    }

    const { data: statsData } = await profileService.getProfileStats(user.id);
    if (statsData) setStats(statsData);

    const { data: bookingData } = await classService.getUserBookings(user.id);
    if (bookingData) setBookings(bookingData);

    setLoading(false);
  };

  const handleAvatarPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) handleAvatarUpload('camera');
          else if (index === 2) handleAvatarUpload('gallery');
        }
      );
    } else {
      Alert.alert('Update Photo', 'Choose an option', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => handleAvatarUpload('camera') },
        { text: 'Choose from Library', onPress: () => handleAvatarUpload('gallery') },
      ]);
    }
  };

  const handleAvatarUpload = async (source: 'camera' | 'gallery') => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const result = await pickAndUploadImage(source, 'profile-photos', user.id);
      if (result.success && result.url) {
        await profileService.updateProfile(user.id, { avatar_url: result.url });
        setProfile((prev) => prev ? { ...prev, avatar_url: result.url! } : prev);
        showAlert(t('success'), 'Profile photo updated!');
      } else if (result.error) {
        showAlert(t('error'), result.error);
      }
    } catch (err: any) {
      showAlert(t('error'), String(err?.message ?? 'Failed to upload photo'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    const { success, error } = await profileService.updateProfile(user.id, {
      username: editedUsername.trim() || null,
      language: language,
    });

    setSaving(false);

    if (error) {
      showAlert(t('error'), error);
    } else {
      showAlert(t('success'), 'Profile updated successfully!');
      setEditing(false);
      loadData();
    }
  };

  const handleCancelEdit = () => {
    setEditedUsername(profile?.username || '');
    setEditing(false);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ja' ? 'en' : 'ja');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Info Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Pressable
              onPress={handleAvatarPress}
              disabled={uploadingAvatar}
              style={({ pressed }) => [styles.avatarPressable, pressed && { opacity: 0.8 }]}
            >
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={styles.avatar}>
                  <MaterialIcons name="person" size={48} color={colors.surface} />
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <MaterialIcons name="camera-alt" size={16} color={colors.surface} />
                )}
              </View>
            </Pressable>
          </View>

          <View style={styles.profileInfo}>
            {editing ? (
              <TextInput
                style={styles.input}
                value={editedUsername}
                onChangeText={setEditedUsername}
                placeholder="Enter username"
                placeholderTextColor={colors.textLight}
                autoFocus
              />
            ) : (
              <Text style={styles.username}>{profile?.username || 'No username'}</Text>
            )}
            <Text style={styles.email}>{profile?.email}</Text>
          </View>

          {editing ? (
            <View style={styles.editActions}>
              <Pressable style={[styles.editButton, styles.cancelButton]} onPress={handleCancelEdit}>
                <Text style={[styles.editButtonText, { color: colors.textLight }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.editButton, styles.saveButton, saving && styles.disabledButton]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Text style={styles.editButtonText}>Save</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.editIconButton} onPress={() => setEditing(true)}>
              <MaterialIcons name="edit" size={20} color={colors.primary} />
            </Pressable>
          )}
        </View>

        {/* Settings Card */}
        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <MaterialIcons name="language" size={24} color={colors.primary} />
            <Text style={styles.settingLabel}>Language</Text>
            <Pressable style={styles.languageToggle} onPress={toggleLanguage}>
              <Text style={[styles.languageOption, language === 'en' && styles.languageOptionActive]}>EN</Text>
              <Text style={[styles.languageOption, language === 'ja' && styles.languageOptionActive]}>日本語</Text>
            </Pressable>
          </View>
          
          <View style={styles.settingDivider} />
          
          <Pressable 
            style={styles.settingRow}
            onPress={() => router.push('/analytics')}
          >
            <MaterialIcons name="bar-chart" size={24} color={colors.primary} />
            <Text style={styles.settingLabel}>My Analytics</Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.textLight} />
          </Pressable>
          
          <View style={styles.settingDivider} />
          
          <Pressable 
            style={styles.settingRow}
            onPress={() => router.push('/notification-history')}
          >
            <MaterialIcons name="notifications" size={24} color={colors.accent} />
            <Text style={styles.settingLabel}>Notification History</Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.textLight} />
          </Pressable>
          
          <View style={styles.settingDivider} />
          
          <Pressable 
            style={styles.settingRow}
            onPress={() => router.push('/notification-preferences')}
          >
            <MaterialIcons name="tune" size={24} color="#9c27b0" />
            <Text style={styles.settingLabel}>Notification Preferences</Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.textLight} />
          </Pressable>
          
          <View style={styles.settingDivider} />
          
          <Pressable 
            style={styles.settingRow}
            onPress={() => router.push('/faq')}
          >
            <MaterialIcons name="help-outline" size={24} color="#FF6347" />
            <Text style={styles.settingLabel}>{language === 'ja' ? 'よくある質問' : 'FAQ'}</Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.textLight} />
          </Pressable>

          <View style={styles.settingDivider} />

          <Pressable
            style={styles.settingRow}
            onPress={() =>
              showAlert(
                language === 'ja' ? 'ログアウト' : 'Log Out',
                language === 'ja' ? 'ログアウトしますか？' : 'Are you sure you want to log out?',
                [
                  { text: language === 'ja' ? 'キャンセル' : 'Cancel', style: 'cancel' },
                  {
                    text: language === 'ja' ? 'ログアウト' : 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                      await logout();
                      router.replace('/landing');
                    },
                  },
                ]
              )
            }
          >
            <MaterialIcons name="logout" size={24} color={colors.error} />
            <Text style={[styles.settingLabel, { color: colors.error }]}>
              {language === 'ja' ? 'ログアウト' : 'Log Out'}
            </Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.error + '80'} />
          </Pressable>
        </View>

        {/* Stats Grid */}
        {stats && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>My Statistics</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <MaterialIcons name="event" size={32} color={colors.primary} />
                <Text style={styles.statValue}>{stats.total_bookings}</Text>
                <Text style={styles.statLabel}>Total Bookings</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialIcons name="check-circle" size={32} color={colors.success} />
                <Text style={styles.statValue}>{stats.attended_classes}</Text>
                <Text style={styles.statLabel}>Classes Attended</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialIcons name="toll" size={32} color={colors.tokenActive} />
                <Text style={styles.statValue}>{stats.tokens_remaining}</Text>
                <Text style={styles.statLabel}>Tokens Left</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialIcons name="assignment-turned-in" size={32} color={colors.accent} />
                <Text style={styles.statValue}>{stats.private_lessons_completed}</Text>
                <Text style={styles.statLabel}>Lessons Done</Text>
              </View>
            </View>
          </View>
        )}

        {/* Booking History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Booking History</Text>
          {bookings.length > 0 ? (
            bookings.map((booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingIcon}>
                  <MaterialIcons
                    name={booking.status === 'attended' ? 'check-circle' : 'event'}
                    size={24}
                    color={booking.status === 'attended' ? colors.success : colors.primary}
                  />
                </View>
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingTitle}>{booking.class.title}</Text>
                  <View style={styles.bookingDetails}>
                    <Text style={styles.bookingDetail}>
                      {new Date(booking.class.start_time).toLocaleDateString(language)}
                    </Text>
                    <Text style={styles.bookingDetail}>•</Text>
                    <Text style={styles.bookingDetail}>{booking.class.location || booking.class.class_type}</Text>
                  </View>
                  <View style={styles.bookingMeta}>
                    <View style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          booking.status === 'attended' ? colors.success :
                          booking.status === 'confirmed' ? colors.primary :
                          colors.textLight
                      }
                    ]}>
                      <Text style={styles.statusText}>{booking.status}</Text>
                    </View>
                    <Text style={styles.bookingPayment}>
                      {booking.payment_method === 'token' ? '1 Token' : `¥${booking.payment_amount.toLocaleString()}`}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="event-busy" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>No bookings yet</Text>
              <Pressable
                style={styles.browseButton}
                onPress={() => router.push('/(tabs)/classes')}
              >
                <Text style={styles.browseButtonText}>Browse Classes</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Member Since */}
        {stats && (
          <View style={styles.memberCard}>
            <MaterialIcons name="star" size={20} color={colors.accent} />
            <Text style={styles.memberText}>
              Member since {new Date(stats.member_since).toLocaleDateString(language, { month: 'long', year: 'numeric' })}
            </Text>
          </View>
        )}
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarPressable: {
    position: 'relative',
    width: 96,
    height: 96,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  username: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  email: {
    ...typography.body,
    color: colors.textLight,
  },
  input: {
    ...typography.h3,
    color: colors.text,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    textAlign: 'center',
    minWidth: 200,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  editButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.textLight,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  disabledButton: {
    opacity: 0.6,
  },
  editButtonText: {
    ...typography.button,
    fontSize: 14,
    color: colors.surface,
  },
  editIconButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  settingDivider: {
    height: 1,
    backgroundColor: colors.primary + '10',
    marginVertical: spacing.md,
  },
  settingLabel: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  languageToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: 4,
  },
  languageOption: {
    ...typography.caption,
    color: colors.textLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  languageOptionActive: {
    backgroundColor: colors.primary,
    color: colors.surface,
    fontWeight: '600',
  },
  statsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    ...typography.h2,
    color: colors.text,
    marginVertical: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'center',
  },
  historySection: {
    marginBottom: spacing.lg,
  },
  bookingCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  bookingIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  bookingDetails: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  bookingDetail: {
    ...typography.caption,
    color: colors.textLight,
  },
  bookingMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.surface,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  bookingPayment: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textLight,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  browseButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  browseButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  memberText: {
    ...typography.caption,
    color: colors.textLight,
  },
});
