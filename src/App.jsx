import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import Header from './components/Header.jsx'
import Charts from './components/Charts.jsx'
import HoldingsTable from './components/HoldingsTable.jsx'
import SnapshotBar from './components/SnapshotBar.jsx'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler)

export default function App() {
  const [holdings, setHoldings] = useLocalStorage('ledger_holdings', [])
  const [snaps, setSnaps] = useLocalStorage('ledger_snaps', [])

  const totalVal = holdings.reduce((s, h) => s + h.q * h.c, 0)
  const totalCost = holdings.reduce((s, h) => s + h.q * h.b, 0)
  const pl = totalVal - totalCost
  const ret = totalCost > 0 ? (pl / totalCost) * 100 : 0

  function addHolding({ t, nm, q, b, c }) {
    setHoldings([...holdings, { t, nm, q, b, c }])
  }

  function delHolding(i) {
    setHoldings(holdings.filter((_, idx) => idx !== i))
  }

  function takeSnapshot() {
    if (holdings.length === 0) { alert('먼저 종목을 추가해 주세요.'); return }
    const d = new Date()
    const label = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    const next = [...snaps, { label, total: totalVal }]
    setSnaps(next.length > 60 ? next.slice(-60) : next)
  }

  function clearSnaps() {
    if (window.confirm('추이 기록을 모두 지울까요?')) setSnaps([])
  }

  return (
    <div className="wrap">
      <Header totalVal={totalVal} totalCost={totalCost} pl={pl} ret={ret} />
      <Charts holdings={holdings} snaps={snaps} totalVal={totalVal} />
      <HoldingsTable
        holdings={holdings}
        totalVal={totalVal}
        onAdd={addHolding}
        onDelete={delHolding}
      />
      <SnapshotBar onSnapshot={takeSnapshot} onClear={clearSnaps} />
      <footer>
        데이터는 이 브라우저에만 저장됩니다 · 투자 판단의 근거가 아닌 기록·시각화 용도입니다<br />
        Ledger v1 — manual entry edition
      </footer>
    </div>
  )
}
