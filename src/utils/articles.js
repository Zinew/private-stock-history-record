import { marked } from 'marked'

export function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { meta: {}, body: raw }
  const meta = Object.fromEntries(
    match[1].split('\n')
      .filter(Boolean)
      .map(line => {
        const idx = line.indexOf(':')
        const k = line.slice(0, idx).trim()
        const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
        return [k, v]
      })
  )
  return { meta, body: match[2] }
}

export function readingMinutes(text) {
  return Math.max(1, Math.ceil(text.length / 750))
}

const rawFiles = import.meta.glob('../content/articles/*.md', { query: '?raw', import: 'default', eager: true })

function buildArticles() {
  return Object.entries(rawFiles)
    .map(([, raw]) => {
      const { meta, body } = parseFrontmatter(raw)
      return {
        title: meta.title ?? '',
        slug: meta.slug ?? '',
        date: meta.date ?? '',
        description: meta.description ?? '',
        minutes: readingMinutes(body),
        html: marked(body),
        body,
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

let _cache = null
export function getArticles() {
  if (!_cache) _cache = buildArticles()
  return _cache
}

export function getArticleBySlug(slug) {
  return getArticles().find(a => a.slug === slug) ?? null
}
