// Метка точки интереса: HTML-кнопка поверх 3D (drei <Html>), не меньше 44 px для пальца,
// фокус по Tab, Enter открывает карточку (ФТ-6).
// В 3D-сценах у метки есть «ножка» до пола и кольцо на полу — видно, к какому месту она относится.
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { reducedMotion } from './procedural/parts.jsx'

const KIND_LABEL = { info: 'Информация', process: 'Процесс', case: 'Кейс', transition: 'Переход' }
const KIND_COLOR = { case: '#1e8a5f', default: '#2e6fd0' }
const ACTIVE = '#d9480f'

function Stem({ height, color, active }) {
  const ring = useRef()
  useFrame(({ clock }) => {
    if (!ring.current) return
    const t = reducedMotion ? 0.3 : (clock.elapsedTime % 2) / 2
    const s = 0.6 + t * (active ? 1.6 : 1.1)
    ring.current.scale.set(s, s, 1)
    ring.current.material.opacity = (active ? 0.9 : 0.6) * (1 - t)
  })
  if (height <= 0.3) return null
  return (
    <group>
      <mesh position={[0, -height / 2, 0]}>
        <cylinderGeometry args={[0.035, 0.035, height, 6]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.95 : 0.55} toneMapped={false} />
      </mesh>
      <mesh position={[0, -height + 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.22, 20]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={ring} position={[0, -height + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.7, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

export default function Hotspot({ hotspot, position, number, selected, inRoute, draft, stem = false, onSelect }) {
  const cls = [
    'hotspot',
    `hotspot--${hotspot.kind || 'info'}`,
    selected && 'is-selected',
    inRoute && 'is-in-route',
    draft && 'is-draft',
  ]
    .filter(Boolean)
    .join(' ')
  const active = selected || inRoute
  const color = active ? ACTIVE : KIND_COLOR[hotspot.kind] || KIND_COLOR.default

  return (
    <group position={position}>
      {stem && <Stem height={position[1]} color={color} active={active} />}
      <Html center zIndexRange={[15, 5]} style={{ pointerEvents: 'auto' }}>
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
    </group>
  )
}
