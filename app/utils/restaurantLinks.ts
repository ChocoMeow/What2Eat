export function isHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function googleMapsSearchUrl(name: string, location: string): string {
  const query = [name, location].filter(Boolean).join(' ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

/** Deterministic seed from a string for stable image URLs */
function seedFrom(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  return hash % 1_000_000
}

/** Food-style image from a visual prompt (Pollinations; no API key). */
export function foodImageUrl(imagePrompt: string, seedKey: string): string {
  const prompt = [
    imagePrompt.trim() || 'appetizing restaurant food photography',
    'professional food photography',
    'natural lighting',
    'no text',
    'no watermark',
  ].join(', ')

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=960&height=640&nologo=true&seed=${seedFrom(seedKey)}`
}
