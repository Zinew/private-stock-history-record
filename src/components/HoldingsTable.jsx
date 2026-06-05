import { useState } from 'react'
import { fmtCurrency, pct } from '../utils/format.js'
import { fetchQuote } from '../utils/finnhub.js'

export default function HoldingsTable({
  holdings, totalVal, onAdd, onDelete, displayCurrency, toDisplay,
  prices = {}, priceLoading = false, priceError = null, lastUpdatedAt = null, onRefresh = () => {},
}) {
  const [form, setForm] = useState({ ticker: '', name: '', qty: '', buy: '', cur: '', currency: 'USD' })
  const [tickerStatus, setTickerStatus] = useState('idle') // 'idle' | 'loading' | 'found' | 'error'

  const isKRW = form.currency === 'KRW'
  const hasUsdHoldings = holdings.some(h => (h.currency ?? 'USD') === 'USD')
  const dispSym = displayCurrency === 'KRW' ? '₩' : '$'

  async function handleTickerBlur() {
    const ticker = form.ticker.trim().toUpperCase()
    if (!ticker || form.currency !== 'USD') return
    setTickerStatus('loading')
    setForm(f => ({ ...f, cur: '' }))
    const price = await fetchQuote(ticker)
    // Use functional updaters to detect if ticker changed while fetch was in-flight
    setForm(f => {
      if (f.ticker.trim().toUpperCase() !== ticker) return f // stale result, discard
      return { ...f, cur: price !== null ? String(price) : '' }
    })
    setTickerStatus(prev => {
      if (prev !== 'loading') return prev // user typed new ticker (reset to idle), ignore
      return price !== null ? 'found' : 'error'
    })
  }

  function handleAdd() {
    const t = form.ticker.trim().toUpperCase()
    const nm = form.name.trim()
    const q = parseFloat(form.qty)
    const b = parseFloat(form.buy)
    const c = parseFloat(form.cur)
    if (!t || !(q > 0) || !(b >= 0) || !(c >= 0)) {
      alert('티커·수량·매수가·현재가를 올바르게 입력해 주세요.')
      return
    }
    onAdd({ t, nm, q, b, c, currency: form.currency })
    setForm({ ticker: '', name: '', qty: '', buy: '', cur: '', currency: form.currency })
    setTickerStatus('idle')
  }

  function formatUpdatedAt(date) {
    if (!date) return null
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="holdings">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <h2 style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ink-dim)', margin: 0 }}>
          보유 종목
        </h2>
        {hasUsdHoldings && (
          <>
            <button
              onClick={onRefresh}
              disabled={priceLoading}
              title="주가 새로고침"
              style={{ background: 'none', border: '1px solid var(--ink-dim)', borderRadius: 4, color: 'var(--ink-dim)', cursor: priceLoading ? 'default' : 'pointer', fontSize: 12, padding: '2px 8px', opacity: priceLoading ? 0.5 : 1 }}
            >
              ↻
            </button>
            {lastUpdatedAt && (
              <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: 'var(--ink-faint)' }}>
                {formatUpdatedAt(lastUpdatedAt)} 기준
              </span>
            )}
          </>
        )}
      </div>

      {priceError && (
        <div style={{ background: 'rgba(232,101,79,.12)', border: '1px solid rgba(232,101,79,.3)', borderRadius: 6, color: '#e8654f', fontSize: 12, marginBottom: 12, padding: '6px 12px' }}>
          ⚠ {priceError}
        </div>
      )}

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>종목</th><th>수량</th><th>매수가</th><th>현재가</th>
              <th>평가액 ({dispSym})</th><th>손익 ({dispSym})</th><th>수익률</th><th>비중</th><th></th>
            </tr>
          </thead>
          <tbody>
            {holdings.length === 0 ? (
              <tr><td colSpan={9} className="empty">아직 종목이 없습니다. 아래에서 첫 종목을 추가해 보세요.</td></tr>
            ) : (
              holdings.map((h, i) => {
                const hCur = h.currency ?? 'USD'
                const val = toDisplay(h.q * h.c, hCur)
                const cost = toDisplay(h.q * h.b, hCur)
                const p = val - cost
                const r = cost > 0 ? p / cost * 100 : 0
                const w = totalVal > 0 ? val / totalVal * 100 : 0
                const isLive = hCur === 'USD' && prices[h.t] !== undefined
                return (
                  <tr key={i}>
                    <td>
                      <span className="tick">
                        {h.t}
                        {h.nm && <small>{h.nm}</small>}
                      </span>
                    </td>
                    <td>{h.q.toLocaleString()}</td>
                    <td>{fmtCurrency(h.b, hCur)}</td>
                    <td>
                      {isLive && <span style={{ color: '#3fbf8f', fontSize: 9, marginRight: 3 }}>●</span>}
                      {fmtCurrency(h.c, hCur)}
                    </td>
                    <td>{fmtCurrency(val, displayCurrency)}</td>
                    <td className={p >= 0 ? 'pos' : 'neg'}>{fmtCurrency(p, displayCurrency)}</td>
                    <td className={r >= 0 ? 'pos' : 'neg'}>{pct(r)}</td>
                    <td>{w.toFixed(1)}%</td>
                    <td>
                      <button className="del" onClick={() => onDelete(i)} title="삭제">✕</button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="addbar">
        <div className="field tk">
          <label>티커</label>
          <input
            placeholder="AAPL"
            value={form.ticker}
            onChange={e => {
              setForm(f => ({ ...f, ticker: e.target.value }))
              if (tickerStatus !== 'idle') setTickerStatus('idle')
            }}
            onBlur={handleTickerBlur}
          />
        </div>
        <div className="field">
          <label>통화</label>
          <div className="currency-toggle">
            <button
              className={`currency-btn ${form.currency === 'USD' ? 'active' : ''}`}
              onClick={() => { setForm(f => ({ ...f, currency: 'USD' })); setTickerStatus('idle') }}
            >USD</button>
            <button
              className={`currency-btn ${form.currency === 'KRW' ? 'active' : ''}`}
              onClick={() => { setForm(f => ({ ...f, currency: 'KRW' })); setTickerStatus('idle') }}
            >KRW</button>
          </div>
        </div>
        <div className="field nm">
          <label>이름(선택)</label>
          <input
            placeholder="Apple Inc."
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="field">
          <label>수량</label>
          <input
            type="number" step="any" placeholder="10"
            value={form.qty}
            onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
          />
        </div>
        <div className="field">
          <label>매수단가</label>
          <input
            type="number" step="any"
            placeholder={isKRW ? '75000' : '150'}
            value={form.buy}
            onChange={e => setForm(f => ({ ...f, buy: e.target.value }))}
          />
        </div>
        <div className="field">
          <label>현재가{tickerStatus === 'loading' ? ' 조회 중…' : ''}</label>
          <input
            type="number" step="any"
            placeholder={isKRW ? '82000' : '190'}
            value={form.cur}
            readOnly={tickerStatus === 'found'}
            style={tickerStatus === 'found' ? { opacity: 0.7 } : {}}
            onChange={e => {
              if (tickerStatus === 'found') return
              setForm(f => ({ ...f, cur: e.target.value }))
            }}
          />
          {tickerStatus === 'error' && (
            <span style={{ color: '#e8654f', fontSize: 10, display: 'block', marginTop: 2 }}>
              티커를 찾을 수 없습니다
            </span>
          )}
        </div>
        <button className="btn" onClick={handleAdd}>+ 추가</button>
      </div>
    </div>
  )
}
