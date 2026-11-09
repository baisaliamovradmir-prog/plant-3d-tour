// Шапка страниц вне тура: название завода, навигация по разделам, вход и выход.
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { DEMO_USERS } from '../../3d'
import { can, roleName, useAuth } from '../auth.js'

export default function AppHeader() {
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const deleteAccount = useAuth((s) => s.deleteAccount)
  const navigate = useNavigate()
  const isDemo = user && DEMO_USERS.some((u) => u.email === user.email)

  async function onDelete() {
    if (!window.confirm('Удалить аккаунт и данные (e-mail, имя)? Действие необратимо.')) return
    try {
      await deleteAccount()
      navigate('/')
    } catch (e) {
      window.alert(`Не удалось удалить аккаунт: ${e.message}`)
    }
  }
  return (
    <header className="app-header">
      <Link to="/" className="app-brand">
        <span className="app-brand-mark" aria-hidden="true">
          3D
        </span>
        <span>Тур по заводу</span>
      </Link>
      <nav className="app-nav" aria-label="Разделы">
        <NavLink to="/" end>
          Маршруты
        </NavLink>
        <NavLink to="/tour">Свободный осмотр</NavLink>
        {can(user, 'dashboard') && <NavLink to="/dashboard">Дашборд</NavLink>}
        {can(user, 'editor') && <NavLink to="/tour?edit=1">Редактор</NavLink>}
      </nav>
      <div className="app-user">
        {user ? (
          <>
            <span className="app-user-name" title={user.email}>
              {user.name}
              <small>{roleName(user.role)}</small>
            </span>
            {!isDemo && (
              <button type="button" className="btn btn-ghost btn-sm hide-sm" onClick={onDelete}>
                Удалить аккаунт
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                logout()
                navigate('/')
              }}
            >
              Выйти
            </button>
          </>
        ) : (
          <Link to="/login" className="btn btn-ghost btn-sm">
            Войти
          </Link>
        )}
      </div>
    </header>
  )
}
