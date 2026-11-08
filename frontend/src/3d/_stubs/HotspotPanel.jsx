// ВРЕМЕННО: заглушка ветки 3d. Карточка точки (экран 5): описание, медиа, показатель,
// кнопки «Процесс» и «Кейс». Сбоку на ПК, снизу на телефоне. Сделает фронтенд.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'
import { useTourStore } from '../store/tourStore.js'
import { fmt, fmtMetric } from './format.js'

const KIND = { info: 'Информация', process: 'Этап процесса', case: 'Кейс', transition: 'Переход' }

export default function HotspotPanel() {
  const id = useTourStore((s) => s.selectedHotspotId)
  const close = useTourStore((s) => s.closeHotspot)
  const version = useTourStore((s) => s.hotspotsVersion)
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

  return (
    <aside className="hotspot-panel" aria-label={`Точка интереса: ${h.title}`}>
      <button type="button" className="panel-close" onClick={close} aria-label="Закрыть карточку">
        ×
      </button>
      <span className={`panel-kind kind-${h.kind}`}>{KIND[h.kind] || 'Точка'}</span>
      <h2>{h.title}</h2>
      {h.stage && (
        <p className="panel-stage">
          Этап {h.stage.step_no} из 7 · {h.stage.name}
        </p>
      )}
      <p>{h.description}</p>

      {h.media.length > 0 && (
        <figure className="panel-media">
          <img src={h.media[0].url} alt={h.media[0].caption} loading="lazy" />
          <figcaption>{h.media[0].caption}</figcaption>
        </figure>
      )}

      <div className="panel-metrics">
        {h.metrics.map((m) => (
          <div key={m.id} className={`metric${m.unit === '%' && m.latest >= 90 ? ' is-hot' : ''}`}>
            <span>{m.name}</span>
            <strong>{fmtMetric(m)}</strong>
          </div>
        ))}
      </div>

      {h.case && (
        <div className="panel-case">
          <span>Кейс · {h.case.status}</span>
          <strong>{h.case.title}</strong>
          <span>
            было {fmt(h.case.value_before)} → стало {fmt(h.case.value_after)} {h.case.metric?.unit}
          </span>
        </div>
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
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate(`/process/1${h.stage ? `?stage=${h.stage.id}` : ''}`)}
        >
          Процесс
        </button>
        {h.case && (
          <button type="button" className="btn btn-ghost" onClick={() => navigate(`/case/${h.case.id}`)}>
            Кейс
          </button>
        )}
      </div>
    </aside>
  )
}
