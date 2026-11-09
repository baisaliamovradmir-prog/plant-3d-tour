// Карточка точки (экран 5, ФТ-6): описание, фото и видео, показатель, кнопки «Процесс» и «Кейс».
// Сбоку на ПК, снизу на телефоне. Если тур получил расчёт цифрового двойника, показатели берутся из него.
// Руководителю доступна кнопка «Открыть в дашборде» (FR-21: из точки — в метрику двойника).
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, applyTwin, useTourStore } from '../../3d'
import { can, useAuth } from '../auth.js'
import { fmt, fmtMetric } from '../format.js'

const KIND = { info: 'Информация', process: 'Этап процесса', case: 'Кейс', transition: 'Переход' }

function Media({ items }) {
  const [i, setI] = useState(0)
  if (!items.length) return null
  const m = items[Math.min(i, items.length - 1)]
  return (
    <figure className="panel-media">
      {m.media_type === 'video' ? (
        <video src={m.url} controls preload="metadata" aria-label={m.caption} />
      ) : (
        <img src={m.url} alt={m.caption} loading="lazy" />
      )}
      <figcaption>{m.caption}</figcaption>
      {items.length > 1 && (
        <div className="panel-media-dots" role="tablist" aria-label="Медиа точки">
          {items.map((x, k) => (
            <button key={x.id} type="button" role="tab" aria-selected={k === i} aria-label={x.caption} onClick={() => setI(k)} />
          ))}
        </div>
      )}
    </figure>
  )
}

export default function HotspotPanel() {
  const id = useTourStore((s) => s.selectedHotspotId)
  const close = useTourStore((s) => s.closeHotspot)
  const version = useTourStore((s) => s.hotspotsVersion)
  const twin = useTourStore((s) => s.twin)
  const stagesTotal = useTourStore((s) => s.process?.stages?.length)
  const user = useAuth((s) => s.user)
  const [h, setH] = useState(null)
  const [cases, setCases] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    let alive = true
    if (!id) {
      setH(null)
      return
    }
    api.getHotspot(id).then((x) => alive && setH(x))
    return () => {
      alive = false
    }
  }, [id, version])

  useEffect(() => {
    if (h && !h.stage) api.getCases().then(setCases)
  }, [h])

  if (!id || !h || h.id !== id) return null
  const metrics = applyTwin(h.metrics, h.stage?.id, twin)
  const fromTwin = metrics.some((m) => m.from_twin)

  return (
    <aside className="hotspot-panel" aria-label={`Точка интереса: ${h.title}`}>
      <button type="button" className="panel-close" onClick={close} aria-label="Закрыть карточку (Esc)">
        ×
      </button>
      <span className={`panel-kind kind-${h.kind}`}>{KIND[h.kind] || 'Точка'}</span>
      <h2>{h.title}</h2>
      {h.stage && (
        <p className="panel-stage">
          Этап {h.stage.step_no}
          {stagesTotal ? ` из ${stagesTotal}` : ''} · {h.stage.name}
        </p>
      )}
      <p>{h.description}</p>

      <Media items={h.media || []} />

      <div className="panel-metrics">
        {metrics.map((m) => (
          <div key={m.id} className={`metric${m.unit === '%' && m.latest >= 90 ? ' is-hot' : ''}`}>
            <span>{m.name}</span>
            <strong>{fmtMetric(m)}</strong>
          </div>
        ))}
      </div>
      {fromTwin && <p className="panel-source">Показатели — из расчёта цифрового двойника: {twin.scenario}</p>}

      {h.case && (
        <Link className="panel-case" to={`/case/${h.case.id}`}>
          <span>Кейс · {h.case.status}</span>
          <strong>{h.case.title}</strong>
          <span>
            было {fmt(h.case.value_before)} → стало {fmt(h.case.value_after)} {h.case.metric?.unit}
          </span>
        </Link>
      )}

      {!h.stage && cases.length > 0 && (
        <div className="panel-cases">
          <span>Кейсы улучшений</span>
          {cases.map((c) => (
            <button key={c.id} type="button" className="link-btn" onClick={() => navigate(`/case/${c.id}`)}>
              {c.title}: {fmt(c.value_before)} → {fmt(c.value_after)} {c.metric?.unit}
            </button>
          ))}
        </div>
      )}

      <div className="panel-actions">
        <button type="button" className="btn btn-primary" onClick={() => navigate(`/process/1${h.stage ? `?stage=${h.stage.id}` : ''}`)}>
          Процесс
        </button>
        {h.case && (
          <button type="button" className="btn btn-ghost" onClick={() => navigate(`/case/${h.case.id}`)}>
            Кейс
          </button>
        )}
      </div>
      {can(user, 'dashboard') && (
        <Link className="btn btn-ghost panel-dashboard" to={`/dashboard${h.stage ? `?stage=${h.stage.id}` : ''}`}>
          Открыть в дашборде
        </Link>
      )}
    </aside>
  )
}
