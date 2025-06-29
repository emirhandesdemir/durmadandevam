'use server';

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
}

/**
 * Uploads an image to Cloudinary.
 * @param imageDataUri The base64 data URI of the image to upload.
 * @param folder The folder in Cloudinary to upload the image to.
 * @returns An object containing the public_id and secure_url of the uploaded image.
 */
export async function uploadImage(imageDataUri: string, folder: string): Promise<CloudinaryUploadResult> {
  try {
    const result = await cloudinary.uploader.upload(imageDataUri, {
      folder: `hiwewalk/${folder}`,
    });
    return { public_id: result.public_id, secure_url: result.secure_url };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Resim yüklenirken bir hata oluştu.');
  }
}

/**
 * Deletes an image from Cloudinary.
 * @param publicId The public ID of the image to delete.
 */
export async function deleteImage(publicId: string): Promise<void> {
    if (!publicId) return;
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        // We don't throw here because we don't want to block the main action (e.g., profile update) if deletion fails
    }
}
