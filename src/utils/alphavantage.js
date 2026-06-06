export async function fetchEarningsCalendar(apiKey = import.meta.env.VITE_ALPHAVANTAGE_KEY ?? '') {
  if (!apiKey) return []
  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&horizon=3month&apikey=${apiKey}`
    )
    const csv = await res.text()
    const lines = csv.trim().split('\n')
    if (lines.length < 2) return []
    return lines.slice(1)
      .map(line => {
        const parts = line.split(',')
        return {
          symbol: parts[0]?.trim(),
          reportDate: parts[2]?.trim(),
          estimate: parts[4] ? parseFloat(parts[4]) : null,
        }
      })
      .filter(e => e.symbol && e.reportDate)
  } catch {
    return []
  }
}
