// Свет и окружение сцены: небо-градиент, туман у горизонта, солнце с тенями, мягкое окружение
// для отражений на металле (Environment из Lightformer'ов — собирается на месте, без скачивания HDR).
import { useMemo } from 'react'
import * as THREE from 'three'
import { ContactShadows, Environment, Lightformer } from '@react-three/drei'

const SUN = [28, 42, 20]

const SKY = {
  overview: { top: '#7fa7d1', horizon: '#e4ebf2', fog: [70, 190] },
  model: { top: '#9dbad8', horizon: '#e9eef3', fog: [55, 150] },
  panorama: { top: '#9dbad8', horizon: '#e9eef3', fog: null },
}

// Купол неба с вертикальным градиентом. Не участвует в тумане и глубине.
function SkyDome({ top, horizon }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color(top) },
          horizon: { value: new THREE.Color(horizon) },
          ground: { value: new THREE.Color(horizon).multiplyScalar(0.92) },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 top; uniform vec3 horizon; uniform vec3 ground;
          varying vec3 vDir;
          void main() {
            float h = vDir.y;
            vec3 c = h > 0.0 ? mix(horizon, top, pow(smoothstep(0.0, 0.85, h), 0.7)) : mix(horizon, ground, smoothstep(0.0, -0.2, h));
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [top, horizon],
  )
  return (
    <mesh material={material} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[400, 32, 16]} />
    </mesh>
  )
}

export default function Atmosphere({ sceneType, mobile }) {
  const sky = SKY[sceneType] || SKY.model
  const outdoor = sceneType !== 'panorama'
  return (
    <>
      <color attach="background" args={[sky.horizon]} />
      {outdoor && <SkyDome top={sky.top} horizon={sky.horizon} />}
      {sky.fog && <fog attach="fog" args={[sky.horizon, sky.fog[0], sky.fog[1]]} />}

      <hemisphereLight args={['#f4f8ff', '#8a8f86', 0.55]} />
      <directionalLight
        position={SUN}
        intensity={2.3}
        color="#fff6e8"
        castShadow={!mobile}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-48}
        shadow-camera-right={48}
        shadow-camera-top={38}
        shadow-camera-bottom={-38}
        shadow-camera-far={140}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
      />
      {/* мягкая подсветка теней с противоположной стороны */}
      <directionalLight position={[-30, 18, -24]} intensity={0.35} color="#cfe0ff" />

      {/* окружение для отражений: «небо» сверху и светлые панели по сторонам */}
      <Environment resolution={128} frames={1} environmentIntensity={0.55}>
        <color attach="background" args={['#c9d6e3']} />
        <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={[40, 40, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#dbe8ff" position={[-14, 4, -10]} rotation-y={Math.PI / 4} scale={[20, 6, 1]} />
        <Lightformer form="rect" intensity={1.0} color="#fff1dc" position={[14, 4, 10]} rotation-y={-Math.PI * 0.75} scale={[20, 6, 1]} />
        <Lightformer form="rect" intensity={0.4} color="#7c8a7a" position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={[40, 40, 1]} />
      </Environment>

      {/* на телефоне нет теней от солнца — одна статичная контактная тень даёт объём */}
      {mobile && outdoor && (
        <ContactShadows position={[0, 0.02, 0]} scale={sceneType === 'overview' ? 110 : 60} resolution={512} far={14} blur={2.4} opacity={0.45} frames={1} />
      )}
    </>
  )
}
