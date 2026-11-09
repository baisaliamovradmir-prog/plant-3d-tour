// Простые детали для процедурных моделей цехов (низкополигональные, без файлов текстур).
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { COLORS } from '../sceneUtils.js'
import { prefersReducedMotion } from '../../store/tourStore.js'
import { loadLevel } from '../../store/stats.js'

const REDUCED = prefersReducedMotion()

export function Box({ position = [0, 0, 0], size = [1, 1, 1], color = COLORS.steel, onGround = true, rotation, ...rest }) {
  const [x, y, z] = position
  return (
    <mesh position={[x, onGround ? y + size[1] / 2 : y, z]} rotation={rotation} castShadow receiveShadow {...rest}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.8} metalness={0.05} />
    </mesh>
  )
}

export function Cyl({ position = [0, 0, 0], r = 1, rTop, h = 1, color = COLORS.steel, segments = 24, onGround = true, rotation, metal = 0.2, ...rest }) {
  const [x, y, z] = position
  return (
    <mesh position={[x, onGround ? y + h / 2 : y, z]} rotation={rotation} castShadow receiveShadow {...rest}>
      <cylinderGeometry args={[rTop ?? r, r, h, segments]} />
      <meshStandardMaterial color={color} roughness={0.55} metalness={metal} />
    </mesh>
  )
}

// Труба между двумя точками.
export function Pipe({ from, to, r = 0.12, color = COLORS.steelDark }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const dir = b.clone().sub(a)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
    return { position: a.add(b).multiplyScalar(0.5).toArray(), quaternion: q, length: dir.length() }
  }, [from, to])
  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[r, r, length, 10]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.4} />
    </mesh>
  )
}

// Фигура человека в каске — для масштаба и рабочих мест.
export function Person({ position = [0, 0, 0], color = '#2d5d9f', helmet = COLORS.yellow, rotation = 0 }) {
  const [x, y, z] = position
  return (
    <group position={[x, y, z]} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.85, 0]} castShadow>
        <capsuleGeometry args={[0.26, 0.9, 4, 10]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.72, 0]} castShadow>
        <sphereGeometry args={[0.2, 14, 10]} />
        <meshStandardMaterial color="#e2b48c" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.84, 0]}>
        <sphereGeometry args={[0.23, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={helmet} roughness={0.6} />
      </mesh>
    </group>
  )
}

// Пол цеха и две стены (задняя и левая) — интерьер без крыши, чтобы было видно сверху.
export function ShopShell({ w, d, h = 5, floor = COLORS.floor, wall = COLORS.wall, stripe = COLORS.yellow }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={floor} roughness={1} />
      </mesh>
      {/* разметка проходов */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, d / 2 - 1.2]}>
        <planeGeometry args={[w - 1, 0.12]} />
        <meshStandardMaterial color={stripe} />
      </mesh>
      <Box position={[0, 0, -d / 2]} size={[w, h, 0.3]} color={wall} />
      <Box position={[-w / 2, 0, 0]} size={[0.3, h, d]} color={wall} />
      {/* ленточное остекление */}
      <Box position={[0, h * 0.62, -d / 2 + 0.17]} size={[w - 2, h * 0.22, 0.05]} color="#9cc3e6" onGround={false} />
      <Box position={[-w / 2 + 0.17, h * 0.62, 0]} size={[0.05, h * 0.22, d - 2]} color="#9cc3e6" onGround={false} />
    </group>
  )
}

// Табличка с надписью на стене (без шрифтов: цветная плашка-указатель).
export function SafetySign({ position, rotation = [0, 0, 0], color = COLORS.green }) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[1.2, 0.6]} />
      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ---------- живые детали: поток в трубах, лампы, табло ----------

// Одна общая текстура «бегущего» потока: светлые полосы на цвете продукта.
let flowTexture = null
function getFlowTexture() {
  if (flowTexture) return flowTexture
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, 64)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.25, '#ffffff')
  g.addColorStop(0.45, '#9a9a9a')
  g.addColorStop(1, '#9a9a9a')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 4, 64)
  flowTexture = new THREE.CanvasTexture(c)
  flowTexture.wrapS = flowTexture.wrapT = THREE.RepeatWrapping
  return flowTexture
}

// Труба с движущимся по ней продуктом (направление — от from к to).
// Текстура общая на все трубы, поэтому скорость потока одна на сцену.
const FLOW_SPEED = 0.9
export function FlowPipe({ from, to, r = 0.14, color = COLORS.oil, stripe = 1.2 }) {
  const { position, quaternion, geometry } = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const dir = b.clone().sub(a)
    const length = dir.length()
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
    const g = new THREE.CylinderGeometry(r, r, length, 12, 1, true)
    // по длине трубы — по полосе на каждые `stripe` метров
    const uv = g.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * (length / stripe))
    return { position: a.add(b).multiplyScalar(0.5).toArray(), quaternion: q, geometry: g }
  }, [from, to, r, stripe])
  useEffect(() => () => geometry.dispose(), [geometry])
  const tex = getFlowTexture()
  useFrame(({ clock }) => {
    if (!REDUCED) tex.offset.y = (clock.elapsedTime * FLOW_SPEED) % 1
  })
  return (
    <mesh position={position} quaternion={quaternion} geometry={geometry} castShadow>
      <meshStandardMaterial color={color} map={tex} roughness={0.35} metalness={0.35} emissive={color} emissiveIntensity={0.08} />
    </mesh>
  )
}

