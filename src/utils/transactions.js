function sortByDate(transactions) {
  return [...transactions].sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return -1
    if (!b.date) return 1
    return a.date.localeCompare(b.date)
  })
}

export function migrateHoldingsToTransactions(holdings) {
  return holdings.map(h => {
    const tx = {
      id: crypto.randomUUID(),
      type: 'buy',
      ticker: h.t,
      name: h.nm ?? h.t,
      currency: h.currency ?? 'USD',
      date: null,
      qty: h.q,
      price: h.b ?? 0,
    }
    if (h.exchange) tx.exchange = h.exchange
    return tx
  })
}

export function deriveHoldings(transactions) {
  const map = {}
  const sorted = sortByDate(transactions)
  for (const tx of sorted) {
    if (!map[tx.ticker]) {
      map[tx.ticker] = { ticker: tx.ticker, name: tx.name, currency: tx.currency, exchange: tx.exchange ?? null, qty: 0, totalCost: 0 }
    }
    if (tx.type === 'buy') {
      map[tx.ticker].qty += tx.qty
      map[tx.ticker].totalCost += tx.qty * tx.price
    } else {
      const avg = map[tx.ticker].qty > 0 ? map[tx.ticker].totalCost / map[tx.ticker].qty : 0
      map[tx.ticker].qty -= tx.qty
      map[tx.ticker].totalCost -= avg * tx.qty
    }
  }
  return Object.values(map)
    .filter(h => h.qty > 0.0001)
    .map(h => ({
      t: h.ticker,
      nm: h.name,
      q: h.qty,
      b: h.totalCost / h.qty,
      currency: h.currency,
      ...(h.exchange ? { exchange: h.exchange } : {}),
    }))
}

export function deriveRealizedGains(transactions) {
  const avgCosts = {}
  const realized = []
  const sorted = sortByDate(transactions)
  for (const tx of sorted) {
    if (!avgCosts[tx.ticker]) avgCosts[tx.ticker] = { qty: 0, totalCost: 0 }
    if (tx.type === 'buy') {
      avgCosts[tx.ticker].qty += tx.qty
      avgCosts[tx.ticker].totalCost += tx.qty * tx.price
    } else {
      const avgCost = avgCosts[tx.ticker].qty > 0
        ? avgCosts[tx.ticker].totalCost / avgCosts[tx.ticker].qty
        : 0
      realized.push({
        id: tx.id,
        ticker: tx.ticker,
        date: tx.date,
        qty: tx.qty,
        sellPrice: tx.price,
        avgCost,
        gain: (tx.price - avgCost) * tx.qty,
        currency: tx.currency,
      })
      avgCosts[tx.ticker].qty -= tx.qty
      avgCosts[tx.ticker].totalCost -= avgCost * tx.qty
    }
  }
  return realized
}
