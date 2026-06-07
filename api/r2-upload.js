import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
})

export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const buffer = Buffer.concat(chunks)

    const { path, contentType } = JSON.parse(req.headers['x-r2-meta'] || '{}')
    if (!path) return res.status(400).json({ error: 'Missing path' })

    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: path,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream',
    }))

    res.status(200).json({ success: true, path })
  } catch (err) {
    console.error('R2 upload error:', err)
    res.status(500).json({ error: err.message })
  }
}
