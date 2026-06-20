import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ArticlePage from '../../pages/ArticlePage.jsx'

const mockArticle = {
  slug: 'test-slug',
  title: '테스트 글 제목',
  html: '<p>본문 내용</p>',
  date: '2026-06-18',
  minutes: 3,
}

vi.mock('../../utils/articles.js', () => ({
  getArticleBySlug: (slug) => slug === 'test-slug' ? mockArticle : null,
  getArticles: () => [mockArticle],
}))

vi.mock('../../components/learn/ArticleIllustration.jsx', () => ({
  default: ({ slug }) => <div data-testid={`illust-${slug}`} />,
}))

vi.mock('../../components/AdBanner.jsx', () => ({
  default: ({ slot }) => <div data-testid={`ad-${slot}`} />,
}))

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/learn/:slug" element={<ArticlePage />} />
      </Routes>
    </MemoryRouter>
  )
}

it('글 제목을 렌더링한다', () => {
  renderAt('/learn/test-slug')
  expect(screen.getByText('테스트 글 제목')).toBeTruthy()
})

it('본문 HTML을 렌더링한다', () => {
  const { container } = renderAt('/learn/test-slug')
  expect(container.querySelector('.learn-content')).toBeTruthy()
})

it('없는 슬러그는 에러 메시지를 반환한다', () => {
  renderAt('/learn/nonexistent')
  expect(screen.getByText('글을 찾을 수 없습니다.')).toBeTruthy()
})

it('광고 배너 두 개가 렌더링된다', () => {
  renderAt('/learn/test-slug')
  expect(screen.getByTestId('ad-1234567891')).toBeTruthy()
  expect(screen.getByTestId('ad-1234567892')).toBeTruthy()
})
