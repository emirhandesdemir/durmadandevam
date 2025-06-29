'use server';

import { v2 as cloudinary } from 'cloudinary';

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
}

const configureCloudinary = () => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
    if (!cloudName || !apiKey || !apiSecret) {
      console.error("Cloudinary environment variables are not set. Please check your .env file.");
      throw new Error("Sunucu yapılandırma hatası: Resim hizmeti ayarları eksik.");
    }
    
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
};


/**
 * Uploads an image to Cloudinary.
 * @param imageDataUri The base64 data URI of the image to upload.
 * @param folder The folder in Cloudinary to upload the image to.
 * @returns An object containing the public_id and secure_url of the uploaded image.
 */
export async function uploadImage(imageDataUri: string, folder: string): Promise<CloudinaryUploadResult> {
  configureCloudinary();
  try {
    const result = await cloudinary.uploader.upload(imageDataUri, {
      folder: `hiwewalk/${folder}`,
      // Add a transformation to optimize the image
      transformation: [
        { width: 1080, height: 1080, crop: 'limit', quality: 'auto' }
      ]
    });
    return { public_id: result.public_id, secure_url: result.secure_url };
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    const message = error.message || 'Bilinmeyen bir yükleme hatası oluştu.';
    throw new Error(`Resim yüklenemedi: ${message}`);
  }
}

/**
 * Deletes an image from Cloudinary.
 * @param publicId The public ID of the image to delete.
 */
export async function deleteImage(publicId: string): Promise<void> {
    if (!publicId) return;
    configureCloudinary();
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        // We don't throw here because we don't want to block the main action (e.g., profile update) if deletion fails
    }
}
