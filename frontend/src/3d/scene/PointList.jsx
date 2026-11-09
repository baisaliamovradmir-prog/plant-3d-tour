// Список точек интереса текущей локации. Дублирует метки на сцене: на телефоне по нему проще
// попасть пальцем (п. 8.6 ТЗ: «упрощённая сцена и список точек»), а с клавиатуры — пройти Tab'ом.
export default function PointList({ hotspots, number, selectedId, onSelect }) {
  if (!hotspots?.length) return null
  return (
    <ol className="point-list" aria-label="Точки интереса локации">
      {hotspots.map((h, i) => (
        <li key={h.id}>
          <button
            type="button"
            className={`point-list-item kind-${h.kind || 'info'}${h.id === selectedId ? ' is-active' : ''}`}
            aria-pressed={h.id === selectedId}
            onClick={() => onSelect(h.id)}
          >
            <span className="point-list-no">{number(h, i)}</span>
            <span className="point-list-title">{h.title}</span>
          </button>
        </li>
      ))}
    </ol>
  )
}
