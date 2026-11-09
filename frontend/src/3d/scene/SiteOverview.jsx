// Генплан: территория завода сверху. Здания строятся по списку локаций (map_x/map_y из БД),
// здания текущего маршрута подсвечены, клик по зданию открывает локацию (ФТ-4).
// Над территорией идёт поток партий по этапам процесса: перед узким местом партии собираются
// в очередь, а у зданий видна загрузка этапов (из метрик БД или расчёта двойника).
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import { Box, Cyl, StatusLamp, reducedMotion, usePathMotion } from './procedural/parts.jsx'
import { COLORS, SITE_D, SITE_W, mapToSite, proceduralCode } from './sceneUtils.js'
import { loadLevel, locationLoad } from '../store/stats.js'

// Форма здания на генплане по коду процедурной сцены; для .glb-локаций — обычный корпус.
const FOOTPRINTS = {
  tank_farm: { w: 14, d: 10, h: 4 },
  blending: { w: 10, d: 8, h: 7 },
  lab: { w: 7, d: 6, h: 4 },
  filling: { w: 12, d: 9, h: 6 },
  warehouse: { w: 12, d: 14, h: 8 },
}
const DEFAULT_FOOTPRINT = { w: 8, d: 8, h: 5 }
const fmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })

// ---------- здания ----------

function TankFarmBlock({ color, hover }) {
  return (
    <group>
      <Box position={[0, 0, 0]} size={[14, 0.4, 10]} color="#b9b2a6" />
      {/* обвалование */}
      <Box position={[0, 0.4, -4.9]} size={[14, 0.5, 0.2]} color="#a69f92" />
      <Box position={[0, 0.4, 4.9]} size={[14, 0.5, 0.2]} color="#a69f92" />
      {[-4.5, 0, 4.5].map((x) =>
        [-2.3, 2.3].map((z) => (
          <group key={`${x}${z}`}>
            <Cyl position={[x, 0.4, z]} r={1.8} h={3.6} color={hover ? '#ffffff' : COLORS.tank} segments={28} metal={0.35} />
            <Cyl position={[x, 4.0, z]} r={1.8} rTop={0.3} h={0.45} color="#d4d9de" segments={28} metal={0.35} />
            <Cyl position={[x, 3.2, z]} r={1.82} h={0.3} color={color} segments={28} onGround={false} />
          </group>
        )),
      )}
    </group>
  )
}

// Остекление фасада: тёмная лента окон, разбитая простенками.
function Facade({ w, h, z, rows = 2, rotationY = 0 }) {
  const piers = Math.max(2, Math.floor(w / 2.2))
  return (
    <group rotation={[0, rotationY, 0]}>
      {Array.from({ length: rows }, (_, r) => {
        const y = h * (0.35 + (0.4 * r) / Math.max(1, rows - 1 || 1))
        return (
          <group key={r}>
            <Box position={[0, y, z + 0.02]} size={[w - 1.2, 0.85, 0.06]} color="#5f86ad" onGround={false} />
            {Array.from({ length: piers + 1 }, (_, i) => (
              <Box key={i} position={[-(w - 1.2) / 2 + (i * (w - 1.2)) / piers, y, z + 0.06]} size={[0.16, 0.95, 0.06]} color="#e9edf1" onGround={false} />
            ))}
          </group>
        )
      })}
    </group>
  )
}

