// Склад и отгрузка: стеллажи адресного хранения, погрузчик, доковые ворота с машиной клиента.
import { useMemo, useRef } from 'react'
import { Instances, Instance } from '@react-three/drei'
import { Box, Cyl, Person, ShopShell, StageBoard, StatusLamp, usePathMotion } from './parts.jsx'
import { COLORS } from '../sceneUtils.js'

const RACK_ROWS = [-6, -1, 4]
const RACK_X0 = -13
const RACK_BAYS = 6
const BAY_W = 2.8
const LEVELS = [0.15, 1.9, 3.65, 5.4]

// Маршрут погрузчика: по двум проездам между стеллажами, вокруг торцов рядов.
const FORKLIFT_PATH = [
  [-15, 0, 1.5],
  [9, 0, 1.5],
  [9, 0, -3.5],
  [-15, 0, -3.5],
]

function MovingForklift() {
  const ref = useRef()
  // вилы смотрят в −Z модели, поэтому разворачиваем на 180°
  usePathMotion(ref, FORKLIFT_PATH, 2.2, { yawOffset: Math.PI })
  return (
    <group ref={ref} position={FORKLIFT_PATH[0]}>
      <Forklift position={[0, 0, 0]} />
      <StatusLamp position={[0.45, 1.85, 0.75]} color="#ffb020" blink period={0.7} />
    </group>
  )
}

function Forklift({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box position={[0, 0.3, 0]} size={[1.2, 0.9, 2]} color={COLORS.yellow} />
      <Box position={[0, 1.2, 0.3]} size={[1.1, 1.2, 0.9]} color="#2b2b2b" />
      <Box position={[0, 0, -1.15]} size={[0.9, 2.6, 0.12]} color={COLORS.steelDark} />
      <Box position={[0, 0.25, -1.75]} size={[1, 0.08, 1.1]} color={COLORS.steelDark} />
      <Box position={[0, 0.33, -1.75]} size={[1.1, 0.14, 1.1]} color={COLORS.wood} />
      <Box position={[0, 0.47, -1.75]} size={[1, 0.8, 1]} color="#e0a526" />
      {[[-0.6, 0.6], [0.6, 0.6], [-0.6, -0.7], [0.6, -0.7]].map(([x, z]) => (
        <Cyl key={`${x}${z}`} position={[x, 0.3, z]} r={0.3} h={0.25} rotation={[0, 0, Math.PI / 2]} color="#222" onGround={false} />
      ))}
      <Person position={[0, 0.6, 0.4]} color="#2f6fd6" />
    </group>
  )
}

export default function Warehouse({ stages, fromTwin }) {
  const pallets = useMemo(() => {
    const list = []
    RACK_ROWS.forEach((z, row) =>
      LEVELS.forEach((y, lvl) => {
        for (let b = 0; b < RACK_BAYS; b++)
          for (let s = 0; s < 2; s++) {
            // часть ячеек свободна — так стеллаж выглядит живым
            if ((row * 7 + lvl * 3 + b * 5 + s) % 6 === 0) continue
            list.push([RACK_X0 + b * BAY_W + 0.7 + s * 1.4, y + 0.6, z])
          }
      }),
    )
    return list
  }, [])
  const beams = useMemo(() => {
    const list = []
    RACK_ROWS.forEach((z) => LEVELS.slice(1).forEach((y) => list.push([RACK_X0 + (RACK_BAYS * BAY_W) / 2, y, z])))
    return list
  }, [])
  const posts = useMemo(() => {
    const list = []
    RACK_ROWS.forEach((z) => {
      for (let b = 0; b <= RACK_BAYS; b++) for (const dz of [-0.6, 0.6]) list.push([RACK_X0 + b * BAY_W, 3.6, z + dz])
    })
    return list
  }, [])

  return (
    <group>
      <ShopShell w={34} d={22} h={8} />

      {/* стеллажи */}
      <Instances limit={64}>
        <boxGeometry args={[0.12, 7.2, 0.12]} />
        <meshStandardMaterial color={COLORS.blue} />
        {posts.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>
      <Instances limit={16}>
        <boxGeometry args={[RACK_BAYS * BAY_W, 0.14, 1.3]} />
        <meshStandardMaterial color={COLORS.hot} />
        {beams.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>
      <Instances limit={160} castShadow>
        <boxGeometry args={[1.2, 1.05, 1.05]} />
        <meshStandardMaterial color="#e0a526" roughness={0.7} />
        {pallets.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>
      {/* адресные таблички рядов */}
      {RACK_ROWS.map((z, i) => (
        <Box key={z} position={[RACK_X0 - 0.6, 6.4, z]} size={[0.1, 0.7, 1.2]} color={['#2f9e44', '#2f6fd6', '#d9480f'][i]} onGround={false} />
      ))}
      {/* разметка 5S: проезды */}
      {[-3.5, 1.5].map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[RACK_X0 + (RACK_BAYS * BAY_W) / 2, 0.012, z]}>
          <planeGeometry args={[RACK_BAYS * BAY_W, 0.1]} />
          <meshStandardMaterial color={COLORS.yellow} />
        </mesh>
      ))}

      <MovingForklift />

      {/* зона отгрузки и док */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[11.5, 0.012, 3]}>
        <planeGeometry args={[5, 6]} />
        <meshStandardMaterial color="#e8d38a" />
      </mesh>
      {[[10.5, 1.8], [12, 1.8], [10.5, 4], [12, 4]].map(([x, z]) => (
        <group key={`${x}${z}`}>
          <Box position={[x, 0, z]} size={[1.2, 0.15, 1.2]} color={COLORS.wood} />
          <Box position={[x, 0.15, z]} size={[1.1, 1, 1.1]} color="#e0a526" />
        </group>
      ))}
      <Person position={[13.4, 0, 0.8]} rotation={-Math.PI / 2} color="#2f9e44" />
      {/* ворота и машина клиента */}
      <Box position={[17, 0, 3]} size={[0.3, 4.2, 4]} color="#5d6b7a" />
      <group position={[21.5, 0, 3]}>
        <Box position={[0, 0.9, 0]} size={[8, 3.2, 2.6]} color="#f4f6f8" />
        <Box position={[5, 0.6, 0]} size={[2.2, 2.6, 2.5]} color={COLORS.blue} />
        {[-2.5, 2.5, 5].map((x) => (
          <group key={x}>
            <Cyl position={[x, 0.5, 1.25]} r={0.5} h={0.4} rotation={[Math.PI / 2, 0, 0]} color="#222" onGround={false} />
            <Cyl position={[x, 0.5, -1.25]} r={0.5} h={0.4} rotation={[Math.PI / 2, 0, 0]} color="#222" onGround={false} />
          </group>
        ))}
      </group>
      {/* площадка за воротами */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[22, -0.01, 3]}>
        <planeGeometry args={[12, 10]} />
        <meshStandardMaterial color={COLORS.asphalt} />
      </mesh>

      <StageBoard position={[12.5, 3.2, -7.5]} rotationY={0.3} title="Склад и отгрузка" stages={stages} fromTwin={fromTwin} />
    </group>
  )
}
