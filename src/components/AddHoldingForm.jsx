import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchQuote } from '../utils/finnhub.js'
import { fetchUsdSearch, fetchKrxSearch, fetchKrxQuote } from '../utils/stockSearch.js'

export default function AddHoldingForm({ onAddTransaction, holdings = [] }) {
  const { t } = useTranslation()
  const today = new Date().toISOString().slice(0, 10)

  const [type, setType] = useState('buy')
  const [date, setDate] = useState(today)

  const [form, setForm] = useState({ ticker: '', name: '', qty: '', buy: '', cur: '', currency: 'USD', exchange: '' })
  const [priceLoading, setPriceLoading] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [searchOpen, setSearchOpen] = useState(false)
  const debounceRef = useRef(null)

  const [sellTicker, setSellTicker] = useState('')
  const [sellQty, setSellQty] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [sellError, setSellError] = useState('')

  useEffect(() => { return () => clearTimeout(debounceRef.current) }, [])

  function handleNameChange(e) {
    const val = e.target.value
    setForm(f => ({ ...f, name: val, ticker: '', exchange: '', cur: '', currency: 'USD' }))
    clearTimeout(debounceRef.current)
    if (!val.trim()) { setSearchResults([]); setSearchOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      const [krwResults, usdResults] = await Promise.all([
        fetchKrxSearch(val),
        fetchUsdSearch(val),
      ])
      const all = [
        ...krwResults.map(r => ({ ...r, market: r.exchange === 'KS' ? 'KOSPI' : 'KOSDAQ' })),
        ...usdResults.map(r => ({ ...r, market: 'US' })),
      ].slice(0, 8)
      setSearchResults(all)
      setSearchOpen(all.length > 0)
    }, 300)
  }

  async function handleSelect(item) {
    setSearchOpen(false)
    setSearchResults([])
    const isKRW = !!item.exchange
    const currency = isKRW ? 'KRW' : 'USD'
    setForm(f => ({ ...f, name: item.name, ticker: item.ticker, currency, exchange: item.exchange || '', cur: '' }))
    setPriceLoading(true)
    const price = isKRW
      ? await fetchKrxQuote(item.ticker, item.exchange)
      : await fetchQuote(item.ticker)
    setPriceLoading(false)
    if (price !== null) setForm(f => f.ticker !== item.ticker ? f : { ...f, cur: String(price) })
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
    clearTimeout(debounceRef.current)
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
    setForm({ ticker: '', name: '', qty: '', buy: '', cur: '', currency: 'USD', exchange: '' })
    setPriceLoading(false)
    setSearchResults([])
    setSearchOpen(false)
    setDate(today)
  }

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

  const selectedMarket = form.ticker
    ? (form.exchange === 'KS' ? 'KOSPI' : form.exchange === 'KQ' ? 'KOSDAQ' : 'US')
    : null

  return (
    <div className="addbar">
      <div className="field">
        <label>{t('tx.type')}</label>
        <div className="currency-toggle">
          <button
            className={`currency-btn ${type === 'buy' ? 'active' : ''}`}
            onClick={() => {
              setType('buy')
              setSellError('')
              setSellTicker('')
              setSellQty('')
              setSellPrice('')
            }}
          >{t('tx.buy')}</button>
          <button
            className={`currency-btn ${type === 'sell' ? 'active sell-btn' : ''}`}
            onClick={() => {
              setType('sell')
              setSellError('')
              setForm({ ticker: '', name: '', qty: '', buy: '', cur: '', currency: 'USD', exchange: '' })
              setPriceLoading(false)
              setSearchResults([])
              setSearchOpen(false)
              clearTimeout(debounceRef.current)
            }}
          >{t('tx.sell')}</button>
        </div>
      </div>

      <div className="field">
        <label>{t('tx.date')}</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      {type === 'buy' ? (
        <>
          <div className="field nm">
            <label>
              {t('addHolding.searchName')}
              {selectedMarket && <span className="market-badge">{form.ticker} · {selectedMarket}</span>}
              {priceLoading && <span style={{ marginLeft: 6, opacity: 0.6 }}>{t('addHolding.loading')}</span>}
            </label>
            <input
              placeholder="삼성전자 · Apple · AAPL · 005930"
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
                    <span className="search-item-meta">{item.ticker} · {item.market}</span>
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
            <input type="number" step="any" placeholder="150" value={form.buy} onChange={e => setForm(f => ({ ...f, buy: e.target.value }))} />
          </div>
          <div className="field">
            <label>{t('addHolding.currentPrice')}</label>
            <input
              type="number" step="any" placeholder="190"
              value={form.cur}
              onChange={e => setForm(f => ({ ...f, cur: e.target.value }))}
            />
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
