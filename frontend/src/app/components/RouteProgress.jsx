// Панель маршрута (ФТ-8): текст гида, «шаг N из M», прогресс и оставшееся время, «Далее / Назад».
import { Link } from 'react-router-dom'
import { useTourStore } from '../../3d'

const MIN_PER_STEP = 1.5

export default function RouteProgress() {
  const route = useTourStore((s) => s.route)
  const stepIndex = useTourStore((s) => s.stepIndex)
  const next = useTourStore((s) => s.next)
  const prev = useTourStore((s) => s.prev)
  if (!route) return null
  const step = route.steps[stepIndex]
  const total = route.steps.length
  const last = stepIndex === total - 1
  const left = Math.round((total - stepIndex - 1) * MIN_PER_STEP)

  return (
    <section className="route-progress" aria-live="polite" aria-label="Маршрут">
      <div className="route-progress-bar" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={stepIndex + 1}>
        <i style={{ width: `${((stepIndex + 1) / total) * 100}%` }} />
      </div>
      <div className="route-progress-body">
        <span className="route-step">
          Шаг {stepIndex + 1} из {total}
          <small>{last ? 'финиш' : `≈ ${left} мин до конца`}</small>
        </span>
        <p className="narration">{step.narration}</p>
        <div className="route-buttons">
          <button type="button" className="btn btn-ghost" onClick={prev} disabled={stepIndex === 0}>
            Назад
          </button>
          {last ? (
            <Link to="/" className="btn btn-primary">
              Завершить
            </Link>
          ) : (
            <button type="button" className="btn btn-primary" onClick={next}>
              Далее
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
