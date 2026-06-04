export default function SnapshotBar({ onSnapshot, onClear }) {
  return (
    <div className="card snapbar" style={{ marginBottom: 20 }}>
      <button className="btn ghost" onClick={onSnapshot}>📸 오늘 자산 기록하기</button>
      <button className="btn ghost" onClick={onClear}>추이 초기화</button>
      <span className="note">
        버튼을 누를 때마다 현재 총 평가액이 추이 그래프에 점으로 쌓입니다.
        며칠에 걸쳐 눌러두면 상승/하락 이력이 그려져요.
      </span>
    </div>
  )
}
