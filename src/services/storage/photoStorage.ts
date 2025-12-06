import { getSupabaseClient } from '../database/supabaseClient';

/**
 * Upload a photo to Supabase Storage
 * @param file - The file to upload
 * @param memberId - The member ID (used for filename)
 * @returns Public URL of the uploaded photo, or null if upload fails
 */
export async function uploadPhotoToStorage(
  file: File,
  memberId: string
): Promise<string | null> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn('Supabase not configured, cannot upload photo');
    return null;
  }

  try {
    // Generate unique filename: memberId_timestamp.jpg
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `${memberId}_${timestamp}.${extension}`;

    console.log(`Uploading photo to Supabase Storage: ${fileName}`);

    // Upload to storage bucket
    const { error } = await supabase.storage
      .from('family-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading to Supabase Storage:', error);
      return null;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('family-photos')
      .getPublicUrl(fileName);

    console.log('Photo uploaded successfully:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;

  } catch (error) {
    console.error('Exception during photo upload:', error);
    return null;
  }
}

/**
 * Delete a photo from Supabase Storage
 * @param imageUrl - The public URL of the photo to delete
 * @returns True if deletion was successful
 */
export async function deletePhotoFromStorage(imageUrl: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn('Supabase not configured, cannot delete photo');
    return false;
  }

  try {
    // Extract filename from URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/family-photos/FILENAME
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];

    if (!fileName) {
      console.error('Could not extract filename from URL:', imageUrl);
      return false;
    }

    console.log(`Deleting photo from Supabase Storage: ${fileName}`);

    const { error } = await supabase.storage
      .from('family-photos')
      .remove([fileName]);

    if (error) {
      console.error('Error deleting from Supabase Storage:', error);
      return false;
    }

    console.log('Photo deleted successfully');
    return true;

  } catch (error) {
    console.error('Exception during photo deletion:', error);
    return false;
  }
}

/**
 * Update member's image_path in the database
 * @param memberId - The member ID (numeric, e.g., 1, 2, 3)
 * @param imageUrl - The new image URL
 * @returns True if update was successful
 */
export async function updateMemberImagePath(
  memberId: number,
  imageUrl: string | null
): Promise<boolean> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn('Supabase not configured, cannot update image path');
    return false;
  }

  try {
    console.log(`Updating image_path for member ${memberId} to:`, imageUrl);

    const { error } = await supabase
      .from('members')
      .update({ image_path: imageUrl })
      .eq('id', memberId);

    if (error) {
      console.error('Error updating image_path in database:', error);
      return false;
    }

    console.log('Image path updated successfully in database');
    return true;

  } catch (error) {
    console.error('Exception during database update:', error);
    return false;
  }
}
