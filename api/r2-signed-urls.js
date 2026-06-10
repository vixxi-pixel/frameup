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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { paths } = req.body
    if (!paths || !Array.isArray(paths)) return res.status(400).json({ error: 'Missing paths array' })

    // Generate all signed URLs in parallel
    const entries = await Promise.all(
      paths.map(async path => {
        try {
          const url = await getSignedUrl(
            r2,
            new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: path }),
            { expiresIn: 3600 }
          )
          return [path, url]
        } catch (e) {
          console.error('Failed to sign', path, e)
          return [path, null]
        }
      })
    )

    const urls = Object.fromEntries(entries.filter(([, url]) => url !== null))

    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=60')
    res.status(200).json({ urls })
  } catch (err) {
    console.error('Batch signed URL error:', err)
    res.status(500).json({ error: err.message })
  }
}
