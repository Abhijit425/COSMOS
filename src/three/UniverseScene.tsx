import { Html, OrbitControls, useTexture } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { helioPosition } from '../lib/astro'
import { FEATURED, PLANETS, PLANET_INFO, type DeepSkyObject, type PlanetName } from '../lib/catalog'
import { rankForObject, searchNasaImages, type NasaImage } from '../lib/data'
import { asset, qualityProfile, useSettings } from '../lib/settings'
import { ConstellationLines, MilkyWay, StarField, eqToScene, glowTexture, raDecToScene } from './common'

const AU_SCALE = (au: number) => 42 * Math.pow(au, 0.55)
const planetSize = (km: number) => 0.55 + 2.4 * Math.pow(km / 69911, 0.45)
const DSO_RADIUS = 1800

function scaledHelio(name: PlanetName | 'Earth', date: Date) {
  const [x, y, z] = helioPosition(name, date)
  const r = Math.hypot(x, y, z)
  return eqToScene(x, y, z).multiplyScalar(AU_SCALE(r) / r)
}

const PERIOD_DAYS: Record<PlanetName | 'Earth', number> = { Mercury: 88, Venus: 225, Earth: 365.25, Mars: 687, Jupiter: 4333, Saturn: 10759, Uranus: 30687, Neptune: 60190 }

function Orbit({ name, date }: { name: PlanetName | 'Earth'; date: Date }) {
  const geom = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const N = 160
    for (let i = 0; i <= N; i++) pts.push(scaledHelio(name, new Date(date.getTime() + (i / N) * PERIOD_DAYS[name] * 86400e3)))
    return new THREE.BufferGeometry().setFromPoints(pts)
    // orbits change negligibly over a session — compute once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])
  return (
    <line>
      <primitive object={geom} attach="geometry" />
      <lineBasicMaterial color={PLANET_INFO[name].color} transparent opacity={0.28} />
    </line>
  )
}

function Planet({ name, position, selected, onSelect, labels }: { name: PlanetName | 'Earth'; position: THREE.Vector3; selected: boolean; onSelect: () => void; labels: boolean }) {
  const tex = useTexture(asset(`textures/${PLANET_INFO[name].tex}`))
  tex.colorSpace = THREE.SRGBColorSpace
  const ring = useTexture(asset('textures/saturn_ring.png'))
  const ref = useRef<THREE.Mesh>(null)
  const size = planetSize(PLANET_INFO[name].radiusKm)
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.15 })
  const ringGeom = useMemo(() => {
    const g = new THREE.RingGeometry(size * 1.25, size * 2.3, 96, 1)
    const p = g.attributes.position, uv = g.attributes.uv, v = new THREE.Vector3()
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); uv.setXY(i, (v.length() - size * 1.25) / (size * 1.05), 0.5) }
    return g
  }, [size])
  return (
    <group position={position}>
      <mesh ref={ref} onClick={(e) => { e.stopPropagation(); onSelect() }} rotation={[0.41, 0, 0]}>
        <sphereGeometry args={[size, 48, 32]} />
        <meshStandardMaterial map={tex} roughness={0.9} metalness={0} />
      </mesh>
      {name === 'Saturn' && (
        <mesh geometry={ringGeom} rotation={[-Math.PI / 2 + 0.47, 0, 0]}>
          <meshStandardMaterial map={ring} transparent side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      {(
        <Html center position={[0, size * 1.35, 0]} zIndexRange={[10, 0]} style={{ pointerEvents: 'none', display: labels || selected ? 'block' : 'none' }}>
          <div className={`whitespace-nowrap rounded px-1.5 text-[11px] font-medium ${selected ? 'bg-aurora/20 text-aurora' : 'text-slate-200/80'}`}>{name}</div>
        </Html>
      )}
    </group>
  )
}

function Sun({ onSelect }: { onSelect: () => void }) {
  const tex = useTexture(asset('textures/sun.jpg'))
  tex.colorSpace = THREE.SRGBColorSpace
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.03 })
  return (
    <group>
      <mesh ref={ref} onClick={(e) => { e.stopPropagation(); onSelect() }}>
        <sphereGeometry args={[7, 64, 48]} />
        <meshBasicMaterial map={tex} color="#ffd9a0" />
      </mesh>
      <sprite scale={[52, 52, 1]}>
        <spriteMaterial map={glowTexture()} color="#ffb347" transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.9} />
      </sprite>
      <pointLight intensity={3.2} decay={0} distance={0} color="#fff3e0" />
    </group>
  )
}