function Shed({ code, fp, roof, wall }) {
  const { w, d, h } = fp
  return (
    <group>
      {/* цоколь и стены */}
      <Box position={[0, 0, 0]} size={[w, 0.6, d]} color="#9aa3ad" />
      <Box position={[0, 0.6, 0]} size={[w - 0.1, h - 0.6, d - 0.1]} color={wall} />
      {/* кровля с парапетом */}
      <Box position={[0, h, 0]} size={[w + 0.3, 0.25, d + 0.3]} color={roof} />
      <Box position={[0, h + 0.25, -d / 2 - 0.1]} size={[w + 0.3, 0.35, 0.12]} color="#6f7c89" />
      <Box position={[0, h + 0.25, d / 2 + 0.1]} size={[w + 0.3, 0.35, 0.12]} color="#6f7c89" />
      <Box position={[-w / 2 - 0.1, h + 0.25, 0]} size={[0.12, 0.35, d + 0.3]} color="#6f7c89" />
      <Box position={[w / 2 + 0.1, h + 0.25, 0]} size={[0.12, 0.35, d + 0.3]} color="#6f7c89" />
      {/* вентустановки на крыше */}
      <Box position={[-w * 0.22, h + 0.25, -d * 0.15]} size={[1.6, 0.9, 1.1]} color="#c3cbd3" />
      <Box position={[w * 0.2, h + 0.25, d * 0.12]} size={[1.1, 0.7, 1.1]} color="#c3cbd3" />
      <Cyl position={[w * 0.2, h + 0.95, d * 0.12]} r={0.4} h={0.12} color="#4a5562" />
      {/* фасады */}
      <Facade w={w} h={h} z={d / 2} rows={h > 5 ? 2 : 1} />
      <Facade w={d} h={h} z={w / 2} rows={h > 5 ? 2 : 1} rotationY={Math.PI / 2} />
      {/* ворота с козырьком */}
      <Box position={[w * 0.18, 0, d / 2 + 0.03]} size={[2.6, Math.min(3.4, h - 1.4), 0.08]} color="#5d6b7a" />
      <Box position={[w * 0.18, Math.min(3.4, h - 1.4) + 0.2, d / 2 + 0.6]} size={[3.2, 0.12, 1.2]} color="#6f7c89" onGround={false} />
      {/* особенности цехов */}
      {code === 'blending' && (
        <>
          <Cyl position={[-w * 0.32, h, -d * 0.3]} r={0.45} h={5} color="#c7cfd8" metal={0.5} />
          <Cyl position={[-w * 0.32, h + 4.2, -d * 0.3]} r={0.47} h={0.5} color={COLORS.hot} onGround={false} />
        </>
      )}
      {code === 'lab' && (
        <>
          <Cyl position={[w * 0.3, h + 0.25, -d * 0.25]} r={0.05} h={2.2} color="#4a5562" />
          <StatusLamp position={[w * 0.3, h + 2.5, -d * 0.25]} color="#ff5a3c" blink period={1.6} />
        </>
      )}
      {code === 'warehouse' && (
        // доковые ворота с правой стороны
        [-3.5, 0, 3.5].map((z) => <Box key={z} position={[w / 2 + 0.04, 0, z]} size={[0.08, 3.2, 2.4]} color="#5d6b7a" />)
      )}
    </group>
  )
}

// Красный маяк над узким местом: пульсирующее кольцо на земле и световой столб.
function BottleneckBeacon({ radius, height }) {
  const ring = useRef()
  const column = useRef()
  useFrame(({ clock }) => {
    const t = reducedMotion ? 0.5 : (clock.elapsedTime % 1.8) / 1.8
    if (ring.current) {
      const s = 1 + t * 0.35
      ring.current.scale.set(s, s, 1)
      ring.current.material.opacity = 0.75 * (1 - t)
    }
    if (column.current) column.current.material.opacity = 0.16 + 0.08 * Math.sin(clock.elapsedTime * 3)
  })
  return (
    <group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[radius, radius + 0.6, 56]} />
        <meshBasicMaterial color={COLORS.hot} transparent opacity={0.7} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={column} position={[0, height + 6, 0]}>
        <cylinderGeometry args={[0.9, 1.6, 12, 24, 1, true]} />
        <meshBasicMaterial color="#ff5a3c" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Building({ location, inRoute, isBottleneck, isCurrentStep, load, interactive, onOpen }) {
  const code = proceduralCode(location)
  const fp = FOOTPRINTS[code] || DEFAULT_FOOTPRINT
  const [x, z] = mapToSite(location.map_x, location.map_y)
  const [hover, setHover] = useState(false)
  const ring = useRef()

  useFrame(({ clock }) => {
    if (!ring.current) return
    const s = 1 + (reducedMotion ? 0 : 0.05 * Math.sin(clock.elapsedTime * 3))
    ring.current.scale.set(s, s, 1)
  })

  const roof = isCurrentStep ? COLORS.accent : inRoute ? '#6f9be0' : '#8e9aa8'
  const wall = hover ? '#ffffff' : '#e3e7eb'
  const level = loadLevel(load)
  const radius = Math.max(fp.w, fp.d) * 0.62

  return (
    <group
      position={[x, 0, z]}
      onClick={(e) => {
        if (!interactive || e.delta > 5) return // в режиме редактора клик ставит точку
        e.stopPropagation()
        onOpen(location.id)
      }}
      onPointerOver={(e) => {
        if (!interactive) return
        e.stopPropagation()
        setHover(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHover(false)
        document.body.style.cursor = ''
      }}
    >
      {code === 'tank_farm' ? <TankFarmBlock color={roof} hover={hover} /> : <Shed code={code} fp={fp} roof={roof} wall={wall} />}
      {(inRoute || hover) && (
        <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[radius, radius + 0.35, 56]} />
          <meshBasicMaterial color={isCurrentStep ? COLORS.accent : '#6f9be0'} transparent opacity={0.85} toneMapped={false} />
        </mesh>
      )}
      {isBottleneck && <BottleneckBeacon radius={radius + 0.6} height={fp.h} />}
      <Html position={[0, fp.h + 1.8, 0]} center distanceFactor={60} zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`site-label${inRoute ? ' in-route' : ''}${isBottleneck ? ' bottleneck' : ''}`}>
          {location.name}
          {load != null && (
            <span className={`site-label-load lvl-${level}`} title="Загрузка этапа">
              {fmt.format(load)} %
            </span>
          )}
          {isBottleneck && <span className="site-label-badge">узкое место</span>}
        </div>
      </Html>
    </group>
  )
}

