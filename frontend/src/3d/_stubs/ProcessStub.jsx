// ВРЕМЕННО: заглушка ветки 3d. Экран «Процесс» (экран 6): схема этапов с подсвеченным текущим,
// метрики этапа, график по датам, «Вернуться в тур» (ФТ-7). Сделает фронтенд.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api/client.js'
import { useTourStore } from '../store/tourStore.js'
import { fmt, fmtMetric } from './format.js'

export function useBackToTour() {
  const navigate = useNavigate()
  const route = useTourStore((s) => s.route)
  const goToLocation = useTourStore((s) => s.goToLocation)
  return (locationId) => {
    if (locationId) goToLocation(locationId)
    navigate(route ? `/tour/${route.id}` : '/tour')
  }
}

export function MetricChart({ metric, days = 30 }) {
  const [points, setPoints] = useState([])
  useEffect(() => {
    if (!metric) return
    api.getMetricValues(metric.id).then((list) => setPoints(list.slice(-days)))
  }, [metric, days])
  if (!metric) return null
  return (
    <div className="chart">
      <p className="chart-title">
        {metric.name}, {metric.unit} — последние {days} дней
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={points} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#e3e8ee" vertical={false} />
          <XAxis dataKey="measured_on" tickFormatter={(d) => d.slice(8, 10) + '.' + d.slice(5, 7)} fontSize={11} minTickGap={24} />
          <YAxis fontSize={11} domain={['auto', 'auto']} />
          <Tooltip formatter={(v) => [`${fmt(v)} ${metric.unit}`, metric.name]} labelFormatter={(d) => d} />
          <Line type="monotone" dataKey="value" stroke="#2f6fd6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function ProcessStub() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const [process, setProcess] = useState(null)
  const [stageId, setStageId] = useState(params.get('stage') ? Number(params.get('stage')) : null)
  const back = useBackToTour()

  useEffect(() => {
    api.getProcess(id).then(setProcess)
  }, [id])

  const bottleneckId = useMemo(() => {
    let best = null
    for (const s of process?.stages || []) {
      const load = s.metrics.find((m) => m.unit === '%')
      if (load && (!best || load.latest > best.v)) best = { v: load.latest, id: s.id }
    }
    return best?.id
  }, [process])

  if (!process) return <main className="sub-page">Загрузка…</main>
  const stage = process.stages.find((s) => s.id === stageId)
  const chartMetric = stage ? stage.metrics.find((m) => m.unit === 'ч') : process.metrics[0]

  return (
    <main className="sub-page">
      <button type="button" className="btn btn-ghost" onClick={() => back()}>
        ← Вернуться в тур
      </button>
      <h1>{process.name}</h1>
      <p className="lead">{process.description}</p>

      <ol className="stage-chain">
        {process.stages.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className={`stage${s.id === stageId ? ' is-current' : ''}${s.id === bottleneckId ? ' is-hot' : ''}`}
              onClick={() => setStageId(s.id)}
            >
              <span className="stage-no">{s.step_no}</span>
              <strong>{s.name}</strong>
              <span>{fmt(s.duration_h)} ч</span>
              {s.id === bottleneckId && <em>узкое место</em>}
            </button>
          </li>
        ))}
      </ol>

      <div className="metric-row">
        {(stage ? stage.metrics : process.metrics).map((m) => (
          <div key={m.id} className="metric">
            <span>{m.name}</span>
            <strong>{fmtMetric(m)}</strong>
          </div>
        ))}
        {stage && (
          <div className="metric">
            <span>Стоимость этапа</span>
            <strong>{fmt(stage.cost_rub)} ₽/партия</strong>
          </div>
        )}
      </div>

      {stage && (
        <p className="stage-io">
          <b>Ресурс:</b> {stage.resource?.name} ({fmt(stage.resource?.capacity)} {stage.resource?.capacity_unit}) · <b>Вход:</b> {stage.inputs} ·{' '}
          <b>Выход:</b> {stage.outputs}
        </p>
      )}

      <MetricChart metric={chartMetric} />

      {stage && (
        <button type="button" className="btn btn-primary" onClick={() => back(stage.location_id)}>
          Показать этап в туре: {stage.location?.name}
        </button>
      )}
    </main>
  )
}
