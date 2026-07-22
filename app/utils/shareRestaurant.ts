import { googleMapsSearchUrl, isHttpUrl } from './restaurantLinks'

export async function shareRestaurant(input: {
  name: string
  cuisine: string
  priceLabel: string
  suggestedDish: string
  location: string
  shareTitle: string
  shareTextTemplate: string
  shareUrl?: string | null
}): Promise<'shared' | 'copied'> {
  const url =
    (isHttpUrl(input.shareUrl) ? input.shareUrl.trim() : null)
    || googleMapsSearchUrl(input.name, input.location)

  const text = input.shareTextTemplate
    .replace('{name}', input.name)
    .replace('{dish}', input.suggestedDish)
    .replace('{cuisine}', input.cuisine)
    .replace('{price}', input.priceLabel)
    .replace('{url}', url)

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: input.shareTitle, text, url })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
    }
  }

  await navigator.clipboard.writeText(text)
  return 'copied'
}
