// Лаборатория ОТК для режима «панорама 360°», собранная кодом.
// Комната строится в отдельной сцене (портал), кубическая камера снимает её из точки обзора один раз,
// и снимок натягивается на сферу панорамы. Так получается настоящая перспектива и свет,
// а метки по-прежнему задаются углами yaw/pitch, как для фотопанорамы заказчика.
//
// Координаты: глаз в начале координат на высоте 1,6 м; пол y = −1,6, потолок y = +1,6.
// «Вперёд» (yaw 0) — по −Z, yaw растёт по часовой стрелке (к +X).
import { useEffect, useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'
import { createPortal, useThree } from '@react-three/fiber'
import { PANO_RADIUS } from '../sceneUtils.js'

const FLOOR = -1.6
const CEIL = 1.6
const W = 5.2 // полуширина комнаты по X
const D = 4.2 // полуглубина по Z
const BENCH_TOP = FLOOR + 0.92

function canvasTexture(w, h, draw, { repeat } = {}) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(...repeat)
  }
  return t
}

const FONT = '"Segoe UI", system-ui, sans-serif'

function useLabTextures(queue) {
  return useMemo(() => {
    const floor = canvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#c9d1d8'
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = '#aab4be'
      ctx.lineWidth = 4
      ctx.strokeRect(0, 0, w, h)
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.fillRect(10, 10, w / 2, h / 3)
    }, { repeat: [10, 8] })
    const board = canvasTexture(1024, 400, (ctx, w, h) => {
      ctx.fillStyle = '#0f1b2d'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#9fb3c8'
      ctx.font = `500 54px ${FONT}`
      ctx.fillText('Очередь проб на анализ', 48, 96)
      ctx.fillStyle = '#ffd43b'
      ctx.font = `700 150px ${FONT}`
      ctx.fillText(`${queue}`, 48, 270)
      ctx.fillStyle = '#ffffff'
      ctx.font = `500 54px ${FONT}`
      ctx.fillText('партий ждут разрешения', 250, 230)
      ctx.fillText('на фасовку', 250, 300)
      ctx.fillStyle = '#ff6b4a'
      ctx.fillRect(48, 330, 928, 18)
    })
    const screen = (title, value, color) =>
      canvasTexture(512, 320, (ctx, w, h) => {
        ctx.fillStyle = '#10202f'
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = '#8fb3d6'
        ctx.font = `500 40px ${FONT}`
        ctx.fillText(title, 28, 64)
        ctx.fillStyle = color
        ctx.font = `700 96px ${FONT}`
        ctx.fillText(value, 28, 200)
        ctx.strokeStyle = color
        ctx.lineWidth = 6
        ctx.beginPath()
        for (let x = 0; x <= 456; x += 8) ctx.lineTo(28 + x, 280 - 20 * Math.sin(x / 30) - x / 30)
        ctx.stroke()
      })
    const label = (text, bg = '#1f4e8c') =>
      canvasTexture(512, 128, (ctx, w, h) => {
        ctx.fillStyle = bg
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = '#ffffff'
        ctx.font = `600 52px ${FONT}`
        ctx.textBaseline = 'middle'
        ctx.fillText(text, 24, h / 2 + 2)
      })
    const windowView = canvasTexture(512, 256, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, '#8fb9e3')
      g.addColorStop(0.7, '#dbe9f5')
      g.addColorStop(1, '#b7c4a8')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      // цеха за окном
      ctx.fillStyle = '#9aa7b6'
      ctx.fillRect(40, 150, 140, 70)
      ctx.fillRect(220, 130, 110, 90)
      ctx.fillStyle = '#e8ecef'
      for (const x of [380, 430, 480]) ctx.fillRect(x - 18, 140, 36, 80)
    })
    const poster = canvasTexture(256, 360, (ctx, w, h) => {
      ctx.fillStyle = '#1e8a5f'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(16, 16, w - 32, h - 32)
      ctx.fillStyle = '#1e8a5f'
      ctx.font = `700 34px ${FONT}`
      ctx.fillText('ОХРАНА', 32, 70)
      ctx.fillText('ТРУДА', 32, 110)
      ctx.fillStyle = '#16233a'
      ctx.font = `400 22px ${FONT}`
      ;['Очки и перчатки', 'обязательны', '', 'Пробы — только', 'в вытяжном шкафу'].forEach((t, i) => ctx.fillText(t, 32, 170 + i * 30))
    })
    return {
      floor,
      board,
      visc: screen('Вязкость 40 °C', '68,2 мм²/с', '#3ddc84'),
      flash: screen('Т вспышки', '226 °C', '#ffc53d'),
      ir: screen('ИК-спектр', 'норма', '#3ddc84'),
      labels: {
        visc: label('Вискозиметр'),
        flash: label('Анализатор вспышки'),
        ir: label('ИК-спектрометр'),
        hood: label('Вытяжной шкаф', '#5d6b7a'),
        samples: label('Пробы партий', '#b5342b'),
      },
      window: windowView,
      poster,
    }
  }, [queue])
}

