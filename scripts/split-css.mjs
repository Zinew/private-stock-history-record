import fs from 'node:fs'

const SRC = 'src/index.css'
const DRY = process.argv.includes('--dry')
const text = fs.readFileSync(SRC, 'utf8')
const lines = text.split('\n')

// [출력파일, 시작줄, 끝줄] — 1-based, 양끝 포함. src/index.css의 섹션 주석 기준.
const SEGMENTS = [
  ['base.css', 1, 30],          // 폰트 @import, :root, 리셋, body, .wrap
  ['layout.css', 31, 70],       // header, .brand, .summary
  ['base.css', 71, 94],         // .pos/.neg, .grid(+840px), .card
  ['charts.css', 95, 96],       // .chart-box
  ['holdings.css', 97, 214],    // .holdings, table, .tick, .edit/.del, .addbar, .field, .btn
  ['charts.css', 215, 222],     // .snapbar
  ['base.css', 223, 232],       // footer
  ['layout.css', 233, 266],     // currency-toggle, rate-bar
  ['modal.css', 267, 353],      // .modal-*, search-dropdown
  ['layout.css', 354, 453],     // 사이드바, .menu-btn
  ['pages.css', 454, 465],      // .placeholder-page
  ['holdings.css', 466, 537],   // holdings-header, refresh, price-error, market-badge, ticker-error
  ['modal.css', 538, 544],      // .modal-title
  ['holdings.css', 545, 550],   // .auto-label
  ['layout.css', 551, 559],     // .header-right
  ['calendar.css', 560, 728],   // CalendarPage 전체
  ['news.css', 729, 826],       // NewsPage 전체
  ['layout.css', 827, 853],     // 언어 토글
  ['charts.css', 854, 921],     // snapshot delete popup + undo toast
  ['holdings.css', 922, 933],   // Transaction History, sell mode
  ['charts.css', 934, 936],     // BackupBar
  ['pages.css', 937, 1019],     // Static pages + 404
  ['layout.css', 1020, 1038],   // 사이드바 sub-nav
  ['holdings.css', 1039, 1059], // empty state, retry 버튼
  ['mobile.css', 1060, 1232],   // 모바일 카드뷰 + 640px 미디어쿼리
  ['holdings.css', 1233, 1241], // .cash-row
  ['rebalancing.css', 1242, 1330], // 리밸런싱 카드 + 모바일 카드
  ['modal.css', 1331, 1348],    // EditModal 목표비중 행
  ['mobile.css', 1349, 1355],   // 2x2 stats 미디어쿼리 (1355 = trailing newline)
]

// import 순서 — mobile.css가 반드시 마지막 (모바일 오버라이드가 데스크톱 규칙 뒤에 와야 함)
const ORDER = ['base.css', 'layout.css', 'holdings.css', 'modal.css', 'charts.css',
  'rebalancing.css', 'calendar.css', 'news.css', 'pages.css', 'mobile.css']

let failed = false
function fail(msg) { console.error('FAIL: ' + msg); failed = true }

// ── 검증 1: 전체 줄 커버리지 (빠짐/중복 없음) ──
const covered = new Array(lines.length + 1).fill(0)
for (const [, s, e] of SEGMENTS) for (let i = s; i <= e; i++) covered[i]++
for (let i = 1; i <= lines.length; i++) {
  if (covered[i] !== 1) fail(`line ${i} covered ${covered[i]} times: ${lines[i - 1]}`)
}

// ── 출력 조립 (세그먼트는 원본 등장 순서 유지) ──
const out = {}
for (const [file, s, e] of SEGMENTS) {
  (out[file] ??= []).push(lines.slice(s - 1, e).join('\n'))
}

// ── 검증 2: 파일별 중괄호 균형 (규칙 중간 절단 감지) ──
for (const file of ORDER) {
  if (!out[file]) { fail(`no segments for ${file}`); continue }
  let depth = 0
  for (const ch of out[file].join('\n')) {
    if (ch === '{') depth++
    if (ch === '}') depth--
    if (depth < 0) break
  }
  if (depth !== 0) fail(`${file}: unbalanced braces (depth ${depth}) — 세그먼트 경계가 규칙 중간을 자름`)
}

// ── 검증 3: 교차 파일 중복 셀렉터 리포트 (최상위 레벨만) ──
const selToFiles = new Map()
for (const file of ORDER) {
  if (!out[file]) continue
  let depth = 0
  for (const raw of out[file].join('\n').split('\n')) {
    const line = raw.trim()
    if (depth === 0 && /^[.#a-zA-Z*:\[][^{]*\{/.test(line) && !line.startsWith('@')) {
      const sel = line.slice(0, line.indexOf('{')).trim()
      if (!selToFiles.has(sel)) selToFiles.set(sel, new Set())
      selToFiles.get(sel).add(file)
    }
    for (const ch of line) { if (ch === '{') depth++; if (ch === '}') depth-- }
  }
}
for (const [sel, files] of selToFiles) {
  if (files.size > 1) fail(`selector "${sel}" in multiple files: ${[...files].join(', ')}`)
}

if (failed) { console.error('\n검증 실패 — 파일을 쓰지 않음'); process.exit(1) }
console.log(`OK: ${lines.length} lines → ${ORDER.length} files, braces balanced, no cross-file duplicate selectors`)

if (DRY) { console.log('(dry run — 파일 미생성)'); process.exit(0) }

// ── 파일 생성 ──
fs.mkdirSync('src/styles', { recursive: true })
for (const file of ORDER) {
  fs.writeFileSync(`src/styles/${file}`, out[file].join('\n\n') + '\n')
}
fs.writeFileSync(SRC, ORDER.map(f => `@import './styles/${f}';`).join('\n') + '\n')
console.log('생성 완료: src/styles/ 10개 파일 + src/index.css 교체')
