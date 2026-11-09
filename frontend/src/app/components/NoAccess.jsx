// Нет прав — объяснение вместо пустого экрана (п. 8.6 ТЗ, «состояния экранов»).
import { Link } from 'react-router-dom'
import { roleName, useAuth, CAN } from '../auth.js'
import AppHeader from './AppHeader.jsx'

const WHAT = { dashboard: 'Дашборд', editor: 'Редактор точек' }

export default function NoAccess({ what }) {
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  return (
    <>
      <AppHeader />
      <main className="sub-page state-page">
        <h1>Нет доступа</h1>
        <p className="lead">
          Раздел «{WHAT[what]}» доступен ролям: {CAN[what].map(roleName).join(', ')}. Вы вошли как {user?.email} ({roleName(user?.role)}).
        </p>
        <div className="state-actions">
          <Link to="/" className="btn btn-ghost">
            К маршрутам
          </Link>
          <button type="button" className="btn btn-primary" onClick={logout}>
            Войти под другой учётной записью
          </button>
        </div>
      </main>
    </>
  )
}
