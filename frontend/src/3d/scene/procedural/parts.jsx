// Простые детали для процедурных моделей цехов (низкополигональные, без текстур).
import { useMemo } from 'react'
import * as THREE from 'three'
import { COLORS } from '../sceneUtils.js'

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
