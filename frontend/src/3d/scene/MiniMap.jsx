// Мини-карта поверх сцены: локации по map_x/map_y, линия маршрута, текущая локация подсвечена,
// клик по локации — переход (ФТ-8).
export default function MiniMap({ locations, currentId, routeLocationIds = [], bottleneckLocationId, onSelect }) {
  const points = locations.filter((l) => l.scene_type !== 'overview')
  const overview = locations.find((l) => l.scene_type === 'overview')
  const byId = Object.fromEntries(points.map((l) => [l.id, l]))
  // линия маршрута по порядку уникальных локаций (без генплана)
  const path = routeLocationIds.filter((id, i, a) => byId[id] && a.indexOf(id) === i).map((id) => byId[id])

  return (
    <nav className="minimap" aria-label="Мини-карта завода">
      <svg viewBox="0 0 100 70" role="img" aria-hidden="true">
        <rect x="1" y="1" width="98" height="68" rx="4" className="minimap-bg" />
        <line x1="2" x2="98" y1={58} y2={58} className="minimap-road" />
        {path.length > 1 && (
          <polyline
            points={path.map((l) => `${l.map_x},${l.map_y * 0.7}`).join(' ')}
            className="minimap-route"
          />
        )}
        {points.map((l) => {
          const active = l.id === currentId
          return (
            <g
              key={l.id}
              className={`minimap-node${active ? ' is-active' : ''}${routeLocationIds.includes(l.id) ? ' in-route' : ''}${bottleneckLocationId === l.id ? ' is-hot' : ''}`}
              transform={`translate(${l.map_x} ${l.map_y * 0.7})`}
              onClick={() => onSelect(l.id)}
            >
              <circle r={active ? 5 : 3.8} />
              <title>{l.name}</title>
            </g>
          )
        })}
      </svg>
      <div className="minimap-list">
        {overview && (
          <button type="button" className={currentId === overview.id ? 'is-active' : ''} onClick={() => onSelect(overview.id)}>
            {overview.name}
          </button>
        )}
        {points.map((l) => (
          <button key={l.id} type="button" className={l.id === currentId ? 'is-active' : ''} onClick={() => onSelect(l.id)}>
            {l.name}
          </button>
        ))}
      </div>
    </nav>
  )
}
