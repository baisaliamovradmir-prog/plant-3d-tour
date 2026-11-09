// Холст 3D-тура: <Canvas> → свет и окружение → сцена локации (генплан, 3D-модель или панорама)
// → метки точек интереса → камера. Поверх — затемнение перехода, мини-карта и редактор точек.
import { Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html, PerformanceMonitor } from '@react-three/drei'
import { api } from '../api/client.js'
import { useTourStore } from '../store/tourStore.js'
import { useStageStats } from '../store/stats.js'
import { hotspotPosition, isMobileViewport, viewFor } from './sceneUtils.js'
import Atmosphere from './Atmosphere.jsx'
import PointList from './PointList.jsx'
import SiteOverview from './SiteOverview.jsx'
import ModelScene, { preloadLocationAsset } from './ModelScene.jsx'
import PanoramaScene from './PanoramaScene.jsx'
import Hotspot from './Hotspot.jsx'
import CameraRig from './CameraRig.jsx'
import MiniMap from './MiniMap.jsx'
import TourTextVersion from './TourTextVersion.jsx'
import { EditorForm, EditorPicker } from './EditorLayer.jsx'

// Есть ли WebGL. Без него тур открывается в текстовой версии (NFR-05).
let webglOk = null
function hasWebGL() {
  if (webglOk != null) return webglOk
  try {
    const c = document.createElement('canvas')
    webglOk = !!(window.WebGL2RenderingContext && c.getContext('webgl2')) || !!c.getContext('webgl')
  } catch {
    webglOk = false
  }
  return webglOk
}

function SceneLoader() {
  return (
    <Html center>
      <div className="scene-loader">Загрузка сцены…</div>
    </Html>
  )
}

