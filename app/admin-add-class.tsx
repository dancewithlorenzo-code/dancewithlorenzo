import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';

import { getSupabaseClient } from '@/template';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { pickAndUploadImage } from '@/services/imageUploadService';

// ─── Date Helpers ────────────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Constants ───────────────────────────────────────────────────────────────

const CLASS_TYPES = [
  { value: 'tokyo',          label: 'Tokyo' },
  { value: 'yokohama',       label: 'Yokohama' },
  { value: 'online',         label: 'Online' },
  { value: 'private',        label: 'Private' },
  { value: 'online_global',  label: 'Online Global' },
  { value: 'workshop',       label: 'Workshop' },
  { value: 'international',  label: 'International' },
  { value: 'multi_location', label: 'Multi Location' },
];

// ─── Stepper Column ──────────────────────────────────────────────────────────

interface StepperColumnProps {
  label: string;
  value: string;
  onIncrement: () => void;
  onDecrement: () => void;
  flex?: number;
}

function StepperColumn({ label, value, onIncrement, onDecrement, flex = 1 }: StepperColumnProps) {
  // Long-press repeat
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  function startRepeat(fn: () => void) {
    fn();
    intervalRef.current = setInterval(fn, 120);
  }
  function stopRepeat() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  React.useEffect(() => () => stopRepeat(), []);

  return (
    <View style={[stepperStyles.column, { flex }]}>
      <Text style={stepperStyles.label}>{label}</Text>
      <Pressable
        style={({ pressed }) => [stepperStyles.btn, pressed && stepperStyles.btnPressed]}
        onPress={onIncrement}
        onLongPress={() => startRepeat(onIncrement)}
        onPressOut={stopRepeat}
        delayLongPress={400}
      >
        <MaterialIcons name="keyboard-arrow-up" size={28} color={colors.primary} />
      </Pressable>
      <View style={stepperStyles.valueBox}>
        <Text style={stepperStyles.valueText}>{value}</Text>
      </View>
      <Pressable
        style={({ pressed }) => [stepperStyles.btn, pressed && stepperStyles.btnPressed]}
        onPress={onDecrement}
        onLongPress={() => startRepeat(onDecrement)}
        onPressOut={stopRepeat}
        delayLongPress={400}
      >
        <MaterialIcons name="keyboard-arrow-down" size={28} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  column: {
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '12',
  },
  btnPressed: {
    backgroundColor: colors.primary + '30',
  },
  valueBox: {
    minWidth: 48,
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary + '50',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    paddingHorizontal: 4,
  },
  valueText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
});

// ─── DateTimePickerModal ──────────────────────────────────────────────────────

