import { createOpenAI } from '@ai-sdk/openai'
import { createTextStreamResponse, streamObject, type StreamObjectResult } from 'ai'
import {
  encodeAiSessionMeta,
  type AiSessionMeta,
} from '../../shared/aiMeta'
import { buildRecommendPrompts } from '../../shared/recommendPrompts'
import {
  createRecommendationSchema,
  recommendRequestSchema,
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
          max_results: 15,
          search_prompt:
            'Find dine-in restaurants near the user. Prioritize Google Maps (ratings, hours, photos, place URL), OpenRice (cover images), TripAdvisor, Yelp, Time Out, and official sites.',
        },
      ]
      return globalThis.fetch(input, { ...init, body: JSON.stringify(body) })
    } catch {
      return globalThis.fetch(input, init)
    }
  }) as typeof fetch
}

function metaStream(
  result: StreamObjectResult<unknown, unknown, never>,
  startedAt: number,
  getError: () => Error | undefined,
) {
  return new ReadableStream<string>({
    async start(controller) {
      try {
        for await (const chunk of result.textStream) {
          const err = getError()
          if (err) throw err
          controller.enqueue(chunk)
        }

        const err = getError()
        if (err) throw err

        const usage = await Promise.race([
          result.usage,
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('usage timeout')), 10_000)
          }),
        ])

        const meta: AiSessionMeta = {
          durationMs: Date.now() - startedAt,
          usage: {
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            totalTokens: usage.totalTokens,
            reasoningTokens: usage.outputTokenDetails?.reasoningTokens,
          },
        }
        controller.enqueue(encodeAiSessionMeta(meta))
        controller.close()
      } catch (error) {
        controller.error(error instanceof Error ? error : new Error(String(error)))
      }
    },
  })
}

export default defineEventHandler(async (event) => {
  const apiKey = process.env.OPENAI_API_KEY
  const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

  if (!apiKey) {
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
  const openrouter = /openrouter\.ai/i.test(baseURL)

  const openai = createOpenAI({
    apiKey,
    baseURL,
    fetch: withOpenRouterWebSearch(openrouter),
  })

  const { system, prompt } = buildRecommendPrompts({
    locale,
    location,
    mode,
    cuisines,
    priceTier,
  })

  console.log('[what2eat:ai] request', {
    model,
    baseURL,
    webSearch: openrouter,
    body: parsed.data,
    system,
    prompt,
  })

  const startedAt = Date.now()
  let streamError: Error | undefined

  const result = streamObject({
    model: openai.chat(model),
    schema: createRecommendationSchema(locale),
    system,
    prompt,
    abortSignal: toWebRequest(event).signal,
    onFinish: ({ object, usage, finishReason }) => {
      console.log('[what2eat:ai] response', { object, usage, finishReason })
    },
    onError: ({ error }) => {
      streamError = error instanceof Error ? error : new Error(String(error))
      console.error('[what2eat:ai] error', streamError)
    },
  })

  return createTextStreamResponse({
    stream: metaStream(result, startedAt, () => streamError),
  })
})
