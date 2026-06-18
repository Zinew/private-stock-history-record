const illustrations = {
  'what-is-rebalancing': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="48" fill="#1a201d" stroke="#27302c" strokeWidth="2"/>
      <path d="M60 60 L60 14 A46 46 0 0 1 100.8 83 Z" fill="#7fd1ae" opacity=".9"/>
      <path d="M60 60 L100.8 83 A46 46 0 0 1 22.2 92 Z" fill="#d4b483" opacity=".9"/>
      <path d="M60 60 L22.2 92 A46 46 0 0 1 60 14 Z" fill="#5c6660" opacity=".9"/>
      <path d="M60 34 L66 42 M60 34 L54 42" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  'portfolio-diversification': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="70" width="20" height="40" rx="4" fill="#7fd1ae" opacity=".9"/>
      <rect x="35" y="50" width="20" height="60" rx="4" fill="#d4b483" opacity=".9"/>
      <rect x="60" y="30" width="20" height="80" rx="4" fill="#7fd1ae" opacity=".7"/>
      <rect x="85" y="55" width="20" height="55" rx="4" fill="#d4b483" opacity=".7"/>
      <line x1="10" y1="115" x2="110" y2="115" stroke="#27302c" strokeWidth="2"/>
      <path d="M15 65 L45 45 L70 28 L95 50" stroke="#e8654f" strokeWidth="1.5" strokeDasharray="4 2" fill="none"/>
    </svg>
  ),
  'average-cost-calculation': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="15" y1="20" x2="15" y2="100" stroke="#27302c" strokeWidth="2"/>
      <line x1="15" y1="100" x2="110" y2="100" stroke="#27302c" strokeWidth="2"/>
      <circle cx="30" cy="80" r="4" fill="#d4b483"/>
      <circle cx="50" cy="60" r="4" fill="#d4b483"/>
      <circle cx="70" cy="40" r="4" fill="#d4b483"/>
      <circle cx="90" cy="55" r="4" fill="#d4b483"/>
      <line x1="20" y1="58" x2="105" y2="58" stroke="#7fd1ae" strokeWidth="1.5" strokeDasharray="5 3"/>
      <text x="108" y="62" fontSize="8" fill="#7fd1ae">avg</text>
    </svg>
  ),
  'realized-vs-unrealized-pnl': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="30" width="40" height="50" rx="6" fill="#1a201d" stroke="#27302c" strokeWidth="1.5"/>
      <rect x="65" y="30" width="40" height="50" rx="6" fill="#1a201d" stroke="#27302c" strokeWidth="1.5"/>
      <text x="35" y="58" fontSize="10" fill="#3fbf8f" textAnchor="middle">+12%</text>
      <text x="35" y="72" fontSize="7" fill="#8a958e" textAnchor="middle">평가손익</text>
      <text x="85" y="58" fontSize="10" fill="#d4b483" textAnchor="middle">+8%</text>
      <text x="85" y="72" fontSize="7" fill="#8a958e" textAnchor="middle">실현손익</text>
    </svg>
  ),
  'target-weight-setting': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="45" stroke="#27302c" strokeWidth="1.5" fill="none"/>
      <circle cx="60" cy="60" r="32" stroke="#7fd1ae" strokeWidth="1.5" fill="none"/>
      <circle cx="60" cy="60" r="16" stroke="#d4b483" strokeWidth="1.5" fill="none"/>
      <circle cx="60" cy="60" r="4" fill="#d4b483"/>
      <line x1="60" y1="15" x2="60" y2="25" stroke="#7fd1ae" strokeWidth="1.5"/>
      <line x1="60" y1="95" x2="60" y2="105" stroke="#7fd1ae" strokeWidth="1.5"/>
    </svg>
  ),
  'us-stock-for-beginners': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="35" width="80" height="55" rx="8" fill="#1a201d" stroke="#27302c" strokeWidth="1.5"/>
      <text x="60" y="67" fontSize="22" fill="#d4b483" textAnchor="middle" fontFamily="serif">$</text>
      <path d="M25 95 Q60 30 95 95" stroke="#7fd1ae" strokeWidth="1.5" fill="none"/>
      <circle cx="95" cy="95" r="3" fill="#7fd1ae"/>
      <text x="60" y="108" fontSize="7" fill="#8a958e" textAnchor="middle">US STOCK</text>
    </svg>
  ),
  'exchange-rate-impact': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="28" y="58" fontSize="16" fill="#d4b483" textAnchor="middle" fontFamily="serif">₩</text>
      <text x="92" y="58" fontSize="16" fill="#7fd1ae" textAnchor="middle" fontFamily="serif">$</text>
      <path d="M42 50 L62 46 L78 50" stroke="#e9ece9" strokeWidth="1.5" fill="none"/>
      <path d="M78 64 L58 68 L42 64" stroke="#e9ece9" strokeWidth="1.5" fill="none"/>
      <path d="M20 80 Q60 30 100 75" stroke="#5c6660" strokeWidth="1" strokeDasharray="3 3" fill="none"/>
    </svg>
  ),
  'kospi-vs-sp500': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="15" y1="20" x2="15" y2="100" stroke="#27302c" strokeWidth="2"/>
      <line x1="15" y1="100" x2="110" y2="100" stroke="#27302c" strokeWidth="2"/>
      <polyline points="20,80 40,60 60,65 80,40 100,35" stroke="#7fd1ae" strokeWidth="2" fill="none"/>
      <polyline points="20,85 40,75 60,80 80,65 100,55" stroke="#d4b483" strokeWidth="2" fill="none" strokeDasharray="5 3"/>
      <circle cx="15" cy="97" r="2" fill="#7fd1ae"/>
      <text x="20" y="100" fontSize="6" fill="#7fd1ae">S&amp;P</text>
      <circle cx="45" cy="97" r="2" fill="#d4b483"/>
      <text x="50" y="100" fontSize="6" fill="#d4b483">KOSPI</text>
    </svg>
  ),
  'us-etf-guide': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="25" width="90" height="70" rx="8" fill="#1a201d" stroke="#27302c" strokeWidth="1.5"/>
      <rect x="25" y="40" width="30" height="16" rx="4" fill="#7fd1ae" opacity=".8"/>
      <rect x="25" y="62" width="30" height="16" rx="4" fill="#d4b483" opacity=".8"/>
      <rect x="63" y="40" width="30" height="16" rx="4" fill="#7fd1ae" opacity=".5"/>
      <rect x="63" y="62" width="30" height="16" rx="4" fill="#d4b483" opacity=".5"/>
      <text x="40" y="52" fontSize="7" fill="#0c0e0d" textAnchor="middle" fontWeight="bold">SPY</text>
      <text x="40" y="74" fontSize="7" fill="#0c0e0d" textAnchor="middle" fontWeight="bold">QQQ</text>
      <text x="78" y="52" fontSize="7" fill="#0c0e0d" textAnchor="middle" fontWeight="bold">SCHD</text>
      <text x="78" y="74" fontSize="6" fill="#0c0e0d" textAnchor="middle" fontWeight="bold">VTI</text>
    </svg>
  ),
  'tax-basics-for-korean-investors': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="20" width="70" height="85" rx="6" fill="#1a201d" stroke="#27302c" strokeWidth="1.5"/>
      <line x1="35" y1="42" x2="85" y2="42" stroke="#27302c" strokeWidth="1"/>
      <line x1="35" y1="55" x2="85" y2="55" stroke="#27302c" strokeWidth="1"/>
      <line x1="35" y1="68" x2="85" y2="68" stroke="#27302c" strokeWidth="1"/>
      <line x1="35" y1="81" x2="70" y2="81" stroke="#27302c" strokeWidth="1"/>
      <text x="60" y="35" fontSize="8" fill="#d4b483" textAnchor="middle" fontWeight="bold">세금 신고</text>
      <rect x="68" y="72" width="22" height="12" rx="3" fill="#7fd1ae" opacity=".8"/>
      <text x="79" y="81" fontSize="6" fill="#0c0e0d" textAnchor="middle" fontWeight="bold">250만</text>
    </svg>
  ),
}

const DEFAULT_SVG = (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="20" width="80" height="80" rx="12" fill="#1a201d" stroke="#27302c" strokeWidth="1.5"/>
    <text x="60" y="68" fontSize="28" fill="#d4b483" textAnchor="middle">📈</text>
  </svg>
)

export default function ArticleIllustration({ slug, size = 72 }) {
  const svg = illustrations[slug] ?? DEFAULT_SVG
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {svg}
    </div>
  )
}
