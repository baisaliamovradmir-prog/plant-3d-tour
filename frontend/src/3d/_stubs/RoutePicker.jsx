// ВРЕМЕННО: заглушка ветки 3d. Экран выбора маршрута (экран 2) сделает фронтенд.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, API_MODE } from '../api/client.js'

export default function RoutePicker() {
  const [routes, setRoutes] = useState([])
  const [enterprise, setEnterprise] = useState(null)

  useEffect(() => {
    api.getRoutes().then(setRoutes)
    api.getEnterprise().then(setEnterprise)
  }, [])

  return (
    <main className="picker">
      <header className="picker-head">
        <p className="eyebrow">3D-тур по предприятию</p>
        <h1>{enterprise ? enterprise.name : 'Загрузка…'}</h1>
        {enterprise && <p className="lead">{enterprise.description}</p>}
      </header>
      <h2>Выберите маршрут</h2>
      <div className="route-grid">
        {routes.map((r) => (
          <Link key={r.id} to={`/tour/${r.id}`} className="route-card">
            <span className="route-audience">{r.audience}</span>
            <strong>{r.name}</strong>
            <span>{r.description}</span>
            <span className="route-meta">
              {r.steps_count} точек · ~{r.duration_min} мин
            </span>
          </Link>
        ))}
      </div>
      <p className="picker-free">
        <Link to="/tour">Свободный осмотр завода</Link> · <Link to="/tour?edit=1">Редактор точек</Link>
      </p>
      <p className="picker-note">Данные синтетические{API_MODE === 'mock' ? ' (режим заглушек, без бэкенда)' : ''}.</p>
    </main>
  )
}