export default function TourCanvas() {
  const locationId = useTourStore((s) => s.locationId)
  const selectedHotspotId = useTourStore((s) => s.selectedHotspotId)
  const route = useTourStore((s) => s.route)
  const stepIndex = useTourStore((s) => s.stepIndex)
  const editMode = useTourStore((s) => s.editMode)
  const textMode = useTourStore((s) => s.textMode)
  const fading = useTourStore((s) => s.fading)
  const hotspotsVersion = useTourStore((s) => s.hotspotsVersion)
  const goToLocation = useTourStore((s) => s.goToLocation)
  const selectHotspot = useTourStore((s) => s.selectHotspot)
  const closeHotspot = useTourStore((s) => s.closeHotspot)
  const bumpHotspots = useTourStore((s) => s.bumpHotspots)
  const loadProcess = useTourStore((s) => s.loadProcess)
  const stats = useStageStats()
  const bottleneckLocationId = stats?.bottleneckLocationId ?? null

  const [locations, setLocations] = useState([])
  const [location, setLocation] = useState(null)
  const [draft, setDraft] = useState(null)
  const [mobile] = useState(isMobileViewport)
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2))
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getLocations().then(setLocations).catch((e) => setError(e.message))
    loadProcess().catch(() => {})
  }, [loadProcess])

  useEffect(() => {
    let alive = true
    setDraft(null)
    api
      .getLocation(locationId)
      .then((l) => alive && setLocation(l))
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [locationId, hotspotsVersion])

  // Esc закрывает карточку точки и черновик редактора.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        closeHotspot()
        setDraft(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeHotspot])

  const routeLocationIds = useMemo(() => (route ? route.steps.map((s) => s.location_id) : []), [route])
  const currentStep = route ? route.steps[stepIndex] : null

  // Заранее подгружаем следующую локацию маршрута (для .glb-моделей).
  useEffect(() => {
    if (!route) return
    const next = route.steps[stepIndex + 1]
    if (next) preloadLocationAsset(locations.find((l) => l.id === next.location_id))
  }, [route, stepIndex, locations])

  const ready = location && location.id === locationId
  const sceneType = ready ? location.scene_type : null
  const view = ready ? viewFor(location) : null
  const selected = ready ? location.hotspots.find((h) => h.id === selectedHotspotId) : null
  const focus = selected ? hotspotPosition(selected, sceneType) : null

  const hotspotNumber = (h, i) => {
    if (route) {
      const idx = route.steps.findIndex((s) => s.hotspot_id === h.id)
      if (idx >= 0) return idx + 1
    }
    return i + 1
  }

  if (!hasWebGL()) return <TourTextVersion locations={locations} noWebGL />
  if (textMode) return <TourTextVersion locations={locations} />

  return (
    <div className={`tour-canvas${editMode ? ' is-editing' : ''}`}>
      {error && <div className="scene-error">Не удалось загрузить данные тура: {error}</div>}
      <Canvas
        dpr={dpr}
        shadows={!mobile}
        camera={{ fov: 55, near: 0.05, far: 600, position: [-26, 34, 44] }}
        gl={{ antialias: !mobile, powerPreference: 'high-performance' }}
        onPointerMissed={() => !editMode && closeHotspot()}
      >
        <PerformanceMonitor
          onDecline={() => setDpr(1)}
          onIncline={() => setDpr(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2))}
        />
        {sceneType && <Atmosphere key={sceneType} sceneType={sceneType} mobile={mobile} />}

        {ready && (
          <Suspense fallback={<SceneLoader />}>
            <EditorPicker enabled={editMode} sceneType={sceneType} onPick={setDraft}>
              {sceneType === 'overview' && (
                <SiteOverview
                  locations={locations}
                  routeLocationIds={routeLocationIds}
                  currentStepLocationId={currentStep && currentStep.location_id !== location.id ? currentStep.location_id : null}
                  stats={stats}
                  interactive={!editMode}
                  onOpenLocation={(id) => goToLocation(id)}
                />
              )}
              {sceneType === 'model' && <ModelScene location={location} stats={stats} />}
              {sceneType === 'panorama' && <PanoramaScene location={location} stats={stats} />}
            </EditorPicker>

            {location.hotspots.map((h, i) => (
              <Hotspot
                key={h.id}
                hotspot={h}
                position={hotspotPosition(h, sceneType)}
                number={hotspotNumber(h, i)}
                selected={h.id === selectedHotspotId}
                inRoute={!!currentStep && currentStep.hotspot_id === h.id}
                stem={sceneType === 'model'}
                onSelect={selectHotspot}
              />
            ))}
            {draft && (
              <Hotspot
                hotspot={{ id: 'draft', title: 'Новая точка', kind: 'info' }}
                position={hotspotPosition(draft, sceneType)}
                stem={sceneType === 'model'}
                draft
              />
            )}
          </Suspense>
        )}

        {ready && <CameraRig sceneKey={location.id} sceneType={sceneType} view={view} focus={focus} idle={!route && !selectedHotspotId && !editMode} />}
      </Canvas>

      <div className={`fade${fading || !ready ? ' is-on' : ''}`} aria-hidden="true" />

      {ready && (
        <div className="location-panel">
          <div className="location-chip">
            <span className="location-chip-type">{sceneType === 'panorama' ? 'Панорама 360°' : sceneType === 'overview' ? 'Генплан' : '3D-модель'}</span>
            <strong>{location.name}</strong>
          </div>
          <PointList hotspots={location.hotspots} number={hotspotNumber} selectedId={selectedHotspotId} onSelect={selectHotspot} />
          {stats?.fromTwin && (
            <div className="twin-chip" title={`Цифры на сцене — из расчёта цифрового двойника: ${stats.scenario}`}>
              <i aria-hidden="true" /> Данные двойника
            </div>
          )}
        </div>
      )}

      {locations.length > 0 && (
        <MiniMap
          locations={locations}
          currentId={locationId}
          routeLocationIds={routeLocationIds}
          bottleneckLocationId={bottleneckLocationId}
          onSelect={(id) => goToLocation(id)}
        />
      )}

      {editMode && ready && (
        <EditorForm
          location={location}
          draft={draft}
          onCancel={() => setDraft(null)}
          onSaved={(h) => {
            setDraft(null)
            bumpHotspots()
            selectHotspot(h.id)
          }}
        />
      )}
    </div>
  )
}
