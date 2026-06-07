import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchQuote } from '../utils/finnhub.js'
import { fetchUsdSearch, fetchKrxSearch, fetchKrxQuote } from '../utils/stockSearch.js'

export default function AddHoldingForm({ onAddTransaction, holdings = [] }) {
  const { t } = useTranslation()
  const today = new Date().toISOString().slice(0, 10)

  // 공통
  const [type, setType] = useState('buy')
  const [date, setDate] = useState(today)

  // 매수 전용
  const [form, setForm] = useState({ ticker: '', name: '', qty: '', buy: '', cur: '', currency: 'USD', exchange: '' })
  const [tickerStatus, setTickerStatus] = useState('idle')
  const [searchResults, setSearchResults] = useState([])
  const [searchOpen, setSearchOpen] = useState(false)
  const debounceRef = useRef(null)

  // 매도 전용
  const [sellTicker, setSellTicker] = useState('')
  const [sellQty, setSellQty] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [sellError, setSellError] = useState('')

  const isKRW = form.currency === 'KRW'

  // ──── 매수 핸들러 (기존 로직 그대로) ────

  async function handleTickerBlur() {
    const ticker = form.ticker.trim().toUpperCase()
    if (!ticker || form.currency !== 'USD') return
    setTickerStatus('loading')
    setForm(f => ({ ...f, cur: '' }))
    const price = await fetchQuote(ticker)
    setForm(f => {
      if (f.ticker.trim().toUpperCase() !== ticker) return f
      return { ...f, cur: price !== null ? String(price) : '' }
    })
    setTickerStatus(prev => prev !== 'loading' ? prev : price !== null ? 'found' : 'error')
  }

  function handleNameChange(e) {
    const val = e.target.value
    setForm(f => ({ ...f, name: val, ticker: '', exchange: '', cur: '' }))
    setTickerStatus('idle')
    clearTimeout(debounceRef.current)
    if (!val.trim()) { setSearchResults([]); setSearchOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      const results = isKRW ? await fetchKrxSearch(val) : await fetchUsdSearch(val)
      setSearchResults(results)
      setSearchOpen(results.length > 0)
    }, 300)
  }

  async function handleSelect(item) {
    setSearchOpen(false)
    setSearchResults([])
    if (isKRW) {
      setForm(f => ({ ...f, name: item.name, ticker: item.ticker, exchange: item.exchange, cur: '' }))
      const price = await fetchKrxQuote(item.ticker, item.exchange)
      if (price !== null) setForm(f => f.ticker !== item.ticker ? f : { ...f, cur: String(price) })
    } else {
      setForm(f => ({ ...f, name: item.name, ticker: item.ticker, cur: '' }))
      setTickerStatus('loading')
      const price = await fetchQuote(item.ticker)
      setForm(f => f.ticker !== item.ticker ? f : { ...f, cur: price !== null ? String(price) : '' })
      setTickerStatus(price !== null ? 'found' : 'error')
    }
  }

  function handleBuySubmit() {
    const ticker = form.ticker.trim().toUpperCase()
    const nm = form.name.trim()
    const qty = parseFloat(form.qty)
    const price = parseFloat(form.buy)
    const cur = parseFloat(form.cur)
    if (!ticker || !(qty > 0) || !(price >= 0) || !(cur >= 0)) {
      alert(t('addHolding.validationError'))
      return
    }
    onAddTransaction({
      type: 'buy',
      ticker,
      name: nm,
      currency: form.currency,
      exchange: form.exchange || undefined,
      date,
      qty,
      price,
    })
    setForm({ ticker: '', name: '', qty: '', buy: '', cur: '', currency: form.currency, exchange: '' })
    setTickerStatus('idle')
    setSearchResults([])
    setSearchOpen(false)
    setDate(today)
  }

  // ──── 매도 핸들러 ────

  function handleSellSubmit() {
    setSellError('')
    const holding = holdings.find(h => h.t === sellTicker)
    const qty = parseFloat(sellQty)
    const price = parseFloat(sellPrice)
    if (!sellTicker || !(qty > 0) || !(price >= 0)) {
      alert(t('addHolding.validationError'))
      return
    }
    if (holding && qty > holding.q) {
      setSellError(t('tx.sellExceedsHolding'))
      return
    }
    onAddTransaction({
      type: 'sell',
      ticker: sellTicker,
      name: holding?.nm ?? sellTicker,
      currency: holding?.currency ?? 'USD',
      exchange: holding?.exchange || undefined,
      date,
      qty,
      price,
    })
    setSellTicker('')
    setSellQty('')
    setSellPrice('')
    setSellError('')
    setDate(today)
  }

  return (
    <div className="addbar">
      {/* 매수/매도 토글 */}
      <div className="field">
        <label>{t('tx.type')}</label>
        <div className="currency-toggle">
          <button
            className={`currency-btn ${type === 'buy' ? 'active' : ''}`}
            onClick={() => { setType('buy'); setSellError('') }}
          >{t('tx.buy')}</button>
          <button
            className={`currency-btn ${type === 'sell' ? 'active sell-btn' : ''}`}
            onClick={() => { setType('sell'); setSellError('') }}
          >{t('tx.sell')}</button>
        </div>
      </div>

      {/* 날짜 (공통) */}
      <div className="field">
        <label>{t('tx.date')}</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      {type === 'buy' ? (
        <>
          <div className="field tk">
            <label>{t('addHolding.ticker')}</label>
            <input
              placeholder="AAPL"
              value={form.ticker}
              readOnly={!!form.exchange || (tickerStatus === 'found' && !!form.ticker)}
              style={(!!form.exchange || tickerStatus === 'found') ? { opacity: 0.6 } : {}}
              onChange={e => {
                if (form.exchange) return
                setForm(f => ({ ...f, ticker: e.target.value }))
                if (tickerStatus !== 'idle') setTickerStatus('idle')
              }}
              onBlur={handleTickerBlur}
            />
          </div>
          <div className="field">
            <label>{t('addHolding.currency')}</label>
            <div className="currency-toggle">
              <button
                className={`currency-btn ${form.currency === 'USD' ? 'active' : ''}`}
                onClick={() => {
                  setForm(f => ({ ...f, currency: 'USD', exchange: '', ticker: '', name: '', cur: '' }))
                  setTickerStatus('idle'); setSearchOpen(false); setSearchResults([])
                }}
              >USD</button>
              <button
                className={`currency-btn ${form.currency === 'KRW' ? 'active' : ''}`}
                onClick={() => {
                  setForm(f => ({ ...f, currency: 'KRW', exchange: '', ticker: '', name: '', cur: '' }))
                  setTickerStatus('idle'); setSearchOpen(false); setSearchResults([])
                }}
              >KRW</button>
            </div>
          </div>
          <div className="field nm">
            <label>{t('addHolding.searchName')}</label>
            <input
              placeholder={isKRW ? t('addHolding.searchPlaceholderKRW') : 'Apple Inc.'}
              value={form.name}
              autoComplete="off"
              onChange={handleNameChange}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
            />
            {searchOpen && searchResults.length > 0 && (
              <div className="search-dropdown">
                {searchResults.map(item => (
                  <div key={item.symbol} className="search-dropdown-item" onClick={() => handleSelect(item)}>
                    <span className="search-item-name">{item.name}</span>
                    <span className="search-item-meta">
                      {item.ticker}{item.exchange ? ` · ${item.exchange === 'KS' ? 'KOSPI' : 'KOSDAQ'}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="field">
            <label>{t('addHolding.qty')}</label>
            <input type="number" step="any" placeholder="10" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
          </div>
          <div className="field">
            <label>{t('addHolding.avgCost')}</label>
            <input type="number" step="any" placeholder={isKRW ? '75000' : '150'} value={form.buy} onChange={e => setForm(f => ({ ...f, buy: e.target.value }))} />
          </div>
          <div className="field">
            <label>{t('addHolding.currentPrice')}{tickerStatus === 'loading' ? ` ${t('addHolding.loading')}` : ''}</label>
            <input
              type="number" step="any" placeholder={isKRW ? '82000' : '190'}
              value={form.cur}
              readOnly={tickerStatus === 'found'}
              style={tickerStatus === 'found' ? { opacity: 0.7 } : {}}
              onChange={e => { if (tickerStatus !== 'found') setForm(f => ({ ...f, cur: e.target.value })) }}
            />
            {tickerStatus === 'error' && <span className="ticker-error">{t('addHolding.notFound')}</span>}
          </div>
          <button className="btn" onClick={handleBuySubmit}>{t('addHolding.addButton')}</button>
        </>
      ) : (
        <>
          {holdings.length === 0 ? (
            <p className="news-empty">{t('tx.noHoldingsToSell')}</p>
          ) : (
            <>
              <div className="field">
                <label>{t('addHolding.ticker')}</label>
                <select value={sellTicker} onChange={e => { setSellTicker(e.target.value); setSellError('') }}>
                  <option value="">--</option>
                  {holdings.map(h => (
                    <option key={h.t} value={h.t}>{h.t}{h.nm && h.nm !== h.t ? ` · ${h.nm}` : ''} ({h.q.toLocaleString()}주)</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>{t('tx.qty')}</label>
                <input type="number" step="any" placeholder="5" value={sellQty} onChange={e => { setSellQty(e.target.value); setSellError('') }} />
                {sellError && <span className="ticker-error">{sellError}</span>}
              </div>
              <div className="field">
                <label>{t('tx.price')}</label>
                <input type="number" step="any" placeholder="200" value={sellPrice} onChange={e => setSellPrice(e.target.value)} />
              </div>
              <button className="btn" onClick={handleSellSubmit}>{t('tx.sell')}</button>
            </>
          )}
        </>
      )}
    </div>
  )
}
