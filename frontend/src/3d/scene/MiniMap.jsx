// Мини-карта поверх сцены: локации по map_x/map_y, линия маршрута, текущая локация подсвечена,
// клик по локации — переход (ФТ-8). Под картой — меню локаций; на узком экране оно
// сворачивается в кнопку «Локации», чтобы не закрывать сцену.
import { useState } from 'react'

export default function MiniMap({ locations, currentId, routeLocationIds = [], bottleneckLocationId, onSelect }) {
  const [open, setOpen] = useState(false)
  const points = locations.filter((l) => l.scene_type !== 'overview')
  const overview = locations.find((l) => l.scene_type === 'overview')
  const byId = Object.fromEntries(points.map((l) => [l.id, l]))
  const current = locations.find((l) => l.id === currentId)
  // линия маршрута по порядку уникальных локаций (без генплана)
  const path = routeLocationIds.filter((id, i, a) => byId[id] && a.indexOf(id) === i).map((id) => byId[id])
  const go = (id) => {
    setOpen(false)
    onSelect(id)
  }

  return (
    <nav className={`minimap${open ? ' is-open' : ''}`} aria-label="Мини-карта завода">
      <svg viewBox="0 0 100 70" role="img" aria-hidden="true">
        <rect x="1" y="1" width="98" height="68" rx="4" className="minimap-bg" />
        <line x1="2" x2="98" y1={58} y2={58} className="minimap-road" />
        {path.length > 1 && <polyline points={path.map((l) => `${l.map_x},${l.map_y * 0.7}`).join(' ')} className="minimap-route" />}
        {points.map((l) => {
          const active = l.id === currentId
          return (
            <g
              key={l.id}
              className={`minimap-node${active ? ' is-active' : ''}${routeLocationIds.includes(l.id) ? ' in-route' : ''}${bottleneckLocationId === l.id ? ' is-hot' : ''}`}
              transform={`translate(${l.map_x} ${l.map_y * 0.7})`}
              onClick={() => go(l.id)}
            >
              <circle r={active ? 5 : 3.8} />
              <title>{l.name}</title>
            </g>
          )
        })}
      </svg>
      <button type="button" className="minimap-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span>{current ? current.name : 'Локации'}</span>
        <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      <div className="minimap-list">
        {overview && (
          <button type="button" className={currentId === overview.id ? 'is-active' : ''} onClick={() => go(overview.id)}>
            {overview.name}
          </button>
        )}
        {points.map((l) => (
          <button key={l.id} type="button" className={`${l.id === currentId ? 'is-active' : ''}${bottleneckLocationId === l.id ? ' is-hot' : ''}`} onClick={() => go(l.id)}>
            {l.name}
          </button>
        ))}
      </div>
    </nav>
  )
}
