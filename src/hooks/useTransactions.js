import { useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage.js'
import { migrateHoldingsToTransactions, deriveHoldings, deriveRealizedGains } from '../utils/transactions.js'

// 일회성 마이그레이션: 구버전 ledger_holdings → ledger_transactions (usePortfolio에서 이동, import 시 1회 실행)
function runMigrationIfNeeded() {
  if (localStorage.getItem('ledger_migration_v1')) return
  localStorage.setItem('ledger_migration_v1', '1')
  const rawHoldings = localStorage.getItem('ledger_holdings')
  if (!rawHoldings) return
  try {
    const holdings = JSON.parse(rawHoldings)
    if (!holdings.length) return
    const migrated = migrateHoldingsToTransactions(holdings)
    localStorage.setItem('ledger_transactions', JSON.stringify(migrated))
    localStorage.removeItem('ledger_holdings')
  } catch {
    localStorage.removeItem('ledger_holdings')
  }
}

runMigrationIfNeeded()

// 거래 원장 훅 — ledger_transactions 저장과 보유종목/실현손익 파생을 소유.
// 스냅샷 트리거(snapAfterTx)는 모름 — 그 신호는 usePortfolio가 addTransaction을 래핑해 처리
export function useTransactions() {
  const [transactions, setTransactions] = useLocalStorage('ledger_transactions', [])

  const holdings = useMemo(() => deriveHoldings(transactions), [transactions])
  const realizedGains = useMemo(() => deriveRealizedGains(transactions), [transactions])

  function addTransaction({ type, ticker, name, currency, exchange, date, qty, price }) {
    const tx = {
      id: crypto.randomUUID(),
      type,
      ticker: ticker.toUpperCase(),
      name,
      currency,
      date: date || null,
      qty,
      price,
    }
    if (exchange) tx.exchange = exchange
    setTransactions([...transactions, tx])
  }

  function deleteTransaction(id) {
    setTransactions(transactions.filter(tx => tx.id !== id))
  }

  function editTransaction(id, patch) {
    setTransactions(transactions.map(tx =>
      tx.id === id ? { ...tx, ...patch } : tx
    ))
  }

  function delHolding(i) {
    const ticker = holdings[i].t
    setTransactions(transactions.filter(tx => tx.ticker !== ticker))
  }

  function editHolding(i, patch) {
    if (!patch.nm) return
    const ticker = holdings[i].t
    setTransactions(transactions.map(tx =>
      tx.ticker === ticker ? { ...tx, name: patch.nm } : tx
    ))
  }

  return { transactions, holdings, realizedGains, addTransaction, deleteTransaction, editTransaction, delHolding, editHolding }
}
