import { isHttpUrl } from '../../shared/url'

export default defineEventHandler(async (event) => {
  const raw = String(getQuery(event).url || '')
  if (!isHttpUrl(raw)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid image URL' })
  }

  const res = await fetch(raw, {
    headers: {
      Accept: 'image/*',
      'User-Agent': 'What2Eat/1.0',
    },
  })

  if (!res.ok || !res.body) {
    throw createError({ statusCode: 502, statusMessage: 'Image fetch failed' })
  }

  const type = res.headers.get('content-type') || ''
  if (!type.startsWith('image/')) {
    throw createError({ statusCode: 400, statusMessage: 'URL is not an image' })
  }

  setHeader(event, 'Content-Type', type)
  setHeader(event, 'Cache-Control', 'public, max-age=86400, immutable')
  return res.body
})
