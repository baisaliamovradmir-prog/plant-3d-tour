// Карточка кейса (экран 7, ФТ-9): проблема → решение → результат, метрика до и после,
// график с датой внедрения, «Показать в туре».
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../3d'
import { fmt, fmtDate } from '../format.js'
import MetricChart from '../components/MetricChart.jsx'
import { useBackToTour } from '../components/useBackToTour.js'

export default function CasePage() {
  const { id } = useParams()
  const [c, setC] = useState(null)
  const [error, setError] = useState(null)
  const back = useBackToTour()

  useEffect(() => {
    setError(null)
    api
      .getCase(id)
      .then((x) => (x ? setC(x) : setError('Кейс не найден')))
      .catch((e) => setError(e.message))
  }, [id])

  if (error)
    return (
      <main className="sub-page state-page">
        <p className="form-error">{error}</p>
        <Link to="/" className="btn btn-ghost">
          К маршрутам
        </Link>
      </main>
    )
  if (!c)
    return (
      <main className="sub-page">
        <div className="skeleton" style={{ height: 32, width: 320 }} />
        <div className="skeleton" style={{ height: 140, marginTop: 16 }} />
      </main>
    )
  const max = Math.max(c.value_before, c.value_after)
  const delta = ((c.value_after - c.value_before) / c.value_before) * 100
  const better = c.metric?.better === 'higher' ? delta > 0 : delta < 0

  return (
    <main className="sub-page">
      <div className="page-actions">
        <button type="button" className="btn btn-ghost" onClick={() => back()}>
          ← Вернуться в тур
        </button>
      </div>
      <p className="eyebrow">
        Кейс · {c.status}
        {c.implemented_on ? ` с ${fmtDate(c.implemented_on)}` : ''} · {c.stage?.name}
      </p>
      <h1>{c.title}</h1>
      <div className="case-steps">
        <section>
          <h3>
            <span className="case-step-no">1</span> Проблема
          </h3>
          <p>{c.problem}</p>
        </section>
        <section>
          <h3>
            <span className="case-step-no">2</span> Решение
          </h3>
          <p>{c.solution}</p>
        </section>
        <section>
          <h3>
            <span className="case-step-no">3</span> Результат
          </h3>
          <p>{c.result}</p>
        </section>
      </div>
      <div className="before-after" aria-label="Метрика до и после">
        <p>
          {c.metric?.name}, {c.metric?.unit}:&nbsp;
          <b className={better ? 'is-good' : 'is-bad'}>
            {delta > 0 ? '+' : ''}
            {fmt(delta)} %
          </b>
        </p>
        <div className="ba-row">
          <span>Было</span>
          <i style={{ width: `${(c.value_before / max) * 100}%` }} className="ba-before" />
          <strong>{fmt(c.value_before)}</strong>
        </div>
        <div className="ba-row">
          <span>Стало</span>
          <i style={{ width: `${(c.value_after / max) * 100}%` }} className="ba-after" />
          <strong>{fmt(c.value_after)}</strong>
        </div>
      </div>
      <MetricChart metric={c.metric} days={60} markDate={c.status === 'внедрено' ? c.implemented_on : null} />
      {c.location_id && (
        <button type="button" className="btn btn-primary" onClick={() => back(c.location_id)}>
          Показать в туре
        </button>
      )}
    </main>
  )
}