function B({ p, s, c = '#d5dbe2', r = 0.7, m = 0.05, e, map }) {
  return (
    <mesh position={p}>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={r} metalness={m} emissive={e || '#000000'} emissiveIntensity={e ? 1 : 0} map={map} />
    </mesh>
  )
}

function Plane({ p, s, rot = [0, 0, 0], map, emissive = false }) {
  return (
    <mesh position={p} rotation={rot}>
      <planeGeometry args={s} />
      {emissive ? <meshBasicMaterial map={map} toneMapped={false} /> : <meshStandardMaterial map={map} roughness={0.6} />}
    </mesh>
  )
}

// Лабораторный стол вдоль стены: столешница, тумбы.
function Bench({ x, z, len, depth = 0.75, rotY = 0 }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <B p={[0, BENCH_TOP - 0.02, 0]} s={[len, 0.05, depth]} c="#2f3b48" r={0.35} />
      <B p={[0, FLOOR + 0.44, 0.02]} s={[len - 0.06, 0.86, depth - 0.08]} c="#e6eaee" />
      {Array.from({ length: Math.floor(len / 0.6) }, (_, i) => (
        <B key={i} p={[-len / 2 + 0.3 + i * 0.6, FLOOR + 0.5, depth / 2 - 0.02]} s={[0.56, 0.78, 0.02]} c="#f4f6f8" />
      ))}
    </group>
  )
}

// Штатив с пробами: латунные пробирки, часть уже проверена (светлые).
function SampleRack({ position, queue }) {
  const tubes = []
  for (let i = 0; i < 12; i++) tubes.push(i)
  return (
    <group position={position}>
      <B p={[0, 0.03, 0]} s={[0.9, 0.06, 0.22]} c="#5d6b7a" />
      <B p={[0, 0.16, 0]} s={[0.9, 0.03, 0.22]} c="#7d8b9a" m={0.4} />
      {tubes.map((i) => (
        <mesh key={i} position={[-0.39 + i * 0.071, 0.17, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.26, 10]} />
          <meshStandardMaterial color={i < queue ? '#c8962e' : '#efe2b8'} roughness={0.25} transparent opacity={0.92} />
        </mesh>
      ))}
    </group>
  )
}

function Instrument({ position, size, color, screen, rotY = 0 }) {
  const [w, h, d] = size
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <B p={[0, h / 2, 0]} s={size} c={color} r={0.45} m={0.2} />
      <Plane p={[0, h * 0.62, d / 2 + 0.002]} s={[w * 0.8, h * 0.45]} map={screen} emissive />
    </group>
  )
}

function Person({ position, rotY = 0 }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.85, 0]}>
        <capsuleGeometry args={[0.24, 0.9, 4, 12]} />
        <meshStandardMaterial color="#f4f6f8" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.66, 0]}>
        <sphereGeometry args={[0.17, 16, 12]} />
        <meshStandardMaterial color="#e2b48c" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.72, 0.02]}>
        <sphereGeometry args={[0.18, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#3a2a20" roughness={0.9} />
      </mesh>
    </group>
  )
}

function Bottles({ x, z, rotY }) {
  const list = useMemo(() => {
    const out = []
    const colors = ['#c8962e', '#8e6c2c', '#e8d38a', '#3b6ea8', '#c8962e']
    for (let shelf = 0; shelf < 3; shelf++) for (let i = 0; i < 9; i++) out.push({ x: -0.8 + i * 0.2, y: FLOOR + 1.0 + shelf * 0.42, c: colors[(i + shelf) % colors.length] })
    return out
  }, [])
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <B p={[0, FLOOR + 1.1, -0.05]} s={[2, 1.6, 0.04]} c="#dfe4ea" />
      {[0, 1, 2].map((i) => (
        <B key={i} p={[0, FLOOR + 0.9 + i * 0.42, 0.1]} s={[2, 0.03, 0.32]} c="#b8c2cc" m={0.3} />
      ))}
      {list.map((b, i) => (
        <mesh key={i} position={[b.x, b.y + 0.09, 0.1]}>
          <cylinderGeometry args={[0.05, 0.06, 0.2, 10]} />
          <meshStandardMaterial color={b.c} roughness={0.2} transparent opacity={0.88} />
        </mesh>
      ))}
    </group>
  )
}

