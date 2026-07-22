export function isHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function proxiedImageUrl(url: string | null | undefined): string | null {
  if (!isHttpUrl(url)) return null
  return `/api/image?url=${encodeURIComponent(url.trim())}`
}

function placeQuery(name: string, location: string) {
  return [name, location].filter(Boolean).join(' ')
}

export function googleMapsSearchUrl(name: string, location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeQuery(name, location))}`
}

export function openRiceSearchUrl(name: string, location: string) {
  return `https://www.openrice.com/zh/hongkong/restaurants?query=${encodeURIComponent(placeQuery(name, location))}`
}

type LinkLabels = { maps: string; openRice: string; website: string }

export function buildRestaurantLinks(
  item: { mapsUrl?: string | null; openRiceUrl?: string | null; websiteUrl?: string | null },
  name: string,
  location: string,
  locale: string,
  labels: LinkLabels,
) {
  const links = [{
    href: isHttpUrl(item.mapsUrl) ? item.mapsUrl : googleMapsSearchUrl(name, location),
    label: labels.maps,
  }]

  if (isHttpUrl(item.openRiceUrl)) {
    links.push({ href: item.openRiceUrl, label: labels.openRice })
  } else if (locale.startsWith('zh')) {
    links.push({ href: openRiceSearchUrl(name, location), label: labels.openRice })
  }

  if (isHttpUrl(item.websiteUrl)) {
    links.push({ href: item.websiteUrl, label: labels.website })
  }

  return links
}
