import { useEffect } from 'react'
import { SITE_URL } from '../config/site.js'

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

// 클라이언트 네비게이션 시 페이지별 title/description/canonical/OG를 동기화한다.
// 초기 HTML의 메타는 프리렌더 스크립트(scripts/prerender.mjs)가 담당한다.
export function usePageMeta({ title, description, path }) {
  useEffect(() => {
    if (title) {
      document.title = title
      upsertMeta('property', 'og:title', title)
    }
    if (description) {
      upsertMeta('name', 'description', description)
      upsertMeta('property', 'og:description', description)
    }
    if (path != null) {
      const url = SITE_URL + path
      upsertMeta('property', 'og:url', url)
      let link = document.head.querySelector('link[rel="canonical"]')
      if (!link) {
        link = document.createElement('link')
        link.setAttribute('rel', 'canonical')
        document.head.appendChild(link)
      }
      link.setAttribute('href', url)
    }
  }, [title, description, path])
}
