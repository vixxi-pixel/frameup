import { AwsClient } from 'aws4fetch'

const R2_ACCOUNT_ID = import.meta.env.VITE_R2_ACCOUNT_ID
const R2_ACCESS_KEY = import.meta.env.VITE_R2_ACCESS_KEY
const R2_SECRET_KEY = import.meta.env.VITE_R2_SECRET_KEY
const R2_BUCKET     = import.meta.env.VITE_R2_BUCKET
const R2_ENDPOINT   = import.meta.env.VITE_R2_ENDPOINT

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
  console.warn('R2 env vars missing — storage uploads will fail.')
}

const r2 = new AwsClient({
  accessKeyId:     R2_ACCESS_KEY,
  secretAccessKey: R2_SECRET_KEY,
  service: 's3',
  region: 'auto',
})

function bucketUrl(path = '') {
  return `${R2_ENDPOINT}/${R2_BUCKET}/${path}`
}

/**
 * Upload a File object to R2.
 * Returns { path, publicUrl } on success, throws on failure.
 */
export async function uploadToR2(file, storagePath) {
  const url = bucketUrl(storagePath)
  const response = await r2.fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`R2 upload failed: ${response.status} ${text}`)
  }
  return { path: storagePath }
}

/**
 * Generate a presigned GET URL valid for `expiresIn` seconds (default 1 hour).
 * R2 presigned URLs use S3-style query-string signing.
 */
export async function getR2SignedUrl(storagePath, expiresIn = 3600) {
  const url = new URL(bucketUrl(storagePath))
  url.searchParams.set('X-Amz-Expires', String(expiresIn))

  // aws4fetch signs query-string presigned URLs when you pass presign: true
  const signed = await r2.sign(
    new Request(url.toString(), { method: 'GET' }),
    { aws: { signQuery: true } }
  )
  return signed.url
}

/**
 * Delete an object from R2.
 */
export async function deleteFromR2(storagePath) {
  const url = bucketUrl(storagePath)
  const response = await r2.fetch(url, { method: 'DELETE' })
  if (!response.ok && response.status !== 404) {
    const text = await response.text()
    throw new Error(`R2 delete failed: ${response.status} ${text}`)
  }
}
