// Цех фасовки: линия розлива в канистры, пост розлива в бочки, паллеты, рабочее место оператора.
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Instances, Instance } from '@react-three/drei'
import { Box, Cyl, Person, ShopShell, StageBoard, StatusLamp, reducedMotion } from './parts.jsx'
import { COLORS } from '../sceneUtils.js'

const CONVEYOR_FROM = -12
const CONVEYOR_TO = 9
const CAN_STEP = 0.9
const CAN_SPEED = 0.55 // м/с
const FILLER_X = -3 // розливочный автомат: до него канистры пустые, после — с маслом и крышкой

// Канистры едут по конвейеру; после автомата розлива — с крышкой (другой цвет).
function ConveyorCanisters() {
  const empty = useRef()
  const full = useRef()
  const count = Math.floor((CONVEYOR_TO - CONVEYOR_FROM - 1) / CAN_STEP)
  const m = useMemo(() => new THREE.Matrix4(), [])
  const hidden = useMemo(() => new THREE.Matrix4().makeScale(0, 0, 0), [])
  useFrame(({ clock }) => {
    if (!empty.current || !full.current) return
    const shift = reducedMotion ? 0 : (clock.elapsedTime * CAN_SPEED) % CAN_STEP
    for (let i = 0; i < count; i++) {
      const x = CONVEYOR_FROM + 0.6 + i * CAN_STEP + shift
      m.makeTranslation(x, 1.38, 0)
      const isFull = x > FILLER_X + 0.4
      empty.current.setMatrixAt(i, isFull ? hidden : m)
      full.current.setMatrixAt(i, isFull ? m : hidden)
    }
    empty.current.instanceMatrix.needsUpdate = true
    full.current.instanceMatrix.needsUpdate = true
  })
  return (
    <>
      <instancedMesh ref={empty} args={[null, null, count]} castShadow frustumCulled={false}>
        <boxGeometry args={[0.5, 0.75, 0.35]} />
        <meshStandardMaterial color="#f1e6c9" roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={full} args={[null, null, count]} castShadow frustumCulled={false}>
        <boxGeometry args={[0.5, 0.75, 0.35]} />
        <meshStandardMaterial color="#e0a526" roughness={0.55} />
      </instancedMesh>
    </>
  )
}

// Дозаторы автомата опускаются в горловины и поднимаются.
function FillerNozzles() {
  const g = useRef()
  useFrame(({ clock }) => {
    if (g.current && !reducedMotion) g.current.position.y = 0.18 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.6))
  })
  return (
    <group ref={g}>
      {[-1.1, -0.37, 0.37, 1.1].map((dx) => (
        <Cyl key={dx} position={[dx, 1.95, 0]} r={0.08} h={0.75} color={COLORS.steelDark} metal={0.6} />
      ))}
    </group>
  )
}

export default function FillingShop({ stages, fromTwin }) {
  // канистры на паллетах готовой продукции
  const palletCans = useMemo(() => {
    const list = []
    for (const [px, pz] of [[11.5, -1.5], [11.5, 1.5], [11.5, 4.5]])
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 2; k++)
        list.push([px - 0.7 + i * 0.7, 0.55 + k * 0.62, pz - 0.7 + j * 0.7])
    return list
  }, [])
  // бочки 216 л
  const drums = useMemo(() => {
    const list = []
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) list.push([-11 + i * 1.3, 0.55, -6 + j * 1.3])
    return list
  }, [])

  return (
    <group>
      <ShopShell w={30} d={18} h={6} />

      {/* конвейер */}
      <Box position={[(CONVEYOR_FROM + CONVEYOR_TO) / 2, 0.95, 0]} size={[CONVEYOR_TO - CONVEYOR_FROM, 0.12, 1.2]} color="#3a4552" onGround={false} />
      {[CONVEYOR_FROM + 0.5, -6, 0, 6, CONVEYOR_TO - 0.5].map((x) => (
        <Box key={x} position={[x, 0, 0]} size={[0.15, 0.9, 1.1]} color={COLORS.steelDark} />
      ))}
      <Box position={[(CONVEYOR_FROM + CONVEYOR_TO) / 2, 1.05, 0.62]} size={[CONVEYOR_TO - CONVEYOR_FROM, 0.15, 0.05]} color={COLORS.steel} onGround={false} />
      <Box position={[(CONVEYOR_FROM + CONVEYOR_TO) / 2, 1.05, -0.62]} size={[CONVEYOR_TO - CONVEYOR_FROM, 0.15, 0.05]} color={COLORS.steel} onGround={false} />

      <ConveyorCanisters />

      {/* розливочный автомат: портал с дозаторами */}
      <group position={[-3, 0, 0]}>
        <Box position={[0, 0, -1.2]} size={[3.4, 3.2, 0.4]} color="#d8dee6" />
        <Box position={[0, 2.7, 0]} size={[3.4, 0.7, 2.6]} color="#d8dee6" />
        <FillerNozzles />
        <StatusLamp position={[1.5, 3.05, 1.0]} color="#2fd36a" />
        <Box position={[0, 2.72, 1.32]} size={[2.2, 0.35, 0.03]} color={COLORS.blue} onGround={false} />
        {/* ограждение */}
        <Box position={[0, 0, 1.4]} size={[3.4, 2.4, 0.04]} color="#bcd7f0" />
      </group>
      {/* укупорка и этикетировка */}
      <Box position={[2, 0, -1.1]} size={[1.6, 2.4, 0.9]} color="#d8dee6" />
      <Box position={[5, 0, -1.1]} size={[1.6, 2.0, 0.9]} color="#d8dee6" />

      {/* рабочее место оператора: стол, пульт, оператор */}
      <Box position={[4, 0, 3.6]} size={[2.2, 0.9, 1]} color={COLORS.wood} />
      <Box position={[4, 0.9, 3.4]} size={[0.9, 0.6, 0.06]} color="#1f3550" />
      <Box position={[2.2, 0, 3.6]} size={[0.8, 1.6, 0.6]} color="#d5dbe2" />
      <Person position={[4, 0, 4.6]} rotation={Math.PI} color="#2f6fd6" />
      {/* разметка рабочей зоны */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[4, 0.012, 4.2]}>
        <ringGeometry args={[1.7, 1.85, 4, 1, Math.PI / 4]} />
        <meshStandardMaterial color={COLORS.yellow} />
      </mesh>

      {/* пост розлива в бочки */}
      <Box position={[-8, 0, -6]} size={[1.4, 3, 1.4]} color="#d8dee6" />
      <Instances limit={16} castShadow>
        <cylinderGeometry args={[0.45, 0.45, 1.1, 18]} />
        <meshStandardMaterial color={COLORS.blue} roughness={0.5} metalness={0.3} />
        {drums.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>

      {/* паллеты готовой продукции */}
      {[[11.5, -1.5], [11.5, 1.5], [11.5, 4.5]].map(([x, z]) => (
        <Box key={`${x}${z}`} position={[x, 0, z]} size={[2.2, 0.18, 2.2]} color={COLORS.wood} />
      ))}
      <Instances limit={64} castShadow>
        <boxGeometry args={[0.55, 0.6, 0.55]} />
        <meshStandardMaterial color="#e0a526" roughness={0.6} />
        {palletCans.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>

      {/* стопка пустой тары */}
      <Box position={[-13, 0, 4]} size={[1.6, 2.2, 1.6]} color="#c9c2b3" />

      <StageBoard position={[-4, 3.2, -7.6]} rotationY={0.65} title="Цех фасовки" stages={stages} fromTwin={fromTwin} />
    </group>
  )
}
