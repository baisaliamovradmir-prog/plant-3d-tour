// Детерминированный генератор истории метрик за 60 дней (синтетика I этапа).
// Те же правила стоит повторить в backend/seed/generate.py, чтобы цифры совпадали.

export const HISTORY_DAYS = 60
export const HISTORY_END = '2026-11-07'

// Простой генератор псевдослучайных чисел с фиксированным seed.
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function dateList() {
  const end = new Date(HISTORY_END + 'T00:00:00Z')
  return Array.from({ length: HISTORY_DAYS }, (_, i) => {
    const d = new Date(end)
    d.setUTCDate(end.getUTCDate() - (HISTORY_DAYS - 1 - i))
    return d.toISOString().slice(0, 10)
  })
}

// base — значение до изменений; steps — с какой даты значение меняется (внедрённые кейсы).
const SERIES = {
  // длительность этапов, ч
  11: { base: 2.0, noise: 0.15 },
  12: { base: 8.0, noise: 0.5 },
  13: { base: 3.0, noise: 0.2 },
  14: { base: 5.5, noise: 0.35 }, // ОТК — узкое место; кейс 1 пока пилот
  15: { base: 3.4, noise: 0.15, steps: [{ from: '2026-10-09', value: 2.5 }] }, // кейс 2, SMED
  16: { base: 12.0, noise: 0.8 },
  17: { base: 2.6, noise: 0.15, steps: [{ from: '2026-09-29', value: 1.5 }] }, // кейс 3, 5S
  // загрузка ресурсов, %
  21: { base: 62, noise: 3 },
  22: { base: 71, noise: 3 },
  23: { base: 78, noise: 3 },
  24: { base: 96, noise: 1.5 },
  25: { base: 93, noise: 2, steps: [{ from: '2026-10-09', value: 84 }] },
  26: { base: 66, noise: 3 },
  27: { base: 58, noise: 3 },
  // выпуск, т/сут и стоимость, ₽/т
  2: { base: 112, noise: 3, steps: [{ from: '2026-10-09', value: 118 }] },
  4: { base: 5200, noise: 60, steps: [{ from: '2026-10-09', value: 5000 }] },
}

const STAGE_DURATION_IDS = [11, 12, 13, 14, 15, 16, 17]
const STAGE_LOAD_IDS = [21, 22, 23, 24, 25, 26, 27]

function round(v, digits) {
  const k = 10 ** digits
  return Math.round(v * k) / k
}

function buildSeries(id, dates) {
  const s = SERIES[id]
  const rnd = mulberry32(1000 + id)
  return dates.map((d, i) => {
    let v = s.base
    for (const st of s.steps || []) if (d >= st.from) v = st.value
    const noise = (rnd() * 2 - 1) * s.noise
    // последний день = текущее значение модели без шума, чтобы цифры тура, гида и мнемосхемы совпадали
    if (i < dates.length - 1) v += noise
    return { measured_on: d, value: round(v, id === 4 ? 0 : 1) }
  })
}

let cache = null

export function allMetricValues() {
  if (cache) return cache
  const dates = dateList()
  const out = {}
  for (const id of Object.keys(SERIES)) out[id] = buildSeries(Number(id), dates)
  // время цикла = сумма длительностей этапов за день
  out[1] = dates.map((d, i) => ({
    measured_on: d,
    value: round(STAGE_DURATION_IDS.reduce((a, mid) => a + out[mid][i].value, 0), 1),
  }))
  // загрузка ресурсов процесса = загрузка самого нагруженного ресурса
  out[3] = dates.map((d, i) => ({
    measured_on: d,
    value: round(Math.max(...STAGE_LOAD_IDS.map((mid) => out[mid][i].value)), 1),
  }))
  cache = out
  return out
}

export function metricValues(metricId, from, to) {
  const list = allMetricValues()[metricId] || []
  return list.filter((p) => (!from || p.measured_on >= from) && (!to || p.measured_on <= to))
}

export function latestValue(metricId) {
  const list = allMetricValues()[metricId] || []
  return list.length ? list[list.length - 1] : null
}
