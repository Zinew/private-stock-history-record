import { useState, useEffect } from 'react'

export default function EditModal({ holding, onSave, onClose }) {
  const [form, setForm] = useState({
    nm: holding.nm ?? '',
    q:  String(holding.q),
    b:  String(holding.b),
    c:  String(holding.c),
  })

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleSave() {
    const q = parseFloat(form.q)
    const b = parseFloat(form.b)
    const c = parseFloat(form.c)
    if (!(q > 0) || !(b >= 0) || !(c >= 0)) {
      alert('수량·매수가·현재가를 올바르게 입력해 주세요.')
      return
    }
    onSave({ nm: form.nm.trim(), q, b, c })
  }

  const isKRW = (holding.currency ?? 'USD') === 'KRW'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 13, letterSpacing: 1, marginBottom: 20 }}>
          {holding.t} 수정
        </h3>
        <div className="modal-field">
          <label>이름(선택)</label>
          <input value={form.nm} onChange={e => setForm(f => ({ ...f, nm: e.target.value }))} />
        </div>
        <div className="modal-field">
          <label>수량</label>
          <input type="number" step="any" value={form.q} onChange={e => setForm(f => ({ ...f, q: e.target.value }))} />
        </div>
        <div className="modal-field">
          <label>매수단가</label>
          <input type="number" step="any" value={form.b} onChange={e => setForm(f => ({ ...f, b: e.target.value }))} />
        </div>
        <div className="modal-field">
          <label>
            현재가
            {!isKRW && <span style={{ color: 'var(--ink-faint)', fontSize: 10, marginLeft: 6 }}>API 자동</span>}
          </label>
          <input
            type="number" step="any"
            value={form.c}
            readOnly={!isKRW}
            style={!isKRW ? { opacity: 0.4 } : {}}
            onChange={e => { if (isKRW) setForm(f => ({ ...f, c: e.target.value })) }}
          />
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={handleSave}>저장</button>
          <button className="btn ghost" onClick={onClose}>취소</button>
        </div>
      </div>
    </div>
  )
}
