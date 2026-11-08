// Метка точки интереса: HTML-кнопка поверх 3D (drei <Html>), не меньше 44 px для пальца,
// фокус по Tab, Enter открывает карточку (ФТ-6).
import { Html } from '@react-three/drei'

const KIND_LABEL = { info: 'Информация', process: 'Процесс', case: 'Кейс', transition: 'Переход' }

export default function Hotspot({ hotspot, position, number, selected, inRoute, draft, onSelect }) {
  const cls = [
    'hotspot',
    `hotspot--${hotspot.kind || 'info'}`,
    selected && 'is-selected',
    inRoute && 'is-in-route',
    draft && 'is-draft',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Html position={position} center zIndexRange={[15, 5]} style={{ pointerEvents: 'auto' }}>
      <button
        type="button"
        className={cls}
        aria-label={`${hotspot.title}. ${KIND_LABEL[hotspot.kind] || ''}`}
        aria-pressed={selected}
        onClick={(e) => {
          e.stopPropagation()
          onSelect && onSelect(hotspot.id)
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <span className="hotspot-dot">{draft ? '+' : number}</span>
        <span className="hotspot-title">{hotspot.title}</span>
      </button>
    </Html>
  )
}
