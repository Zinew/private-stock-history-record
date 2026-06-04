import { Line, Doughnut } from 'react-chartjs-2'
import { fmt } from '../utils/format.js'

const PALETTE = ['#7fd1ae','#d4b483','#e8654f','#6aa9d8','#b98fd1','#d8c46a','#5fb0a0','#d88f9e','#9ed86a','#888']

function getGradient(ctx, chartArea, isUp) {
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
  gradient.addColorStop(0, isUp ? 'rgba(63,191,143,.28)' : 'rgba(232,101,79,.28)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  return gradient
}

export default function Charts({ holdings, snaps, totalVal }) {
  const labels = snaps.map(s => s.label)
  const data = snaps.map(s => s.total)
  const isUp = data.length < 2 || data[data.length - 1] >= data[0]
  const lineColor = isUp ? '#3fbf8f' : '#e8654f'

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
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: c => ' ' + fmt(c.parsed.y) } },
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
          callback: v => '$' + v.toLocaleString(),
        },
      },
    },
  }

  const pieData = {
    labels: holdings.map(h => h.t),
    datasets: [{
      data: holdings.map(h => h.q * h.c),
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
          label: c => ` ${c.label}: ${fmt(c.parsed)} (${totalVal > 0 ? (c.parsed / totalVal * 100).toFixed(1) : 0}%)`,
        },
      },
    },
  }

  return (
    <div className="grid">
      <div className="card">
        <h2>
          자산 추이 <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>snapshot history</span>
        </h2>
        <div className="chart-box">
          <Line data={lineData} options={lineOptions} />
        </div>
      </div>
      <div className="card">
        <h2>
          종목 비중 <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>by value</span>
        </h2>
        <div className="chart-box">
          <Doughnut data={pieData} options={pieOptions} />
        </div>
      </div>
    </div>
  )
}
