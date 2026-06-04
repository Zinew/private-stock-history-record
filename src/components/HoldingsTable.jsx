import { useState } from 'react'
import { fmt, pct } from '../utils/format.js'

export default function HoldingsTable({ holdings, totalVal, onAdd, onDelete }) {
  const [form, setForm] = useState({ ticker: '', name: '', qty: '', buy: '', cur: '' })

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
    onAdd({ t, nm, q, b, c })
    setForm({ ticker: '', name: '', qty: '', buy: '', cur: '' })
  }

  return (
    <div className="holdings">
      <h2 style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ink-dim)', marginBottom: 14 }}>
        보유 종목
      </h2>
      <table>
        <thead>
          <tr>
            <th>종목</th><th>수량</th><th>매수가</th><th>현재가</th>
            <th>평가액</th><th>손익</th><th>수익률</th><th>비중</th><th></th>
          </tr>
        </thead>
        <tbody>
          {holdings.length === 0 ? (
            <tr><td colSpan={9} className="empty">아직 종목이 없습니다. 아래에서 첫 종목을 추가해 보세요.</td></tr>
          ) : (
            holdings.map((h, i) => {
              const val = h.q * h.c
              const cost = h.q * h.b
              const p = val - cost
              const r = cost > 0 ? p / cost * 100 : 0
              const w = totalVal > 0 ? val / totalVal * 100 : 0
              return (
                <tr key={i}>
                  <td>
                    <span className="tick">
                      {h.t}
                      {h.nm && <small>{h.nm}</small>}
                    </span>
                  </td>
                  <td>{h.q.toLocaleString()}</td>
                  <td>{fmt(h.b)}</td>
                  <td>{fmt(h.c)}</td>
                  <td>{fmt(val)}</td>
                  <td className={p >= 0 ? 'pos' : 'neg'}>{fmt(p)}</td>
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

      <div className="addbar">
        <div className="field tk">
          <label>티커</label>
          <input
            placeholder="AAPL"
            value={form.ticker}
            onChange={e => setForm(f => ({ ...f, ticker: e.target.value }))}
          />
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
            type="number" step="any" placeholder="150"
            value={form.buy}
            onChange={e => setForm(f => ({ ...f, buy: e.target.value }))}
          />
        </div>
        <div className="field">
          <label>현재가</label>
          <input
            type="number" step="any" placeholder="190"
            value={form.cur}
            onChange={e => setForm(f => ({ ...f, cur: e.target.value }))}
          />
        </div>
        <button className="btn" onClick={handleAdd}>+ 추가</button>
      </div>
    </div>
  )
}
