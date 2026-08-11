import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { path, contentType } = req.body
    if (!path) return res.status(400).json({ error: 'Missing path' })

    const url = await getSignedUrl(
      r2,
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: path,
        ContentType: contentType || 'application/octet-stream',
      }),
      { expiresIn: 3600 }
    )

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.status(200).json({ url })
  } catch (err) {
    console.error('Presign error:', err)
    res.status(500).json({ error: err.message })
  }
}
