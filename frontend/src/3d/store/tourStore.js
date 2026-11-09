// Состояние тура: маршрут, шаг, текущая локация, выбранная точка, режим редактора.
import { create } from 'zustand'
import { api, sessionId } from '../api/client.js'
import { listenTwin } from '../api/twin.js'

export const FADE_MS = 300
export const PROCESS_ID = 1

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
  process: null, // процесс с этапами и последними значениями метрик (для табло и узкого места)
  twin: null, // последний расчёт цифрового двойника (api/twin.js) или null

  async loadProcess() {
    if (get().process) return get().process
    const process = await api.getProcess(PROCESS_ID)
    set({ process })
    return process
  },
  setTwin(twin) {
    set({ twin })
  },

  startRoute(route) {
    set({ route, stepIndex: 0 })
    if (!route) return
    // старт маршрута — для статистики «где бросают маршрут» (ФТ-14)
    api.postEvent({ session_id: sessionId(), route_id: route.id, hotspot_id: null, event_type: 'start' })
    if (route.steps.length) get().applyStep(0)
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

// Тур слушает расчёты двойника с момента загрузки модуля: дашборд может прислать их раньше,
// чем откроется сцена.
listenTwin(
  (twin) => useTourStore.getState().setTwin(twin),
  // «Показать в туре» из двойника: этап → его локация и точка интереса
  async ({ stage_id, location_id, hotspot_id }) => {
    const store = useTourStore.getState()
    if (stage_id) {
      const process = await store.loadProcess().catch(() => null)
      const stage = process?.stages.find((s) => s.id === stage_id)
      if (!stage) return
      const location = await api.getLocation(stage.location_id).catch(() => null)
      const hotspot = location?.hotspots.find((h) => h.stage_id === stage_id)
      store.goToLocation(stage.location_id, hotspot ? hotspot.id : null)
    } else {
      store.goToLocation(location_id, hotspot_id)
    }
  },
)
