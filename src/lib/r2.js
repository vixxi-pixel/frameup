/**
 * R2 storage client — talks to our Vercel API routes
 * which handle the actual AWS S3 signing server-side.
 * This means no credentials ever touch the browser.
 */

/**
 * Upload a File object to R2 via the /api/r2-upload proxy.
 */
export async function uploadToR2(file, storagePath) {
  const res = await fetch('/api/r2-upload', {
    method: 'POST',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'x-r2-meta': JSON.stringify({ path: storagePath, contentType: file.type }),
    },
    body: file,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Upload failed: ${err.error || res.statusText}`)
  }

  return { path: storagePath }
}

/**
 * Get a presigned GET URL for a stored object.
 * Valid for 1 hour by default.
 */
export async function getR2SignedUrl(storagePath, expiresIn = 3600) {
  const res = await fetch(`/api/r2-signed-url?path=${encodeURIComponent(storagePath)}&expires=${expiresIn}`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Signed URL failed: ${err.error || res.statusText}`)
  }

  const { url } = await res.json()
  return url
}

/**
 * Get presigned GET URLs for multiple paths in a single API call.
 * Returns a map of { storagePath: signedUrl }
 */
export async function getBatchR2SignedUrls(storagePaths) {
  if (!storagePaths.length) return {}

  const res = await fetch('/api/r2-signed-urls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths: storagePaths }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Batch signed URLs failed: ${err.error || res.statusText}`)
  }

  const { urls } = await res.json()
  return urls
}
export async function deleteFromR2(storagePath) {
  const res = await fetch(`/api/r2-delete?path=${encodeURIComponent(storagePath)}`, {
    method: 'DELETE',
  })

  if (!res.ok && res.status !== 404) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Delete failed: ${err.error || res.statusText}`)
  }
}
