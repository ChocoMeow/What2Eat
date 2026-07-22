import { ProxyAgent, fetch as undiciFetch } from 'undici'

type BunFetchInit = RequestInit & {
  proxy?: string
}

/** Proxy URL for OpenAI-compatible API calls (e.g. regions that block direct access). */
export function getOpenAiProxyUrl(): string | undefined {
  const url = process.env.OPENAI_PROXY_URL?.trim()
  return url || undefined
}

/** Wrap fetch so outbound requests use {@link getOpenAiProxyUrl} when set. */
export function withProxyFetch(baseFetch: typeof fetch = globalThis.fetch): typeof fetch {
  const proxyUrl = getOpenAiProxyUrl()
  if (!proxyUrl) return baseFetch

  // Bun supports per-request proxy; Node ignores it, so use undici there.
  if (typeof Bun !== 'undefined') {
    return (async (input, init) => {
      return baseFetch(input, { ...init, proxy: proxyUrl } as BunFetchInit)
    }) as typeof fetch
  }

  const agent = new ProxyAgent(proxyUrl)
  return (async (input, init) => {
    return undiciFetch(
      input as Parameters<typeof undiciFetch>[0],
      { ...init, dispatcher: agent } as Parameters<typeof undiciFetch>[1],
    ) as unknown as Response
  }) as typeof fetch
}
