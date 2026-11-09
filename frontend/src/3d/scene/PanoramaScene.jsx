// Панорама 360°: сфера изнутри, камера в центре. Текстура — файл из БД (asset_url)
// или комната, собранная кодом и снятая кубической камерой (ОТК на 1 этапе).
// Приближение колесом/щипком меняет fov (ФТ-5).
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { PANO_RADIUS, baseFov, isMobileViewport, proceduralCode } from './sceneUtils.js'
import LabRoomPanorama from './procedural/LabRoom.jsx'
import { locationLoad } from '../store/stats.js'

// Процедурные панорамы: код из asset_url → компонент.
const PROCEDURAL = { lab: LabRoomPanorama }

function useSphere() {
  return useMemo(() => {
    const g = new THREE.SphereGeometry(PANO_RADIUS, 64, 32)
    g.scale(-1, 1, 1) // грани смотрят внутрь, изображение не зеркалится
    return g
  }, [])
}

function Sphere({ texture }) {
  const geometry = useSphere()
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry} name="panorama-sphere">
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

function FileSphere({ url }) {
  const texture = useTexture(url)
  texture.colorSpace = THREE.SRGBColorSpace
  return <Sphere texture={texture} />
}

// Очередь проб на табло растёт с загрузкой лаборатории: 70 % — очереди нет, 96 % — около 9 партий.
function queueFromLoad(load) {
  if (load == null) return 9
  return Math.max(0, Math.min(12, Math.round((load - 70) / 3)))
}

// Приближение в панораме: колесо мыши и щипок двумя пальцами меняют угол обзора камеры.
function FovZoom() {
  const { camera, gl } = useThree()
  useEffect(() => {
    const el = gl.domElement
    const apply = (fov) => {
      camera.fov = THREE.MathUtils.clamp(fov, 35, 90)
      camera.updateProjectionMatrix()
    }
    const onWheel = (e) => {
      e.preventDefault()
      apply(camera.fov + e.deltaY * 0.04)
    }
    let pinch = null
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const onTouchStart = (e) => {
      if (e.touches.length === 2) pinch = { d: dist(e.touches), fov: camera.fov }
    }
    const onTouchMove = (e) => {
      if (pinch && e.touches.length === 2) apply(pinch.fov * (pinch.d / dist(e.touches)))
    }
    const onTouchEnd = () => {
      pinch = null
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      apply(baseFov())
    }
  }, [camera, gl])
  return null
}

export default function PanoramaScene({ location, stats }) {
  const code = proceduralCode(location)
  const Procedural = code && PROCEDURAL[code]
  return (
    <group>
      {Procedural ? (
        // на телефоне грань куба 512 px (≈ панорама 2048×1024), на ПК — 1024 px (≈ 4096×2048)
        <Procedural size={isMobileViewport() ? 512 : 1024} queue={queueFromLoad(locationLoad(stats, location.id))} />
      ) : location.asset_url ? (
        <FileSphere url={location.asset_url} />
      ) : null}
      <FovZoom />
    </group>
  )
}
