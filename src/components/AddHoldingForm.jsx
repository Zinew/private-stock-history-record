import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchQuote } from '../utils/finnhub.js'
import { fetchKrxQuote } from '../utils/stockSearch.js'
import { useStockSearch } from '../hooks/useStockSearch.js'
import StockSearchField from './StockSearchField.jsx'

export default function AddHoldingForm({ onAddTransaction, holdings = [] }) {
  const { t } = useTranslation()
  const today = new Date().toISOString().slice(0, 10)

  const [type, setType] = useState('buy')
  const [date, setDate] = useState(today)

  const [form, setForm] = useState({ ticker: '', name: '', qty: '', buy: '', cur: '', currency: 'USD', exchange: '' })
  const [priceLoading, setPriceLoading] = useState(false)
  const search = useStockSearch()

  const [sellTicker, setSellTicker] = useState('')
  const [sellQty, setSellQty] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [sellError, setSellError] = useState('')

  function handleNameChange(val) {
    setForm(f => ({ ...f, name: val, ticker: '', exchange: '', cur: '', currency: 'USD' }))
    search.search(val)
  }

  async function handleSelect(item) {
    search.clear()
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
    search.clear()
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
              search.clear()
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
          <StockSearchField
            value={form.name}
            onQueryChange={handleNameChange}
            onSelect={handleSelect}
            results={search.results}
            open={search.open}
            onClose={search.close}
            label={t('addHolding.searchName')}
            badge={
              <>
                {selectedMarket && <span className="market-badge">{form.ticker} · {selectedMarket}</span>}
                {priceLoading && <span style={{ marginLeft: 6, opacity: 0.6 }}>{t('addHolding.loading')}</span>}
              </>
            }
            placeholder="삼성전자 · Apple · AAPL · 005930"
          />
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
              <button className="btn danger" onClick={handleSellSubmit}>{t('tx.sellSubmit')}</button>
            </>
          )}
        </>
      )}
    </div>
  )
}
