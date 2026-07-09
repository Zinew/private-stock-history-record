// 순수 마크다운 유틸 (브라우저·Node 공용 — Vite 전용 API 사용 금지)
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
