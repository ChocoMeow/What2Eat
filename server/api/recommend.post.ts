import { createOpenAI } from '@ai-sdk/openai'
import { streamObject } from 'ai'
import {
  createRecommendationSchema,
  recommendRequestSchema,
  type AppLocale,
} from '../../shared/schemas/recommendation'

function withOpenRouterWebSearch(enable: boolean): typeof fetch | undefined {
  if (!enable) return undefined
  return (async (input, init) => {
    if (!init?.body || typeof init.body !== 'string') {
      return globalThis.fetch(input, init)
    }
    try {
      const body = JSON.parse(init.body) as Record<string, unknown>
      body.plugins = [
        {
          id: 'web',
          engine: 'exa',
          max_results: 10,
          search_prompt:
            'Restaurant results near the user: ratings, hours/open-now, Maps, OpenRice listings, official sites. Skip broken links.',
        },
      ]
      return globalThis.fetch(input, { ...init, body: JSON.stringify(body) })
    } catch {
      return globalThis.fetch(input, init)
    }
  }) as typeof fetch
}

function languageRules(locale: AppLocale) {
  if (locale === 'zh-HK') {
    return `OUTPUT LANGUAGE: Traditional Chinese (Hong Kong) for process, cuisine, summary, description, suggestedDish, hours.
Keep imagePrompt in English. openStatus must be open|closed|unknown.
Translate from English web snippets into 繁體中文.`
  }
  return `OUTPUT LANGUAGE: English for process, cuisine, summary, description, suggestedDish, hours.
imagePrompt in English. openStatus must be open|closed|unknown.`
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  if (!config.openaiApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'OPENAI_API_KEY is not configured' })
  }

  const parsed = recommendRequestSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request body',
      data: parsed.error.flatten(),
    })
  }

  const { location, cuisines, priceTier, mode, locale } = parsed.data
  const baseURL = config.openaiBaseUrl || 'https://api.openai.com/v1'
  const openrouter = /openrouter\.ai/i.test(baseURL)

  const openai = createOpenAI({
    apiKey: config.openaiApiKey,
    baseURL,
    fetch: withOpenRouterWebSearch(openrouter),
  })

  const lang = languageRules(locale)
  const system = `You are a local food guide with live web search.

${lang}

Return 6–8 REAL places near the user. Prefer well-reviewed spots.
Include rating (0–5 or null), openStatus, hours when found — never invent ratings/URLs.
Links: only verified https mapsUrl / openRiceUrl / websiteUrl; else null.
Emit process first, then recommendations.
priceTier: budget | mid-range | high-end.
Mode search: respect cuisine/price. Mode random: ignore filters, vary cuisines.
Be specific.`

  const prompt =
    mode === 'random'
      ? `Locale: ${locale}\nLocation: ${location}\nMode: random\nFind 6–8 highly rated places. Include ratings, open status, hours, verified links when found.\n${lang}`
      : `Locale: ${locale}\nLocation: ${location}\nMode: search\nCuisines: ${cuisines.length ? cuisines.join(', ') : 'any'}\nPrice: ${priceTier ?? 'any'}\nFind 6–8 matching places. Include ratings, open status, hours, verified links when found.\n${lang}`

  return streamObject({
    model: openai.chat(config.openaiModel || 'gpt-4o-mini'),
    schema: createRecommendationSchema(locale),
    system,
    prompt,
    abortSignal: toWebRequest(event).signal,
  }).toTextStreamResponse()
})