/** Real NASA photo shown as a disc in 3D space (if the image host allows WebGL/CORS), else a coloured glow */
function DsoMarker({ obj, selected, onSelect, labels, photo }: { obj: DeepSkyObject; selected: boolean; onSelect: () => void; labels: boolean; photo?: NasaImage }) {
  const pos = useMemo(() => raDecToScene(obj.ra, obj.dec, DSO_RADIUS), [obj])
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    if (!photo) return
    let alive = true
    const loader = new THREE.TextureLoader(); loader.setCrossOrigin('anonymous')
    loader.load(photo.thumb, (t) => { if (!alive) return; t.colorSpace = THREE.SRGBColorSpace; setTex(t) }, undefined, () => setTex(null))
    return () => { alive = false }
  }, [photo])
  const s = selected ? 70 : 46
  return (
    <group position={pos}>
      <sprite scale={[s * 1.8, s * 1.8, 1]} onClick={(e) => { e.stopPropagation(); onSelect() }}>
        <spriteMaterial map={glowTexture()} color={obj.color} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={selected ? 1 : 0.75} />
      </sprite>
      {tex && (
        <sprite scale={[s, s, 1]} onClick={(e) => { e.stopPropagation(); onSelect() }}>
          <spriteMaterial map={tex} transparent depthWrite={false} opacity={0.95} alphaMap={roundMask()} />
        </sprite>
      )}
      {(
        <Html center position={[0, -s * 0.75, 0]} distanceFactor={900} zIndexRange={[10, 0]} style={{ pointerEvents: 'none', display: labels || selected ? 'block' : 'none' }}>
          <div className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold ${selected ? 'bg-aurora/25 text-aurora' : 'bg-black/40 text-slate-100/90'}`}>{obj.name}</div>
        </Html>
      )}
    </group>
  )
}

let mask: THREE.Texture | null = null
function roundMask() {
  if (mask) return mask
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')!; const grd = g.createRadialGradient(64, 64, 40, 64, 64, 64)
  grd.addColorStop(0, '#fff'); grd.addColorStop(1, '#000'); g.fillStyle = grd; g.fillRect(0, 0, 128, 128)
  mask = new THREE.CanvasTexture(c); return mask
}

export interface FlyTarget { pos: THREE.Vector3; look: THREE.Vector3 }

function CameraRig({ target, controls }: { target: FlyTarget | null; controls: React.RefObject<OrbitControlsImpl | null> }) {
  const { camera, invalidate } = useThree()
  const active = useRef(false)
  useEffect(() => { if (target) { active.current = true; invalidate() } }, [target, invalidate])
  useFrame((_, dt) => {
    const c = controls.current
    if (!target || !active.current || !c) return
    const k = 1 - Math.pow(0.03, dt)
    camera.position.lerp(target.pos, k)
    c.target.lerp(target.look, k)
    c.update()
    if (camera.position.distanceTo(target.pos) < 0.05 * Math.max(1, target.pos.length() / 50)) active.current = false
    invalidate()
  })
  return null
}

export interface UniverseHandle { zoom: (f: number) => void; reset: () => void }

interface Props {
  date: Date
  selectedKey: string
  onSelectDso: (o: DeepSkyObject) => void
  onSelectBody: (n: PlanetName | 'Earth' | 'Sun') => void
  showConstellations: boolean
  labels: boolean
}

const HOME: FlyTarget = { pos: new THREE.Vector3(120, 160, 320), look: new THREE.Vector3(0, 0, 0) }

export const UniverseScene = forwardRef<UniverseHandle, Props>(function UniverseScene(p, ref) {
  const { settings } = useSettings()
  const q = qualityProfile(settings.quality)
  const controls = useRef<OrbitControlsImpl | null>(null)
  const [fly, setFly] = useState<FlyTarget | null>(HOME)
  const [photos, setPhotos] = useState<Record<string, NasaImage>>({})

  const positions = useMemo(() => {
    const m = {} as Record<PlanetName | 'Earth', THREE.Vector3>
    ;([...PLANETS, 'Earth'] as const).forEach((n) => { m[n] = scaledHelio(n, p.date) })
    return m
  }, [p.date])

  // fetch a real photo for each featured object to hang in 3D space
  useEffect(() => {
    FEATURED.forEach((o) => searchNasaImages(o.nasaQuery).then((imgs) => {
      const best = rankForObject(imgs, o.match)[0]
      if (best) setPhotos((ph) => ({ ...ph, [o.id]: best }))
    }).catch(() => {}))
  }, [])

  // fly to selection
  useEffect(() => {
    const key = p.selectedKey
    const dso = FEATURED.find((o) => o.id === key)
    if (dso) {
      const look = raDecToScene(dso.ra, dso.dec, DSO_RADIUS)
      setFly({ look, pos: look.clone().multiplyScalar(0.88).add(new THREE.Vector3(0, 12, 0)) })
      return
    }
    if (key === 'Sun') { setFly({ look: new THREE.Vector3(), pos: new THREE.Vector3(18, 10, 34) }); return }
    const pl = positions[key as PlanetName | 'Earth']
    if (pl) {
      const s = planetSize(PLANET_INFO[key as PlanetName].radiusKm)
      const dir = pl.clone().normalize()
      // approach from the Sun's side so the day hemisphere faces the camera
      const side = new THREE.Vector3(0, 1, 0).cross(dir).normalize()
      setFly({ look: pl.clone(), pos: pl.clone().add(dir.clone().multiplyScalar(-s * 4.2)).add(side.multiplyScalar(s * 2.2)).add(new THREE.Vector3(0, s * 1.2, 0)) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.selectedKey])

  useImperativeHandle(ref, () => ({
    zoom: (f: number) => {
      const c = controls.current; if (!c) return
      const cam = c.object
      const off = cam.position.clone().sub(c.target).multiplyScalar(f)
      setFly({ look: c.target.clone(), pos: c.target.clone().add(off) })
    },
    reset: () => setFly({ pos: HOME.pos.clone(), look: HOME.look.clone() }),
  }))

  return (
    <Canvas
      dpr={q.dpr}
      gl={{ antialias: q.antialias, powerPreference: 'high-performance' }}
      frameloop={settings.powerSaver ? 'demand' : 'always'}
      camera={{ position: [600, 800, 1600], fov: 55, near: 0.1, far: 20000 }}
      onPointerMissed={() => {}}
    >
      <color attach="background" args={['#020309']} />
      <ambientLight intensity={0.08} />
      <MilkyWay count={q.milkyWay} />
      <StarField file={q.starFile} dpr={Math.min(window.devicePixelRatio, q.dpr[1])} />
      {p.showConstellations && <ConstellationLines />}
      <Suspense fallback={null}>
        <Sun onSelect={() => p.onSelectBody('Sun')} />
        {([...PLANETS, 'Earth'] as const).map((n) => (
          <group key={n}>
            <Orbit name={n} date={p.date} />
            <Planet name={n} position={positions[n]} selected={p.selectedKey === n} labels={p.labels} onSelect={() => p.onSelectBody(n)} />
          </group>
        ))}
      </Suspense>
      {FEATURED.map((o) => (
        <DsoMarker key={o.id} obj={o} photo={photos[o.id]} selected={p.selectedKey === o.id} labels={p.labels} onSelect={() => p.onSelectDso(o)} />
      ))}
      <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.08} rotateSpeed={0.5} zoomSpeed={0.9} minDistance={1.5} maxDistance={4200}
        onStart={() => setFly(null)} />
      <CameraRig target={fly} controls={controls} />
    </Canvas>
  )
})
