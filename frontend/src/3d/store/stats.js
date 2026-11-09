// Сводка по этапам процесса для сцены и интерфейса: длительность, загрузка, узкое место.
// Источник — последние значения метрик из БД; если пришёл расчёт цифрового двойника, берутся его цифры.
import { useMemo } from 'react'
import { useTourStore } from './tourStore.js'

export const LOAD_WARN = 85 // загрузка, выше которой этап считается напряжённым
export const LOAD_HOT = 90 // ... и узким местом

export function loadLevel(pct) {
  if (pct == null) return 'none'
  if (pct >= LOAD_HOT) return 'hot'
  if (pct >= LOAD_WARN) return 'warn'
  return 'ok'
}

export function buildStats(process, twin) {
  if (!process) return null
  const stages = process.stages.map((s) => {
    const dur = s.metrics?.find((m) => m.unit === 'ч')
    const load = s.metrics?.find((m) => m.unit === '%')
    const t = twin?.stages?.[s.id]
    const duration_h = t?.duration_h ?? dur?.latest ?? s.duration_h
    const load_pct = t?.load_pct ?? load?.latest ?? null
    return {
      id: s.id,
      step_no: s.step_no,
      name: s.name,
      location_id: s.location_id,
      duration_h,
      load_pct,
      fromTwin: !!t,
    }
  })
  let bottleneck = null
  for (const s of stages) if (s.load_pct != null && (!bottleneck || s.load_pct > bottleneck.load_pct)) bottleneck = s

  const byLocation = {}
  for (const s of stages) (byLocation[s.location_id] ||= []).push(s)

  const latest = (id) => process.metrics?.find((m) => m.id === id)?.latest ?? null
  const kpi = {
    cycle_h: twin?.process?.cycle_h ?? latest(1),
    output_tpd: twin?.process?.output_tpd ?? latest(2),
    bottleneck_load_pct: twin?.process?.bottleneck_load_pct ?? latest(3),
    cost_rub_t: twin?.process?.cost_rub_t ?? latest(4),
  }

  return {
    stages,
    byLocation,
    bottleneck,
    bottleneckLocationId: bottleneck?.location_id ?? null,
    kpi,
    fromTwin: !!twin,
    scenario: twin?.scenario ?? null,
  }
}

// Максимальная загрузка этапов локации (для подписи здания и табло цеха).
export function locationLoad(stats, locationId) {
  const list = stats?.byLocation?.[locationId]
  if (!list) return null
  return list.reduce((m, s) => (s.load_pct != null && (m == null || s.load_pct > m) ? s.load_pct : m), null)
}

export function useStageStats() {
  const process = useTourStore((s) => s.process)
  const twin = useTourStore((s) => s.twin)
  return useMemo(() => buildStats(process, twin), [process, twin])
}
