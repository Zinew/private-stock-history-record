import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { usePortfolio } from './hooks/usePortfolio.js'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import NewsPage from './pages/NewsPage.jsx'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler)

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const portfolio = usePortfolio()

  return (
    <div className="wrap">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header
        totalVal={portfolio.totalVal}
        totalCost={portfolio.totalCost}
        pl={portfolio.pl}
        ret={portfolio.ret}
        displayCurrency={portfolio.displayCurrency}
        onToggleCurrency={portfolio.toggleCurrency}
        exchangeRate={portfolio.exchangeRate}
        onMenuOpen={() => setSidebarOpen(true)}
      />
      <Routes>
        <Route path="/" element={<DashboardPage portfolio={portfolio} />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/news" element={<NewsPage />} />
      </Routes>
    </div>
  )
}
