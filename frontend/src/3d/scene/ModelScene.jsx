// Сцена цеха как 3D-модель: .glb из БД (asset_url) или процедурная модель, собранная кодом.
// Вокруг цеха — площадка завода, чтобы модель не висела в пустоте.
import { useGLTF } from '@react-three/drei'
import { proceduralCode } from './sceneUtils.js'
import TankFarm from './procedural/TankFarm.jsx'
import BlendingShop from './procedural/BlendingShop.jsx'
import FillingShop from './procedural/FillingShop.jsx'
import Warehouse from './procedural/Warehouse.jsx'

const PROCEDURAL = {
  tank_farm: TankFarm,
  blending: BlendingShop,
  filling: FillingShop,
  warehouse: Warehouse,
}

// Draco-декодер: при сжатых .glb (НФТ-4) drei сам подгрузит декодер с CDN gstatic.
function GlbModel({ url }) {
  const { scene } = useGLTF(url, true)
  return <primitive object={scene} />
}

function Grounds() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
      <circleGeometry args={[160, 48]} />
      <meshStandardMaterial color="#b9c1c9" roughness={1} />
    </mesh>
  )
}

export default function ModelScene({ location, stats }) {
  const code = proceduralCode(location)
  const Procedural = code && PROCEDURAL[code]
  const stages = stats?.byLocation?.[location.id] || []
  return (
    <group>
      <Grounds />
      {Procedural ? (
        <Procedural stages={stages} fromTwin={!!stats?.fromTwin} />
      ) : location.asset_url ? (
        <GlbModel url={location.asset_url} />
      ) : null}
    </group>
  )
}

export function preloadLocationAsset(location) {
  if (!location || proceduralCode(location)) return
  if (location.scene_type === 'model' && location.asset_url) useGLTF.preload(location.asset_url, true)
}
