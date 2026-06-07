import { useState, useRef, useEffect } from 'react'
import { Line, Doughnut } from 'react-chartjs-2'
import { fmtCurrency, tooltipDeltaLines } from '../utils/format.js'
import { useTranslation } from 'react-i18next'

const PALETTE = ['#7fd1ae','#d4b483','#e8654f','#6aa9d8','#b98fd1','#d8c46a','#5fb0a0','#d88f9e','#9ed86a','#888']

function getGradient(ctx, chartArea, isUp) {
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
  gradient.addColorStop(0, isUp ? 'rgba(63,191,143,.28)' : 'rgba(232,101,79,.28)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  return gradient
}

export default function Charts({ holdings, snaps, totalVal, displayCurrency, toDisplay, onDeleteSnap, onRestoreSnap }) {
  const { t } = useTranslation()
  const [popup, setPopup] = useState(null)
  const [undoState, setUndoState] = useState(null)
  const undoTimerRef = useRef(null)

  useEffect(() => {
    return () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current) }
  }, [])

  useEffect(() => { setPopup(null) }, [snaps])

  const labels = snaps.map(s => s.label)
  const data = snaps.map(s => toDisplay(s.total, s.currency ?? 'USD'))
  const isUp = data.length < 2 || data[data.length - 1] >= data[0]
  const lineColor = isUp ? '#3fbf8f' : '#e8654f'

  function handleChartClick(event, elements, chart) {
    if (!elements.length) { setPopup(null); return }
    const el = elements[0]
    const meta = chart.getDatasetMeta(0)
    const point = meta.data[el.index]
    setPopup({
      index: el.index,
      x: point.x,
      y: point.y,
      label: snaps[el.index].label,
      value: fmtCurrency(data[el.index], displayCurrency),
    })
  }

  function handleDelete() {
    const snap = snaps[popup.index]
    const idx = popup.index
    onDeleteSnap(idx)
    setPopup(null)
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoState({ snap, index: idx })
    undoTimerRef.current = setTimeout(() => setUndoState(null), 5000)
  }

  function handleUndo() {
    clearTimeout(undoTimerRef.current)
    onRestoreSnap(undoState.snap, undoState.index)
    setUndoState(null)
  }

  const lineData = {
    labels,
    datasets: [{
      data,
      borderColor: lineColor,
      backgroundColor: (context) => {
        const chart = context.chart
        const { ctx, chartArea } = chart
        if (!chartArea) return 'transparent'
        return getGradient(ctx, chartArea, isUp)
      },
      fill: true,
      tension: .3,
      pointRadius: 3,
      pointBackgroundColor: lineColor,
      borderWidth: 2,
    }],
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: handleChartClick,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: c => tooltipDeltaLines(c.parsed.y, data[c.dataIndex - 1], displayCurrency),
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(39,48,44,.4)' },
        ticks: { color: '#5c6660', font: { family: 'Spline Sans Mono', size: 10 } },
      },
      y: {
        grid: { color: 'rgba(39,48,44,.4)' },
        ticks: {
          color: '#5c6660',
          font: { family: 'Spline Sans Mono', size: 10 },
          callback: v => displayCurrency === 'KRW'
            ? '₩' + v.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
            : '$' + v.toLocaleString(),
        },
      },
    },
  }

  const pieData = {
    labels: holdings.map(h => h.t),
    datasets: [{
      data: holdings.map(h => toDisplay(h.q * h.c, h.currency ?? 'USD')),
      backgroundColor: PALETTE,
      borderColor: '#141816',
      borderWidth: 2,
    }],
  }

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'right',
        labels: { color: '#8a958e', font: { family: 'Spline Sans Mono', size: 11 }, boxWidth: 10, padding: 10 },
      },
      tooltip: {
        callbacks: {
          label: c => ` ${c.label}: ${fmtCurrency(c.parsed, displayCurrency)} (${totalVal > 0 ? (c.parsed / totalVal * 100).toFixed(1) : 0}%)`,
        },
      },
    },
  }

  return (
    <div className="grid">
      <div className="card">
        <h2>
          {t('charts.trend')} <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>snapshot history</span>
        </h2>
        <div className="chart-box">
          <Line data={lineData} options={lineOptions} />
          {popup && (
            <div
              className="snap-popup"
              style={{ left: popup.x, top: popup.y }}
            >
              <div className="snap-popup-info">{popup.label} · {popup.value}</div>
              <div className="snap-popup-actions">
                <button onClick={() => setPopup(null)}>{t('charts.cancelDelete')}</button>
                <button className="snap-popup-delete" onClick={handleDelete}>{t('charts.deleteSnap')}</button>
              </div>
            </div>
          )}
          {undoState && (
            <div className="snap-undo-toast">
              <span>{t('charts.snapDeleted')}</span>
              <button onClick={handleUndo}>{t('charts.undoDelete')}</button>
            </div>
          )}
        </div>
      </div>
      <div className="card">
        <h2>
          {t('charts.allocation')} <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>by value</span>
        </h2>
        <div className="chart-box">
          <Doughnut data={pieData} options={pieOptions} />
        </div>
      </div>
    </div>
  )
}
