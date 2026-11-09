// Данные из цифрового двойника (прототип дашборда, ветка frontend → prototype/).
//
// Дашборд встраивает тур во <iframe> и после каждого прогона модели отправляет результат:
//
//   frame.contentWindow.postMessage({
//     type: 'plant-twin:run', version: 1,
//     scenario: 'параметры прогона с дашборда',
//     params:  { demand_tpd, series, setup_pct, seed },
//     process: { cycle_h, output_tpd, bottleneck_load_pct, cost_rub_t },
//     stages:  { '<id этапа>': { duration_h, load_pct }, ... },
//   }, tourOrigin)
//
// id этапа — process_stages.id тура (1 — приёмка … 7 — отгрузка).
// Загрузку двойник может прислать долей (0,96) или процентами (96): тур понимает оба варианта.
// Тур показывает эти цифры в карточках точек, на табло цехов и переносит подсветку узкого места.
// Без сообщения тур работает на данных БД (metric_values).
//
// В ответ тур сообщает родителю, что готов принять данные: { type: 'plant-twin:ready', version: 1 }.
// Так дашборд может повторить отправку, если тур загрузился позже первого прогона.

export const TWIN_MESSAGE = 'plant-twin:run'
export const TWIN_READY = 'plant-twin:ready'

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
// доля или проценты → проценты, 0…160
const pct = (v) => {
  const n = num(v)
  if (n == null) return null
  return Math.max(0, Math.min(160, n <= 2 ? n * 100 : n))
}
const clampHours = (v) => {
  const n = num(v)
  return n == null ? null : Math.max(0, Math.min(10000, n))
}

// Проверяет и нормализует сообщение двойника. Всё, что не число, отбрасывается.
export function parseTwinMessage(data) {
  if (!data || typeof data !== 'object' || data.type !== TWIN_MESSAGE) return null
  if (data.version != null && data.version !== 1) return null
  const p = data.process && typeof data.process === 'object' ? data.process : {}
  const stages = {}
  if (data.stages && typeof data.stages === 'object') {
    for (const [key, s] of Object.entries(data.stages)) {
      const id = Number(key)
      if (!Number.isInteger(id) || id < 1 || id > 99 || !s || typeof s !== 'object') continue
      stages[id] = { duration_h: clampHours(s.duration_h), load_pct: pct(s.load_pct) }
    }
  }
  return {
    scenario: typeof data.scenario === 'string' ? data.scenario.slice(0, 120) : 'расчёт двойника',
    received_at: new Date().toISOString(),
    process: {
      cycle_h: clampHours(p.cycle_h),
      output_tpd: num(p.output_tpd),
      bottleneck_load_pct: pct(p.bottleneck_load_pct),
      cost_rub_t: num(p.cost_rub_t),
    },
    stages,
  }
}

// Команда «покажи место в туре»: { type: 'plant-twin:show', version: 1, stage_id } или { location_id, hotspot_id }.
export const TWIN_SHOW = 'plant-twin:show'

export function parseShowMessage(data) {
  if (!data || typeof data !== 'object' || data.type !== TWIN_SHOW) return null
  const int = (v) => (Number.isInteger(v) && v > 0 && v < 10000 ? v : null)
  const out = { stage_id: int(data.stage_id), location_id: int(data.location_id), hotspot_id: int(data.hotspot_id) }
  return out.stage_id || out.location_id ? out : null
}

// Подписка на сообщения двойника. Возвращает функцию отписки.
export function listenTwin(onData, onShow) {
  if (typeof window === 'undefined') return () => {}
  const onMessage = (e) => {
    const parsed = parseTwinMessage(e.data)
    if (parsed) return onData(parsed)
    const show = onShow && parseShowMessage(e.data)
    if (show) onShow(show)
  }
  window.addEventListener('message', onMessage)
  // тур во фрейме — сообщаем родителю, что слушаем
  if (window.parent && window.parent !== window) {
    try {
      window.parent.postMessage({ type: TWIN_READY, version: 1 }, '*')
    } catch {
      /* родитель недоступен — ничего страшного */
    }
  }
  return () => window.removeEventListener('message', onMessage)
}

// Метрика процесса (id из таблицы metrics) → поле process в сообщении двойника.
const PROCESS_FIELD = { 1: 'cycle_h', 2: 'output_tpd', 3: 'bottleneck_load_pct', 4: 'cost_rub_t' }

// Подменяет последние значения метрик карточки значениями двойника (если они есть).
// Метрики этапа различаются по единице: «ч» — длительность, «%» — загрузка.
export function applyTwin(metrics, stageId, twin) {
  if (!twin || !metrics) return metrics
  return metrics.map((m) => {
    let v = null
    if (stageId) {
      const s = twin.stages[stageId]
      if (s) v = m.unit === '%' ? s.load_pct : m.unit === 'ч' ? s.duration_h : null
    } else if (PROCESS_FIELD[m.id]) {
      v = twin.process[PROCESS_FIELD[m.id]]
    }
    return v == null ? m : { ...m, latest: Math.round(v * 10) / 10, from_twin: true }
  })
}
