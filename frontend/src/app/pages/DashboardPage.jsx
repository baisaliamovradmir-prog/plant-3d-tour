// Дашборд руководителя (экран 8, ФТ-10): 4 метрики и их динамика, загрузка этапов с узким местом,
// рекомендация, кейсы, популярные точки тура и доходимость маршрутов (ФТ-14).
// Из любой цифры — «Показать в туре»: обратный путь от метрики к месту на заводе.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts'
import { api, loadLevel } from '../../3d'
import { fmt, fmt0, fmtDate } from '../format.js'
import AppHeader from '../components/AppHeader.jsx'
import MetricChart from '../components/MetricChart.jsx'
import { useBackToTour } from '../components/useBackToTour.js'

const KPI_TITLE = { 1: 'Время цикла партии', 2: 'Выпуск', 3: 'Загрузка узкого места', 4: 'Стоимость переработки' }

function Kpi({ m }) {
  const d = m.value_30d_ago ? ((m.latest - m.value_30d_ago) / m.value_30d_ago) * 100 : null
  const good = d == null || Math.abs(d) < 0.5 ? null : m.better === 'higher' ? d > 0 : d < 0
  const value = m.unit === '₽/т' ? fmt0(m.latest) : fmt(m.latest)
  return (
    <article className="kpi">
      <span className="kpi-title">{KPI_TITLE[m.id] || m.name}</span>
      <strong className="kpi-value">
        {value} <small>{m.unit}</small>
      </strong>
      {d != null && (
        <span className={`kpi-delta${good == null ? '' : good ? ' is-good' : ' is-bad'}`}>
          {d > 0 ? '▲' : d < 0 ? '▼' : '■'} {fmt(Math.abs(d))} % за 30 дней
        </span>
      )}
      <div className="kpi-spark" aria-hidden="true">
        <ResponsiveContainer width="100%" height={44}>
          <LineChart data={m.series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <YAxis hide domain={['auto', 'auto']} />
            <Line type="monotone" dataKey="value" stroke={good === false ? '#b5342b' : '#2e6fd0'} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}

export default function DashboardPage() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const back = useBackToTour()
  const stageId = params.get('stage') ? Number(params.get('stage')) : null

  const load = () => {
    setError(null)
    api.getDashboard().then(setData).catch((e) => setError(e.message))
  }
  useEffect(load, [])

  if (error)
    return (
      <>
        <AppHeader />
        <main className="dash state-page">
          <p className="form-error">Не удалось загрузить дашборд: {error}</p>
          <button type="button" className="btn btn-primary" onClick={load}>
            Повторить
          </button>
        </main>
      </>
    )

  const selected = data?.stages.find((s) => s.id === stageId) || data?.bottleneck || null
  const b = data?.bottleneck
  const maxViews = data ? Math.max(...data.views.map((v) => v.views), 1) : 1

  return (
    <>
      <AppHeader />
      <main className="dash">
        <header className="dash-head">
          <div>
            <p className="eyebrow">Дашборд руководителя</p>
            <h1>{data ? data.process.name : 'Загрузка…'}</h1>
          </div>
          {data && <p className="dash-asof">Данные на {fmtDate(data.as_of)}</p>}
        </header>

        <section className="kpi-row" aria-label="Ключевые показатели">
          {data ? data.kpi.map((m) => <Kpi key={m.id} m={m} />) : [1, 2, 3, 4].map((i) => <div key={i} className="kpi skeleton" style={{ height: 140 }} />)}
        </section>

        <div className="dash-grid">
          <section className="dash-card" aria-labelledby="loads-title">
            <h2 id="loads-title">Загрузка этапов</h2>
            <p className="dash-hint">Нажмите на этап, чтобы увидеть его динамику. Красным — узкое место.</p>
            <ol className="load-bars">
              {data?.stages.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`load-bar lvl-${loadLevel(s.load_pct)}${selected?.id === s.id ? ' is-selected' : ''}`}
                    aria-pressed={selected?.id === s.id}
                    onClick={() => setParams({ stage: String(s.id) }, { replace: true })}
                  >
                    <span className="load-bar-name">
                      {s.step_no}. {s.name}
                    </span>
                    <span className="load-bar-track">
                      <i style={{ width: `${Math.min(100, s.load_pct ?? 0)}%` }} />
                    </span>
                    <span className="load-bar-value">{fmt(s.load_pct)} %</span>
                  </button>
                </li>
              ))}
            </ol>
            {selected && (
              <>
                <MetricChart metric={{ id: selected.duration_metric_id, name: `Длительность: ${selected.name}`, unit: 'ч' }} height={180} />
                <div className="dash-actions">
                  <button type="button" className="btn btn-primary" onClick={() => back(selected.location_id)}>
                    Показать в туре: {selected.location}
                  </button>
                  <Link className="btn btn-ghost" to={`/process/1?stage=${selected.id}`}>
                    Этап в процессе
                  </Link>
                </div>
              </>
            )}
          </section>

          <div className="dash-side">
            {b && (
              <section className="dash-card bottleneck-card" aria-labelledby="bn-title">
                <p className="eyebrow">Узкое место</p>
                <h2 id="bn-title">
                  {b.name} · {fmt(b.load_pct)} %
                </h2>
                <p>
                  Этап {b.step_no}, {b.location}. Партия проводит здесь {fmt(b.duration_h)} ч — при загрузке выше 90 % очередь растёт быстрее, чем
                  разбирается.
                </p>
                <p className="bn-advice">
                  <b>Рекомендация:</b> {b.advice}
                </p>
                <div className="dash-actions">
                  <button type="button" className="btn btn-primary" onClick={() => back(b.location_id, b.hotspot_id)}>
                    Показать в туре
                  </button>
                  {b.case && (
                    <Link className="btn btn-ghost" to={`/case/${b.case.id}`}>
                      Кейс: {b.case.title}
                    </Link>
                  )}
                </div>
              </section>
            )}

            <section className="dash-card" aria-labelledby="cases-title">
              <h2 id="cases-title">Кейсы улучшений</h2>
              <ul className="case-list">
                {data?.cases.map((c) => {
                  const d = ((c.value_after - c.value_before) / c.value_before) * 100
                  return (
                    <li key={c.id}>
                      <Link to={`/case/${c.id}`}>
                        <strong>{c.title}</strong>
                        <span>
                          {c.stage?.name} · {c.status}
                        </span>
                      </Link>
                      <span className="case-delta">
                        {fmt(c.value_before)} → {fmt(c.value_after)} {c.metric?.unit} <b>({fmt(d)} %)</b>
                      </span>
                      {c.location_id && (
                        <button type="button" className="link-btn" onClick={() => back(c.location_id)}>
                          Показать в туре
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          </div>
        </div>

        <div className="dash-grid dash-grid--even">
          <section className="dash-card" aria-labelledby="views-title">
            <h2 id="views-title">Популярные точки тура</h2>
            <p className="dash-hint">Просмотры карточек (анонимно).</p>
            <ol className="views-list">
              {data?.views.slice(0, 6).map((v) => (
                <li key={v.hotspot_id}>
                  <button type="button" className="views-row" onClick={() => back(v.location_id, v.hotspot_id)} title="Показать в туре">
                    <span className="views-name">
                      {v.title}
                      <small>{v.location}</small>
                    </span>
                    <span className="views-track">
                      <i style={{ width: `${(v.views / maxViews) * 100}%` }} />
                    </span>
                    <span className="views-value">{fmt0(v.views)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
          <section className="dash-card" aria-labelledby="routes-title">
            <h2 id="routes-title">Маршруты: доходимость</h2>
            <p className="dash-hint">Сколько посетителей дошли маршрут до конца.</p>
            <ul className="route-stats">
              {data?.routes.map((r) => {
                const pct = r.starts ? (r.finishes / r.starts) * 100 : 0
                return (
                  <li key={r.route_id}>
                    <div>
                      <strong>{r.name}</strong>
                      <span>{r.audience}</span>
                    </div>
                    <span className="route-stats-pct">{fmt0(pct)} %</span>
                    <span className="route-stats-n">
                      {fmt0(r.finishes)} из {fmt0(r.starts)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      </main>
    </>
  )
}
