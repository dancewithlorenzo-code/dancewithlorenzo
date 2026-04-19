import * as ImagePicker from 'expo-image-picker';
import { getSupabaseClient } from '@/template';

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/** Request camera and media library permissions */
export async function requestImagePermissions(): Promise<boolean> {
  try {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaPermission  = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return cameraPermission.granted && mediaPermission.granted;
  } catch (error) {
    console.error('Permission request error:', error);
    return false;
  }
}

/** Pick an image from the gallery */
export async function pickImageFromGallery(): Promise<ImagePicker.ImagePickerAsset | null> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0];
    }
    return null;
  } catch (error) {
    console.error('Gallery picker error:', error);
    return null;
  }
}

/** Take a photo with the camera */
export async function takePhotoWithCamera(): Promise<ImagePicker.ImagePickerAsset | null> {
  try {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0];
    }
    return null;
  } catch (error) {
    console.error('Camera error:', error);
    return null;
  }
}

/**
 * Upload image to Supabase Storage.
 *
 * Uses React Native's native file object `{ uri, type, name }` passed directly
 * to the Supabase storage client. This is the ONLY approach that:
 *   - Works on Hermes (no atob, no blob.arrayBuffer, no FileSystem needed)
 *   - Is officially supported by @supabase/supabase-js in React Native
 *   - Does not require any additional native modules
 */
export async function uploadImageToStorage(
  imageUri: string,
  bucket: string = 'class-media',
  folder: string = 'uploads'
): Promise<ImageUploadResult> {
  try {
    const supabase = getSupabaseClient();

    // Derive filename and MIME type from the URI
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const uriLower  = imageUri.toLowerCase();

    let fileExt  = 'jpg';
    let mimeType = 'image/jpeg';
    if (uriLower.includes('.png'))  { fileExt = 'png';  mimeType = 'image/png'; }
    else if (uriLower.includes('.gif'))  { fileExt = 'gif';  mimeType = 'image/gif'; }
    else if (uriLower.includes('.webp')) { fileExt = 'webp'; mimeType = 'image/webp'; }

    const fileName = `${folder}/${timestamp}-${randomStr}.${fileExt}`;

    // React Native file object — Supabase JS client handles this natively.
    // DO NOT use fetch().blob(), blob.arrayBuffer(), or atob() — none exist on Hermes.
    const fileObject = {
      uri:  imageUri,
      type: mimeType,
      name: fileName,
    } as any;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileObject, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return { success: false, error: error.message };
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return { success: true, url: publicUrl };
  } catch (err: any) {
    console.error('uploadImageToStorage error:', err);
    return { success: false, error: String(err?.message ?? err) };
  }
}

/** Complete workflow: pick image then upload to storage */
export async function pickAndUploadImage(
  source: 'gallery' | 'camera',
  bucket: string = 'class-media',
  folder: string = 'uploads'
): Promise<ImageUploadResult> {
  try {
    const hasPermission = await requestImagePermissions();
    if (!hasPermission) {
      return { success: false, error: 'Camera or media library permission denied' };
    }

    const image = source === 'gallery'
      ? await pickImageFromGallery()
      : await takePhotoWithCamera();

    if (!image) {
      return { success: false, error: 'No image selected' };
    }

    return await uploadImageToStorage(image.uri, bucket, folder);
  } catch (err: any) {
    console.error('pickAndUploadImage error:', err);
    return { success: false, error: String(err?.message ?? 'Failed to pick and upload image') };
  }
}

/** Delete image from Supabase Storage */
export async function deleteImageFromStorage(
  imageUrl: string,
  bucket: string = 'class-media'
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const urlParts = imageUrl.split(`/storage/v1/object/public/${bucket}/`);
    if (urlParts.length !== 2) {
      console.error('Invalid image URL format');
      return false;
    }
    const filePath = urlParts[1];
    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    if (error) {
      console.error('Delete error:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('deleteImageFromStorage error:', error);
    return false;
  }
}
