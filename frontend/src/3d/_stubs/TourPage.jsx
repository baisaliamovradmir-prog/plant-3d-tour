// ВРЕМЕННО: заглушка ветки 3d. Страница тура (экран 4): верхняя панель, холст 3D,
// текст гида с «Далее / Назад» и карточка точки. Вёрстку экрана сделает фронтенд.
import { useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../api/client.js'
import { useTourStore } from '../store/tourStore.js'
import TourCanvas from '../scene/TourCanvas.jsx'
import HotspotPanel from './HotspotPanel.jsx'
import RouteProgress from './RouteProgress.jsx'

export default function TourPage() {
  const { routeId } = useParams()
  const [params] = useSearchParams()
  const route = useTourStore((s) => s.route)
  const startRoute = useTourStore((s) => s.startRoute)
  const stopRoute = useTourStore((s) => s.stopRoute)
  const editMode = useTourStore((s) => s.editMode)
  const setEditMode = useTourStore((s) => s.setEditMode)
  const textMode = useTourStore((s) => s.textMode)
  const setTextMode = useTourStore((s) => s.setTextMode)

  useEffect(() => {
    if (params.get('edit') === '1') setEditMode(true)
  }, [params, setEditMode])

  useEffect(() => {
    if (!routeId) {
      if (route) stopRoute()
      return
    }
    // при возврате с экрана процесса или кейса маршрут продолжается с того же шага
    if (route && route.id === Number(routeId)) return
    api.getRoute(routeId).then((r) => r && startRoute(r))
  }, [routeId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="tour-page">
      <header className="tour-top">
        <Link to="/" className="btn btn-ghost" aria-label="К выбору маршрута">
          ←
        </Link>
        <div className="tour-top-title">
          <strong>{route ? route.name : 'Свободный осмотр'}</strong>
          {route && <span>{route.audience}</span>}
        </div>
        <div className="tour-top-actions">
          <button type="button" className={`btn btn-ghost${textMode ? ' is-on' : ''}`} onClick={() => setTextMode(!textMode)}>
            Текст
          </button>
          <button type="button" className={`btn btn-ghost${editMode ? ' is-on' : ''}`} onClick={() => setEditMode(!editMode)}>
            Редактор
          </button>
        </div>
      </header>
      <div className="tour-stage">
        <TourCanvas />
        {!textMode && <HotspotPanel />}
      </div>
      {route && !textMode && <RouteProgress />}
    </div>
  )
}
