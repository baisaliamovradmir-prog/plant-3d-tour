// Общие константы и функции 3D-сцены.
import * as THREE from 'three'

export const COLORS = {
  ground: '#cfd6dd',
  asphalt: '#7d8791',
  grass: '#a9c29a',
  wall: '#dfe4ea',
  roof: '#9aa7b6',
  floor: '#c9cfd6',
  steel: '#b8c2cc',
  steelDark: '#6f7c89',
  tank: '#e8ecef',
  oil: '#c8962e',
  accent: '#2f6fd6', // подсветка маршрута
  hot: '#d9480f', // узкое место
  yellow: '#f2c230',
  green: '#2f9e44',
  rail: '#5b4a3a',
  blue: '#3b6ea8',
  wood: '#b48a5a',
  red: '#c0392b',
}

// Радиус сферы панорамы и радиус, на котором рисуются метки в панораме.
export const PANO_RADIUS = 50
export const PANO_HOTSPOT_RADIUS = 12

const DEG = Math.PI / 180

// yaw — поворот по горизонтали от направления «вперёд» (−Z) по часовой стрелке, градусы;
// pitch — наклон вверх (+) или вниз (−), градусы.
export function yawPitchToVec3(yaw, pitch, r = PANO_HOTSPOT_RADIUS) {
  const y = yaw * DEG
  const p = pitch * DEG
  return [r * Math.cos(p) * Math.sin(y), r * Math.sin(p), -r * Math.cos(p) * Math.cos(y)]
}

export function vec3ToYawPitch(v) {
  const d = new THREE.Vector3(v.x, v.y, v.z).normalize()
  let yaw = Math.atan2(d.x, -d.z) / DEG
  if (yaw < 0) yaw += 360
  const pitch = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)) / DEG
  return { yaw: Math.round(yaw * 10) / 10, pitch: Math.round(pitch * 10) / 10 }
}

// Позиция точки интереса в координатах сцены (3D-модель или панорама).
export function hotspotPosition(h, sceneType) {
  if (sceneType === 'panorama' && h.yaw != null) return yawPitchToVec3(h.yaw, h.pitch ?? 0)
  return [h.pos_x ?? 0, h.pos_y ?? 0, h.pos_z ?? 0]
}

// Генплан: координаты мини-карты (0–100) ↔ координаты территории в сцене.
export const SITE_W = 64
export const SITE_D = 44
export function mapToSite(mapX, mapY) {
  return [(mapX / 100) * SITE_W - SITE_W / 2, (mapY / 100) * SITE_D - SITE_D / 2]
}

// asset_url вида "procedural:tank_farm" — сцена собирается кодом, иначе это путь к .glb / панораме.
export function proceduralCode(location) {
  const url = location?.asset_url || ''
  return url.startsWith('procedural:') ? url.slice('procedural:'.length) : null
}

// Стартовые ракурсы камеры и ограничения орбиты для каждой сцены.
export const VIEWS = {
  site: { position: [-26, 34, 44], target: [0, 0, 2], minDistance: 18, maxDistance: 85 },
  tank_farm: { position: [22, 16, 26], target: [0, 2, 0], minDistance: 8, maxDistance: 55 },
  blending: { position: [15, 12, 17], target: [0, 2.5, -1], minDistance: 6, maxDistance: 40 },
  filling: { position: [14, 11, 16], target: [0, 1.5, 0], minDistance: 6, maxDistance: 40 },
  warehouse: { position: [22, 15, 22], target: [0, 2.5, 0], minDistance: 8, maxDistance: 50 },
  glb: { position: [12, 10, 14], target: [0, 1, 0], minDistance: 4, maxDistance: 60 },
}

export function viewFor(location) {
  return VIEWS[proceduralCode(location)] || VIEWS.glb
}

export const isMobileViewport = () => typeof window !== 'undefined' && window.innerWidth < 768

// В узком вертикальном окне шире угол обзора, иначе по горизонтали видно слишком мало.
export const baseFov = () => (typeof window !== 'undefined' && window.innerWidth < window.innerHeight ? 70 : 55)
