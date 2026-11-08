// Холст 3D-тура: <Canvas> → свет и окружение → сцена локации (генплан, 3D-модель или панорама)
// → метки точек интереса → камера. Поверх — затемнение перехода, мини-карта и редактор точек.
import { Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html, PerformanceMonitor } from '@react-three/drei'
import { api } from '../api/client.js'
import { useTourStore } from '../store/tourStore.js'
import { hotspotPosition, isMobileViewport, viewFor } from './sceneUtils.js'
import SiteOverview from './SiteOverview.jsx'
import ModelScene, { preloadLocationAsset } from './ModelScene.jsx'
import PanoramaScene from './PanoramaScene.jsx'
import Hotspot from './Hotspot.jsx'
import CameraRig from './CameraRig.jsx'
import MiniMap from './MiniMap.jsx'
import TourTextVersion from './TourTextVersion.jsx'
import { EditorForm, EditorPicker } from './EditorLayer.jsx'

const PROCESS_ID = 1

// Узкое место = локация этапа с самой высокой загрузкой ресурса (по последнему значению метрики).
function findBottleneckLocation(process) {
  let best = null
  for (const s of process?.stages || []) {
    const load = s.metrics.find((m) => m.unit === '%')
    if (load && load.latest != null && (!best || load.latest > best.value)) best = { value: load.latest, locationId: s.location_id }
  }
  return best ? best.locationId : null
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

  const [locations, setLocations] = useState([])
  const [location, setLocation] = useState(null)
  const [bottleneckLocationId, setBottleneckLocationId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [mobile] = useState(isMobileViewport)
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2))
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getLocations().then(setLocations).catch((e) => setError(e.message))
    api.getProcess(PROCESS_ID).then((p) => setBottleneckLocationId(findBottleneckLocation(p))).catch(() => {})
  }, [])

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
        <color attach="background" args={[sceneType === 'overview' ? '#dbe5ee' : '#e7ecf1']} />
        {sceneType === 'overview' && <fog attach="fog" args={['#dbe5ee', 90, 170]} />}
        <hemisphereLight args={['#ffffff', '#9aa7b6', 1.1]} />
        <directionalLight
          position={[25, 40, 18]}
          intensity={1.6}
          castShadow={!mobile}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-45}
          shadow-camera-right={45}
          shadow-camera-top={35}
          shadow-camera-bottom={-35}
          shadow-bias={-0.0004}
        />

        {ready && (
          <Suspense fallback={<SceneLoader />}>
            <EditorPicker enabled={editMode} sceneType={sceneType} onPick={setDraft}>
              {sceneType === 'overview' && (
                <SiteOverview
                  locations={locations}
                  routeLocationIds={routeLocationIds}
                  currentStepLocationId={currentStep && currentStep.location_id !== location.id ? currentStep.location_id : null}
                  bottleneckLocationId={bottleneckLocationId}
                  interactive={!editMode}
                  onOpenLocation={(id) => goToLocation(id)}
                />
              )}
              {sceneType === 'model' && <ModelScene location={location} />}
              {sceneType === 'panorama' && <PanoramaScene location={location} />}
            </EditorPicker>

            {location.hotspots.map((h, i) => (
              <Hotspot
                key={h.id}
                hotspot={h}
                position={hotspotPosition(h, sceneType)}
                number={hotspotNumber(h, i)}
                selected={h.id === selectedHotspotId}
                inRoute={!!currentStep && currentStep.hotspot_id === h.id}
                onSelect={selectHotspot}
              />
            ))}
            {draft && (
              <Hotspot
                hotspot={{ id: 'draft', title: 'Новая точка', kind: 'info' }}
                position={hotspotPosition(draft, sceneType)}
                draft
              />
            )}
          </Suspense>
        )}

        {ready && <CameraRig sceneKey={location.id} sceneType={sceneType} view={view} focus={focus} />}
      </Canvas>

      <div className={`fade${fading || !ready ? ' is-on' : ''}`} aria-hidden="true" />

      {ready && (
        <div className="location-chip">
          <span className="location-chip-type">{sceneType === 'panorama' ? 'Панорама 360°' : sceneType === 'overview' ? 'Генплан' : '3D-модель'}</span>
          <strong>{location.name}</strong>
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