// ---------- поток партий ----------

const BATCHES = 34

// Путь продукции: ж/д → резервуары → смешение → ОТК → фасовка → склад → выезд.
// Между зданиями — дуги над территорией; перед узким местом партии замедляются и копятся.
function ProcessFlow({ stops, slowAt }) {
  const { curve, points, slowU } = useMemo(() => {
    const path = new THREE.CurvePath()
    for (let i = 0; i < stops.length - 1; i++) {
      const a = new THREE.Vector3(...stops[i])
      const b = new THREE.Vector3(...stops[i + 1])
      const mid = a.clone().add(b).multiplyScalar(0.5)
      mid.y = Math.max(a.y, b.y) + 2 + a.distanceTo(b) * 0.18
      path.add(new THREE.QuadraticBezierCurve3(a, mid, b))
    }
    const lengths = path.getCurveLengths()
    const total = lengths[lengths.length - 1]
    // u-координата остановки slowAt (конец дуги, входящей в узкое место)
    const slowU = slowAt != null && slowAt > 0 ? lengths[slowAt - 1] / total : null
    return { curve: path, points: path.getSpacedPoints(240), slowU }
  }, [stops, slowAt])

  const mesh = useRef()
  const state = useMemo(() => Float32Array.from({ length: BATCHES }, (_, i) => i / BATCHES), [])
  const m = useMemo(() => new THREE.Matrix4(), [])
  const p = useMemo(() => new THREE.Vector3(), [])
  const hot = useMemo(() => new THREE.Color('#ff5a3c'), [])
  const oil = useMemo(() => new THREE.Color('#f2a52a'), [])

  useFrame((_, dt) => {
    if (!mesh.current) return
    const step = reducedMotion ? 0 : Math.min(dt, 0.05) * 0.035
    for (let i = 0; i < BATCHES; i++) {
      let u = state[i]
      let f = 1
      let queued = false
      if (slowU != null) {
        // перед узким местом скорость падает в 6 раз — партии стоят в очереди
        const du = slowU - u
        if (du > -0.01 && du < 0.08) {
          f = 0.16
          queued = du > -0.01 && du < 0.06
        }
      }
      u += step * f
      if (u >= 1) u -= 1
      state[i] = u
      curve.getPointAt(u, p)
      const s = queued ? 1.15 : 0.9
      m.makeScale(s, s, s).setPosition(p)
      mesh.current.setMatrixAt(i, m)
      mesh.current.setColorAt(i, queued ? hot : oil)
    }
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
  })

  return (
    <group>
      <Line points={points} color="#2e6fd0" lineWidth={2} transparent opacity={0.45} />
      <instancedMesh ref={mesh} args={[null, null, BATCHES]} frustumCulled={false}>
        <sphereGeometry args={[0.38, 14, 10]} />
        <meshStandardMaterial color="#ffffff" emissive="#f2a52a" emissiveIntensity={0.6} roughness={0.4} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

// ---------- окружение ----------

function mulberry(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Деревья вокруг ограждения и вдоль дороги — два instanced-меша (ствол и крона).
function Trees() {
  const trunks = useRef()
  const crowns = useRef()
  const list = useMemo(() => {
    const rnd = mulberry(7)
    const out = []
    const add = (x, z) => out.push({ x, z, s: 0.8 + rnd() * 0.6, c: rnd() })
    for (let x = -SITE_W / 2 - 4; x <= SITE_W / 2 + 4; x += 3.2 + rnd() * 1.5) {
      add(x, -SITE_D / 2 - 3 - rnd() * 4)
      add(x, SITE_D / 2 + 3 + rnd() * 4)
    }
    for (let z = -SITE_D / 2; z <= SITE_D / 2; z += 3.4 + rnd() * 1.5) {
      add(-SITE_W / 2 - 3 - rnd() * 4, z)
      add(SITE_W / 2 + 3 + rnd() * 4, z)
    }
    for (const x of [-28, -22, 10, 16, 26]) add(x, 17.5)
    return out
  }, [])
  const ready = useRef(false)
  useFrame(() => {
    if (ready.current || !trunks.current || !crowns.current) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const greens = ['#4f8a45', '#5f9a4e', '#6aa457', '#3f7a3d'].map((c) => new THREE.Color(c))
    list.forEach((t, i) => {
      m.compose(new THREE.Vector3(t.x, 0.7 * t.s, t.z), q, new THREE.Vector3(t.s, t.s, t.s))
      trunks.current.setMatrixAt(i, m)
      m.compose(new THREE.Vector3(t.x, 2.3 * t.s, t.z), q, new THREE.Vector3(t.s, t.s * 1.15, t.s))
      crowns.current.setMatrixAt(i, m)
      crowns.current.setColorAt(i, greens[Math.floor(t.c * greens.length)])
    })
    trunks.current.instanceMatrix.needsUpdate = true
    crowns.current.instanceMatrix.needsUpdate = true
    crowns.current.instanceColor.needsUpdate = true
    ready.current = true
  })
  return (
    <>
      <instancedMesh ref={trunks} args={[null, null, list.length]} castShadow>
        <cylinderGeometry args={[0.16, 0.22, 1.4, 6]} />
        <meshStandardMaterial color="#7a5a3a" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[null, null, list.length]} castShadow>
        <icosahedronGeometry args={[1.25, 0]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} flatShading />
      </instancedMesh>
    </>
  )
}

const CAR_COLORS = ['#c0392b', '#2f6fd6', '#f4f6f8', '#3a3f45', '#9aa7b6', '#2f9e44', '#f4f6f8', '#3a3f45']

function Car({ position, color, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box position={[0, 0.2, 0]} size={[1.8, 0.55, 3.8]} color={color} />
      <Box position={[0, 0.75, -0.2]} size={[1.6, 0.5, 2]} color="#2b3540" />
    </group>
  )
}

function Truck({ color = COLORS.blue }) {
  return (
    <group>
      <Box position={[0, 0.5, -1]} size={[2.4, 2.8, 6]} color="#f4f6f8" />
      <Box position={[0, 0.4, 2.8]} size={[2.3, 2.2, 1.9]} color={color} />
      <Box position={[0, 1.6, 3.7]} size={[2.1, 0.8, 0.05]} color="#1f3550" onGround={false} />
      {[-2.8, 0.2, 2.8].map((z) => (
        <group key={z}>
          <Cyl position={[1.1, 0.45, z]} r={0.45} h={0.35} rotation={[0, 0, Math.PI / 2]} color="#222" onGround={false} />
          <Cyl position={[-1.1, 0.45, z]} r={0.45} h={0.35} rotation={[0, 0, Math.PI / 2]} color="#222" onGround={false} />
        </group>
      ))}
    </group>
  )
}

// Грузовик клиента ездит по внутренней дороге: туда по одной полосе, обратно по другой.
const TRUCK_PATH = [
  [-27, 0, 13.2],
  [27, 0, 13.2],
  [29, 0, 14.8],
  [-27, 0, 14.8],
  [-29, 0, 13.6],
]
function MovingTruck() {
  const ref = useRef()
  usePathMotion(ref, TRUCK_PATH, 4.5)
  return (
    <group ref={ref} position={TRUCK_PATH[0]} scale={0.8}>
      <Truck />
    </group>
  )
}

function RoadMarkings() {
  const dashes = []
  for (let x = -SITE_W / 2 + 2; x < SITE_W / 2 - 1; x += 3) dashes.push(x)
  return (
    <group>
      {dashes.map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.025, 14]}>
          <planeGeometry args={[1.4, 0.14]} />
          <meshBasicMaterial color="#f2f2f2" />
        </mesh>
      ))}
    </group>
  )
}