function LabContents({ queue }) {
  const t = useLabTextures(queue)
  return (
    <>
      <color attach="background" args={['#e9eef3']} />
      <hemisphereLight args={['#ffffff', '#b9c4cf', 1.0]} />
      <directionalLight position={[6, 2, 0]} intensity={1.2} color="#fff4e0" />
      <pointLight position={[-2, 1.4, -1.5]} intensity={6} distance={9} decay={1.6} />
      <pointLight position={[2.5, 1.4, 1.5]} intensity={6} distance={9} decay={1.6} />
      <ambientLight intensity={0.25} />

      {/* пол, потолок, стены */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
        <meshStandardMaterial map={t.floor} roughness={0.55} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, CEIL, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
        <meshStandardMaterial color="#f2f4f6" roughness={1} />
      </mesh>
      {/* светильники */}
      {[-2.6, 0, 2.6].map((x) => [-2, 1.2].map((z) => <B key={`${x}${z}`} p={[x, CEIL - 0.02, z]} s={[1.2, 0.03, 0.6]} c="#ffffff" e="#ffffff" />))}
      <B p={[0, 0, -D]} s={[W * 2, CEIL * 2, 0.1]} c="#e7ecf1" r={0.95} />
      <B p={[0, 0, D]} s={[W * 2, CEIL * 2, 0.1]} c="#e7ecf1" r={0.95} />
      <B p={[-W, 0, 0]} s={[0.1, CEIL * 2, D * 2]} c="#e3e9ef" r={0.95} />
      <B p={[W, 0, 0]} s={[0.1, CEIL * 2, D * 2]} c="#e3e9ef" r={0.95} />
      {/* цокольная полоса */}
      <B p={[0, FLOOR + 0.06, -D + 0.06]} s={[W * 2, 0.12, 0.02]} c="#5d6b7a" />
      <B p={[0, FLOOR + 0.06, D - 0.06]} s={[W * 2, 0.12, 0.02]} c="#5d6b7a" />

      {/* «вперёд»: стол с пробами и приборами, табло очереди */}
      <Bench x={0.4} z={-D + 0.42} len={8.4} />
      <SampleRack position={[1.3, BENCH_TOP, -D + 0.45]} queue={queue} />
      <Plane p={[1.3, BENCH_TOP + 0.55, -D + 0.07]} s={[1.1, 0.27]} map={t.labels.samples} emissive />
      <Instrument position={[-1.8, BENCH_TOP, -D + 0.45]} size={[0.7, 0.55, 0.45]} color="#3b6ea8" screen={t.visc} />
      <Plane p={[-1.8, BENCH_TOP + 0.85, -D + 0.07]} s={[1.0, 0.25]} map={t.labels.visc} emissive />
      <Instrument position={[3.4, BENCH_TOP, -D + 0.45]} size={[0.6, 0.65, 0.5]} color="#e8ecef" screen={t.flash} />
      <Plane p={[3.4, BENCH_TOP + 0.95, -D + 0.07]} s={[1.2, 0.3]} map={t.labels.flash} emissive />
      <Plane p={[1.3, 0.55, -D + 0.07]} s={[2.6, 1.02]} map={t.board} emissive />

      {/* справа: окна и стол со спектрометром */}
      {[-2.4, 0, 2.4].map((z) => (
        <group key={z}>
          <Plane p={[W - 0.07, 0.35, z]} s={[1.9, 1.5]} rot={[0, -Math.PI / 2, 0]} map={t.window} emissive />
          <B p={[W - 0.08, 0.35, z]} s={[0.05, 1.6, 0.08]} c="#f4f6f8" />
          <B p={[W - 0.08, 0.35, z - 0.98]} s={[0.06, 1.6, 0.06]} c="#f4f6f8" />
          <B p={[W - 0.08, 0.35, z + 0.98]} s={[0.06, 1.6, 0.06]} c="#f4f6f8" />
        </group>
      ))}
      <Bench x={W - 0.42} z={0} len={6.4} rotY={-Math.PI / 2} />
      <Instrument position={[W - 0.45, BENCH_TOP, 1.1]} size={[0.6, 0.45, 0.8]} color="#2f9e44" screen={t.ir} rotY={-Math.PI / 2} />
      <Plane p={[W - 0.07, BENCH_TOP + 0.9, 1.1]} s={[1.1, 0.27]} rot={[0, -Math.PI / 2, 0]} map={t.labels.ir} emissive />
      {/* монитор оператора */}
      <group position={[W - 0.5, BENCH_TOP, -1.3]} rotation={[0, -Math.PI / 2, 0]}>
        <B p={[0, 0.3, 0]} s={[0.6, 0.38, 0.03]} c="#1f2933" />
        <B p={[0, 0.08, 0]} s={[0.06, 0.16, 0.06]} c="#4a5562" />
      </group>

      {/* сзади: дверь, вытяжной шкаф */}
      <B p={[-3.2, FLOOR + 1.05, D - 0.06]} s={[1.0, 2.1, 0.04]} c="#7d8fa3" />
      <B p={[-2.8, FLOOR + 1.05, D - 0.09]} s={[0.04, 0.2, 0.04]} c="#d0d6dc" m={0.6} />
      <group position={[1.4, 0, D - 0.45]}>
        <B p={[0, FLOOR + 0.45, 0]} s={[1.8, 0.9, 0.8]} c="#e6eaee" />
        <B p={[0, FLOOR + 1.45, 0]} s={[1.8, 1.1, 0.8]} c="#dde3e8" />
        <mesh position={[0, FLOOR + 1.4, -0.41]}>
          <planeGeometry args={[1.6, 0.9]} />
          <meshStandardMaterial color="#a9cbe8" transparent opacity={0.55} roughness={0.1} />
        </mesh>
        <B p={[0, FLOOR + 2.3, 0]} s={[1.8, 0.6, 0.8]} c="#cfd6dd" />
        <Plane p={[0, FLOOR + 2.3, -0.41]} s={[1.2, 0.3]} rot={[0, Math.PI, 0]} map={t.labels.hood} emissive />
      </group>
      <B p={[3.8, FLOOR + 0.9, D - 0.35]} s={[1.6, 1.8, 0.6]} c="#d5dbe2" />

      {/* слева: стеллаж с образцами, плакат по охране труда */}
      <Bottles x={-W + 0.2} z={-1.2} rotY={Math.PI / 2} />
      <Plane p={[-W + 0.07, 0.4, 1.8]} s={[0.8, 1.12]} rot={[0, Math.PI / 2, 0]} map={t.poster} />

      {/* лаборант у стола */}
      <Person position={[-2.7, FLOOR, -3.05]} rotY={Math.PI} />
    </>
  )
}

const panoVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`
const panoFragment = /* glsl */ `
  uniform samplerCube map;
  varying vec3 vDir;
  void main() {
    gl_FragColor = textureCube(map, normalize(vDir));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`

// Снимает комнату кубической камерой и показывает снимок на сфере панорамы.
export default function LabRoomPanorama({ size = 1024, queue = 9 }) {
  const gl = useThree((s) => s.gl)
  const roomScene = useMemo(() => new THREE.Scene(), [])
  const { target, camera } = useMemo(() => {
    const rt = new THREE.WebGLCubeRenderTarget(size, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter })
    rt.texture.colorSpace = THREE.SRGBColorSpace
    return { target: rt, camera: new THREE.CubeCamera(0.05, 30, rt) }
  }, [size])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { map: { value: target.texture } },
        vertexShader: panoVertex,
        fragmentShader: panoFragment,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [target],
  )

  // Комната смонтирована в портал — снимаем её (и переснимаем, если поменялась очередь).
  useLayoutEffect(() => {
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => camera.update(gl, roomScene))
    })
    return () => cancelAnimationFrame(raf)
  }, [gl, camera, roomScene, queue])

  useEffect(
    () => () => {
      target.dispose()
      material.dispose()
    },
    [target, material],
  )

  return (
    <>
      {createPortal(<LabContents queue={queue} />, roomScene)}
      <mesh material={material} name="panorama-sphere">
        <sphereGeometry args={[PANO_RADIUS, 64, 32]} />
      </mesh>
    </>
  )
}
