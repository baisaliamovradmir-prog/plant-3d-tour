// Цех смешения: три смесителя 25 м³ с мешалками, площадка обслуживания, насосы, трубопроводы.
import { Box, Cyl, Pipe, Person, ShopShell } from './parts.jsx'
import { COLORS } from '../sceneUtils.js'

function Mixer({ x, z, highlight }) {
  return (
    <group position={[x, 0, z]}>
      {/* опоры */}
      {[[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]].map(([dx, dz]) => (
        <Box key={`${dx}${dz}`} position={[dx, 0, dz]} size={[0.2, 1.6, 0.2]} color={COLORS.steelDark} />
      ))}
      {/* коническое днище */}
      <Cyl position={[0, 1.0, 0]} r={0.35} rTop={1.8} h={1.0} color={COLORS.steel} onGround={false} />
      {/* корпус */}
      <Cyl position={[0, 1.5, 0]} r={1.8} h={4.2} color={highlight ? '#dfe7f2' : COLORS.tank} segments={32} metal={0.45} />
      {/* рубашка обогрева */}
      <Cyl position={[0, 2.2, 0]} r={1.86} h={1.6} color="#c7cfd8" segments={32} metal={0.45} />
      {/* крышка и привод мешалки */}
      <Cyl position={[0, 5.7, 0]} r={1.8} rTop={0.6} h={0.5} color={COLORS.steel} />
      <Box position={[0, 6.2, 0]} size={[0.8, 0.9, 0.8]} color={COLORS.blue} />
      <Cyl position={[0, 7.1, 0]} r={0.3} h={0.4} color={COLORS.steelDark} />
    </group>
  )
}

export default function BlendingShop() {
  return (
    <group>
      <ShopShell w={28} d={18} h={7} />
      <Mixer x={-6.5} z={-2} />
      <Mixer x={0} z={-2} highlight />
      <Mixer x={6.5} z={-2} />

      {/* площадка обслуживания на отметке +5,7 м */}
      <Box position={[0, 5.7, -4.6]} size={[18, 0.15, 1.3]} color={COLORS.yellow} onGround={false} />
      <Box position={[0, 6.6, -5.25]} size={[18, 0.06, 0.06]} color={COLORS.yellow} onGround={false} />
      {[-9, -3, 3, 9].map((x) => (
        <Box key={x} position={[x, 0, -4.6]} size={[0.2, 5.7, 0.2]} color={COLORS.steelDark} />
      ))}
      {/* лестница на площадку */}
      <Box position={[10.5, 0, -4.6]} size={[1.2, 5.7, 0.2]} rotation={[0, 0, 0.6]} color={COLORS.steelDark} />

      {/* коллекторы базовых масел и присадок */}
      <Pipe from={[-13.5, 6.6, -7.5]} to={[10, 6.6, -7.5]} r={0.18} color={COLORS.oil} />
      <Pipe from={[-13.5, 6.1, -7.9]} to={[10, 6.1, -7.9]} r={0.12} color="#8e6c2c" />
      {[-6.5, 0, 6.5].map((x) => (
        <group key={x}>
          <Pipe from={[x, 6.6, -7.5]} to={[x, 6.6, -2]} r={0.12} color={COLORS.oil} />
          {/* выход на насос */}
          <Pipe from={[x, 1.0, -2]} to={[x, 0.6, 3]} r={0.12} color={COLORS.steelDark} />
          {/* насос */}
          <Box position={[x, 0, 3.3]} size={[1.2, 0.8, 0.8]} color={COLORS.green} />
          <Cyl position={[x + 0.8, 0.4, 3.3]} r={0.3} h={0.8} rotation={[0, 0, Math.PI / 2]} color={COLORS.steelDark} onGround={false} />
        </group>
      ))}
      {/* выход на ОТК и фасовку */}
      <Pipe from={[-7, 0.6, 4.2]} to={[13.5, 0.6, 4.2]} r={0.2} color={COLORS.steelDark} />

      {/* шкаф управления и оператор */}
      <Box position={[-11.5, 0, 4]} size={[1.6, 2.1, 0.7]} color="#d5dbe2" />
      <Box position={[-11.5, 1.3, 4.36]} size={[1, 0.6, 0.02]} color="#1f3550" onGround={false} />
      <Person position={[-11.5, 0, 5.2]} rotation={Math.PI} />
      <Person position={[2, 5.78, -4.6]} rotation={-Math.PI / 2} color="#3b6ea8" />

      {/* бочки с присадками */}
      {[[-12, -6], [-12, -4.8], [-10.8, -6]].map(([x, z]) => (
        <Cyl key={`${x}${z}`} position={[x, 0, z]} r={0.45} h={1.2} color={COLORS.blue} />
      ))}
    </group>
  )
}
