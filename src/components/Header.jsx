import { fmt, pct } from '../utils/format.js'

export default function Header({ totalVal, totalCost, pl, ret }) {
  return (
    <header>
      <div className="brand">
        <h1>Ledger<span className="dot">.</span></h1>
        <span className="tag">portfolio tracker · v1</span>
      </div>
      <div className="summary">
        <div className="sum-item">
          <div className="label">총 평가액</div>
          <div className="val">{fmt(totalVal)}</div>
        </div>
        <div className="sum-item">
          <div className="label">총 매입액</div>
          <div className="val">{fmt(totalCost)}</div>
        </div>
        <div className="sum-item">
          <div className="label">평가손익</div>
          <div className={`val ${pl >= 0 ? 'pos' : 'neg'}`}>{pl >= 0 ? '+' : ''}{fmt(pl)}</div>
        </div>
        <div className="sum-item">
          <div className="label">수익률</div>
          <div className={`val ${ret >= 0 ? 'pos' : 'neg'}`}>{pct(ret)}</div>
        </div>
      </div>
    </header>
  )
}
