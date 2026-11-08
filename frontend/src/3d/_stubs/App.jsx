// ВРЕМЕННО: заглушка ветки 3d, чтобы тур запускался. Заменит фронтенд (роутер, вход, страницы).
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import RoutePicker from './RoutePicker.jsx'
import TourPage from './TourPage.jsx'
import ProcessStub from './ProcessStub.jsx'
import CaseStub from './CaseStub.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoutePicker />} />
        <Route path="/tour" element={<TourPage />} />
        <Route path="/tour/:routeId" element={<TourPage />} />
        <Route path="/process/:id" element={<ProcessStub />} />
        <Route path="/case/:id" element={<CaseStub />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
