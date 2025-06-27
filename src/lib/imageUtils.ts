'use client';

/**
 * Resizes and compresses an image client-side from a data URL.
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
        return reject(new Error('Canvas context oluşturulamadı.'));
      }

      let { width, height } = img;

      // En-boy oranını koruyarak yeniden boyutlandır
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Resmi canvas'a çiz
      ctx.drawImage(img, 0, 0, width, height);

      // Yeni, sıkıştırılmış resmin Blob'unu al
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas -> Blob dönüşümü başarısız oldu.'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Resim yüklenemedi. Dosya bozuk olabilir.'));
    };

    img.src = dataUrl;
  });
}
