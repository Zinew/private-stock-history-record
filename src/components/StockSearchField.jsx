// 종목 검색 입력 필드 + 드롭다운 (표현 전용 — 검색 상태는 부모의 useStockSearch가 소유)
export default function StockSearchField({
  value, onQueryChange, onSelect,
  results, open, onClose,
  label, badge, placeholder,
}) {
  return (
    <div className="field nm">
      <label>
        {label}
        {badge}
      </label>
      <input
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onChange={e => onQueryChange(e.target.value)}
        onBlur={() => setTimeout(onClose, 150)}
      />
      {open && results.length > 0 && (
        <div className="search-dropdown">
          {results.map(item => (
            <div key={item.symbol} className="search-dropdown-item" onClick={() => onSelect(item)}>
              <span className="search-item-name">{item.name}</span>
              <span className="search-item-meta">{item.ticker} · {item.market}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
