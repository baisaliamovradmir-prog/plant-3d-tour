// ВРЕМЕННО: заглушка ветки 3d. Карточка кейса (экран 7): проблема → решение → результат,
// метрика до и после, «Показать в туре» (ФТ-9). Сделает фронтенд.
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client.js'
import { fmt } from './format.js'
import { MetricChart, useBackToTour } from './ProcessStub.jsx'

export default function CaseStub() {
  const { id } = useParams()
  const [c, setC] = useState(null)
  const back = useBackToTour()

  useEffect(() => {
    api.getCase(id).then(setC)
  }, [id])

  if (!c) return <main className="sub-page">Загрузка…</main>
  const max = Math.max(c.value_before, c.value_after)
  const delta = ((c.value_after - c.value_before) / c.value_before) * 100

  return (
    <main className="sub-page">
      <button type="button" className="btn btn-ghost" onClick={() => back()}>
        ← Вернуться в тур
      </button>
      <p className="eyebrow">
        Кейс · {c.status} · {c.stage?.name}
      </p>
      <h1>{c.title}</h1>
      <div className="case-steps">
        <section>
          <h3>Проблема</h3>
          <p>{c.problem}</p>
        </section>
        <section>
          <h3>Решение</h3>
          <p>{c.solution}</p>
        </section>
        <section>
          <h3>Результат</h3>
          <p>{c.result}</p>
        </section>
      </div>
      <div className="before-after" aria-label="Метрика до и после">
        <p>
          {c.metric?.name} ({c.stage?.name}), {c.metric?.unit}: <b>{fmt(delta)} %</b>
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
      <MetricChart metric={c.metric} days={60} />
      {c.location_id && (
        <button type="button" className="btn btn-primary" onClick={() => back(c.location_id)}>
          Показать в туре
        </button>
      )}
    </main>
  )
}
