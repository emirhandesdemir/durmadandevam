'use client';

/**
 * Resizes and compresses an image client-side to improve upload speed.
 *
 * @param dataUrl The data URI of the image to process.
 * @param maxWidth The maximum width for the output image. Defaults to 1920px.
 * @param quality The quality of the output JPEG image (0 to 1). Defaults to 0.85.
 * @returns A promise that resolves with a Blob of the new, compressed image.
 */
export function compressImage(
  dataUrl: string,
  maxWidth: number = 1920,
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Canvas context could not be created.'));
      }

      let { width, height } = img;

      // Calculate the new dimensions while maintaining aspect ratio
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw the image onto the canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Get the Blob of the new, compressed image
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas to Blob conversion failed.'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = (err) => {
      reject(new Error('Image could not be loaded.'));
    };

    img.src = dataUrl;
  });
}