// Сигнальная лампа на оборудовании: мигает, если `blink`.
export function StatusLamp({ position, color = '#2fd36a', blink = false, period = 1.2 }) {
  const mat = useRef()
  useFrame(({ clock }) => {
    if (!mat.current || !blink || REDUCED) return
    mat.current.emissiveIntensity = (clock.elapsedTime % period) < period / 2 ? 2.2 : 0.2
  })
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.07, 0.07, 0.25, 10]} />
        <meshStandardMaterial color="#4a5562" />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshStandardMaterial ref={mat} color={color} emissive={color} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
    </group>
  )
}

const nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })
const LEVEL_COLOR = { ok: '#3ddc84', warn: '#ffc53d', hot: '#ff6b4a', none: '#9aa7b6' }

// Табло этапов цеха: название, длительность партии, загрузка с полосой. Рисуется на canvas,
// поэтому корректно перекрывается оборудованием и не нагружает DOM.
function drawBoard(title, stages, source) {
  const W = 1024
  const rowH = 150
  const H = 140 + rowH * Math.max(1, stages.length) + 54
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#0f1b2d'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#1f4e8c'
  ctx.fillRect(0, 0, W, 110)
  ctx.fillStyle = '#ffffff'
  ctx.font = '600 54px "Segoe UI", system-ui, sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText(title, 40, 58)

  stages.forEach((s, i) => {
    const y = 140 + i * rowH
    const lvl = loadLevel(s.load_pct)
    ctx.fillStyle = '#9fb3c8'
    ctx.font = '500 36px "Segoe UI", system-ui, sans-serif'
    ctx.fillText(`Этап ${s.step_no} · ${s.name}`, 40, y + 22)
    ctx.fillStyle = '#ffffff'
    ctx.font = '700 52px "Segoe UI", system-ui, sans-serif'
    ctx.fillText(`${nf.format(s.duration_h)} ч`, 40, y + 84)
    // полоса загрузки
    const bx = 330
    const bw = W - bx - 230
    ctx.fillStyle = '#26344a'
    ctx.fillRect(bx, y + 66, bw, 36)
    if (s.load_pct != null) {
      ctx.fillStyle = LEVEL_COLOR[lvl]
      ctx.fillRect(bx, y + 66, (bw * Math.min(100, s.load_pct)) / 100, 36)
      ctx.font = '700 52px "Segoe UI", system-ui, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(`${nf.format(s.load_pct)} %`, W - 40, y + 84)
      ctx.textAlign = 'left'
    }
  })
  ctx.fillStyle = '#6f84a0'
  ctx.font = '400 30px "Segoe UI", system-ui, sans-serif'
  ctx.fillText(source, 40, H - 30)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return { tex, aspect: W / H }
}

export function StageBoard({ position, rotationY = 0, title, stages, fromTwin, width = 4.2 }) {
  const key = JSON.stringify(stages?.map((s) => [s.id, s.duration_h, s.load_pct]))
  const board = useMemo(
    () => (stages?.length ? drawBoard(title, stages, fromTwin ? 'по расчёту цифрового двойника' : 'последние данные · обновляется ежедневно') : null),
    [title, key, fromTwin], // eslint-disable-line react-hooks/exhaustive-deps
  )
  useEffect(() => () => board?.tex.dispose(), [board])
  if (!board) return null
  const h = width / board.aspect
  const hot = stages.some((s) => loadLevel(s.load_pct) === 'hot')
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* стойки */}
      {[-width / 2 + 0.2, width / 2 - 0.2].map((x) => (
        <mesh key={x} position={[x, -position[1] / 2, -0.06]} castShadow>
          <boxGeometry args={[0.12, position[1], 0.12]} />
          <meshStandardMaterial color="#4a5562" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 0, -0.07]} castShadow>
        <boxGeometry args={[width + 0.2, h + 0.2, 0.1]} />
        <meshStandardMaterial color={hot ? '#b5342b' : '#2a3442'} metalness={0.3} roughness={0.6} />
      </mesh>
      <mesh>
        <planeGeometry args={[width, h]} />
        <meshBasicMaterial map={board.tex} toneMapped={false} />
      </mesh>
    </group>
  )
}

// Плавное движение по замкнутому пути из точек (погрузчик, грузовик).
export function usePathMotion(ref, points, speed = 2, { yawOffset = 0 } = {}) {
  const path = useMemo(() => {
    const pts = points.map((p) => new THREE.Vector3(...p))
    const lens = []
    let total = 0
    for (let i = 0; i < pts.length; i++) {
      const l = pts[i].distanceTo(pts[(i + 1) % pts.length])
      lens.push(l)
      total += l
    }
    return { pts, lens, total }
  }, [points])
  useFrame(({ clock }) => {
    const o = ref.current
    if (!o) return
    let d = REDUCED ? 0 : (clock.elapsedTime * speed) % path.total
    let i = 0
    while (d > path.lens[i]) {
      d -= path.lens[i]
      i = (i + 1) % path.pts.length
    }
    const a = path.pts[i]
    const b = path.pts[(i + 1) % path.pts.length]
    const t = path.lens[i] ? d / path.lens[i] : 0
    o.position.lerpVectors(a, b, t)
    const yaw = Math.atan2(b.x - a.x, b.z - a.z) + yawOffset
    // мягкий поворот на углах
    let dy = yaw - o.rotation.y
    dy = Math.atan2(Math.sin(dy), Math.cos(dy))
    o.rotation.y += dy * 0.15
  })
}

export const reducedMotion = REDUCED
