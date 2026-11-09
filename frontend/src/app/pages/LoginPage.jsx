// Вход и регистрация (экран 1, ФТ-1, ФТ-2): e-mail и пароль, согласие на обработку ПД (152-ФЗ).
// Для показа есть демо-учётки ролей. Тур открыт и без входа.
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { API_MODE, DEMO_PASSWORD, DEMO_USERS } from '../../3d'
import { roleName, useAuth } from '../auth.js'
import AppHeader from '../components/AppHeader.jsx'

const HOME = { manager: '/dashboard', admin: '/dashboard', editor: '/tour?edit=1', visitor: '/' }

export default function LoginPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const login = useAuth((s) => s.login)
  const register = useAuth((s) => s.register)
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [showPolicy, setShowPolicy] = useState(false)

  const done = (user) => {
    const next = params.get('next')
    navigate(next && next.startsWith('/') && !next.startsWith('//') ? next : HOME[user.role] || '/', { replace: true })
  }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const user = mode === 'login' ? await login({ email, password }) : await register({ email, password, name, consent })
      done(user)
    } catch (err) {
      setError(err.message || 'Не удалось войти')
    } finally {
      setBusy(false)
    }
  }

  async function demo(u) {
    setError(null)
    setBusy(true)
    try {
      done(await login({ email: u.email, password: DEMO_PASSWORD }))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <AppHeader />
      <main className="auth-page">
        <section className="auth-card">
          <div className="segmented" role="tablist" aria-label="Вход или регистрация">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'is-on' : ''} onClick={() => setMode('login')}>
              Вход
            </button>
            <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'is-on' : ''} onClick={() => setMode('register')}>
              Регистрация
            </button>
          </div>
          <h1>{mode === 'login' ? 'Вход' : 'Регистрация'}</h1>
          <form onSubmit={submit} className="auth-form" noValidate>
            {mode === 'register' && (
              <label>
                Имя (необязательно)
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
              </label>
            )}
            <label>
              E-mail
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </label>
            <label>
              Пароль
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={mode === 'register' ? 8 : undefined}
                required
              />
            </label>
            {mode === 'register' && (
              <label className="auth-consent">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>
                  Согласен на обработку персональных данных (e-mail и имя) по{' '}
                  <button type="button" className="link-btn" onClick={() => setShowPolicy((v) => !v)}>
                    политике обработки ПД
                  </button>
                </span>
              </label>
            )}
            {mode === 'register' && showPolicy && (
              <div className="auth-policy">
                Собираем только e-mail и имя, чтобы вы могли войти. Статистика тура анонимная. Данные хранятся на серверах в РФ.
                Удалить аккаунт можно в любой момент — кнопка «Удалить аккаунт» в меню после входа.
              </div>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary" disabled={busy || (mode === 'register' && !consent)}>
              {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </form>
          <p className="auth-note">
            Тур можно пройти без входа — <Link to="/">к маршрутам</Link>.
          </p>
        </section>

        {API_MODE === 'mock' && (
          <section className="auth-demo" aria-label="Демо-учётки">
            <h2>Демо-доступ</h2>
            <p>Для показа на защите — вход одной кнопкой. Пароль у всех: {DEMO_PASSWORD}.</p>
            <div className="auth-demo-list">
              {DEMO_USERS.map((u) => (
                <button key={u.email} type="button" className="auth-demo-btn" disabled={busy} onClick={() => demo(u)}>
                  <strong>{roleName(u.role)}</strong>
                  <span>{u.email}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  )
}
