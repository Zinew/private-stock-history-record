/**
 * @param {Array<{t: string, nm: string, displayVal: number}>} allRows
 * @param {Object<string, number>} targetWeights
 * @param {number} totalVal
 * @returns {Array<{ticker, nm, currentPct, targetPct, diffPct, action, amount}>}
 */
export function computeRebalancing(allRows, targetWeights, totalVal) {
  if (!totalVal || totalVal <= 0) return []
  return allRows
    .filter(row => targetWeights[row.t] != null)
    .map(row => {
      const currentPct = isFinite(row.displayVal) ? (row.displayVal / totalVal) * 100 : 0
      const targetPct = targetWeights[row.t]
      const diffPct = targetPct - currentPct
      const amount = Math.abs(diffPct / 100 * totalVal)
      const isCash = row.t === 'cash'
      let action
      if (Math.abs(diffPct) < 0.01) action = 'hold'
      else if (isCash) action = diffPct > 0 ? 'hold_cash' : 'use_cash'
      else action = diffPct > 0 ? 'buy' : 'sell'
      return { ticker: row.t, nm: row.nm, currentPct, targetPct, diffPct, action, amount }
    })
}

export function totalTargetWeight(targetWeights) {
  return Object.values(targetWeights).reduce((s, v) => s + (Number(v) || 0), 0)
}
