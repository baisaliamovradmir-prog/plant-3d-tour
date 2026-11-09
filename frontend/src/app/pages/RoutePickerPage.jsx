// Выбор маршрута (экран 2, ФТ-3): карточки маршрутов — для кого, сколько точек, сколько минут.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, API_MODE } from '../../3d'
import AppHeader from '../components/AppHeader.jsx'


export default function RoutePickerPage() {
  const [routes, setRoutes] = useState(null)
  const [enterprise, setEnterprise] = useState(null)
  const [error, setError] = useState(null)

  const load = () => {
    setError(null)
    api.getRoutes().then(setRoutes).catch((e) => setError(e.message))
    api.getEnterprise().then(setEnterprise).catch(() => {})
  }
  useEffect(load, [])

  return (
    <>
      <AppHeader />
      <main className="picker">
        <header className="picker-head">
          <p className="eyebrow">3D-тур по предприятию</p>
          <h1>{enterprise ? enterprise.name : 'Завод'}</h1>
          {enterprise && <p className="lead">{enterprise.description}</p>}
        </header>
        <h2>Выберите маршрут</h2>
        {error && (
          <div className="state-inline">
            <p className="form-error">Не удалось загрузить маршруты: {error}</p>
            <button type="button" className="btn btn-ghost" onClick={load}>
              Повторить
            </button>
          </div>
        )}
        <div className="route-grid">
          {routes == null && !error && [1, 2, 3].map((i) => <div key={i} className="route-card skeleton" style={{ height: 170 }} />)}
          {routes?.map((r) => (
            <Link key={r.id} to={`/tour/${r.id}`} className="route-card">
              <span className="route-audience">
                {r.audience}
              </span>
              <strong>{r.name}</strong>
              <span>{r.description}</span>
              <span className="route-meta">
                {r.steps_count} точек · ~{r.duration_min} мин
              </span>
              <span className="route-go">Начать маршрут →</span>
            </Link>
          ))}
          {routes?.length === 0 && <p className="empty">Опубликованных маршрутов пока нет.</p>}
        </div>
        <section className="picker-free">
          <Link to="/tour" className="btn btn-ghost">
            Свободный осмотр завода
          </Link>
          <span className="picker-note">без гида: генплан, все цеха и точки интереса</span>
        </section>
        <p className="picker-note">Данные синтетические{API_MODE === 'mock' ? ' (режим заглушек, без бэкенда)' : ''}.</p>
      </main>
    </>
  )
}
