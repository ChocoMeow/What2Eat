type PlaceSuggestion = {
  id: string
  label: string
  name: string
}

type NominatimResult = {
  place_id?: number | string
  osm_type?: string
  osm_id?: number | string
  name?: string
  display_name?: string
  address?: {
    suburb?: string
    neighbourhood?: string
    city_district?: string
    district?: string
    city?: string
    town?: string
    village?: string
    municipality?: string
    county?: string
    state?: string
    region?: string
    country?: string
  }
}

function acceptLanguage(lang: string): string {
  if (lang === 'zh-HK' || lang.startsWith('zh')) {
    // Prefer Traditional Chinese when OSM has a translation; fall back to English
    return 'zh-HK,zh-Hant,zh,en'
  }
  return 'en'
}

function buildLabel(item: NominatimResult): string {
  if (item.display_name) return item.display_name

  const a = item.address
  const parts = [
    item.name,
    a?.neighbourhood || a?.suburb,
    a?.city || a?.town || a?.village || a?.municipality,
    a?.state || a?.region || a?.county,
    a?.country,
  ].filter((part, index, arr): part is string => {
    if (!part) return false
    return arr.indexOf(part) === index
  })

  return parts.join(', ')
}

/**
 * Free place autocomplete via Nominatim (OpenStreetMap).
 * https://operations.osmfoundation.org/policies/nominatim/
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q.trim() : ''
  const lang = typeof query.lang === 'string' ? query.lang : 'en'

  if (q.length < 2) {
    return { suggestions: [] as PlaceSuggestion[] }
  }

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('limit', '6')

  try {
    const results = await $fetch<NominatimResult[]>(url.toString(), {
      headers: {
        Accept: 'application/json',
        'Accept-Language': acceptLanguage(lang),
        'User-Agent': 'What2Eat/1.0 (https://github.com/What2Eat; location autocomplete)',
      },
    })

    const suggestions = (results ?? [])
      .map((item): PlaceSuggestion | null => {
        const label = buildLabel(item)
        const name = item.name || item.address?.suburb || item.address?.city || label
        if (!label || !name) return null
        return {
          id: `${item.osm_type ?? 'place'}-${item.osm_id ?? item.place_id ?? label}`,
          label,
          name,
        }
      })
      .filter((item): item is PlaceSuggestion => item !== null)

    const seen = new Set<string>()
    return {
      suggestions: suggestions.filter((item) => {
        if (seen.has(item.label)) return false
        seen.add(item.label)
        return true
      }),
    }
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'Place autocomplete unavailable',
    })
  }
})
