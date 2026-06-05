import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import HoldingsTable from '../../components/HoldingsTable.jsx'
import { fetchQuote } from '../../utils/finnhub.js'
import { fetchUsdSearch, fetchKrxSearch, fetchKrxQuote } from '../../utils/stockSearch.js'

vi.mock('../../utils/finnhub.js', () => ({ fetchQuote: vi.fn() }))
vi.mock('../../utils/stockSearch.js', () => ({
  fetchUsdSearch: vi.fn(),
  fetchKrxSearch: vi.fn(),
  fetchKrxQuote: vi.fn(),
}))

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

describe('HoldingsTable', () => {
  beforeEach(() => vi.clearAllMocks())

  it('종목 없을 때 빈 안내 메시지 표시', () => {
    render(<HoldingsTable {...defaultProps} />)
    expect(screen.getByText(/종목이 없습니다/)).toBeInTheDocument()
  })

  it('종목 티커 표시', () => {
    render(<HoldingsTable {...defaultProps} holdings={mockHoldings} totalVal={1900} />)
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('삭제 버튼 클릭 시 onDelete 호출', () => {
    const onDelete = vi.fn()
    render(<HoldingsTable {...defaultProps} holdings={mockHoldings} totalVal={1900} onDelete={onDelete} />)
    fireEvent.click(screen.getByTitle('삭제'))
    expect(onDelete).toHaveBeenCalledWith(0)
  })

  it('폼 입력 후 추가 버튼 클릭 시 onAdd에 currency 포함', () => {
    const onAdd = vi.fn()
    render(<HoldingsTable {...defaultProps} onAdd={onAdd} />)
    fireEvent.change(screen.getByPlaceholderText('AAPL'), { target: { value: 'TSLA' } })
    fireEvent.change(screen.getByPlaceholderText('10'), { target: { value: '5' } })
    fireEvent.change(screen.getByPlaceholderText('150'), { target: { value: '200' } })
    fireEvent.change(screen.getByPlaceholderText('190'), { target: { value: '250' } })
    fireEvent.click(screen.getByText('+ 추가'))
    expect(onAdd).toHaveBeenCalledWith({ t: 'TSLA', nm: '', q: 5, b: 200, c: 250, currency: 'USD' })
  })

  it('폼 통화 KRW 선택 후 추가 시 currency: KRW', () => {
    const onAdd = vi.fn()
    render(<HoldingsTable {...defaultProps} onAdd={onAdd} />)
    fireEvent.click(screen.getByText('KRW'))
    fireEvent.change(screen.getByPlaceholderText('AAPL'), { target: { value: '005930' } })
    fireEvent.change(screen.getByPlaceholderText('10'), { target: { value: '10' } })
    fireEvent.change(screen.getByPlaceholderText('75000'), { target: { value: '75000' } })
    fireEvent.change(screen.getByPlaceholderText('82000'), { target: { value: '82000' } })
    fireEvent.click(screen.getByText('+ 추가'))
    expect(onAdd).toHaveBeenCalledWith({ t: '005930', nm: '', q: 10, b: 75000, c: 82000, currency: 'KRW' })
  })

  it('테이블이 table-scroll 래퍼 안에 존재한다', () => {
    const { container } = render(<HoldingsTable {...defaultProps} />)
    const wrapper = container.querySelector('.table-scroll')
    expect(wrapper).toBeInTheDocument()
    expect(wrapper.querySelector('table')).toBeInTheDocument()
  })

  it('USD 티커 blur 시 fetchQuote 호출 후 현재가 자동 입력', async () => {
    fetchQuote.mockResolvedValueOnce(195.5)
    render(<HoldingsTable {...defaultProps} />)
    const tickerInput = screen.getByPlaceholderText('AAPL')
    fireEvent.change(tickerInput, { target: { value: 'AAPL' } })
    fireEvent.blur(tickerInput)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('190').value).toBe('195.5')
    })
    expect(fetchQuote).toHaveBeenCalledWith('AAPL')
  })

  it('USD 티커 blur 시 fetchQuote null 반환 → 현재가 비워짐', async () => {
    fetchQuote.mockResolvedValueOnce(null)
    render(<HoldingsTable {...defaultProps} />)
    const tickerInput = screen.getByPlaceholderText('AAPL')
    fireEvent.change(tickerInput, { target: { value: 'INVALID' } })
    fireEvent.blur(tickerInput)
    await waitFor(() => {
      expect(screen.getByText(/티커를 찾을 수 없습니다/)).toBeInTheDocument()
    })
  })

  it('KRW 선택 시 티커 blur에서 fetchQuote 호출하지 않음', async () => {
    render(<HoldingsTable {...defaultProps} />)
    fireEvent.click(screen.getByText('KRW'))
    const tickerInput = screen.getByPlaceholderText('AAPL')
    fireEvent.change(tickerInput, { target: { value: '005930' } })
    fireEvent.blur(tickerInput)
    expect(fetchQuote).not.toHaveBeenCalled()
  })

  it('✎ 버튼 클릭 시 EditModal 표시', () => {
    render(<HoldingsTable {...defaultProps} holdings={mockHoldings} rawHoldings={mockHoldings} totalVal={1900} />)
    fireEvent.click(screen.getByTitle('수정'))
    expect(screen.getByText('AAPL 수정')).toBeInTheDocument()
  })

  it('EditModal 저장 시 onEdit 올바른 인덱스·patch로 호출', () => {
    const onEdit = vi.fn()
    render(<HoldingsTable {...defaultProps} holdings={mockHoldings} rawHoldings={mockHoldings} totalVal={1900} onEdit={onEdit} />)
    fireEvent.click(screen.getByTitle('수정'))
    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: '15' } })
    fireEvent.click(screen.getByText('저장'))
    expect(onEdit).toHaveBeenCalledWith(0, { nm: 'Apple Inc.', q: 15, b: 150, c: 190 })
  })

  it('EditModal 취소 시 모달 사라짐', () => {
    render(<HoldingsTable {...defaultProps} holdings={mockHoldings} rawHoldings={mockHoldings} totalVal={1900} />)
    fireEvent.click(screen.getByTitle('수정'))
    expect(screen.getByText('AAPL 수정')).toBeInTheDocument()
    fireEvent.click(screen.getByText('취소'))
    expect(screen.queryByText('AAPL 수정')).not.toBeInTheDocument()
  })

  // USD 이름 검색
  it('USD: 이름 입력 시 fetchUsdSearch 호출', async () => {
    fetchUsdSearch.mockResolvedValue([
      { symbol: 'AAPL', name: 'Apple Inc.', ticker: 'AAPL' },
    ])
    render(<HoldingsTable {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText('Apple Inc.'), { target: { value: 'apple' } })
    await waitFor(() => expect(fetchUsdSearch).toHaveBeenCalledWith('apple'), { timeout: 500 })
  })

  it('USD: 드롭다운 선택 시 티커·이름 자동 입력', async () => {
    fetchUsdSearch.mockResolvedValue([
      { symbol: 'AAPL', name: 'Apple Inc.', ticker: 'AAPL' },
    ])
    fetchQuote.mockResolvedValue(195.5)
    render(<HoldingsTable {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText('Apple Inc.'), { target: { value: 'apple' } })
    await waitFor(() => expect(screen.getByText('Apple Inc.')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Apple Inc.'))
    await waitFor(() => expect(screen.getByPlaceholderText('AAPL').value).toBe('AAPL'))
  })

  it('USD: 종목 선택 후 추가 시 onAdd에 올바른 값 전달', async () => {
    fetchUsdSearch.mockResolvedValue([
      { symbol: 'AAPL', name: 'Apple Inc.', ticker: 'AAPL' },
    ])
    fetchQuote.mockResolvedValue(195.5)
    const onAdd = vi.fn()
    render(<HoldingsTable {...defaultProps} onAdd={onAdd} />)
    fireEvent.change(screen.getByPlaceholderText('Apple Inc.'), { target: { value: 'apple' } })
    await waitFor(() => expect(screen.getByText('Apple Inc.')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Apple Inc.'))
    await waitFor(() => expect(screen.getByPlaceholderText('AAPL').value).toBe('AAPL'))
    fireEvent.change(screen.getByPlaceholderText('10'), { target: { value: '3' } })
    fireEvent.change(screen.getByPlaceholderText('150'), { target: { value: '180' } })
    fireEvent.click(screen.getByText('+ 추가'))
    expect(onAdd).toHaveBeenCalledWith({ t: 'AAPL', nm: 'Apple Inc.', q: 3, b: 180, c: 195.5, currency: 'USD' })
  })

  // KRW 이름 검색
  it('KRW: 이름 입력 시 fetchKrxSearch 호출', async () => {
    fetchKrxSearch.mockResolvedValue([
      { symbol: '005930.KS', name: '삼성전자', ticker: '005930', exchange: 'KS' },
    ])
    render(<HoldingsTable {...defaultProps} />)
    fireEvent.click(screen.getByText('KRW'))
    fireEvent.change(screen.getByPlaceholderText('삼성전자'), { target: { value: '삼성' } })
    await waitFor(() => expect(fetchKrxSearch).toHaveBeenCalledWith('삼성'), { timeout: 500 })
  })

  it('KRW: 드롭다운 선택 시 티커·이름·거래소 자동 입력', async () => {
    fetchKrxSearch.mockResolvedValue([
      { symbol: '005930.KS', name: '삼성전자', ticker: '005930', exchange: 'KS' },
    ])
    fetchKrxQuote.mockResolvedValue(329000)
    render(<HoldingsTable {...defaultProps} />)
    fireEvent.click(screen.getByText('KRW'))
    fireEvent.change(screen.getByPlaceholderText('삼성전자'), { target: { value: '삼성' } })
    await waitFor(() => expect(screen.getByText('삼성전자')).toBeInTheDocument())
    fireEvent.click(screen.getByText('삼성전자'))
    await waitFor(() => expect(screen.getByPlaceholderText('AAPL').value).toBe('005930'))
  })

  it('KRW: 종목 선택 후 추가 시 onAdd에 exchange 포함', async () => {
    fetchKrxSearch.mockResolvedValue([
      { symbol: '005930.KS', name: '삼성전자', ticker: '005930', exchange: 'KS' },
    ])
    fetchKrxQuote.mockResolvedValue(329000)
    const onAdd = vi.fn()
    render(<HoldingsTable {...defaultProps} onAdd={onAdd} />)
    fireEvent.click(screen.getByText('KRW'))
    fireEvent.change(screen.getByPlaceholderText('삼성전자'), { target: { value: '삼성' } })
    await waitFor(() => expect(screen.getByText('삼성전자')).toBeInTheDocument())
    fireEvent.click(screen.getByText('삼성전자'))
    await waitFor(() => expect(screen.getByPlaceholderText('AAPL').value).toBe('005930'))
    fireEvent.change(screen.getByPlaceholderText('10'), { target: { value: '5' } })
    fireEvent.change(screen.getByPlaceholderText('75000'), { target: { value: '75000' } })
    fireEvent.click(screen.getByText('+ 추가'))
    expect(onAdd).toHaveBeenCalledWith({
      t: '005930', nm: '삼성전자', q: 5, b: 75000, c: 329000, currency: 'KRW', exchange: 'KS',
    })
  })
})