// ---------- сцена ----------

export default function SiteOverview({ locations, routeLocationIds, currentStepLocationId, stats, interactive = true, onOpenLocation }) {
  const buildings = locations.filter((l) => l.scene_type !== 'overview')
  const byCode = Object.fromEntries(buildings.map((l) => [proceduralCode(l), mapToSite(l.map_x, l.map_y)]))
  const tank = byCode.tank_farm
  const blend = byCode.blending
  const bottleneckLocationId = stats?.bottleneckLocationId ?? null

  // Остановки потока — здания в порядке этапов процесса.
  const flow = useMemo(() => {
    if (!stats) return null
    const order = []
    for (const s of [...stats.stages].sort((a, b) => a.step_no - b.step_no)) if (!order.includes(s.location_id)) order.push(s.location_id)
    const stops = []
    let slowAt = null
    if (tank) stops.push([-SITE_W / 2 - 6, 0.6, tank[1] + 6.5])
    for (const id of order) {
      const l = buildings.find((b) => b.id === id)
      if (!l) continue
      const fp = FOOTPRINTS[proceduralCode(l)] || DEFAULT_FOOTPRINT
      const [x, z] = mapToSite(l.map_x, l.map_y)
      if (id === bottleneckLocationId) slowAt = stops.length
      stops.push([x, fp.h + 1.2, z])
    }
    stops.push([SITE_W / 2 + 6, 0.6, 14])
    return stops.length > 2 ? { stops, slowAt } : null
  }, [stats, buildings, tank, bottleneckLocationId])

  const cars = useMemo(() => {
    const out = []
    for (let i = 0; i < 8; i++) {
      if (i === 5) continue // свободное место
      out.push({ x: -30 + (i % 4) * 2.4, z: i < 4 ? 6.3 : 10.1, r: i < 4 ? 0 : Math.PI, c: CAR_COLORS[i] })
    }
    return out
  }, [])

  return (
    <group>
      {/* газон вокруг и площадка завода */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
        <circleGeometry args={[180, 48]} />
        <meshStandardMaterial color="#9bb88b" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[SITE_W, SITE_D]} />
        <meshStandardMaterial color="#cdd3d9" roughness={1} />
      </mesh>
      {/* ограждение: столбы и сетка */}
      {[
        [0, -SITE_D / 2, SITE_W, 0.12],
        [0, SITE_D / 2, SITE_W, 0.12],
        [-SITE_W / 2, 0, 0.12, SITE_D],
        [SITE_W / 2, 0, 0.12, SITE_D],
      ].map(([x, z, w, d], i) => (
        <group key={i}>
          <mesh position={[x, 0.9, z]}>
            <boxGeometry args={[w, 1.8, d]} />
            <meshStandardMaterial color="#8d98a3" transparent opacity={0.45} metalness={0.4} />
          </mesh>
          <Box position={[x, 1.75, z]} size={[w || 0.12, 0.08, d || 0.12]} color="#6f7c89" onGround={false} />
        </group>
      ))}

      {/* дороги */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 14]} receiveShadow>
        <planeGeometry args={[SITE_W, 3.6]} />
        <meshStandardMaterial color={COLORS.asphalt} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.2, 0.01, -1]} receiveShadow>
        <planeGeometry args={[3, 30]} />
        <meshStandardMaterial color={COLORS.asphalt} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[17, 0.01, -1]} receiveShadow>
        <planeGeometry args={[30, 3]} />
        <meshStandardMaterial color={COLORS.asphalt} roughness={0.95} />
      </mesh>
      {/* выезд к общей дороге */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-6, 0.012, 19]} receiveShadow>
        <planeGeometry args={[4, 10]} />
        <meshStandardMaterial color={COLORS.asphalt} roughness={0.95} />
      </mesh>
      <RoadMarkings />

      {/* железная дорога к резервуарному парку */}
      {tank && (
        <group>
          <Box position={[(-SITE_W / 2 - 20 + tank[0]) / 2, 0, tank[1] + 6.5]} size={[tank[0] + SITE_W / 2 + 26, 0.12, 2.2]} color="#8a8178" />
          {[-0.55, 0.55].map((dz) => (
            <Box key={dz} position={[(-SITE_W / 2 - 20 + tank[0]) / 2, 0.12, tank[1] + 6.5 + dz]} size={[tank[0] + SITE_W / 2 + 26, 0.1, 0.08]} color={COLORS.steelDark} />
          ))}
          {[-7, 2].map((dx) => (
            <group key={dx}>
              <Cyl position={[tank[0] + dx, 1.5, tank[1] + 6.5]} r={1} h={7.5} rotation={[0, 0, Math.PI / 2]} color="#2b2b2b" onGround={false} metal={0.3} />
              <Box position={[tank[0] + dx, 0.2, tank[1] + 6.5]} size={[7.8, 0.4, 1.6]} color="#3d3d3d" />
            </group>
          ))}
        </group>
      )}
      {/* эстакада трубопроводов: парк → смешение */}
      {tank && blend && (
        <group>
          <Box position={[(tank[0] + blend[0]) / 2, 2.4, tank[1] - 1]} size={[blend[0] - tank[0] - 10, 0.35, 0.6]} color={COLORS.oil} onGround={false} />
          {[0.3, 0.5, 0.7].map((t) => (
            <Box key={t} position={[tank[0] + (blend[0] - tank[0]) * t, 0, tank[1] - 1]} size={[0.25, 2.4, 0.25]} color={COLORS.steelDark} />
          ))}
        </group>
      )}

      {/* АБК, проходная, парковка — декоративные, без локации */}
      <group position={[-17, 0, 9]}>
        <Box position={[0, 0, 0]} size={[9, 5.5, 5]} color="#ece6d9" />
        <Box position={[0, 5.5, 0]} size={[9.4, 0.35, 5.4]} color="#a39a88" />
        <Facade w={9} h={5.5} z={2.52} rows={2} />
      </group>
      <Box position={[-6, 0, 19.5]} size={[3, 2.6, 2.4]} color="#ece6d9" />
      <Box position={[-6, 2.6, 19.5]} size={[3.4, 0.2, 2.8]} color="#a39a88" />
      <Box position={[-3.6, 1.0, 19.5]} size={[3.2, 0.12, 0.12]} color={COLORS.hot} onGround={false} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-26.5, 0.011, 8.2]} receiveShadow>
        <planeGeometry args={[10, 7.6]} />
        <meshStandardMaterial color="#8f98a1" roughness={0.95} />
      </mesh>
      {cars.map((c, i) => (
        <Car key={i} position={[c.x, 0, c.z]} color={c.c} rotation={c.r} />
      ))}
      {/* стела «Итоги» у въезда */}
      <Box position={[0, 0, 16.6]} size={[3.2, 4.2, 0.4]} color="#1f3550" />
      <Box position={[0, 1.6, 16.82]} size={[2.6, 2.4, 0.05]} color="#2f6fd6" onGround={false} />

      <Trees />
      <MovingTruck />
      {flow && <ProcessFlow stops={flow.stops} slowAt={flow.slowAt} />}

      {buildings.map((l) => (
        <Building
          key={l.id}
          location={l}
          inRoute={routeLocationIds.includes(l.id)}
          isCurrentStep={currentStepLocationId === l.id}
          isBottleneck={bottleneckLocationId === l.id}
          load={locationLoad(stats, l.id)}
          interactive={interactive}
          onOpen={onOpenLocation}
        />
      ))}
    </group>
  )
}
