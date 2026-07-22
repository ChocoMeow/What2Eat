import { W2E_META_DELIMITER, parseAiSessionMeta, type AiSessionMeta } from '~~/shared/aiMeta'

export function createRecommendFetch(onMeta: (meta: AiSessionMeta) => void): typeof fetch {
  const wrapped = async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await fetch(input, init)
    if (!res.ok || !res.body) return res

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    const encoder = new TextEncoder()
    let pending = ''

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            pending += decoder.decode(value, { stream: true })
            const idx = pending.indexOf(W2E_META_DELIMITER)
            if (idx === -1) {
              controller.enqueue(encoder.encode(pending))
              pending = ''
              continue
            }

            const text = pending.slice(0, idx)
            if (text) controller.enqueue(encoder.encode(text))
            const meta = parseAiSessionMeta(pending)
            if (meta) onMeta(meta)
            pending = ''
            break
          }

          if (pending) {
            const idx = pending.indexOf(W2E_META_DELIMITER)
            const text = idx === -1 ? pending : pending.slice(0, idx)
            if (text) controller.enqueue(encoder.encode(text))
            const meta = idx === -1 ? null : parseAiSessionMeta(pending)
            if (meta) onMeta(meta)
          }

          controller.close()
        } catch (error) {
          controller.error(error)
        } finally {
          reader.releaseLock()
        }
      },
    })

    return new Response(stream, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    })
  }

  return wrapped as typeof fetch
}
