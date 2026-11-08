// ВРЕМЕННО: заглушка ветки 3d. Панель маршрута: текст гида, «шаг N из M», «Далее / Назад» (ФТ-8).
import { useTourStore } from '../store/tourStore.js'

export default function RouteProgress() {
  const route = useTourStore((s) => s.route)
  const stepIndex = useTourStore((s) => s.stepIndex)
  const next = useTourStore((s) => s.next)
  const prev = useTourStore((s) => s.prev)
  if (!route) return null
  const step = route.steps[stepIndex]
  const total = route.steps.length
  const last = stepIndex === total - 1

  return (
    <section className="route-progress" aria-live="polite">
      <div className="route-progress-bar">
        <i style={{ width: `${((stepIndex + 1) / total) * 100}%` }} />
      </div>
      <div className="route-progress-body">
        <span className="route-step">
          Шаг {stepIndex + 1} из {total}
        </span>
        <p className="narration">{step.narration}</p>
        <div className="route-buttons">
          <button type="button" className="btn btn-ghost" onClick={prev} disabled={stepIndex === 0}>
            Назад
          </button>
          <button type="button" className="btn btn-primary" onClick={next} disabled={last}>
            {last ? 'Маршрут пройден' : 'Далее'}
          </button>
        </div>
      </div>
    </section>
  )
}
