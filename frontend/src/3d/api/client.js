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
import { metricValues as mockValues, latestValue } from './mock/metricValues.js'

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
  if (!res.ok) throw new Error(`${options.method || 'GET'} ${path}: ${res.status}`)
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
    return null
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
