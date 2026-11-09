// Резервуарный парк: сливная эстакада с цистерной, резервуары базовых масел и присадок.
import { Box, Cyl, FlowPipe, Person, StageBoard, StatusLamp } from './parts.jsx'
import { COLORS } from '../sceneUtils.js'

const BIG_TANKS = [
  [-2, -2], [5, -2], [12, -2],
  [-2, -9], [5, -9], [12, -9],
]
const SMALL_TANKS = [[-10, -3], [-13.5, -3], [-10, -8], [-13.5, -8]]

function TankCar({ x }) {
  return (
    <group position={[x, 0, 8]}>
      <Box position={[0, 0.5, 0]} size={[9.5, 0.4, 2.2]} color="#3d3d3d" />
      <Cyl position={[0, 2.25, 0]} r={1.35} h={9} rotation={[0, 0, Math.PI / 2]} color="#2b2b2b" onGround={false} metal={0.3} />
      <Cyl position={[0, 3.6, 0]} r={0.35} h={0.5} color="#2b2b2b" />
      {[-3.2, 3.2].map((dx) => (
        <group key={dx}>
          <Cyl position={[dx - 0.6, 0.4, 0.9]} r={0.4} h={0.2} rotation={[Math.PI / 2, 0, 0]} color="#222" onGround={false} />
          <Cyl position={[dx + 0.6, 0.4, 0.9]} r={0.4} h={0.2} rotation={[Math.PI / 2, 0, 0]} color="#222" onGround={false} />
        </group>
      ))}
    </group>
  )
}

export default function TankFarm({ stages, fromTwin }) {
  return (
    <group>
      {/* площадка */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 30]} />
        <meshStandardMaterial color={COLORS.ground} roughness={1} />
      </mesh>
      {/* железнодорожный путь */}
      <Box position={[0, 0, 8]} size={[40, 0.15, 2.6]} color="#8a8178" />
      {[-0.75, 0.75].map((dz) => (
        <Box key={dz} position={[0, 0.15, 8 + dz]} size={[40, 0.12, 0.1]} color={COLORS.steelDark} />
      ))}
      <TankCar x={-6} />
      <TankCar x={4.5} />

      {/* сливная эстакада: площадка обслуживания вдоль цистерн */}
      <Box position={[-1, 4.2, 6.1]} size={[20, 0.25, 1.4]} color={COLORS.yellow} onGround={false} />
      {[-10, -5, 0, 5, 8.5].map((x) => (
        <Box key={x} position={[x, 0, 5.6]} size={[0.3, 4.1, 0.3]} color={COLORS.steelDark} />
      ))}
      {/* сливные стояки */}
      {[-6, 4.5].map((x) => (
        <FlowPipe key={x} from={[x, 3.7, 7.4]} to={[x, 4.3, 6]} r={0.12} color={COLORS.oil} />
      ))}
      {[-6, 4.5].map((x) => (
        <FlowPipe key={`d${x}`} from={[x, 4.3, 6]} to={[x, 1.2, 4.6]} r={0.12} color={COLORS.oil} />
      ))}
      {/* коллектор к резервуарам */}
      <FlowPipe from={[-12, 1.2, 4.6]} to={[14, 1.2, 4.6]} r={0.2} color={COLORS.oil} />
      {[-2, 5, 12].map((x) => (
        <FlowPipe key={x} from={[x, 1.2, 4.6]} to={[x, 1.2, 1]} r={0.16} color={COLORS.oil} />
      ))}
      <StatusLamp position={[-9.6, 2.8, 1.5]} color="#2fd36a" />
      <Person position={[-7.5, 4.3, 6]} rotation={Math.PI} />

      {/* обвалование */}
      <Box position={[5, 0, 1.6]} size={[19, 0.9, 0.3]} color="#b9b2a6" />
      <Box position={[5, 0, -12.6]} size={[19, 0.9, 0.3]} color="#b9b2a6" />
      <Box position={[-4.5, 0, -5.5]} size={[0.3, 0.9, 14.2]} color="#b9b2a6" />
      <Box position={[14.5, 0, -5.5]} size={[0.3, 0.9, 14.2]} color="#b9b2a6" />

      {/* резервуары базовых масел */}
      {BIG_TANKS.map(([x, z]) => (
        <group key={`${x}${z}`}>
          <Cyl position={[x, 0, z]} r={2.8} h={7} color={COLORS.tank} segments={32} />
          <Cyl position={[x, 7, z]} r={2.8} rTop={0.4} h={0.8} color="#d4d9de" segments={32} />
          {/* лестница */}
          <Box position={[x + 2.85, 0, z]} size={[0.15, 7.2, 0.6]} color={COLORS.steelDark} />
          {/* полоса-маркировка */}
          <Cyl position={[x, 5.6, z]} r={2.82} h={0.35} color={COLORS.blue} segments={32} onGround={false} />
        </group>
      ))}
      {/* ёмкости присадок */}
      {SMALL_TANKS.map(([x, z]) => (
        <group key={`${x}${z}`}>
          <Cyl position={[x, 0, z]} r={1.5} h={4} color="#e9e2cf" />
          <Cyl position={[x, 3.2, z]} r={1.52} h={0.3} color={COLORS.oil} onGround={false} />
        </group>
      ))}
      {/* насосная */}
      <Box position={[-11.5, 0, 1.5]} size={[4, 2.6, 2.4]} color={COLORS.wall} />
      <Box position={[-11.5, 2.6, 1.5]} size={[4.3, 0.2, 2.7]} color={COLORS.roof} />

      <StageBoard position={[17.5, 3, -1]} rotationY={0.2} title="Резервуарный парк" stages={stages} fromTwin={fromTwin} />
    </group>
  )
}
