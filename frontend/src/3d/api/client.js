// Клиент API тура.
// mock — данные из src/3d/api/mock (пока бэкенд не готов), live — Django REST API по контракту
// из документа «3D-тур по предприятию: структура проекта» (раздел «API бэкенда»).
//
// Режим задаётся переменной VITE_API_MODE (mock | live), по умолчанию mock.

import enterprise from './mock/enterprise.json'
import locations from './mock/locations.json'
import hotspotsSeed from './mock/hotspots.json'
import routes from './mock/routes.json'
import processData from './mock/process.json'
import cases from './mock/cases.json'
import media from './mock/media.json'
import { metricValues as mockValues, latestValue, HISTORY_END } from './mock/metricValues.js'

export const API_MODE = import.meta.env.VITE_API_MODE === 'live' ? 'live' : 'mock'

// ---------- live ----------

async function http(path, options = {}) {
  const token = safeGet('auth.token')
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = body.detail || body.message || ''
    } catch {
      /* тело не JSON */
    }
    throw Object.assign(new Error(detail || `${options.method || 'GET'} ${path}: ${res.status}`), { status: res.status })
  }
  return res.status === 204 ? null : res.json()
}

// ---------- mock ----------

const LOCAL_KEY = 'tour.mock.hotspots'

function safeGet(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}
function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* приватный режим — точки живут до перезагрузки */
  }
}

let localHotspots = null
function editorHotspots() {
  if (localHotspots) return localHotspots
  try {
    localHotspots = JSON.parse(safeGet(LOCAL_KEY) || '[]')
  } catch {
    localHotspots = []
  }
  return localHotspots
}
function saveEditorHotspots() {
  safeSet(LOCAL_KEY, JSON.stringify(localHotspots))
}

function allHotspots() {
  const extra = editorHotspots()
  const patched = hotspotsSeed.map((h) => extra.find((e) => e.id === h.id) || h)
  return [...patched, ...extra.filter((e) => !hotspotsSeed.some((h) => h.id === e.id))]
}

const delay = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), 60))

// ---------- mock: вход и роли (ФТ-1, ФТ-2) ----------
// Демо-учётки для показа: пароль у всех demo1234. Зарегистрированные в браузере пользователи
// хранятся в localStorage только с хэшем пароля (SHA-256), как того требует НФТ-5.

export const ROLES = {
  visitor: 'Посетитель',
  manager: 'Руководитель',
  editor: 'Редактор',
  admin: 'Администратор',
}
export const DEMO_PASSWORD = 'demo1234'
export const DEMO_USERS = [
  { email: 'manager@demo.ru', name: 'Руководитель завода', role: 'manager' },
  { email: 'editor@demo.ru', name: 'Редактор тура', role: 'editor' },
  { email: 'admin@demo.ru', name: 'Администратор', role: 'admin' },
  { email: 'visitor@demo.ru', name: 'Посетитель', role: 'visitor' },
]
const USERS_KEY = 'tour.mock.users'

async function sha256(text) {
  if (!globalThis.crypto?.subtle) return `len:${text.length}` // http без TLS не на localhost — только демо
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}
function mockUsers() {
  try {
    return JSON.parse(safeGet(USERS_KEY) || '[]')
  } catch {
    return []
  }
}
function mockToken(user) {
  const payload = new TextEncoder().encode(JSON.stringify({ email: user.email, role: user.role }))
  return `mock.${btoa(String.fromCharCode(...payload))}`
}
const authError = (message, status = 400) => Object.assign(new Error(message), { status })
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// ---------- mock: статистика просмотров (ФТ-14) ----------
// Базовые просмотры синтетические, к ним добавляются события из этого браузера.
const EVENTS_KEY = 'tour.mock.events'
const BASE_VIEWS = { 1: 412, 2: 118, 3: 164, 4: 296, 5: 341, 6: 233, 7: 187, 8: 152, 9: 121, 10: 205 }
const BASE_ROUTES = { 1: { start: 214, finish: 171 }, 2: { start: 133, finish: 88 }, 3: { start: 96, finish: 79 } }
function readEvents() {
  try {
    const ev = JSON.parse(safeGet(EVENTS_KEY) || 'null')
    return ev && ev.views && ev.routes ? ev : { views: {}, routes: {} }
  } catch {
    return { views: {}, routes: {} }
  }
}
function recordEvent(e) {
  const ev = readEvents()
  if (e.event_type === 'open' && e.hotspot_id) ev.views[e.hotspot_id] = (ev.views[e.hotspot_id] || 0) + 1
  if (e.route_id && (e.event_type === 'start' || e.event_type === 'finish')) {
    const r = (ev.routes[e.route_id] ||= { start: 0, finish: 0 })
    r[e.event_type] += 1
  }
  safeSet(EVENTS_KEY, JSON.stringify(ev))
}

function shiftDate(iso, days) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// Рекомендация по узкому месту: из кейса, привязанного к метрике этапа, иначе общая.
function bottleneckAdvice(stage, caseForStage) {
  if (caseForStage) return caseForStage.solution
  return `Этап «${stage.name}» загружен сильнее остальных. Проверьте мощность ресурса и порядок запуска партий.`
}

