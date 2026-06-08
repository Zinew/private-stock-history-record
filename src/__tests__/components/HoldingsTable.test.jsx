import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n.js'
import HoldingsTable from '../../components/HoldingsTable.jsx'
import AddHoldingForm from '../../components/AddHoldingForm.jsx'
import { fetchQuote } from '../../utils/finnhub.js'
import { fetchUsdSearch, fetchKrxSearch, fetchKrxQuote } from '../../utils/stockSearch.js'

vi.mock('../../utils/finnhub.js', () => ({ fetchQuote: vi.fn() }))
vi.mock('../../utils/stockSearch.js', () => ({
  fetchUsdSearch: vi.fn(),
  fetchKrxSearch: vi.fn(),
  fetchKrxQuote: vi.fn(),
}))

const SEARCH_PLACEHOLDER = '삼성전자 · Apple · AAPL · 005930'

const mockHoldings = [
  { t: 'AAPL', nm: 'Apple Inc.', q: 10, b: 150, c: 190, currency: 'USD' },
]
const identity = (n) => n

const defaultProps = {
  holdings: [],
  rawHoldings: [],
  totalVal: 0,
  onAdd: vi.fn(),
  onDelete: vi.fn(),
  onEdit: vi.fn(),
  displayCurrency: 'USD',
  toDisplay: identity,
  prices: {},
  priceLoading: false,
  priceError: null,
  lastUpdatedAt: null,
  onRefresh: vi.fn(),
}

function renderHoldingsTable(props = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <HoldingsTable {...defaultProps} {...props} />
    </I18nextProvider>
  )
}

