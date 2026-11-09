// Текстовая версия тура: все локации и точки с описаниями без 3D (доступность, работа на слабых устройствах).
import { useEffect, useState } from 'react'
import { api } from '../api/client.js'
import { useTourStore } from '../store/tourStore.js'

export default function TourTextVersion({ locations, noWebGL = false }) {
  const [details, setDetails] = useState([])
  const goToLocation = useTourStore((s) => s.goToLocation)
  const setTextMode = useTourStore((s) => s.setTextMode)
  const version = useTourStore((s) => s.hotspotsVersion)

  useEffect(() => {
    let alive = true
    Promise.all(locations.map((l) => api.getLocation(l.id))).then((list) => alive && setDetails(list.filter(Boolean)))
    return () => {
      alive = false
    }
  }, [locations, version])

  return (
    <section className="text-version" aria-label="Текстовая версия тура">
      <header>
        <h2>Текстовая версия тура</h2>
        {!noWebGL && (
          <button type="button" className="btn btn-ghost" onClick={() => setTextMode(false)}>
            Вернуться к 3D
          </button>
        )}
      </header>
      {noWebGL && <p className="text-version-note">Браузер не поддерживает WebGL, поэтому тур открыт в текстовом виде. Все точки и описания — те же, что в 3D.</p>}
      {details.map((l) => (
        <article key={l.id}>
          <h3>{l.name}</h3>
          <p>{l.description}</p>
          <ul>
            {l.hotspots.map((h) => (
              <li key={h.id}>
                <strong>{h.title}.</strong> {h.description}{' '}
                {!noWebGL && (
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setTextMode(false)
                    goToLocation(l.id, h.id)
                  }}
                >
                  Показать в туре
                </button>
                )}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  )
}
