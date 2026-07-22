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
  .describe('Verified https URL from web search, or null — never invent')

/** Locale-aware schema for the recommend API (descriptions steer model language). */
export function createRecommendationSchema(locale: AppLocale) {
  const zh = locale === 'zh-HK'

  const item = z.object({
    name: z.string().describe(zh ? '真實餐廳名稱' : 'Restaurant name'),
    cuisine: z.string().describe(zh ? '菜式（繁體中文）' : 'Cuisine type'),
    priceTier: priceTierSchema,
    rating: z
      .number()
      .min(0)
      .max(5)
      .nullable()
      .describe(zh ? '評分 0–5，唔知就 null' : 'Stars 0–5, or null'),
    openStatus: openStatusSchema.describe('open | closed | unknown'),
    hours: z
      .string()
      .nullable()
      .describe(zh ? '營業時間短字串，唔知就 null' : 'Hours string, or null'),
    summary: z.string().describe(zh ? '一句繁體中文摘要' : 'One-line summary'),
    description: z.string().describe(zh ? '2–3 句繁體中文介紹' : '2–3 sentence blurb'),
    suggestedDish: z.string().describe(zh ? '推介菜式' : 'Dish to try'),
    imagePrompt: z.string().describe('English food photo prompt, no text'),
    mapsUrl: optionalUrl,
    openRiceUrl: optionalUrl,
    websiteUrl: optionalUrl,
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
