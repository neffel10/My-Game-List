import { put } from '@vercel/blob';

export const DEFAULT_IMAGE_MAX_BYTES = 4 * 1024 * 1024;

export function validateImageFile(file: File, maxBytes = DEFAULT_IMAGE_MAX_BYTES) {
  if (!(file instanceof File)) {
    throw new Error('Please select a valid image file.');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed.');
  }

  if (file.size > maxBytes) {
    throw new Error(`The image is too large. Please use a file smaller than ${Math.round(maxBytes / (1024 * 1024))}MB.`);
  }
}

export async function uploadImageToBlob(file: File, folder: string, maxBytes = DEFAULT_IMAGE_MAX_BYTES) {
  validateImageFile(file, maxBytes);

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    throw new Error('Missing BLOB_READ_WRITE_TOKEN. Add the real Vercel Blob token to your environment variables.');
  }

  if (token.includes('replace_with') || token.includes('your_vercel_blob_token') || token.includes('example')) {
    throw new Error('BLOB_READ_WRITE_TOKEN is still a placeholder. Add the real token from Vercel Blob in the project environment before uploading images.');
  }

  const blob = await put(`${folder}/${Date.now()}-${file.name.replace(/\s+/g, '-').toLowerCase()}`, file, {
    access: 'public',
    addRandomSuffix: true,
    contentType: file.type || 'image/jpeg',
  });

  return blob.url;
}
