import { Html, OrbitControls, useTexture } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Suspense, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { asset, qualityProfile, useSettings } from '../lib/settings'
import { StarField } from './common'

export interface LunarFeature { name: string; lat: number; lon: number; kind: string; info: string }
export const LUNAR_FEATURES: LunarFeature[] = [
  { name: 'Tycho', lat: -43.31, lon: -11.36, kind: 'Crater', info: '85 km young rayed crater (~108 million years old); its bright rays span much of the near side.' },
  { name: 'Copernicus', lat: 9.62, lon: -20.08, kind: 'Crater', info: '93 km crater with terraced walls and central peaks, ~800 million years old.' },
  { name: 'Kepler', lat: 8.12, lon: -38.01, kind: 'Crater', info: '31 km bright rayed crater in Oceanus Procellarum.' },
  { name: 'Aristarchus', lat: 23.73, lon: -47.49, kind: 'Crater', info: 'The brightest large feature on the Moon, 40 km across.' },
  { name: 'Plato', lat: 51.62, lon: -9.38, kind: 'Crater', info: '101 km lava-flooded crater with a very dark, smooth floor.' },
  { name: 'Clavius', lat: -58.62, lon: -14.73, kind: 'Crater', info: '231 km ancient walled plain; water molecules were detected here by SOFIA in 2020.' },
  { name: 'Grimaldi', lat: -5.2, lon: -68.6, kind: 'Basin', info: '173 km dark-floored basin near the western limb.' },
  { name: 'Langrenus', lat: -8.86, lon: 60.9, kind: 'Crater', info: '132 km crater with central peaks near the eastern limb.' },
  { name: 'Mare Tranquillitatis', lat: 8.5, lon: 31.4, kind: 'Mare', info: 'Sea of Tranquillity — basaltic plain where Apollo 11 landed.' },
  { name: 'Mare Imbrium', lat: 32.8, lon: -15.6, kind: 'Mare', info: 'Sea of Showers — 1,145 km impact basin flooded with lava.' },
  { name: 'Mare Serenitatis', lat: 28.0, lon: 17.5, kind: 'Mare', info: 'Sea of Serenity, explored by Apollo 17 near its edge.' },
  { name: 'Mare Crisium', lat: 17.0, lon: 59.1, kind: 'Mare', info: 'Sea of Crises — an isolated oval mare near the eastern limb.' },
  { name: 'Oceanus Procellarum', lat: 18.4, lon: -57.4, kind: 'Mare', info: 'Ocean of Storms — the largest mare, over 2,500 km across.' },
  { name: 'Apollo 11', lat: 0.674, lon: 23.473, kind: 'Landing site', info: 'Tranquility Base — first crewed landing, 20 July 1969.' },
  { name: 'Chandrayaan-3', lat: -69.37, lon: 32.32, kind: 'Landing site', info: 'Shiv Shakti Point — ISRO Vikram lander, first landing near the south pole, 23 Aug 2023.' },
]

const R = 10
/** fit the whole disc on portrait phones too */
const startDist = () => { const a = window.innerWidth / Math.max(1, window.innerHeight); return a < 1 ? Math.min(80, 34 / Math.max(a, 0.42) * 0.8) : 34 }
/** selenographic lat/lon -> local position on the (rotated) moon mesh. Near side (lon 0) faces +Z */
export function lunarToLocal(lat: number, lon: number, r = R) {
  const la = THREE.MathUtils.degToRad(lat), lo = THREE.MathUtils.degToRad(lon)
  return new THREE.Vector3(r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo))
}

function MoonMesh({ texFile, segments, displacement, onPick, libLon, libLat }: { texFile: string; segments: number; displacement: boolean; onPick: (p: THREE.Vector3, lat: number, lon: number) => void; libLon: number; libLat: number }) {
  const [map, height] = useTexture([asset(`textures/${texFile}`), asset('textures/moon_height_1k.jpg')])
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 8
  const group = useRef<THREE.Group>(null)
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.delta > 6) return
    const local = group.current!.worldToLocal(e.point.clone())
    const lat = THREE.MathUtils.radToDeg(Math.asin(local.y / local.length()))
    const lon = THREE.MathUtils.radToDeg(Math.atan2(local.x, local.z))
    onPick(e.point.clone(), lat, lon)
  }
  return (
    // libration tilts the visible face exactly as seen from Earth right now
    <group ref={group} rotation={[THREE.MathUtils.degToRad(libLat), THREE.MathUtils.degToRad(-libLon), 0]}>
      <mesh rotation={[0, -Math.PI / 2, 0]} onClick={click}>
        <sphereGeometry args={[R, segments, segments / 2]} />
        <meshStandardMaterial map={map} displacementMap={displacement ? height : null} displacementScale={displacement ? 0.12 : 0} displacementBias={-0.06}
          bumpMap={height} bumpScale={2.2} roughness={1} metalness={0} />
      </mesh>
      {LUNAR_FEATURES.map((f) => <FeatureMarker key={f.name} f={f} />)}
    </group>
  )
}

