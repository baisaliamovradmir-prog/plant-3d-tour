// Публичный вход модуля 3D-тура. Остальной фронтенд импортирует только отсюда:
//   import { TourCanvas, useTourStore } from './3d'
// Всё, что внутри src/3d/, ведёт роль «3D»; правки снаружи этой папки не нужны.
import './scene/tour.css'

export { default as TourCanvas } from './scene/TourCanvas.jsx'
export { useTourStore, FADE_MS, PROCESS_ID, prefersReducedMotion } from './store/tourStore.js'
export { useStageStats, buildStats, loadLevel, locationLoad, LOAD_HOT, LOAD_WARN } from './store/stats.js'
export { api, API_MODE, lookups, sessionId, ROLES, DEMO_USERS, DEMO_PASSWORD } from './api/client.js'
export { applyTwin, parseTwinMessage, TWIN_MESSAGE } from './api/twin.js'
