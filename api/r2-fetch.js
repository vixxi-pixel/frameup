import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

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

  const { path } = req.query
  if (!path) return res.status(400).json({ error: 'Missing path' })

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: path,
    })
    const { Body, ContentType, ContentLength } = await r2.send(command)

    res.setHeader('Content-Type', ContentType || 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    if (ContentLength) res.setHeader('Content-Length', ContentLength)

    // Stream the body directly to the response
    Body.pipe(res)
  } catch (err) {
    console.error('R2 fetch error:', err)
    res.status(500).json({ error: err.message })
  }
}
