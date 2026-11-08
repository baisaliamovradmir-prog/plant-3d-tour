// Сцена цеха как 3D-модель: .glb из БД (asset_url) или процедурная модель, собранная кодом.
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

export default function ModelScene({ location }) {
  const code = proceduralCode(location)
  const Procedural = code && PROCEDURAL[code]
  if (Procedural) return <Procedural />
  if (location.asset_url) return <GlbModel url={location.asset_url} />
  return null
}

export function preloadLocationAsset(location) {
  if (!location || proceduralCode(location)) return
  if (location.scene_type === 'model' && location.asset_url) useGLTF.preload(location.asset_url, true)
}