function FeatureMarker({ f }: { f: LunarFeature }) {
  const pos = useMemo(() => lunarToLocal(f.lat, f.lon, R * 1.004), [f])
  const { camera } = useThree()
  const ref = useRef<THREE.Group>(null)
  const label = useRef<HTMLDivElement>(null)
  useFrame(() => {
    if (!ref.current || !label.current) return
    const w = ref.current.getWorldPosition(new THREE.Vector3())
    const facing = w.clone().normalize().dot(camera.position.clone().sub(w).normalize()) > 0.12
    label.current.style.display = facing ? 'flex' : 'none'
  })
  return (
    <group ref={ref} position={pos}>
      {(
        <Html center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div ref={label} className="flex flex-col items-center">
            <div className={`h-1.5 w-1.5 rounded-full ${f.kind === 'Landing site' ? 'bg-solar' : 'bg-aurora'} shadow-[0_0_6px_rgba(110,242,208,.9)]`} />
            <div className="mt-0.5 whitespace-nowrap rounded bg-black/45 px-1 text-[10px] text-slate-100/90">{f.name}</div>
          </div>
        </Html>
      )}
    </group>
  )
}

function Rig({ target, controls }: { target: { pos: THREE.Vector3; look: THREE.Vector3 } | null; controls: React.RefObject<OrbitControlsImpl | null> }) {
  const { camera, invalidate } = useThree()
  const active = useRef(false)
  useEffect(() => { if (target) { active.current = true; invalidate() } }, [target, invalidate])
  useFrame((_, dt) => {
    const c = controls.current
    if (!target || !active.current || !c) return
    const k = 1 - Math.pow(0.02, dt)
    camera.position.lerp(target.pos, k); c.target.lerp(target.look, k); c.update()
    if (camera.position.distanceTo(target.pos) < 0.01) active.current = false
    invalidate()
  })
  return null
}

export interface MoonHandle { zoom: (f: number) => void; reset: () => void; flyToFeature: (f: LunarFeature) => void }
interface Props { phaseAngle: number; realPhase: boolean; libLon: number; libLat: number; onPick: (lat: number, lon: number) => void }

export const MoonScene = forwardRef<MoonHandle, Props>(function MoonScene(p, ref) {
  const { settings } = useSettings()
  const q = qualityProfile(settings.quality)
  const controls = useRef<OrbitControlsImpl | null>(null)
  const [fly, setFly] = useState<{ pos: THREE.Vector3; look: THREE.Vector3 } | null>(null)

  // Sun direction relative to the Earth–Moon line: phase 0 = new (sun behind moon), 180 = full (sun behind viewer).
  // Waxing moon is lit on the west limb, which appears on the RIGHT (+X) for observers in the northern hemisphere.
  const light = useMemo(() => {
    const a = THREE.MathUtils.degToRad(p.phaseAngle)
    return new THREE.Vector3(Math.sin(a) * 50, 4, -Math.cos(a) * 50)
  }, [p.phaseAngle])

  const flyToLocal = (local: THREE.Vector3) => {
    const libRot = new THREE.Euler(THREE.MathUtils.degToRad(p.libLat), THREE.MathUtils.degToRad(-p.libLon), 0)
    const w = local.clone().applyEuler(libRot)
    setFly({ look: w.clone().multiplyScalar(0.98), pos: w.clone().normalize().multiplyScalar(R * 1.32) })
  }

  useImperativeHandle(ref, () => ({
    zoom: (f) => {
      const c = controls.current; if (!c) return
      const off = c.object.position.clone().sub(c.target).multiplyScalar(f)
      if (c.target.length() + off.length() < R * 1.04) return
      setFly({ look: c.target.clone(), pos: c.target.clone().add(off) })
    },
    reset: () => setFly({ pos: new THREE.Vector3(0, 0, startDist()), look: new THREE.Vector3() }),
    flyToFeature: (f) => flyToLocal(lunarToLocal(f.lat, f.lon)),
  }))

  return (
    <Canvas dpr={q.dpr} gl={{ antialias: q.antialias }} frameloop={settings.powerSaver ? 'demand' : 'always'} camera={{ position: [0, 0, startDist()], fov: 40, near: 0.01, far: 20000 }}>
      <color attach="background" args={['#010208']} />
      <StarField file="stars6.json" radius={6000} dpr={1} />
      <ambientLight intensity={p.realPhase ? 0.035 : 0.25} />
      {p.realPhase
        ? <directionalLight position={light} intensity={3.2} color="#fff8ee" />
        : <directionalLight position={[10, 6, 40]} intensity={2.6} color="#fff8ee" />}
      <Suspense fallback={null}>
        <MoonMesh texFile={q.moonTex} segments={q.moonSegments} displacement={q.displacement} libLon={p.libLon} libLat={p.libLat}
          onPick={(_pt, lat, lon) => { p.onPick(lat, lon); flyToLocal(lunarToLocal(lat, lon)) }} />
      </Suspense>
      <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.08} enablePan={false} minDistance={R * 1.03} maxDistance={90} rotateSpeed={0.45} zoomSpeed={0.8} onStart={() => setFly(null)} />
      <Rig target={fly} controls={controls} />
    </Canvas>
  )
})
