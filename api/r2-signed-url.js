import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
})

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { path, expires = '3600' } = req.query
  if (!path) return res.status(400).json({ error: 'Missing path' })

  try {
    const url = await getSignedUrl(
      r2,
      new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: path }),
      { expiresIn: parseInt(expires) }
    )
    res.status(200).json({ url })
  } catch (err) {
    console.error('R2 signed URL error:', err)
    res.status(500).json({ error: err.message })
  }
}
