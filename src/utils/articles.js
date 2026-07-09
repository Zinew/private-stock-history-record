import { marked } from 'marked'
import { parseFrontmatter, readingMinutes } from './markdown.js'
export { parseFrontmatter, readingMinutes }

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
