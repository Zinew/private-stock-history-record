import { parseFrontmatter, readingMinutes } from '../../utils/markdown.js'

describe('parseFrontmatter', () => {
  const raw = `---
title: "테스트 글"
slug: "test-article"
date: "2026-06-18"
description: "설명"
---
본문 내용입니다.`

  it('frontmatter 키를 파싱한다', () => {
    const { meta } = parseFrontmatter(raw)
    expect(meta.title).toBe('테스트 글')
    expect(meta.slug).toBe('test-article')
    expect(meta.date).toBe('2026-06-18')
    expect(meta.description).toBe('설명')
  })

  it('본문을 반환한다', () => {
    const { body } = parseFrontmatter(raw)
    expect(body.trim()).toBe('본문 내용입니다.')
  })

  it('frontmatter 없으면 빈 meta와 전체 body 반환', () => {
    const { meta, body } = parseFrontmatter('그냥 텍스트')
    expect(meta).toEqual({})
    expect(body).toBe('그냥 텍스트')
  })

  it('CRLF 줄바꿈 파일도 파싱한다', () => {
    const crlf = raw.replace(/\n/g, '\r\n')
    const { meta, body } = parseFrontmatter(crlf)
    expect(meta.slug).toBe('test-article')
    expect(body.trim()).toBe('본문 내용입니다.')
  })
})

describe('readingMinutes', () => {
  it('500자 본문은 1분 반환', () => {
    expect(readingMinutes('가'.repeat(500))).toBe(1)
  })
  it('1500자 본문은 2분 반환', () => {
    expect(readingMinutes('가'.repeat(1500))).toBe(2)
  })
})
