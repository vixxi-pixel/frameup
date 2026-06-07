import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
})

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  const { path } = req.query
  if (!path) return res.status(400).json({ error: 'Missing path' })

  try {
    await r2.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: path,
    }))
    res.status(200).json({ success: true })
  } catch (err) {
    console.error('R2 delete error:', err)
    res.status(500).json({ error: err.message })
  }
}
