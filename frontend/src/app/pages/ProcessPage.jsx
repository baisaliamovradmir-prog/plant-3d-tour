// Экран «Процесс» (экран 6, ФТ-7): схема этапов с подсвеченным текущим, метрики этапа,
// график по датам, «Вернуться в тур» и «Показать этап в туре».
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api, loadLevel } from '../../3d'
import { can, useAuth } from '../auth.js'
import { fmt, fmt0, fmtMetric } from '../format.js'
import MetricChart from '../components/MetricChart.jsx'
import { useBackToTour } from '../components/useBackToTour.js'

export default function ProcessPage() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const [process, setProcess] = useState(null)
  const [error, setError] = useState(null)
  const [chartKind, setChartKind] = useState('duration')
  const stageId = params.get('stage') ? Number(params.get('stage')) : null
  const back = useBackToTour()
  const user = useAuth((s) => s.user)

  useEffect(() => {
    setError(null)
    api.getProcess(id).then(setProcess).catch((e) => setError(e.message))
  }, [id])

  const bottleneckId = useMemo(() => {
    let best = null
    for (const s of process?.stages || []) {
      const load = s.metrics.find((m) => m.unit === '%')
      if (load && (!best || load.latest > best.v)) best = { v: load.latest, id: s.id }
    }
    return best?.id
  }, [process])

  if (error)
    return (
      <main className="sub-page state-page">
        <p className="form-error">Не удалось загрузить процесс: {error}</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Повторить
        </button>
      </main>
    )
  if (!process)
    return (
      <main className="sub-page">
        <div className="skeleton" style={{ height: 32, width: 320 }} />
        <div className="skeleton" style={{ height: 90, marginTop: 16 }} />
        <div className="skeleton" style={{ height: 240, marginTop: 16 }} />
      </main>
    )

  const stage = process.stages.find((s) => s.id === stageId)
  const durationMetric = stage ? stage.metrics.find((m) => m.unit === 'ч') : process.metrics.find((m) => m.id === 1)
  const loadMetric = stage ? stage.metrics.find((m) => m.unit === '%') : process.metrics.find((m) => m.id === 3)
  const chartMetric = chartKind === 'load' ? loadMetric : durationMetric

  return (
    <main className="sub-page">
      <div className="page-actions">
        <button type="button" className="btn btn-ghost" onClick={() => back()}>
          ← Вернуться в тур
        </button>
        {can(user, 'dashboard') && (
          <Link className="btn btn-ghost" to={`/dashboard${stage ? `?stage=${stage.id}` : ''}`}>
            Открыть в дашборде
          </Link>
        )}
      </div>
      <p className="eyebrow">Процесс · {process.stages.length} этапов</p>
      <h1>{process.name}</h1>
      <p className="lead">{process.description}</p>

      <ol className="stage-chain" aria-label="Схема этапов процесса">
        {process.stages.map((s) => {
          const load = s.metrics.find((m) => m.unit === '%')?.latest
          return (
            <li key={s.id}>
              <button
                type="button"
                aria-current={s.id === stageId ? 'step' : undefined}
                className={`stage${s.id === stageId ? ' is-current' : ''}${s.id === bottleneckId ? ' is-hot' : ''}`}
                onClick={() => setParams(s.id === stageId ? {} : { stage: String(s.id) }, { replace: true })}
              >
                <span className="stage-no">Этап {s.step_no}</span>
                <strong>{s.name}</strong>
                <span>{fmt(s.metrics.find((m) => m.unit === 'ч')?.latest ?? s.duration_h)} ч</span>
                {load != null && (
                  <span className={`stage-load lvl-${loadLevel(load)}`} aria-label={`Загрузка ${fmt(load)} %`}>
                    <i style={{ width: `${Math.min(100, load)}%` }} />
                  </span>
                )}
                {s.id === bottleneckId && <em>узкое место</em>}
              </button>
            </li>
          )
        })}
      </ol>

      <h2 className="section-title">{stage ? `Этап ${stage.step_no}. ${stage.name}` : 'Весь процесс'}</h2>
      {stage?.description && <p className="lead">{stage.description}</p>}
      <div className="metric-row">
        {(stage ? stage.metrics : process.metrics).map((m) => (
          <div key={m.id} className={`metric${m.unit === '%' && m.latest >= 90 ? ' is-hot' : ''}`}>
            <span>{m.name}</span>
            <strong>{fmtMetric(m)}</strong>
          </div>
        ))}
        {stage && (
          <div className="metric">
            <span>Стоимость этапа</span>
            <strong>{fmt0(stage.cost_rub)} ₽/партия</strong>
          </div>
        )}
      </div>

      {stage && (
        <p className="stage-io">
          <b>Ресурс:</b> {stage.resource?.name} ({fmt(stage.resource?.capacity)} {stage.resource?.capacity_unit}) · <b>Вход:</b> {stage.inputs} · <b>Выход:</b> {stage.outputs}
        </p>
      )}

      <div className="segmented" role="group" aria-label="Что показать на графике">
        <button type="button" className={chartKind === 'duration' ? 'is-on' : ''} onClick={() => setChartKind('duration')}>
          {stage ? 'Длительность' : 'Время цикла'}
        </button>
        <button type="button" className={chartKind === 'load' ? 'is-on' : ''} onClick={() => setChartKind('load')}>
          Загрузка
        </button>
      </div>
      <MetricChart metric={chartMetric} />

      {stage && (
        <button type="button" className="btn btn-primary" onClick={() => back(stage.location_id)}>
          Показать этап в туре: {stage.location?.name}
        </button>
      )}
    </main>
  )
}
