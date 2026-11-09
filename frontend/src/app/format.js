// Форматирование чисел и дат по-русски (NFR-12).
const nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })
const nf0 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
export const fmt = (v) => (v == null ? '—' : nf.format(v))
export const fmt0 = (v) => (v == null ? '—' : nf0.format(v))
export const fmtMetric = (m) => (m ? `${m.unit === '₽/т' ? fmt0(m.latest) : fmt(m.latest)} ${m.unit}` : '—')
export const fmtDate = (iso) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : '—')
export const fmtDay = (iso) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}` : '')
