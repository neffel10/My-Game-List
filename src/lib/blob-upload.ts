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
  console.log('[Blob Upload Debug]', {
    folder,
    fileName: file.name,
    type: file.type,
    size: file.size,
    hasToken: Boolean(token),
    tokenPrefix: token ? token.slice(0, 12) : null,
    nodeEnv: process.env.NODE_ENV,
  });

  if (!token) {
    throw new Error('Missing BLOB_READ_WRITE_TOKEN. Add the real Vercel Blob token to your environment variables.');
  }

  if (token.includes('replace_with') || token.includes('your_vercel_blob_token') || token.includes('example')) {
    throw new Error('BLOB_READ_WRITE_TOKEN is still a placeholder. Add the real token from Vercel Blob in the project environment before uploading images.');
  }

  try {
    const blob = await put(`${folder}/${Date.now()}-${file.name.replace(/\s+/g, '-').toLowerCase()}`, file, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.type || 'image/jpeg',
    });

    console.log('[Blob Upload Success]', { url: blob.url, pathname: blob.pathname });
    return blob.url;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('[Blob Upload Failed]', {
      folder,
      fileName: file.name,
      size: file.size,
      type: file.type,
      tokenPrefix: token.slice(0, 12),
      error: detail,
    });

    if (detail.includes('private store') || detail.includes('private access')) {
      throw new Error('The Vercel Blob store is configured as private. Set the store to Public access or create a new public Blob store and update BLOB_READ_WRITE_TOKEN.');
    }

    throw error;
  }
}

export async function uploadImageUrlToBlob(url: string, folder: string, maxBytes = DEFAULT_IMAGE_MAX_BYTES) {
  const normalizedUrl = url.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    throw new Error('IMAGE_URL_ERROR: Please provide a valid public http(s) image URL.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let response: Response;
  try {
    response = await fetch(normalizedUrl, {
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/jpeg,image/png,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; MyGameList/1.0; +https://my-game-list.vercel.app)',
      },
    });
  } catch (error) {
    const detail = error instanceof Error && error.name === 'AbortError'
      ? 'The image server took too long to respond.'
      : 'The image server could not be reached.';
    throw new Error(`IMAGE_URL_ERROR: ${detail}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`IMAGE_URL_ERROR: The image server rejected the download (${response.status}). Try a direct image URL from a host that allows public downloads.`);
  }

  const contentType = response.headers.get('content-type')?.split(';')[0].trim() ?? '';
  if (!contentType.startsWith('image/')) {
    throw new Error('IMAGE_URL_ERROR: The provided URL does not point to a directly downloadable image.');
  }

  const contentLength = Number(response.headers.get('content-length') ?? 0);
  if (contentLength > maxBytes) {
    throw new Error(`IMAGE_URL_ERROR: The image is too large. Please use an image smaller than ${Math.round(maxBytes / (1024 * 1024))}MB.`);
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > maxBytes) {
    throw new Error(`IMAGE_URL_ERROR: The image is too large. Please use an image smaller than ${Math.round(maxBytes / (1024 * 1024))}MB.`);
  }

  const extension = contentType.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'jpg';
  const file = new File([buffer], `remote-banner.${extension}`, { type: contentType });
  return uploadImageToBlob(file, folder, maxBytes);
}
