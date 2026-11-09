// Роутер приложения. Тур открыт всем (внешняя аудитория), дашборд — руководителю и администратору,
// редактор точек — редактору и администратору. Окончательно права проверяет сервер.
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { can, useAuth } from './auth.js'
import RoutePickerPage from './pages/RoutePickerPage.jsx'
import TourPage from './pages/TourPage.jsx'
import ProcessPage from './pages/ProcessPage.jsx'
import CasePage from './pages/CasePage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NoAccess from './components/NoAccess.jsx'

function RequireRole({ what, children }) {
  const user = useAuth((s) => s.user)
  const location = useLocation()
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (!can(user, what)) return <NoAccess what={what} />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoutePickerPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/tour" element={<TourPage />} />
        <Route path="/tour/:routeId" element={<TourPage />} />
        <Route path="/process/:id" element={<ProcessPage />} />
        <Route path="/case/:id" element={<CasePage />} />
        <Route
          path="/dashboard"
          element={
            <RequireRole what="dashboard">
              <DashboardPage />
            </RequireRole>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
