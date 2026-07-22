export const W2E_META_DELIMITER = '\x1eW2E_META'

export type AiSessionMeta = {
  durationMs: number
  usage: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    reasoningTokens?: number
  }
}

export function encodeAiSessionMeta(meta: AiSessionMeta): string {
  return `${W2E_META_DELIMITER}${JSON.stringify(meta)}`
}

export function parseAiSessionMeta(text: string): AiSessionMeta | null {
  const idx = text.indexOf(W2E_META_DELIMITER)
  if (idx === -1) return null
  try {
    return JSON.parse(text.slice(idx + W2E_META_DELIMITER.length)) as AiSessionMeta
  } catch {
    return null
  }
}

export function formatSessionStats(
  meta: AiSessionMeta | null | undefined,
  liveMs: number,
  t: (key: string, params?: Record<string, string | number>) => string,
  nf: Intl.NumberFormat,
) {
  const parts: string[] = []
  const durationMs = meta?.durationMs ?? liveMs

  if (durationMs > 0) {
    parts.push(t('results.stats.durationSec', { sec: (durationMs / 1000).toFixed(1) }))
  }

  const usage = meta?.usage
  if (usage?.totalTokens != null) {
    parts.push(t('results.stats.tokens', { total: nf.format(usage.totalTokens) }))
    if (usage.inputTokens != null && usage.outputTokens != null) {
      parts.push(t('results.stats.tokenSplit', {
        input: nf.format(usage.inputTokens),
        output: nf.format(usage.outputTokens),
      }))
    }
    if (usage.reasoningTokens != null && usage.reasoningTokens > 0) {
      parts.push(t('results.stats.reasoningTokens', { count: nf.format(usage.reasoningTokens) }))
    }
  }

  return parts.join(' · ')
}
