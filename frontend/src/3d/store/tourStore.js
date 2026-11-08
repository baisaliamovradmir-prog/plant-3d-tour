// Состояние тура: маршрут, шаг, текущая локация, выбранная точка, режим редактора.
import { create } from 'zustand'
import { api, sessionId } from '../api/client.js'

export const FADE_MS = 300

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

let fadeTimer = null

export const useTourStore = create((set, get) => ({
  route: null, // маршрут с шагами или null (свободный осмотр)
  stepIndex: 0,
  locationId: 1, // по умолчанию — генплан
  selectedHotspotId: null,
  fading: false,
  editMode: false,
  textMode: false,
  hotspotsVersion: 0, // растёт, когда редактор меняет точки — сцена перечитывает локацию

  startRoute(route) {
    set({ route, stepIndex: 0 })
    if (route && route.steps.length) get().applyStep(0)
  },
  stopRoute() {
    set({ route: null, stepIndex: 0, selectedHotspotId: null })
  },
  applyStep(i) {
    const { route } = get()
    if (!route) return
    const step = route.steps[i]
    if (!step) return
    set({ stepIndex: i })
    get().goToLocation(step.location_id, step.hotspot_id)
    if (i === route.steps.length - 1) {
      api.postEvent({ session_id: sessionId(), route_id: route.id, hotspot_id: step.hotspot_id, event_type: 'finish' })
    }
  },
  next() {
    const { route, stepIndex } = get()
    if (route && stepIndex < route.steps.length - 1) get().applyStep(stepIndex + 1)
  },
  prev() {
    const { route, stepIndex } = get()
    if (route && stepIndex > 0) get().applyStep(stepIndex - 1)
  },

  // Переход между локациями через затемнение (300 мс), затем выбор точки.
  goToLocation(locationId, hotspotId = null) {
    const { locationId: current } = get()
    if (current === locationId) {
      set({ selectedHotspotId: hotspotId })
      return
    }
    clearTimeout(fadeTimer)
    const ms = prefersReducedMotion() ? 0 : FADE_MS
    set({ fading: true, selectedHotspotId: null })
    fadeTimer = setTimeout(() => {
      set({ locationId, selectedHotspotId: hotspotId })
      // кадр на смену сцены, потом открываем затемнение
      fadeTimer = setTimeout(() => set({ fading: false }), 50)
    }, ms)
  },

  selectHotspot(id) {
    const { route } = get()
    set({ selectedHotspotId: id })
    if (id) api.postEvent({ session_id: sessionId(), route_id: route ? route.id : null, hotspot_id: id, event_type: 'open' })
  },
  closeHotspot() {
    set({ selectedHotspotId: null })
  },

  setEditMode(editMode) {
    set({ editMode })
  },
  setTextMode(textMode) {
    set({ textMode })
  },
  bumpHotspots() {
    set((s) => ({ hotspotsVersion: s.hotspotsVersion + 1 }))
  },
}))
