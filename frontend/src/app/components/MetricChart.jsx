// График метрики по датам (ФТ-7). Под графиком — последние значения текстом (доступность, п. 8.6 ТЗ).
import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../3d'
import { fmt, fmtDate, fmtDay } from '../format.js'

export default function MetricChart({ metric, days = 30, markDate, height = 220 }) {
  const [points, setPoints] = useState(null)
  useEffect(() => {
    if (!metric) return
    let alive = true
    setPoints(null)
    api
      .getMetricValues(metric.id)
      .then((list) => alive && setPoints(list.slice(-days)))
      .catch(() => alive && setPoints([]))
    return () => {
      alive = false
    }
  }, [metric?.id, days]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!metric) return null
  const last = points?.[points.length - 1]
  const first = points?.[0]
  return (
    <figure className="chart">
      <figcaption className="chart-title">
        {metric.name}, {metric.unit} — последние {days} дней
      </figcaption>
      {points == null ? (
        <div className="skeleton" style={{ height }} />
      ) : points.length === 0 ? (
        <p className="empty">Нет данных за период.</p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={points} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="#e3e8ee" vertical={false} />
            <XAxis dataKey="measured_on" tickFormatter={fmtDay} fontSize={11} minTickGap={24} />
            <YAxis fontSize={11} domain={['auto', 'auto']} />
            <Tooltip formatter={(v) => [`${fmt(v)} ${metric.unit}`, metric.name]} labelFormatter={fmtDate} />
            {markDate && <ReferenceLine x={markDate} stroke="#1e8a5f" strokeDasharray="4 3" label={{ value: 'внедрено', fontSize: 11, fill: '#1e8a5f', position: 'insideTopRight' }} />}
            <Line type="monotone" dataKey="value" stroke="#2e6fd0" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
      {last && first && (
        <p className="chart-text">
          {fmtDate(first.measured_on)}: {fmt(first.value)} {metric.unit} → {fmtDate(last.measured_on)}: {fmt(last.value)} {metric.unit}
        </p>
      )}
    </figure>
  )
}
