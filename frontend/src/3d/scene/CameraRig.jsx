// Камера и переходы: ограниченная орбита на генплане и в цехах, поворот из центра в панораме,
// плавный подлёт к выбранной точке интереса (без него при prefers-reduced-motion).
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { prefersReducedMotion } from '../store/tourStore.js'
import { baseFov, isMobileViewport } from './sceneUtils.js'

const PANO_EYE = 0.1 // камера в панораме чуть позади центра, чтобы OrbitControls мог вращать

export default function CameraRig({ sceneKey, sceneType, view, focus }) {
  const controls = useRef()
  const { camera } = useThree()
  const anim = useRef(null) // { pos: Vector3, target: Vector3 }

  // Новая локация — камера сразу в стартовый ракурс (смена скрыта затемнением).
  useEffect(() => {
    const c = controls.current
    anim.current = null
    if (sceneType === 'panorama') {
      camera.position.set(0, 0, PANO_EYE)
      c?.target.set(0, 0, 0)
    } else {
      camera.position.set(...view.position)
      c?.target.set(...view.target)
    }
    camera.fov = baseFov()
    camera.updateProjectionMatrix()
    c?.update()
  }, [sceneKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Выбрана точка — плавно разворачиваем камеру к ней.
  useEffect(() => {
    if (!focus || !controls.current) return
    const p = new THREE.Vector3(...focus)
    let pos
    let target
    if (sceneType === 'panorama') {
      target = new THREE.Vector3(0, 0, 0)
      const look = p.clone().normalize()
      // на телефоне смотрим ниже точки, чтобы метка оказалась над карточкой
      if (isMobileViewport()) look.y -= 0.32
      pos = look.normalize().multiplyScalar(-PANO_EYE)
    } else {
      // сохраняем направление взгляда, приближаемся к точке
      const dir = camera.position.clone().sub(controls.current.target).normalize()
      dir.y = Math.max(dir.y, 0.45)
      dir.normalize()
      // на телефоне карточка занимает низ экрана: камера дальше, точка смещается в верхнюю часть кадра
      const mobile = isMobileViewport()
      const dist = (sceneType === 'overview' ? 30 : 13) * (mobile ? 1.6 : 1)
      target = p.clone().setY(Math.max(0, p.y - (mobile ? 5 : 2)))
      pos = target.clone().add(dir.multiplyScalar(dist))
    }
    if (prefersReducedMotion()) {
      camera.position.copy(pos)
      controls.current.target.copy(target)
      controls.current.update()
      return
    }
    anim.current = { pos, target }
  }, [focus?.[0], focus?.[1], focus?.[2], sceneKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, delta) => {
    const a = anim.current
    const c = controls.current
    if (!a || !c) return
    const k = 1 - Math.exp(-delta * 4)
    camera.position.lerp(a.pos, k)
    c.target.lerp(a.target, k)
    if (sceneType === 'panorama') camera.position.setLength(PANO_EYE)
    c.update()
    if (camera.position.distanceTo(a.pos) < 0.02 && c.target.distanceTo(a.target) < 0.02) anim.current = null
  })

  const isPano = sceneType === 'panorama'
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan={!isPano}
      enableZoom={!isPano}
      rotateSpeed={isPano ? -0.35 : 0.6}
      minDistance={isPano ? 0 : view.minDistance}
      maxDistance={isPano ? PANO_EYE * 2 : view.maxDistance}
      minPolarAngle={isPano ? 0.15 : 0.15}
      maxPolarAngle={isPano ? Math.PI - 0.15 : 1.38}
      onStart={() => {
        anim.current = null // пользователь взял управление — прекращаем автоперелёт
      }}
    />
  )
}
