// Публичный вход модуля 3D-тура. Остальной фронтенд импортирует только отсюда:
//   import { TourCanvas, useTourStore } from './3d'
// Всё, что внутри src/3d/, ведёт роль «3D»; правки снаружи этой папки не нужны.
import './scene/tour.css'

export { default as TourCanvas } from './scene/TourCanvas.jsx'
export { useTourStore, FADE_MS, prefersReducedMotion } from './store/tourStore.js'
export { api, API_MODE, lookups, sessionId } from './api/client.js'
