import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';

import { getSupabaseClient } from '@/template';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { pickAndUploadImage } from '@/services/imageUploadService';

export default function AdminAddMusicScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const params  = useLocalSearchParams();
  const isEdit  = !!params.id;

  const [loading,        setLoading]        = React.useState(false);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [title,          setTitle]          = React.useState('');
  const [artist,         setArtist]         = React.useState('Lorenzo');
  const [description,    setDescription]    = React.useState('');
  const [productType,    setProductType]    = React.useState('album');
  const [price,          setPrice]          = React.useState('3000');
  const [trackCount,     setTrackCount]     = React.useState('10');
  const [releaseDate,    setReleaseDate]    = React.useState('');
  const [coverImageUrl,  setCoverImageUrl]  = React.useState('');
  const [previewAudioUrl,setPreviewAudioUrl]= React.useState('');

  React.useEffect(() => {
    if (isEdit) loadProduct();
  }, [params.id]);

  async function loadProduct() {
    try {
      const supabase = getSupabaseClient();
      const productId = Array.isArray(params.id) ? params.id[0] : String(params.id);
      const { data, error } = await supabase
        .from('music_products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;

      setTitle(data.title ?? '');
      setArtist(data.artist ?? 'Lorenzo');
      setDescription(data.description ?? '');
      setProductType(data.product_type ?? 'album');
      setPrice(String(data.price ?? 3000));
      setTrackCount(String(data.track_count ?? ''));
      setReleaseDate(data.release_date ?? '');
      setCoverImageUrl(data.cover_image_url ?? '');
      setPreviewAudioUrl(data.preview_audio_url ?? '');
    } catch (err: any) {
      console.error('loadProduct error:', err);
      Alert.alert('Error', String(err?.message ?? err));
    }
  }

  async function handleImagePicker(source: 'gallery' | 'camera') {
    setUploadingImage(true);
    try {
      const result = await pickAndUploadImage(source, 'class-media', 'music');
      if (result.success && result.url) {
        setCoverImageUrl(result.url);
        Alert.alert('Success', 'Cover image uploaded');
      } else {
        Alert.alert('Error', result.error ?? 'Failed to upload image');
      }
    } catch (err: any) {
      Alert.alert('Error', String(err?.message ?? 'Upload failed'));
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    const parsedPrice = parseInt(price, 10);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('Error', 'Enter a valid price');
      return;
    }

    setLoading(true);
    try {
      const supabase  = getSupabaseClient();
      const productId = Array.isArray(params.id) ? params.id[0] : String(params.id ?? '');

      const payload = {
        title:             title.trim(),
        artist:            artist.trim() || 'Lorenzo',
        description:       description.trim(),
        product_type:      productType.trim() || 'album',
        price:             parsedPrice,
        track_count:       trackCount ? parseInt(trackCount, 10) : null,
        release_date:      releaseDate.trim() || null,
        cover_image_url:   coverImageUrl.trim() || null,
        preview_audio_url: previewAudioUrl.trim() || null,
        is_active:         true,
      };

      if (isEdit && productId) {
        const { error } = await supabase
          .from('music_products')
          .update(payload)
          .eq('id', productId);
        if (error) throw new Error(error.message || error.details || JSON.stringify(error));
        Alert.alert('Success', 'Music product updated', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        const { error } = await supabase
          .from('music_products')
          .insert(payload);
        if (error) throw new Error(error.message || error.details || JSON.stringify(error));
        Alert.alert('Success', 'Music product created', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      const msg = err?.message || String(err) || 'Unexpected error';
      console.error('handleSave music error:', msg);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

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
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Music' : 'Add Music'}</Text>
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
            : <Text style={styles.saveButtonText}>Save</Text>}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Tahitian Rhythms Album"
            placeholderTextColor={colors.textLight}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Artist</Text>
          <TextInput
            style={styles.input}
            value={artist}
            onChangeText={setArtist}
            placeholder="Lorenzo"
            placeholderTextColor={colors.textLight}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Album description, genre, style..."
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Product Type</Text>
          <TextInput
            style={styles.input}
            value={productType}
            onChangeText={setProductType}
            placeholder="e.g., album, single, EP"
            placeholderTextColor={colors.textLight}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Price (¥)</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            keyboardType="number-pad"
            placeholder="3000"
            placeholderTextColor={colors.textLight}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Track Count</Text>
          <TextInput
            style={styles.input}
            value={trackCount}
            onChangeText={setTrackCount}
            keyboardType="number-pad"
            placeholder="10"
            placeholderTextColor={colors.textLight}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Release Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={releaseDate}
            onChangeText={setReleaseDate}
            placeholder="2024-03-15"
            placeholderTextColor={colors.textLight}
          />
        </View>

        {/* Cover Image */}
        <View style={styles.imagePickerContainer}>
          <Text style={styles.label}>Cover Image</Text>
          {coverImageUrl ? (
            <>
              <Image
                source={{ uri: coverImageUrl }}
                style={styles.imagePreview}
                contentFit="cover"
                transition={200}
              />
              <Pressable
                onPress={() => setCoverImageUrl('')}
                style={({ pressed }) => [styles.removeImageButton, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.removeImageText}>Remove Cover</Text>
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
                  : <><MaterialIcons name="photo-library" size={20} color={colors.primary} /><Text style={styles.imagePickerButtonText}>Gallery</Text></>}
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
                  : <><MaterialIcons name="photo-camera" size={20} color={colors.primary} /><Text style={styles.imagePickerButtonText}>Camera</Text></>}
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Preview Audio URL</Text>
          <TextInput
            style={styles.input}
            value={previewAudioUrl}
            onChangeText={setPreviewAudioUrl}
            placeholder="https://example.com/preview.mp3"
            placeholderTextColor={colors.textLight}
            autoCapitalize="none"
          />
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: colors.background },
  header:               { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton:           { padding: spacing.md, minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle:          { ...typography.h2, color: colors.text, flex: 1, marginLeft: spacing.md },
  saveButton:           { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.md, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  saveButtonText:       { color: '#fff', fontWeight: '600', fontSize: 16 },
  scrollContent:        { padding: spacing.lg, paddingBottom: 100 },
  inputGroup:           { marginBottom: spacing.lg },
  label:                { ...typography.body, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  input:                { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.md, fontSize: 16, color: colors.text, minHeight: 48 },
  textArea:             { minHeight: 100, textAlignVertical: 'top' },
  imagePickerContainer: { marginBottom: spacing.lg },
  imagePickerButtons:   { flexDirection: 'row', gap: spacing.md },
  imagePickerButton:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: spacing.md, minHeight: 48 },
  imagePickerButtonText:{ color: colors.primary, fontWeight: '600', fontSize: 15 },
  imagePreview:         { width: '100%', height: 200, borderRadius: borderRadius.md, marginBottom: spacing.sm, backgroundColor: colors.border },
  removeImageButton:    { backgroundColor: colors.error, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center' },
  removeImageText:      { color: '#fff', fontWeight: '600', fontSize: 14 },
});
