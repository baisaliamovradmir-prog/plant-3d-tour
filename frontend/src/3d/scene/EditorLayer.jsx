// Режим редактора точек (ФТ-12): клик по сцене возвращает координаты (x, y, z или yaw/pitch),
// редактор заполняет карточку и сохраняет точку — без правки кода.
import { useState } from 'react'
import { api, lookups } from '../api/client.js'
import { useTourStore } from '../store/tourStore.js'
import { vec3ToYawPitch } from './sceneUtils.js'

const CLICK_TOLERANCE_PX = 5

// Внутри <Canvas>: оборачивает сцену и в режиме правки ловит клик по геометрии.
export function EditorPicker({ enabled, sceneType, onPick, children }) {
  return (
    <group
      onClick={(e) => {
        if (!enabled || e.delta > CLICK_TOLERANCE_PX) return
        e.stopPropagation()
        if (sceneType === 'panorama') {
          onPick(vec3ToYawPitch(e.point))
        } else {
          const r = (v) => Math.round(v * 10) / 10
          onPick({ pos_x: r(e.point.x), pos_y: r(e.point.y + 0.8), pos_z: r(e.point.z) })
        }
      }}
    >
      {children}
    </group>
  )
}

// Поверх сцены: панель с подсказкой и формой новой точки.
export function EditorForm({ location, draft, onCancel, onSaved }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [stageId, setStageId] = useState('')
  const [caseId, setCaseId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const setEditMode = useTourStore((s) => s.setEditMode)

  if (!draft) {
    return (
      <div className="editor-hint" role="status">
        <strong>Режим редактора.</strong> Нажмите на объект сцены, чтобы поставить точку интереса в локации «{location?.name}».
        <button type="button" className="btn btn-ghost" onClick={() => setEditMode(false)}>
          Выйти
        </button>
      </div>
    )
  }

  const coords = draft.yaw != null ? `yaw ${draft.yaw}°, pitch ${draft.pitch}°` : `x ${draft.pos_x}, y ${draft.pos_y}, z ${draft.pos_z}`

  async function save(e) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Укажите название точки')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const h = await api.createHotspot({
        location_id: location.id,
        title: title.trim(),
        description: description.trim(),
        kind: caseId ? 'case' : stageId ? 'process' : 'info',
        status: 'published',
        stage_id: stageId ? Number(stageId) : null,
        case_id: caseId ? Number(caseId) : null,
        ...draft,
      })
      setTitle('')
      setDescription('')
      setStageId('')
      setCaseId('')
      onSaved(h)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="editor-form" onSubmit={save}>
      <h3>Новая точка интереса</h3>
      <p className="editor-coords">
        {location?.name} · {coords}
      </p>
      <label>
        Название
        <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus maxLength={80} />
      </label>
      <label>
        Описание
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </label>
      <label>
        Этап процесса
        <select value={stageId} onChange={(e) => setStageId(e.target.value)}>
          <option value="">— не привязан —</option>
          {lookups.stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Кейс
        <select value={caseId} onChange={(e) => setCaseId(e.target.value)}>
          <option value="">— нет —</option>
          {lookups.cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="editor-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Сохраняю…' : 'Сохранить точку'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Отмена
        </button>
      </div>
    </form>
  )
}
