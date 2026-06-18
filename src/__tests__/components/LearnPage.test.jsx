import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LearnPage from '../../pages/LearnPage.jsx'

vi.mock('../../utils/articles.js', () => ({
  getArticles: () => [
    { slug: 'test-slug', title: '테스트 글', description: '설명', date: '2026-06-18', minutes: 3 },
  ],
}))

vi.mock('../../components/learn/ArticleIllustration.jsx', () => ({
  default: ({ slug }) => <div data-testid={`illust-${slug}`} />,
}))

vi.mock('../../components/AdBanner.jsx', () => ({
  default: ({ slot }) => <div data-testid={`ad-${slot}`} />,
}))

it('페이지 타이틀을 렌더링한다', () => {
  render(<MemoryRouter><LearnPage /></MemoryRouter>)
  expect(screen.getByRole('heading', { level: 1 })).toBeTruthy()
})

it('글 카드가 렌더링된다', () => {
  render(<MemoryRouter><LearnPage /></MemoryRouter>)
  expect(screen.getByText('테스트 글')).toBeTruthy()
})

it('광고 배너가 렌더링된다', () => {
  render(<MemoryRouter><LearnPage /></MemoryRouter>)
  expect(screen.getByTestId('ad-1234567890')).toBeTruthy()
})
