import { z } from 'zod'

export const priceTierSchema = z.enum(['budget', 'mid-range', 'high-end'])
export const openStatusSchema = z.enum(['open', 'closed', 'unknown'])
export const localeSchema = z.enum(['en', 'zh-HK'])

export type PriceTier = z.infer<typeof priceTierSchema>
export type OpenStatus = z.infer<typeof openStatusSchema>
export type AppLocale = z.infer<typeof localeSchema>

export const PRICE_TIERS = priceTierSchema.options
export const CUISINE_OPTIONS = [
  'japanese',
  'chinese',
  'italian',
  'street-food',
  'burgers',
  'thai',
  'mexican',
  'korean',
  'cafe',
  'seafood',
] as const
export type CuisineOption = (typeof CUISINE_OPTIONS)[number]

const optionalUrl = z
  .string()
  .nullable()
  .describe('Verified https URL from web search only; null if not found — never invent')

/** Locale-aware schema for the recommend API (descriptions steer model language). */
export function createRecommendationSchema(locale: AppLocale) {
  const zh = locale === 'zh-HK'

  const item = z.object({
    name: z.string().describe(zh ? '真實餐廳／食店名稱' : 'Real restaurant name'),
    cuisine: z.string().describe(zh ? '菜式（繁體中文）' : 'Cuisine type'),
    priceTier: priceTierSchema,
    rating: z
      .number()
      .min(0)
      .max(5)
      .nullable()
      .describe(
        zh
          ? 'Google Maps 或 OpenRice 星級（0–5）；兩邊都搵唔到先填 null'
          : 'Star rating 0–5 from Google Maps or OpenRice; null only if neither lists one',
      ),
    openStatus: openStatusSchema.describe(
      zh
        ? 'Google Maps 營業中／休息；搵唔到先填 unknown'
        : 'open | closed from Google Maps hours; unknown only if not found',
    ),
    hours: z
      .string()
      .nullable()
      .describe(
        zh
          ? 'Google Maps 營業時間（繁體中文短字串）；搵唔到填 null'
          : 'Opening hours from Google Maps; null if not found',
      ),
    summary: z.string().describe(zh ? '一句繁體中文摘要' : 'One-line summary'),
    description: z.string().describe(zh ? '2–3 句繁體中文介紹' : '2–3 sentence blurb'),
    suggestedDish: z.string().describe(zh ? '推介菜式（堂食）' : 'Signature dine-in dish'),
    imageUrl: optionalUrl.describe(
      zh
        ? '真實餐廳相片的直接 https 圖片網址（Google Maps、OpenRice、TripAdvisor、官網）；搵唔到填 null，禁止 AI 生成'
        : 'Direct https URL to a real photo of this venue from Google Maps, OpenRice, TripAdvisor, or official site; null if not found — never AI-generated',
    ),
    mapsUrl: optionalUrl.describe(
      'Google Maps place URL (google.com/maps/place/... or maps.app.goo.gl) from search; null if not found',
    ),
    openRiceUrl: optionalUrl.describe('OpenRice restaurant page URL if found; null otherwise'),
    websiteUrl: optionalUrl.describe('Official restaurant website if found; null otherwise'),
  })

  return z.object({
    process: z
      .string()
      .describe(
        zh
          ? '最先輸出：繁體中文搜尋／推理過程（2–5 句）'
          : 'Write FIRST: short search/reasoning commentary (2–5 sentences)',
      ),
    recommendations: z.array(item).min(6).max(8),
  })
}

/** Client streaming schema (shape only; locale comes from the request). */
export const recommendationSchema = createRecommendationSchema('zh-HK')

export type RecommendationItem = z.infer<
  ReturnType<typeof createRecommendationSchema>
>['recommendations'][number]

export const recommendRequestSchema = z.object({
  location: z.string().min(1),
  cuisines: z.array(z.string()).default([]),
  priceTier: priceTierSchema.nullable().optional(),
  mode: z.enum(['search', 'random']).default('search'),
  locale: localeSchema.default('zh-HK'),
})
