/** Avatar limits tuned for Supabase free tier (keep storage tiny). */
export const AVATAR_MAX_KB = 256;
export const AVATAR_MAX_BYTES = AVATAR_MAX_KB * 1024;
export const AVATAR_MAX_DIMENSION = 256;
/** Large phone photos are OK — we compress before upload. */
export const AVATAR_MAX_INPUT_BYTES = 12 * 1024 * 1024;

export interface CompressedImage {
  blob: Blob;
  contentType: string;
  sizeKb: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

/**
 * Resize + compress to WebP/JPEG, targeting under AVATAR_MAX_BYTES.
 */
export async function compressAvatarImage(file: File): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (JPEG, PNG, or WebP).');
  }
  if (file.size > AVATAR_MAX_INPUT_BYTES) {
    throw new Error('Image is too large. Please choose one under 12 MB.');
  }

  const img = await loadImage(file);
  const scale = Math.min(1, AVATAR_MAX_DIMENSION / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process image.');

  ctx.drawImage(img, 0, 0, width, height);

  const tryFormats: { type: string; ext: string }[] = [
    { type: 'image/webp', ext: 'webp' },
    { type: 'image/jpeg', ext: 'jpg' },
  ];

  for (const { type } of tryFormats) {
    for (let quality = 0.82; quality >= 0.45; quality -= 0.08) {
      const blob = await canvasToBlob(canvas, type, quality);
      if (!blob) continue;
      if (blob.size <= AVATAR_MAX_BYTES) {
        return {
          blob,
          contentType: type,
          sizeKb: Math.round(blob.size / 1024),
        };
      }
    }
  }

  // Last resort: smallest JPEG
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.4);
  if (!blob) throw new Error('Could not compress image.');
  if (blob.size > AVATAR_MAX_BYTES) {
    throw new Error(`Could not compress below ${AVATAR_MAX_KB} KB. Try a simpler photo.`);
  }

  return {
    blob,
    contentType: 'image/jpeg',
    sizeKb: Math.round(blob.size / 1024),
  };
}
