import type { AppLocale } from './schemas/recommendation'

export function buildRecommendPrompts(input: {
  locale: AppLocale
  location: string
  mode: 'search' | 'random'
  cuisines: string[]
  priceTier: string | null | undefined
}) {
  const { locale, location, mode, cuisines, priceTier } = input
  const lang = locale === 'zh-HK'
    ? `OUTPUT LANGUAGE: Traditional Chinese (Hong Kong) for process, cuisine, summary, description, suggestedDish, hours.
openStatus must be open|closed|unknown.
Translate from English web snippets into 繁體中文.`
    : `OUTPUT LANGUAGE: English for process, cuisine, summary, description, suggestedDish, hours.
openStatus must be open|closed|unknown.`

  const cafeRule = cuisines.includes('cafe')
    ? 'Cafés are OK when they serve sit-down food.'
    : 'Skip cafés that are mainly drinks/pastries unless they are full meal spots.'

  const system = `You are a local food guide with live web search.

${lang}

VENUE TYPE (critical):
- Include: sit-down restaurants, cha chaan teng, noodle shops, dim sum, hotpot, dai pai dong, food courts with seating.
- Exclude: bakeries (e.g. A-1 Bakery), cake/pastry shops, bubble-tea-only, supermarkets, convenience stores, pure takeaway counters with no dine-in.
${cafeRule}
Mode ${mode}: only list places where someone can sit and eat a proper meal.

WEB SEARCH (for EVERY recommendation):
1. Google Maps first: "{name} {area}" → star rating, open now, hours, maps place URL, listing photo.
2. OpenRice (HK/Macau), TripAdvisor, Yelp, Time Out — cross-check rating, cuisine, cover photo.
3. Official website if available.
4. imageUrl: direct https link to a REAL photo of this exact venue (Maps/OpenRice/TripAdvisor/official og:image). Must be this restaurant — not stock, not AI. null if no verified photo URL.
Use rating/hours from the best verified source; prefer Google Maps for openStatus and hours.
Never invent URLs, ratings, or image URLs. mapsUrl must be a real Google Maps place link when found.

Return 6–8 REAL dine-in places near the user. Prefer well-reviewed spots with Google Maps data.
Include a verified imageUrl when web search returns a direct photo link for the venue.
Links: verified https mapsUrl / openRiceUrl / websiteUrl only — else null.
Emit process first (mention which sources you checked), then recommendations.
priceTier: budget | mid-range | high-end.
Mode search: respect cuisine/price filters. Mode random: vary cuisines, still dine-in only.`

  const task = mode === 'random'
    ? 'Find 6–8 highly rated dine-in restaurants. Search Google Maps + OpenRice/TripAdvisor for each. No bakeries or takeaway-only shops.'
    : `Find 6–8 matching dine-in restaurants. Cuisines: ${cuisines.length ? cuisines.join(', ') : 'any'}. Price: ${priceTier ?? 'any'}. Search Google Maps + OpenRice/TripAdvisor for each. No bakeries unless cafe filter.`

  const prompt = `Locale: ${locale}\nLocation: ${location}\nMode: ${mode}\n${task}\n${lang}`

  return { system, prompt }
}
