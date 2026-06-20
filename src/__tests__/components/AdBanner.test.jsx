import { render } from '@testing-library/react'
import AdBanner from '../../components/AdBanner.jsx'

beforeEach(() => {
  window.adsbygoogle = []
})

it('ins 엘리먼트를 렌더링한다', () => {
  const { container } = render(<AdBanner slot="1234567890" />)
  expect(container.querySelector('ins.adsbygoogle')).toBeTruthy()
})

it('마운트 시 adsbygoogle.push를 호출한다', () => {
  render(<AdBanner slot="1234567890" />)
  expect(window.adsbygoogle.length).toBe(1)
})

it('className prop이 컨테이너에 전달된다', () => {
  const { container } = render(<AdBanner slot="1234567890" className="ad-top" />)
  expect(container.firstChild.classList.contains('ad-top')).toBe(true)
})