function stageById(id) {
  return processData.stages.find((s) => s.id === id) || null
}
function metricWithLatest(m) {
  const last = latestValue(m.id)
  return { ...m, latest: last ? last.value : null, latest_on: last ? last.measured_on : null }
}
function stageMetrics(stageId) {
  return processData.metrics.filter((m) => m.stage_id === stageId).map(metricWithLatest)
}
function processMetrics() {
  return processData.metrics.filter((m) => m.stage_id === null).map(metricWithLatest)
}
function caseWithMetric(c) {
  if (!c) return null
  const metric = processData.metrics.find((m) => m.id === c.metric_id)
  const stage = metric && metric.stage_id ? stageById(metric.stage_id) : null
  return { ...c, metric: metric ? metricWithLatest(metric) : null, stage, location_id: stage ? stage.location_id : null }
}

const mock = {
  async getEnterprise() {
    return delay(enterprise)
  },
  async getRoutes() {
    return delay(
      routes
        .filter((r) => r.is_published)
        .map(({ steps, ...r }) => ({ ...r, steps_count: steps.length, duration_min: Math.round(steps.length * 1.5) })),
    )
  },
  async getRoute(id) {
    return delay(routes.find((r) => r.id === Number(id)) || null)
  },
  async getLocations() {
    return delay(locations)
  },
  async getLocation(id) {
    const loc = locations.find((l) => l.id === Number(id))
    if (!loc) return delay(null)
    return delay({ ...loc, hotspots: allHotspots().filter((h) => h.location_id === loc.id && h.status === 'published') })
  },
  async getHotspot(id) {
    const h = allHotspots().find((x) => x.id === Number(id))
    if (!h) return delay(null)
    const stage = h.stage_id ? stageById(h.stage_id) : null
    return delay({
      ...h,
      media: media.filter((m) => m.hotspot_id === h.id),
      stage,
      case: caseWithMetric(cases.find((c) => c.id === h.case_id)),
      metrics: stage ? stageMetrics(stage.id) : processMetrics(),
    })
  },
  async getProcess(id) {
    const p = processData.processes.find((x) => x.id === Number(id))
    if (!p) return delay(null)
    return delay({
      ...p,
      metrics: processMetrics(),
      stages: processData.stages.map((s) => ({
        ...s,
        resource: processData.resources.find((r) => r.id === s.resource_id) || null,
        location: locations.find((l) => l.id === s.location_id) || null,
        metrics: stageMetrics(s.id),
      })),
    })
  },
  async getMetricValues(id, from, to) {
    return delay(mockValues(Number(id), from, to))
  },
  async getCase(id) {
    return delay(caseWithMetric(cases.find((c) => c.id === Number(id))))
  },
  async getCases() {
    return delay(cases.map(caseWithMetric))
  },
  async postEvent(event) {
    if (import.meta.env.DEV) console.debug('[tour event]', event)
    recordEvent(event)
    return null
  },
  async login({ email, password }) {
    const e = String(email || '').trim().toLowerCase()
    const demo = DEMO_USERS.find((u) => u.email === e)
    if (demo && password === DEMO_PASSWORD) return delay({ token: mockToken(demo), user: demo })
    const hash = await sha256(String(password || ''))
    const found = mockUsers().find((u) => u.email === e && u.password_hash === hash)
    if (!found) throw authError('Неверный e-mail или пароль', 401)
    const { password_hash: _omit, ...user } = found
    return delay({ token: mockToken(user), user })
  },
  async register({ email, password, name, consent }) {
    const e = String(email || '').trim().toLowerCase()
    if (!consent) throw authError('Нужно согласие на обработку персональных данных')
    if (!EMAIL_RE.test(e)) throw authError('Проверьте e-mail')
    if (String(password || '').length < 8) throw authError('Пароль — не короче 8 символов')
    const users = mockUsers()
    if (users.some((u) => u.email === e) || DEMO_USERS.some((u) => u.email === e)) throw authError('Пользователь с таким e-mail уже есть')
    const user = { email: e, name: String(name || '').trim() || e, role: 'visitor', consent_at: new Date().toISOString() }
    users.push({ ...user, password_hash: await sha256(String(password)) })
    safeSet(USERS_KEY, JSON.stringify(users))
    return delay({ token: mockToken(user), user })
  },
  async deleteAccount(email) {
    safeSet(USERS_KEY, JSON.stringify(mockUsers().filter((u) => u.email !== email)))
    return null
  },
  async getDashboard() {
    const process = await mock.getProcess(1)
    const end = HISTORY_END
    const from30 = shiftDate(end, -29)
    const kpi = process.metrics.map((m) => {
      const series = mockValues(m.id, from30, end)
      return { ...m, series, value_30d_ago: series[0]?.value ?? null }
    })
    const stages = process.stages.map((s) => {
      const load = s.metrics.find((m) => m.unit === '%')
      const dur = s.metrics.find((m) => m.unit === 'ч')
      return {
        id: s.id,
        step_no: s.step_no,
        name: s.name,
        location_id: s.location_id,
        location: s.location?.name,
        load_pct: load?.latest ?? null,
        duration_h: dur?.latest ?? null,
        load_metric_id: load?.id ?? null,
        duration_metric_id: dur?.id ?? null,
      }
    })
    const b = stages.reduce((m, s) => (s.load_pct != null && (!m || s.load_pct > m.load_pct) ? s : m), null)
    const allCases = cases.map(caseWithMetric)
    const bCase = allCases.find((c) => c.metric?.stage_id === b?.id) || null
    const hotspot = b ? allHotspots().find((h) => h.stage_id === b.id && h.status === 'published') : null
    const ev = readEvents()
    const views = allHotspots()
      .filter((h) => h.status === 'published')
      .map((h) => ({
        hotspot_id: h.id,
        title: h.title,
        location_id: h.location_id,
        location: locations.find((l) => l.id === h.location_id)?.name,
        views: (BASE_VIEWS[h.id] || 0) + (ev.views[h.id] || 0),
      }))
      .sort((x, y) => y.views - x.views)
    const routeStats = routes.map((r) => {
      const base = BASE_ROUTES[r.id] || { start: 0, finish: 0 }
      const local = ev.routes[r.id] || { start: 0, finish: 0 }
      return { route_id: r.id, name: r.name, audience: r.audience, starts: base.start + local.start, finishes: base.finish + local.finish }
    })
    return delay({
      as_of: end,
      process: { id: process.id, name: process.name },
      kpi,
      stages,
      bottleneck: b && { ...b, hotspot_id: hotspot?.id ?? null, case: bCase, advice: bottleneckAdvice(b, bCase) },
      cases: allCases,
      views,
      routes: routeStats,
    })
  },
  async createHotspot(data) {
    const list = editorHotspots()
    const maxId = Math.max(0, ...hotspotsSeed.map((h) => h.id), ...list.map((h) => h.id))
    const h = { kind: 'info', status: 'published', yaw: null, pitch: null, pos_x: null, pos_y: null, pos_z: null, stage_id: null, case_id: null, target_location_id: null, ...data, id: maxId + 1 }
    list.push(h)
    saveEditorHotspots()
    return delay(h)
  },
  async patchHotspot(id, patch) {
    const list = editorHotspots()
    const current = allHotspots().find((h) => h.id === Number(id))
    if (!current) throw new Error('Точка не найдена')
    const next = { ...current, ...patch }
    const i = list.findIndex((h) => h.id === next.id)
    if (i >= 0) list[i] = next
    else list.push(next)
    saveEditorHotspots()
    return delay(next)
  },
  async deleteHotspot(id) {
    return mock.patchHotspot(id, { status: 'archived' })
  },
  resetEditorHotspots() {
    localHotspots = []
    saveEditorHotspots()
  },
}