interface DateTimePickerModalProps {
  visible: boolean;
  value: Date;
  title: string;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

function DateTimePickerModal({ visible, value, title, onConfirm, onCancel }: DateTimePickerModalProps) {
  const now = new Date();
  const minYear = now.getFullYear();
  const maxYear = minYear + 5;

  const [selYear,  setSelYear]  = React.useState(value.getFullYear());
  const [selMonth, setSelMonth] = React.useState(value.getMonth());
  const [selDay,   setSelDay]   = React.useState(value.getDate());
  const [selHour,  setSelHour]  = React.useState(value.getHours());
  const [selMin,   setSelMin]   = React.useState(value.getMinutes());

  // Recompute days when year/month changes
  const totalDays = daysInMonth(selYear, selMonth);
  const clampedDay = Math.min(selDay, totalDays);

  // Reset state whenever modal opens — reads directly from value, no scroll needed
  React.useEffect(() => {
    if (visible) {
      setSelYear(value.getFullYear());
      setSelMonth(value.getMonth());
      setSelDay(value.getDate());
      setSelHour(value.getHours());
      setSelMin(value.getMinutes());
    }
  }, [visible]);

  const handleConfirm = () => {
    const d = new Date(selYear, selMonth, clampedDay, selHour, selMin, 0, 0);
    onConfirm(d);
  };

  // Stepper helpers
  function cycleYear(delta: number) {
    setSelYear(prev => Math.max(minYear, Math.min(maxYear, prev + delta)));
  }
  function cycleMonth(delta: number) {
    setSelMonth(prev => (prev + delta + 12) % 12);
  }
  function cycleDay(delta: number) {
    const max = daysInMonth(selYear, selMonth);
    setSelDay(prev => {
      const next = prev + delta;
      if (next < 1) return max;
      if (next > max) return 1;
      return next;
    });
  }
  function cycleHour(delta: number) {
    setSelHour(prev => (prev + delta + 24) % 24);
  }
  function cycleMin(delta: number) {
    setSelMin(prev => (prev + delta + 60) % 60);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={dtStyles.overlay} onPress={onCancel}>
        <Pressable style={dtStyles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={dtStyles.header}>
            <Pressable onPress={onCancel} style={dtStyles.headerBtn}>
              <Text style={dtStyles.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={dtStyles.title}>{title}</Text>
            <Pressable onPress={handleConfirm} style={dtStyles.headerBtn}>
              <Text style={dtStyles.confirmText}>Done</Text>
            </Pressable>
          </View>

          {/* Stepper columns */}
          <View style={dtStyles.columnsRow}>
            <StepperColumn
              label="Year"
              value={String(selYear)}
              onIncrement={() => cycleYear(1)}
              onDecrement={() => cycleYear(-1)}
              flex={1.4}
            />
            <StepperColumn
              label="Month"
              value={MONTHS[selMonth]}
              onIncrement={() => cycleMonth(1)}
              onDecrement={() => cycleMonth(-1)}
              flex={1.3}
            />
            <StepperColumn
              label="Day"
              value={pad(clampedDay)}
              onIncrement={() => cycleDay(1)}
              onDecrement={() => cycleDay(-1)}
              flex={1}
            />
            <View style={dtStyles.separator} />
            <StepperColumn
              label="Hour"
              value={pad(selHour)}
              onIncrement={() => cycleHour(1)}
              onDecrement={() => cycleHour(-1)}
              flex={1}
            />
            <Text style={dtStyles.colon}>:</Text>
            <StepperColumn
              label="Min"
              value={pad(selMin)}
              onIncrement={() => cycleMin(1)}
              onDecrement={() => cycleMin(-1)}
              flex={1}
            />
          </View>

          {/* Selected preview */}
          <View style={dtStyles.preview}>
            <MaterialIcons name="event" size={16} color={colors.primary} />
            <Text style={dtStyles.previewText}>
              {String(selYear)}/{pad(selMonth + 1)}/{pad(clampedDay)}  {pad(selHour)}:{pad(selMin)}
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const dtStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    ...({ shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 20 } as any),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBtn: {
    minWidth: 64,
    minHeight: 44,
    justifyContent: 'center',
  },
  title: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  cancelText: {
    fontSize: 16,
    color: colors.textLight,
    fontWeight: '500',
  },
  confirmText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
    textAlign: 'right',
  },
  columnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: 2,
  },
  separator: {
    width: 12,
  },
  colon: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: 2,
    marginTop: 20,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  previewText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminAddClassScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const isEdit = !!params.id;

  const [loading,           setLoading]           = React.useState(false);
  const [uploadingImage,    setUploadingImage]     = React.useState(false);
  const [title,             setTitle]             = React.useState('');
  const [description,       setDescription]       = React.useState('');
  const [classType,         setClassType]         = React.useState('workshop');
  const [classCategory,     setClassCategory]     = React.useState('workshop');
  const [location,          setLocation]          = React.useState('');
  const [startTime,         setStartTime]         = React.useState<Date>(new Date());
  const [endTime,           setEndTime]           = React.useState<Date>(new Date(Date.now() + 3_600_000));
  const [maxParticipants,   setMaxParticipants]   = React.useState('10');
  const [feePerPerson,      setFeePerPerson]      = React.useState('5000');
  const [photoUrl,          setPhotoUrl]          = React.useState('');
  const [videoUrl,          setVideoUrl]          = React.useState('');

  // Picker modal state
  const [pickerTarget,  setPickerTarget]  = React.useState<'start' | 'end' | null>(null);
  const [pickerVisible, setPickerVisible] = React.useState(false);

  // ── Load existing class ───────────────────────────────────────────────────

  React.useEffect(() => {
    if (isEdit) loadClass();
  }, [params.id]);

  async function loadClass() {
    try {
      const supabase = getSupabaseClient();
      const classId = Array.isArray(params.id) ? params.id[0] : String(params.id);
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();

      if (error) throw error;

      setTitle(data.title ?? '');
      setDescription(data.description ?? '');
      setClassType(data.class_type ?? 'workshop');
      setClassCategory(data.class_category ?? 'workshop');
      setLocation(data.location ?? '');
      setStartTime(new Date(data.start_time));
      setEndTime(new Date(data.end_time));
      setMaxParticipants(String(data.max_participants ?? 10));
      setFeePerPerson(String(data.fee_per_person ?? 0));
      setPhotoUrl(
        Array.isArray(data.photo_urls) && data.photo_urls.length > 0
          ? data.photo_urls[0]
          : ''
      );
      setVideoUrl(data.video_url ?? '');
    } catch (err: any) {
      console.error('loadClass error:', err);
      Alert.alert('Error', String(err?.message ?? err));
    }
  }

  // ── Image picker ──────────────────────────────────────────────────────────

  async function handleImagePicker(source: 'gallery' | 'camera') {
    setUploadingImage(true);
    try {
      const result = await pickAndUploadImage(source, 'class-media', 'classes');
      if (result.success && result.url) {
        setPhotoUrl(result.url);
        Alert.alert('Success', 'Image uploaded successfully');
      } else {
        Alert.alert('Error', result.error ?? 'Failed to upload image');
      }
    } catch (err: any) {
      Alert.alert('Error', String(err?.message ?? 'Failed to upload image'));
    } finally {
      setUploadingImage(false);
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    const payload = {
      title:            title.trim(),
      description:      description.trim(),
      class_type:       classType,
      class_category:   classCategory,
      location:         location.trim(),
      start_time:       startTime.toISOString(),
      end_time:         endTime.toISOString(),
      max_participants: parseInt(maxParticipants, 10) || 10,
      fee_per_person:   parseInt(feePerPerson, 10)   || 0,
      photo_urls:       photoUrl.trim() ? [photoUrl.trim()] : [],
      video_url:        videoUrl.trim() || null,
      is_active:        true,
    };

    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const classId  = Array.isArray(params.id) ? params.id[0] : String(params.id ?? '');

      if (isEdit && classId) {
        const { error } = await supabase.from('classes').update(payload).eq('id', classId);
        if (error) throw new Error(error.message || error.details || JSON.stringify(error));
        Alert.alert('Success', 'Class updated successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        const { error } = await supabase.from('classes').insert(payload);
        if (error) throw new Error(error.message || error.details || JSON.stringify(error));
        Alert.alert('Success', 'Class created successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      const msg = err?.message || String(err) || 'An unexpected error occurred';
      console.error('handleSave error:', msg);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  // ── Picker handlers ───────────────────────────────────────────────────────

  function openPicker(target: 'start' | 'end') {
    setPickerTarget(target);
    setPickerVisible(true);
  }

  function handlePickerConfirm(date: Date) {
    if (pickerTarget === 'start') {
      setStartTime(date);
      // Auto-advance end time if it's not after start
      if (date >= endTime) {
        setEndTime(new Date(date.getTime() + 3_600_000));
      }
    } else {
      setEndTime(date);
    }
    setPickerVisible(false);
    setPickerTarget(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Class' : 'Add Class'}</Text>
        <Pressable
          onPress={handleSave}
          disabled={loading}
          style={({ pressed }) => [
            styles.saveButton,
            loading && { opacity: 0.5 },
            pressed && { opacity: 0.7 },
          ]}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.saveButtonText}>Save</Text>
          }
        </Pressable>
      </View>

      {/* Form */}
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Ori Tahiti Beginner Workshop"
            placeholderTextColor={colors.textLight}
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Class details, requirements, what to bring..."
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Class Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Class Type *</Text>
          <View style={styles.optionGrid}>
            {CLASS_TYPES.map(type => (
              <Pressable
                key={type.value}
                style={({ pressed }) => [
                  styles.optionButton,
                  classType === type.value && styles.optionButtonSelected,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => setClassType(type.value)}
              >
                <Text style={[
                  styles.optionButtonText,
                  classType === type.value && styles.optionButtonTextSelected,
                ]}>
                  {type.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Location */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="e.g., Studio Lorenzo Tokyo"
            placeholderTextColor={colors.textLight}
          />
        </View>

        {/* Start Time */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Start Time</Text>
          <Pressable
            onPress={() => openPicker('start')}
            style={({ pressed }) => [styles.dateField, pressed && { opacity: 0.7 }]}
          >
            <MaterialIcons name="event" size={20} color={colors.primary} />
            <Text style={styles.dateFieldText}>{formatDate(startTime)}</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.textLight} />
          </Pressable>
        </View>

        {/* End Time */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>End Time</Text>
          <Pressable
            onPress={() => openPicker('end')}
            style={({ pressed }) => [styles.dateField, pressed && { opacity: 0.7 }]}
          >
            <MaterialIcons name="event" size={20} color={colors.primary} />
            <Text style={styles.dateFieldText}>{formatDate(endTime)}</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.textLight} />
          </Pressable>
        </View>

        {/* Duration chip */}
        <View style={styles.durationChip}>
          <MaterialIcons name="schedule" size={14} color={colors.primary} />
          <Text style={styles.durationText}>
            Duration: {Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / 60000))} min
          </Text>
        </View>

        {/* Max Participants */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Max Participants</Text>
          <TextInput
            style={styles.input}
            value={maxParticipants}
            onChangeText={setMaxParticipants}
            keyboardType="number-pad"
            placeholder="10"
            placeholderTextColor={colors.textLight}
          />
        </View>

        {/* Fee per person */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Fee per Person (¥)</Text>
          <TextInput
            style={styles.input}
            value={feePerPerson}
            onChangeText={setFeePerPerson}
            keyboardType="number-pad"
            placeholder="5000"
            placeholderTextColor={colors.textLight}
          />
        </View>

        {/* Photo */}
        <View style={styles.imagePickerContainer}>
          <Text style={styles.label}>Class Photo</Text>
          {photoUrl ? (
            <>
              <Image
                source={{ uri: photoUrl }}
                style={styles.imagePreview}
                contentFit="cover"
                transition={200}
              />
              <Pressable
                onPress={() => setPhotoUrl('')}
                style={({ pressed }) => [styles.removeImageButton, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.removeImageText}>Remove Photo</Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.imagePickerButtons}>
              <Pressable
                onPress={() => handleImagePicker('gallery')}
                disabled={uploadingImage}
                style={({ pressed }) => [
                  styles.imagePickerButton,
                  uploadingImage && { opacity: 0.5 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                {uploadingImage
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <>
                      <MaterialIcons name="photo-library" size={20} color={colors.primary} />
                      <Text style={styles.imagePickerButtonText}>Gallery</Text>
                    </>
                }
              </Pressable>
              <Pressable
                onPress={() => handleImagePicker('camera')}
                disabled={uploadingImage}
                style={({ pressed }) => [
                  styles.imagePickerButton,
                  uploadingImage && { opacity: 0.5 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                {uploadingImage
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <>
                      <MaterialIcons name="photo-camera" size={20} color={colors.primary} />
                      <Text style={styles.imagePickerButtonText}>Camera</Text>
                    </>
                }
              </Pressable>
            </View>
          )}
        </View>

        {/* Video URL */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Video URL (Optional)</Text>
          <TextInput
            style={styles.input}
            value={videoUrl}
            onChangeText={setVideoUrl}
            placeholder="https://example.com/class-video.mp4"
            placeholderTextColor={colors.textLight}
            autoCapitalize="none"
          />
        </View>

      </ScrollView>

      {/* Date-Time Picker Modal */}
      <DateTimePickerModal
        visible={pickerVisible}
        value={pickerTarget === 'start' ? startTime : endTime}
        title={pickerTarget === 'start' ? 'Select Start Time' : 'Select End Time'}
        onConfirm={handlePickerConfirm}
        onCancel={() => { setPickerVisible(false); setPickerTarget(null); }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  headerTitle: { ...typography.h2, color: colors.text, flex: 1, marginLeft: spacing.md },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  scrollContent: { padding: spacing.lg, paddingBottom: 100 },
  inputGroup: { marginBottom: spacing.lg },
  label: { ...typography.body, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
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
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  // Date field
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary + '60',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 52,
  },
  dateFieldText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  durationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '12',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
  },
  durationText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  // Class type
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionButtonSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionButtonText: { fontSize: 14, fontWeight: '500', color: colors.textLight },
  optionButtonTextSelected: { color: '#fff', fontWeight: '600' },
  // Image
  imagePickerContainer: { marginBottom: spacing.lg },
  imagePickerButtons: { flexDirection: 'row', gap: spacing.md },
  imagePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  imagePickerButtonText: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.border,
  },
  removeImageButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
  },
  removeImageText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
