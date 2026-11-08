// ВРЕМЕННО: заглушка ветки 3d. Форматирование чисел для карточек.
const nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })
export const fmt = (v) => (v == null ? '—' : nf.format(v))
export const fmtMetric = (m) => (m ? `${fmt(m.latest)} ${m.unit}` : '—')
