// Генплан: территория завода сверху. Здания строятся по списку локаций (map_x/map_y из БД),
// здания текущего маршрута подсвечены, клик по зданию открывает локацию (ФТ-4).
import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Box, Cyl } from './procedural/parts.jsx'
import { COLORS, SITE_D, SITE_W, mapToSite, proceduralCode } from './sceneUtils.js'

// Форма здания на генплане по коду процедурной сцены; для .glb-локаций — обычный корпус.
const FOOTPRINTS = {
  tank_farm: { w: 14, d: 10, h: 4 },
  blending: { w: 10, d: 8, h: 7 },
  lab: { w: 7, d: 6, h: 4 },
  filling: { w: 12, d: 9, h: 6 },
  warehouse: { w: 12, d: 14, h: 8 },
}
const DEFAULT_FOOTPRINT = { w: 8, d: 8, h: 5 }

function TankFarmBlock({ color }) {
  return (
    <group>
      <Box position={[0, 0, 0]} size={[14, 0.4, 10]} color="#b9b2a6" />
      {[-4.5, 0, 4.5].map((x) =>
        [-2.3, 2.3].map((z) => (
          <group key={`${x}${z}`}>
            <Cyl position={[x, 0.4, z]} r={1.8} h={3.6} color={COLORS.tank} segments={24} />
            <Cyl position={[x, 3.3, z]} r={1.82} h={0.35} color={color} segments={24} onGround={false} />
          </group>
        )),
      )}
    </group>
  )
}

function Building({ location, inRoute, isBottleneck, isCurrentStep, interactive, onOpen }) {
  const code = proceduralCode(location)
  const fp = FOOTPRINTS[code] || DEFAULT_FOOTPRINT
  const [x, z] = mapToSite(location.map_x, location.map_y)
  const [hover, setHover] = useState(false)
  const ring = useRef()

  useFrame(({ clock }) => {
    if (!ring.current) return
    const s = 1 + 0.06 * Math.sin(clock.elapsedTime * 3)
    ring.current.scale.set(s, s, 1)
  })

  const roof = isCurrentStep ? COLORS.accent : inRoute ? '#6f9be0' : COLORS.roof
  const wall = hover ? '#ffffff' : COLORS.wall

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
      {code === 'tank_farm' ? (
        <TankFarmBlock color={roof} />
      ) : (
        <>
          <Box position={[0, 0, 0]} size={[fp.w, fp.h, fp.d]} color={wall} />
          <Box position={[0, fp.h, 0]} size={[fp.w + 0.4, 0.4, fp.d + 0.4]} color={roof} />
          {/* ворота */}
          <Box position={[0, 0, fp.d / 2 + 0.01]} size={[2.4, Math.min(3.2, fp.h - 1), 0.05]} color="#6b7886" />
          {/* окна */}
          <Box position={[0, fp.h * 0.6, fp.d / 2 + 0.02]} size={[fp.w - 2, 0.7, 0.05]} color="#9cc3e6" onGround={false} />
        </>
      )}
      {(inRoute || hover) && (
        <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[Math.max(fp.w, fp.d) * 0.62, Math.max(fp.w, fp.d) * 0.62 + 0.35, 48]} />
          <meshBasicMaterial color={isCurrentStep ? COLORS.accent : '#6f9be0'} transparent opacity={0.85} />
        </mesh>
      )}
      <Html position={[0, fp.h + 1.6, 0]} center distanceFactor={60} zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`site-label${inRoute ? ' in-route' : ''}${isBottleneck ? ' bottleneck' : ''}`}>
          {location.name}
          {isBottleneck && <span className="site-label-badge">узкое место</span>}
        </div>
      </Html>
    </group>
  )
}

export default function SiteOverview({ locations, routeLocationIds, currentStepLocationId, bottleneckLocationId, interactive = true, onOpenLocation }) {
  const buildings = locations.filter((l) => l.scene_type !== 'overview')
  const byCode = Object.fromEntries(buildings.map((l) => [proceduralCode(l), mapToSite(l.map_x, l.map_y)]))
  const tank = byCode.tank_farm
  const blend = byCode.blending

  return (
    <group>
      {/* территория и газон вокруг */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[SITE_W + 40, SITE_D + 40]} />
        <meshStandardMaterial color={COLORS.grass} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[SITE_W, SITE_D]} />
        <meshStandardMaterial color={COLORS.ground} roughness={1} />
      </mesh>
      {/* ограждение */}
      {[
        [0, -SITE_D / 2, SITE_W, 0.2],
        [0, SITE_D / 2, SITE_W, 0.2],
        [-SITE_W / 2, 0, 0.2, SITE_D],
        [SITE_W / 2, 0, 0.2, SITE_D],
      ].map(([x, z, w, d], i) => (
        <Box key={i} position={[x, 0, z]} size={[w, 1.2, d]} color="#8d98a3" />
      ))}

      {/* дороги */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 14]}>
        <planeGeometry args={[SITE_W, 3.2]} />
        <meshStandardMaterial color={COLORS.asphalt} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.2, 0.01, -1]}>
        <planeGeometry args={[3, 30]} />
        <meshStandardMaterial color={COLORS.asphalt} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[17, 0.01, -1]}>
        <planeGeometry args={[30, 3]} />
        <meshStandardMaterial color={COLORS.asphalt} />
      </mesh>

      {/* железная дорога к резервуарному парку */}
      {tank && (
        <group>
          <Box position={[(-SITE_W / 2 + tank[0]) / 2, 0, tank[1] + 6.5]} size={[tank[0] + SITE_W / 2 + 6, 0.12, 2]} color="#8a8178" />
          <Cyl position={[tank[0] - 2, 1.4, tank[1] + 6.5]} r={1} h={7} rotation={[0, 0, Math.PI / 2]} color="#2b2b2b" onGround={false} />
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

      {/* АБК и проходная — декоративные, без локации */}
      <Box position={[-17, 0, 12]} size={[9, 5.5, 5]} color="#e9e3d6" />
      <Box position={[-17, 5.5, 12]} size={[9.4, 0.35, 5.4]} color="#a39a88" />
      <Box position={[-6, 0, 19.5]} size={[3, 2.6, 2.4]} color="#e9e3d6" />
      {/* стела «Итоги» у въезда */}
      <Box position={[0, 0, 16.6]} size={[3.2, 4.2, 0.4]} color="#1f3550" />
      <Box position={[0, 1.6, 16.82]} size={[2.6, 2.4, 0.05]} color="#2f6fd6" onGround={false} />

      {/* деревья вдоль дороги */}
      {[-28, -22, 10, 16, 26].map((x) => (
        <group key={x} position={[x, 0, 17.5]}>
          <Cyl position={[0, 0, 0]} r={0.2} h={1.4} color="#7a5a3a" />
          <mesh position={[0, 2.2, 0]}>
            <icosahedronGeometry args={[1.2, 0]} />
            <meshStandardMaterial color="#5f8f4e" flatShading />
          </mesh>
        </group>
      ))}

      {buildings.map((l) => (
        <Building
          key={l.id}
          location={l}
          inRoute={routeLocationIds.includes(l.id)}
          isCurrentStep={currentStepLocationId === l.id}
          isBottleneck={bottleneckLocationId === l.id}
          interactive={interactive}
          onOpen={onOpenLocation}
        />
      ))}
    </group>
  )
}
