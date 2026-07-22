# What2Eat

AI-powered food recommendations for your location. Built with Nuxt 4, Vue 3, Tailwind CSS, and the Vercel AI SDK.

## Features

- Location-based restaurant suggestions (search or random “Feed Me”)
- Free location autocomplete via Nominatim (Chinese labels when available)
- Cuisine and price filters
- Streaming structured AI results (6–8 picks with summary + food image)
- Links only when the model returns a verified URL (Maps / OpenRice / website)
- Share a recommendation (Web Share API or clipboard)
- English and Traditional Chinese (Hong Kong)
- Light and dark mode

## Setup (Bun)

```bash
bun install
cp .env.example .env
```

Edit `.env` with your OpenAI-compatible credentials (never commit this file):

```env
OPENAI_API_KEY=
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=openai/gpt-4o-mini
```

### Provider examples

| Provider   | `OPENAI_BASE_URL`                         | Example model        |
| ---------- | ----------------------------------------- | -------------------- |
| OpenAI     | `https://api.openai.com/v1`               | `gpt-4o-mini`        |
| OpenRouter | `https://openrouter.ai/api/v1`            | `openai/gpt-4o-mini` |
| Groq       | `https://api.groq.com/openai/v1`          | `llama-3.3-70b-versatile` |
| Ollama     | `http://localhost:11434/v1`               | `llama3.2`           |

### OpenRouter + web search

When `OPENAI_BASE_URL` points at OpenRouter, the recommend API automatically enables OpenRouter’s **web** plugin so results can be grounded in live search. Use a model that supports tools/plugins (e.g. `openai/gpt-4o-mini`, `openai/gpt-4o`).

Links (`mapsUrl`, `openRiceUrl`, `websiteUrl`) are only shown when the model returns a real `https` URL — fabricated OpenRice links are discouraged in the prompt and omitted in the UI.

## Development

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production

```bash
bun run build
bun run preview
```

## Locale & theme

- Default language is **繁體中文（香港）**; switch with **繁 | EN** in the header.
- Toggle light/dark with the theme control (follows system preference by default).
- AI replies are requested in the active UI language.

## Location autocomplete

Typing in the location field queries `/api/places/autocomplete`, which proxies **Nominatim** (OpenStreetMap). No API key required.

- With **繁**, suggestions prefer Chinese names when OSM has a translation (e.g. “Mong Kok” → 旺角); otherwise English.
- With **EN**, suggestions stay in English.
- Respect Nominatim’s [fair-use policy](https://operations.osmfoundation.org/policies/nominatim/) (debounced requests via our server).

## Stack

- Nuxt 4 (`app/` + `server/`)
- Tailwind CSS v4
- `@nuxtjs/i18n`, `@nuxtjs/color-mode`
- `ai` + `@ai-sdk/openai` + `@ai-sdk/vue` + Zod
