import { ProxyAgent, fetch as undiciFetch } from 'undici'

/** Proxy URL for OpenAI-compatible API calls (e.g. regions that block direct access). */
export function getOpenAiProxyUrl(): string | undefined {
  const url = process.env.OPENAI_PROXY_URL?.trim()
  return url || undefined
}

let proxyAgent: ProxyAgent | undefined

function getProxyAgent(proxyUrl: string): ProxyAgent {
  if (!proxyAgent) proxyAgent = new ProxyAgent(proxyUrl)
  return proxyAgent
}

/** Wrap fetch so outbound requests use {@link getOpenAiProxyUrl} when set. */
export function withProxyFetch(): typeof fetch {
  const proxyUrl = getOpenAiProxyUrl()
  if (!proxyUrl) return globalThis.fetch

  const agent = getProxyAgent(proxyUrl)
  return (async (input, init) => {
    try {
      return (await undiciFetch(
        input as Parameters<typeof undiciFetch>[0],
        { ...init, dispatcher: agent } as Parameters<typeof undiciFetch>[1],
      )) as unknown as Response
    } catch (error) {
      console.error('[what2eat:proxy] fetch failed', { proxyUrl, error })
      throw error
    }
  }) as typeof fetch
}
