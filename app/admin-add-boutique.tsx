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

export default function AdminAddBoutiqueScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const params  = useLocalSearchParams();
  const isEdit  = !!params.id;

  const [loading,        setLoading]        = React.useState(false);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [name,           setName]           = React.useState('');
  const [description,    setDescription]    = React.useState('');
  const [category,       setCategory]       = React.useState('accessories');
  const [price,          setPrice]          = React.useState('5000');
  const [stockQuantity,  setStockQuantity]  = React.useState('10');
  const [imageUrl,       setImageUrl]       = React.useState('');
  const [sizes,          setSizes]          = React.useState('');

  React.useEffect(() => {
    if (isEdit) loadProduct();
  }, [params.id]);

  async function loadProduct() {
    try {
      const supabase  = getSupabaseClient();
      const productId = Array.isArray(params.id) ? params.id[0] : String(params.id);
      const { data, error } = await supabase
        .from('boutique_products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;

      setName(data.name ?? '');
      setDescription(data.description ?? '');
      setCategory(data.category ?? 'accessories');
      setPrice(String(data.price ?? 5000));
      setStockQuantity(String(data.stock_quantity ?? 0));
      setImageUrl(data.image_url ?? '');
      setSizes(data.sizes ? JSON.stringify(data.sizes) : '');
    } catch (err: any) {
      console.error('loadProduct error:', err);
      Alert.alert('Error', String(err?.message ?? err));
    }
  }

  async function handleImagePicker(source: 'gallery' | 'camera') {
    setUploadingImage(true);
    try {
      const result = await pickAndUploadImage(source, 'class-media', 'boutique');
      if (result.success && result.url) {
        setImageUrl(result.url);
        Alert.alert('Success', 'Product image uploaded');
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
    if (!name.trim()) {
      Alert.alert('Error', 'Product name is required');
      return;
    }

    const parsedPrice = parseInt(price, 10);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      Alert.alert('Error', 'Enter a valid price');
      return;
    }

    // Validate sizes JSON if provided
    let sizesData: any = null;
    if (sizes.trim()) {
      try {
        sizesData = JSON.parse(sizes.trim());
      } catch {
        Alert.alert('Error', 'Invalid sizes format. Use JSON like ["S","M","L"]');
        return;
      }
    }

    setLoading(true);
    try {
      const supabase  = getSupabaseClient();
      const productId = Array.isArray(params.id) ? params.id[0] : String(params.id ?? '');

      const payload = {
        name:           name.trim(),
        description:    description.trim(),
        category:       category.trim() || 'accessories',
        price:          parsedPrice,
        stock_quantity: parseInt(stockQuantity, 10) || 0,
        image_url:      imageUrl.trim() || null,
        sizes:          sizesData,
        is_active:      true,
      };

      if (isEdit && productId) {
        const { error } = await supabase
          .from('boutique_products')
          .update(payload)
          .eq('id', productId);
        if (error) throw new Error(error.message || error.details || JSON.stringify(error));
        Alert.alert('Success', 'Product updated', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        const { error } = await supabase
          .from('boutique_products')
          .insert(payload);
        if (error) throw new Error(error.message || error.details || JSON.stringify(error));
        Alert.alert('Success', 'Product created', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      const msg = err?.message || String(err) || 'Unexpected error';
      console.error('handleSave boutique error:', msg);
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
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Product' : 'Add Product'}</Text>
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
          <Text style={styles.label}>Product Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Tahitian Dance Skirt"
            placeholderTextColor={colors.textLight}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Product details, materials, care instructions..."
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <TextInput
            style={styles.input}
            value={category}
            onChangeText={setCategory}
            placeholder="e.g., accessories, costumes, shoes"
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
            placeholder="5000"
            placeholderTextColor={colors.textLight}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Stock Quantity</Text>
          <TextInput
            style={styles.input}
            value={stockQuantity}
            onChangeText={setStockQuantity}
            keyboardType="number-pad"
            placeholder="10"
            placeholderTextColor={colors.textLight}
          />
        </View>

        {/* Product Image */}
        <View style={styles.imagePickerContainer}>
          <Text style={styles.label}>Product Image</Text>
          {imageUrl ? (
            <>
              <Image
                source={{ uri: imageUrl }}
                style={styles.imagePreview}
                contentFit="cover"
                transition={200}
              />
              <Pressable
                onPress={() => setImageUrl('')}
                style={({ pressed }) => [styles.removeImageButton, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.removeImageText}>Remove Image</Text>
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
          <Text style={styles.label}>Sizes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={sizes}
            onChangeText={setSizes}
            placeholder={'["S","M","L","XL"]'}
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={3}
            autoCapitalize="none"
          />
          <Text style={styles.hint}>JSON array. Leave empty if no size variants.</Text>
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
  hint:                 { fontSize: 12, color: colors.textLight, marginTop: spacing.xs },
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
