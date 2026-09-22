/**
 * Putting a picture somewhere the core can reference it.
 *
 * Three steps, all of them onebank-ui's (`libs/utils/upload.ts`): shrink the
 * file, ask `USER/getuploadurlr2` for a one-shot signed URL, PUT the bytes at
 * it. The public URL is then assembled from the filename — the core never
 * returns it, which is why onebank-ui hardcodes the base and why this reads it
 * from `env.uploadPublicPath` instead.
 *
 * The PUT is a plain `fetch` to object storage, deliberately outside
 * `src/lib/api`: it carries no session and speaks no OneBank envelope.
 */

import imageCompression from 'browser-image-compression'
import { getUploadUrl } from '../api/commands'
import { env } from '../env'

export interface UploadResult {
  /** Public URL of the uploaded picture. Absent when `error` is set. */
  url?: string
  filename?: string
  /** Human-readable failure, already localised by the caller's `t()` if needed. */
  error?: string
}

/** Shrinks a picture to something worth uploading. Same limits as mobile. */
export type Compressor = (file: File) => Promise<Blob>

const defaultCompressor: Compressor = (file) =>
  imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1200,
    preserveExif: true,
    initialQuality: 0.6,
  })

/**
 * Uploads one picture and returns where it now lives.
 *
 * `compress` is injectable because the real compressor needs a canvas, which
 * jsdom does not have — tests pass the file through untouched.
 */
export async function uploadPicture(file: File, compress: Compressor = defaultCompressor): Promise<UploadResult> {
  let body: Blob
  try {
    body = await compress(file)
  } catch (e) {
    return { error: (e as Error)?.message || 'Could not read that image' }
  }

  const response = await getUploadUrl()
  if (response?.result !== 0 || !response.signedurl || !response.filename) {
    return { error: response?.message || 'Could not get an upload URL' }
  }

  try {
    const put = await fetch(response.signedurl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
        // Uploaded names are unique, so the object is safe to cache forever.
        'Cache-Control': 'public, max-age=31536000',
      },
      body,
    })
    if (!put.ok) return { error: `Upload failed with ${put.status}` }
  } catch (e) {
    return { error: (e as Error)?.message || 'Upload failed' }
  }

  return { url: env.uploadPublicPath + response.filename, filename: response.filename }
}
