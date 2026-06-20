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
  'isa-account-guide': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="25" width="80" height="70" rx="8" fill="#1a201d" stroke="#27302c" strokeWidth="1.5"/>
      <rect x="30" y="38" width="60" height="8" rx="3" fill="#7fd1ae" opacity=".8"/>
      <rect x="30" y="52" width="44" height="5" rx="2" fill="#5c6660" opacity=".7"/>
      <rect x="30" y="62" width="52" height="5" rx="2" fill="#5c6660" opacity=".7"/>
      <circle cx="88" cy="85" r="14" fill="#7fd1ae" opacity=".15" stroke="#7fd1ae" strokeWidth="1.5"/>
      <text x="88" y="89" fontSize="11" fill="#7fd1ae" textAnchor="middle" fontWeight="bold">비과세</text>
    </svg>
  ),
  'pension-savings-irp-guide': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="18" y="60" width="22" height="45" rx="4" fill="#7fd1ae" opacity=".7"/>
      <rect x="48" y="40" width="22" height="65" rx="4" fill="#d4b483" opacity=".8"/>
      <rect x="78" y="20" width="22" height="85" rx="4" fill="#7fd1ae" opacity=".9"/>
      <line x1="12" y1="108" x2="108" y2="108" stroke="#27302c" strokeWidth="2"/>
      <text x="29" y="56" fontSize="7" fill="#7fd1ae" textAnchor="middle">연금</text>
      <text x="59" y="36" fontSize="7" fill="#d4b483" textAnchor="middle">IRP</text>
      <text x="89" y="16" fontSize="7" fill="#7fd1ae" textAnchor="middle">복리</text>
    </svg>
  ),
  'overseas-stock-tax-filing': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="20" width="70" height="85" rx="6" fill="#1a201d" stroke="#27302c" strokeWidth="1.5"/>
      <rect x="35" y="35" width="50" height="6" rx="2" fill="#d4b483" opacity=".8"/>
      <rect x="35" y="48" width="40" height="4" rx="2" fill="#5c6660" opacity=".6"/>
      <rect x="35" y="58" width="45" height="4" rx="2" fill="#5c6660" opacity=".6"/>
      <rect x="35" y="68" width="35" height="4" rx="2" fill="#5c6660" opacity=".6"/>
      <rect x="55" y="82" width="30" height="12" rx="4" fill="#7fd1ae" opacity=".85"/>
      <text x="70" y="91" fontSize="7" fill="#0c0e0d" textAnchor="middle" fontWeight="bold">신고완료</text>
    </svg>
  ),
  'per-pbr-valuation': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="45" cy="60" r="28" fill="#1a201d" stroke="#7fd1ae" strokeWidth="1.5"/>
      <circle cx="75" cy="60" r="28" fill="#1a201d" stroke="#d4b483" strokeWidth="1.5"/>
      <text x="35" y="56" fontSize="9" fill="#7fd1ae" textAnchor="middle" fontWeight="bold">PER</text>
      <text x="35" y="68" fontSize="7" fill="#5c6660" textAnchor="middle">수익</text>
      <text x="85" y="56" fontSize="9" fill="#d4b483" textAnchor="middle" fontWeight="bold">PBR</text>
      <text x="85" y="68" fontSize="7" fill="#5c6660" textAnchor="middle">자산</text>
      <text x="60" y="64" fontSize="7" fill="#fff" textAnchor="middle" opacity=".7">밸류</text>
    </svg>
  ),
  'dividend-reinvestment-compounding': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 95 Q35 80 50 65 Q65 45 80 30 Q90 20 100 15" stroke="#7fd1ae" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <circle cx="30" cy="88" r="4" fill="#d4b483"/>
      <circle cx="55" cy="60" r="5" fill="#d4b483"/>
      <circle cx="80" cy="34" r="6" fill="#d4b483"/>
      <circle cx="100" cy="18" r="7" fill="#7fd1ae" opacity=".9"/>
      <path d="M95 75 L105 65 M105 65 L105 75 M105 65 L95 65" stroke="#7fd1ae" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  'currency-hedged-vs-unhedged-etf': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="45" width="40" height="50" rx="6" fill="#1a201d" stroke="#7fd1ae" strokeWidth="1.5"/>
      <rect x="65" y="45" width="40" height="50" rx="6" fill="#1a201d" stroke="#d4b483" strokeWidth="1.5"/>
      <text x="35" y="65" fontSize="8" fill="#7fd1ae" textAnchor="middle">환노출</text>
      <text x="85" y="65" fontSize="8" fill="#d4b483" textAnchor="middle">환헤지</text>
      <text x="35" y="80" fontSize="7" fill="#5c6660" textAnchor="middle">₩↕$</text>
      <text x="85" y="80" fontSize="7" fill="#5c6660" textAnchor="middle">₩⊜</text>
      <path d="M55 70 L65 70" stroke="#27302c" strokeWidth="1.5" strokeDasharray="3 2"/>
      <text x="60" y="35" fontSize="8" fill="#5c6660" textAnchor="middle">같은 지수</text>
    </svg>
  ),
  'bond-etf-portfolio': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 80 Q35 30 60 40 Q85 50 100 20" stroke="#d4b483" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M20 80 Q40 70 60 75 Q80 80 100 60" stroke="#7fd1ae" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <line x1="15" y1="95" x2="110" y2="95" stroke="#27302c" strokeWidth="1.5"/>
      <circle cx="25" cy="90" r="3" fill="#d4b483"/>
      <text x="35" y="94" fontSize="7" fill="#d4b483">주식</text>
      <circle cx="65" cy="90" r="3" fill="#7fd1ae"/>
      <text x="75" y="94" fontSize="7" fill="#7fd1ae">채권</text>
    </svg>
  ),
  'dca-strategy': (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="18" y="75" width="12" height="30" rx="3" fill="#7fd1ae" opacity=".6"/>
      <rect x="36" y="55" width="12" height="50" rx="3" fill="#7fd1ae" opacity=".7"/>
      <rect x="54" y="65" width="12" height="40" rx="3" fill="#7fd1ae" opacity=".8"/>
      <rect x="72" y="45" width="12" height="60" rx="3" fill="#7fd1ae" opacity=".85"/>
      <rect x="90" y="35" width="12" height="70" rx="3" fill="#7fd1ae" opacity=".9"/>
      <line x1="12" y1="108" x2="108" y2="108" stroke="#27302c" strokeWidth="1.5"/>
      <path d="M24 70 L42 50 L60 60 L78 42 L96 30" stroke="#d4b483" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeDasharray="4 2"/>
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