const live = {
  getEnterprise: () => http('/api/enterprise/'),
  getRoutes: () => http('/api/routes/'),
  getRoute: (id) => http(`/api/routes/${id}/`),
  getLocations: () => http('/api/locations/'),
  getLocation: (id) => http(`/api/locations/${id}/`),
  getHotspot: (id) => http(`/api/hotspots/${id}/`),
  getProcess: (id) => http(`/api/processes/${id}/`),
  getMetricValues: (id, from, to) => {
    const q = new URLSearchParams()
    if (from) q.set('from', from)
    if (to) q.set('to', to)
    return http(`/api/metrics/${id}/values/?${q}`)
  },
  getCase: (id) => http(`/api/cases/${id}/`),
  getCases: () => http('/api/cases/'),
  postEvent: (event) => http('/api/events/', { method: 'POST', body: JSON.stringify(event) }).catch(() => null),
  createHotspot: (data) => http('/api/hotspots/', { method: 'POST', body: JSON.stringify(data) }),
  patchHotspot: (id, patch) => http(`/api/hotspots/${id}/`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteHotspot: (id) => http(`/api/hotspots/${id}/`, { method: 'DELETE' }),
  resetEditorHotspots() {},
  // Вход по e-mail и паролю: ответ { token, user: { email, name, role } } (JWT, simplejwt)
  login: ({ email, password }) => http('/api/auth/login/', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data) => http('/api/auth/register/', { method: 'POST', body: JSON.stringify(data) }),
  deleteAccount: () => http('/api/auth/me/', { method: 'DELETE' }),
  getDashboard: () => http('/api/dashboard/'),
}

export const api = API_MODE === 'live' ? live : mock

// Справочники для формы редактора точек (этапы и кейсы).
export const lookups = {
  stages: processData.stages.map(({ id, name, location_id }) => ({ id, name, location_id })),
  cases: cases.map(({ id, title }) => ({ id, title })),
}

// Анонимный идентификатор сессии для статистики тура (без персональных данных, НФТ-6).
export function sessionId() {
  let id = null
  try {
    id = window.sessionStorage.getItem('tour.session')
    if (!id) {
      id = Math.random().toString(36).slice(2, 10)
      window.sessionStorage.setItem('tour.session', id)
    }
  } catch {
    id = 'anon'
  }
  return id
}
