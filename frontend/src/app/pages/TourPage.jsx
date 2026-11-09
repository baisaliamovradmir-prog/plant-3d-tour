// Страница тура (экран 4): верхняя панель, холст 3D, текст гида с «Далее / Назад», карточка точки.
// Режим редактора точек (/tour?edit=1) доступен редактору и администратору.
import { useEffect } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, useTourStore, TourCanvas } from '../../3d'
import { can, useAuth } from '../auth.js'
import HotspotPanel from '../components/HotspotPanel.jsx'
import RouteProgress from '../components/RouteProgress.jsx'

export default function TourPage() {
  const { routeId } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const route = useTourStore((s) => s.route)
  const startRoute = useTourStore((s) => s.startRoute)
  const stopRoute = useTourStore((s) => s.stopRoute)
  const editMode = useTourStore((s) => s.editMode)
  const setEditMode = useTourStore((s) => s.setEditMode)
  const textMode = useTourStore((s) => s.textMode)
  const setTextMode = useTourStore((s) => s.setTextMode)
  const canEdit = can(user, 'editor')

  // ?edit=1 включает редактор; без прав — на вход с возвратом сюда
  useEffect(() => {
    if (params.get('edit') !== '1') return
    if (!user) navigate(`/login?next=${encodeURIComponent('/tour?edit=1')}`, { replace: true })
    else if (canEdit) setEditMode(true)
    else setParams({}, { replace: true })
  }, [params, user, canEdit, navigate, setEditMode, setParams])

  // выход из учётки редактора выключает режим правки
  useEffect(() => {
    if (!canEdit && editMode) setEditMode(false)
  }, [canEdit, editMode, setEditMode])

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
          <span>{route ? route.audience : 'весь завод, без гида'}</span>
        </div>
        <div className="tour-top-actions">
          <button type="button" className={`btn btn-ghost${textMode ? ' is-on' : ''}`} aria-pressed={textMode} onClick={() => setTextMode(!textMode)}>
            Текст
          </button>
          {canEdit && (
            <button type="button" className={`btn btn-ghost${editMode ? ' is-on' : ''}`} aria-pressed={editMode} onClick={() => setEditMode(!editMode)}>
              Редактор
            </button>
          )}
          {can(user, 'dashboard') && (
            <Link to="/dashboard" className="btn btn-ghost hide-sm">
              Дашборд
            </Link>
          )}
          {!user && (
            <Link to="/login?next=/tour" className="btn btn-ghost hide-sm">
              Войти
            </Link>
          )}
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