describe('HoldingsTable', () => {
  beforeEach(() => vi.clearAllMocks())

  it('종목 없을 때 빈 안내 메시지 표시', () => {
    renderHoldingsTable()
    expect(screen.getByText(/포트폴리오를 시작해보세요/)).toBeInTheDocument()
  })

  it('종목 티커 표시', () => {
    renderHoldingsTable({ holdings: mockHoldings, totalVal: 1900 })
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('삭제 버튼 클릭 시 onDelete 호출', () => {
    const onDelete = vi.fn()
    renderHoldingsTable({ holdings: mockHoldings, totalVal: 1900, onDelete })
    fireEvent.click(screen.getByTitle('삭제'))
    expect(onDelete).toHaveBeenCalledWith(0)
  })

  it('테이블이 table-scroll 래퍼 안에 존재한다', () => {
    const { container } = renderHoldingsTable()
    const wrapper = container.querySelector('.table-scroll')
    expect(wrapper).toBeInTheDocument()
    expect(wrapper.querySelector('table')).toBeInTheDocument()
  })

  it('✎ 버튼 클릭 시 EditModal 표시', () => {
    renderHoldingsTable({ holdings: mockHoldings, rawHoldings: mockHoldings, totalVal: 1900 })
    fireEvent.click(screen.getByTitle('수정'))
    expect(screen.getByText('AAPL 수정')).toBeInTheDocument()
  })

  it('EditModal 저장 시 onEdit 올바른 인덱스·patch로 호출', () => {
    const onEdit = vi.fn()
    renderHoldingsTable({ holdings: mockHoldings, rawHoldings: mockHoldings, totalVal: 1900, onEdit })
    fireEvent.click(screen.getByTitle('수정'))
    fireEvent.change(screen.getByDisplayValue('Apple Inc.'), { target: { value: 'Apple Inc. Updated' } })
    fireEvent.click(screen.getByText('저장'))
    expect(onEdit).toHaveBeenCalledWith(0, { nm: 'Apple Inc. Updated' })
  })

  it('EditModal 취소 시 모달 사라짐', () => {
    renderHoldingsTable({ holdings: mockHoldings, rawHoldings: mockHoldings, totalVal: 1900 })
    fireEvent.click(screen.getByTitle('수정'))
    expect(screen.getByText('AAPL 수정')).toBeInTheDocument()
    fireEvent.click(screen.getByText('취소'))
    expect(screen.queryByText('AAPL 수정')).not.toBeInTheDocument()
  })

  // ── 종목 추가 폼 ──────────────────────────────────────────────────────────

  it('USD 종목 검색 후 추가 시 onAddTransaction에 currency 포함', async () => {
    fetchUsdSearch.mockResolvedValue([{ symbol: 'TSLA', name: 'Tesla Inc.', ticker: 'TSLA' }])
    fetchKrxSearch.mockResolvedValue([])
    fetchQuote.mockResolvedValue(250)
    const onAddTransaction = vi.fn()
    render(
      <I18nextProvider i18n={i18n}>
        <AddHoldingForm onAddTransaction={onAddTransaction} />
      </I18nextProvider>
    )
    fireEvent.change(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), { target: { value: 'tesla' } })
    await waitFor(() => expect(screen.getByText('Tesla Inc.')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Tesla Inc.'))
    await waitFor(() => expect(screen.getByPlaceholderText('190').value).toBe('250'))
    fireEvent.change(screen.getByPlaceholderText('10'), { target: { value: '5' } })
    fireEvent.change(screen.getByPlaceholderText('150'), { target: { value: '200' } })
    fireEvent.click(screen.getByText('+ 추가'))
    expect(onAddTransaction).toHaveBeenCalledWith(expect.objectContaining({
      type: 'buy', ticker: 'TSLA', qty: 5, price: 200, currency: 'USD',
    }))
  })

  it('KRW 종목 검색 후 추가 시 currency: KRW 자동 결정', async () => {
    fetchKrxSearch.mockResolvedValue([
      { symbol: '005930.KS', name: '삼성전자', ticker: '005930', exchange: 'KS' },
    ])
    fetchUsdSearch.mockResolvedValue([])
    fetchKrxQuote.mockResolvedValue(75000)
    const onAddTransaction = vi.fn()
    render(
      <I18nextProvider i18n={i18n}>
        <AddHoldingForm onAddTransaction={onAddTransaction} />
      </I18nextProvider>
    )
    fireEvent.change(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), { target: { value: '삼성' } })
    await waitFor(() => expect(screen.getByText('삼성전자')).toBeInTheDocument())
    fireEvent.click(screen.getByText('삼성전자'))
    await waitFor(() => expect(screen.getByPlaceholderText('190').value).toBe('75000'))
    fireEvent.change(screen.getByPlaceholderText('10'), { target: { value: '10' } })
    fireEvent.change(screen.getByPlaceholderText('150'), { target: { value: '75000' } })
    fireEvent.click(screen.getByText('+ 추가'))
    expect(onAddTransaction).toHaveBeenCalledWith(expect.objectContaining({
      type: 'buy', ticker: '005930', qty: 10, price: 75000, currency: 'KRW',
    }))
  })

  it('USD 종목 선택 시 fetchQuote 호출되어 현재가 자동 입력', async () => {
    fetchUsdSearch.mockResolvedValue([{ symbol: 'AAPL', name: 'Apple Inc.', ticker: 'AAPL' }])
    fetchKrxSearch.mockResolvedValue([])
    fetchQuote.mockResolvedValue(195.5)
    renderHoldingsTable()
    fireEvent.change(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), { target: { value: 'apple' } })
    await waitFor(() => expect(screen.getByText('Apple Inc.')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Apple Inc.'))
    await waitFor(() => expect(screen.getByPlaceholderText('190').value).toBe('195.5'))
    expect(fetchQuote).toHaveBeenCalledWith('AAPL')
  })

  it('USD 종목 선택 후 fetchQuote null 반환 시 현재가 비워짐', async () => {
    fetchUsdSearch.mockResolvedValue([{ symbol: 'INVALID', name: 'Invalid Stock', ticker: 'INVALID' }])
    fetchKrxSearch.mockResolvedValue([])
    fetchQuote.mockResolvedValue(null)
    renderHoldingsTable()
    fireEvent.change(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), { target: { value: 'invalid' } })
    await waitFor(() => expect(screen.getByText('Invalid Stock')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Invalid Stock'))
    await waitFor(() => expect(fetchQuote).toHaveBeenCalled())
    expect(screen.getByPlaceholderText('190').value).toBe('')
  })

  it('KRW 종목 선택 시 fetchKrxQuote 사용, fetchQuote 호출하지 않음', async () => {
    fetchKrxSearch.mockResolvedValue([
      { symbol: '005930.KS', name: '삼성전자', ticker: '005930', exchange: 'KS' },
    ])
    fetchUsdSearch.mockResolvedValue([])
    fetchKrxQuote.mockResolvedValue(75000)
    renderHoldingsTable()
    fireEvent.change(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), { target: { value: '삼성' } })
    await waitFor(() => expect(screen.getByText('삼성전자')).toBeInTheDocument())
    fireEvent.click(screen.getByText('삼성전자'))
    await waitFor(() => expect(fetchKrxQuote).toHaveBeenCalledWith('005930', 'KS'))
    expect(fetchQuote).not.toHaveBeenCalled()
  })

  it('USD: 이름 입력 시 fetchUsdSearch 호출', async () => {
    fetchUsdSearch.mockResolvedValue([{ symbol: 'AAPL', name: 'Apple Inc.', ticker: 'AAPL' }])
    fetchKrxSearch.mockResolvedValue([])
    renderHoldingsTable()
    fireEvent.change(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), { target: { value: 'apple' } })
    await waitFor(() => expect(fetchUsdSearch).toHaveBeenCalledWith('apple'), { timeout: 500 })
  })

  it('USD: 드롭다운 선택 시 이름 자동 입력', async () => {
    fetchUsdSearch.mockResolvedValue([{ symbol: 'AAPL', name: 'Apple Inc.', ticker: 'AAPL' }])
    fetchKrxSearch.mockResolvedValue([])
    fetchQuote.mockResolvedValue(195.5)
    renderHoldingsTable()
    fireEvent.change(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), { target: { value: 'apple' } })
    await waitFor(() => expect(screen.getByText('Apple Inc.')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Apple Inc.'))
    await waitFor(() => {
      expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER).value).toBe('Apple Inc.')
    })
  })

  it('USD: 종목 선택 후 추가 시 onAddTransaction에 올바른 값 전달', async () => {
    fetchUsdSearch.mockResolvedValue([{ symbol: 'AAPL', name: 'Apple Inc.', ticker: 'AAPL' }])
    fetchKrxSearch.mockResolvedValue([])
    fetchQuote.mockResolvedValue(195.5)
    const onAddTransaction = vi.fn()
    render(
      <I18nextProvider i18n={i18n}>
        <AddHoldingForm onAddTransaction={onAddTransaction} />
      </I18nextProvider>
    )
    fireEvent.change(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), { target: { value: 'apple' } })
    await waitFor(() => expect(screen.getByText('Apple Inc.')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Apple Inc.'))
    await waitFor(() => expect(screen.getByPlaceholderText('190').value).toBe('195.5'))
    fireEvent.change(screen.getByPlaceholderText('10'), { target: { value: '3' } })
    fireEvent.change(screen.getByPlaceholderText('150'), { target: { value: '180' } })
    fireEvent.click(screen.getByText('+ 추가'))
    expect(onAddTransaction).toHaveBeenCalledWith(expect.objectContaining({
      type: 'buy', ticker: 'AAPL', name: 'Apple Inc.', qty: 3, price: 180, currency: 'USD',
    }))
  })

  it('KRW: 이름 입력 시 fetchKrxSearch 호출', async () => {
    fetchKrxSearch.mockResolvedValue([
      { symbol: '005930.KS', name: '삼성전자', ticker: '005930', exchange: 'KS' },
    ])
    fetchUsdSearch.mockResolvedValue([])
    renderHoldingsTable()
    fireEvent.change(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), { target: { value: '삼성' } })
    await waitFor(() => expect(fetchKrxSearch).toHaveBeenCalledWith('삼성'), { timeout: 500 })
  })

  it('KRW: 드롭다운 선택 시 이름 자동 입력', async () => {
    fetchKrxSearch.mockResolvedValue([
      { symbol: '005930.KS', name: '삼성전자', ticker: '005930', exchange: 'KS' },
    ])
    fetchUsdSearch.mockResolvedValue([])
    fetchKrxQuote.mockResolvedValue(329000)
    renderHoldingsTable()
    fireEvent.change(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), { target: { value: '삼성' } })
    await waitFor(() => expect(screen.getByText('삼성전자')).toBeInTheDocument())
    fireEvent.click(screen.getByText('삼성전자'))
    await waitFor(() => {
      expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER).value).toBe('삼성전자')
    })
  })

  it('KRW: 종목 선택 후 추가 시 onAddTransaction에 exchange 포함', async () => {
    fetchKrxSearch.mockResolvedValue([
      { symbol: '005930.KS', name: '삼성전자', ticker: '005930', exchange: 'KS' },
    ])
    fetchUsdSearch.mockResolvedValue([])
    fetchKrxQuote.mockResolvedValue(329000)
    const onAddTransaction = vi.fn()
    render(
      <I18nextProvider i18n={i18n}>
        <AddHoldingForm onAddTransaction={onAddTransaction} />
      </I18nextProvider>
    )
    fireEvent.change(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), { target: { value: '삼성' } })
    await waitFor(() => expect(screen.getByText('삼성전자')).toBeInTheDocument())
    fireEvent.click(screen.getByText('삼성전자'))
    await waitFor(() => expect(fetchKrxQuote).toHaveBeenCalled())
    fireEvent.change(screen.getByPlaceholderText('10'), { target: { value: '5' } })
    fireEvent.change(screen.getByPlaceholderText('150'), { target: { value: '75000' } })
    fireEvent.click(screen.getByText('+ 추가'))
    expect(onAddTransaction).toHaveBeenCalledWith(expect.objectContaining({
      type: 'buy', ticker: '005930', name: '삼성전자', qty: 5, price: 75000, currency: 'KRW', exchange: 'KS',
    }))
  })

  it('calls onAddTransaction with sell payload', async () => {
    const holdings = [{ t: 'AAPL', nm: 'Apple', q: 10, b: 150, currency: 'USD' }]
    const onAddTransaction = vi.fn()
    render(
      <I18nextProvider i18n={i18n}>
        <AddHoldingForm onAddTransaction={onAddTransaction} holdings={holdings} />
      </I18nextProvider>
    )
    fireEvent.click(screen.getByText(/매도/i))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'AAPL' } })
    const inputs = screen.getAllByRole('spinbutton')
    fireEvent.change(inputs[0], { target: { value: '5' } })
    fireEvent.change(inputs[1], { target: { value: '200' } })
    const buttons = screen.getAllByRole('button')
    const sellSubmitBtn = buttons[buttons.length - 1]
    fireEvent.click(sellSubmitBtn)
    expect(onAddTransaction).toHaveBeenCalledWith(expect.objectContaining({
      type: 'sell', ticker: 'AAPL', qty: 5, price: 200,
    }))
  })

  it('shows sellExceedsHolding error when sell qty > holding qty', () => {
    const holdings = [{ t: 'AAPL', nm: 'Apple', q: 10, b: 150, currency: 'USD' }]
    const onAddTransaction = vi.fn()
    render(
      <I18nextProvider i18n={i18n}>
        <AddHoldingForm onAddTransaction={onAddTransaction} holdings={holdings} />
      </I18nextProvider>
    )
    fireEvent.click(screen.getByText(/매도/i))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'AAPL' } })
    const inputs = screen.getAllByRole('spinbutton')
    fireEvent.change(inputs[0], { target: { value: '99' } })
    fireEvent.change(inputs[1], { target: { value: '200' } })
    const buttons = screen.getAllByRole('button')
    const sellSubmitBtn = buttons[buttons.length - 1]
    fireEvent.click(sellSubmitBtn)
    expect(onAddTransaction).not.toHaveBeenCalled()
    expect(screen.getByText(/초과|Exceeds/i)).toBeTruthy()
  })
})
