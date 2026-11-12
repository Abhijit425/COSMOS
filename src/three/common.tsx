import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { bvToRgb, loadConstellations, loadStars, type Constellation, type StarRow } from '../lib/data'

/** J2000 RA/Dec (deg) -> scene vector. Scene: +Y = celestial north pole, RA 0h along +X */
export function raDecToScene(raDeg: number, decDeg: number, r = 1): THREE.Vector3 {
  const ra = THREE.MathUtils.degToRad(raDeg), dec = THREE.MathUtils.degToRad(decDeg)
  return new THREE.Vector3(r * Math.cos(dec) * Math.cos(ra), r * Math.sin(dec), -r * Math.cos(dec) * Math.sin(ra))
}
/** J2000 equatorial cartesian (x,y,z) -> scene */
export const eqToScene = (x: number, y: number, z: number) => new THREE.Vector3(x, z, -y)

let glowTex: THREE.Texture | null = null
export function glowTexture() {
  if (glowTex) return glowTex
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.15, 'rgba(255,255,255,0.65)')
  grd.addColorStop(0.45, 'rgba(255,255,255,0.15)'); grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128)
  glowTex = new THREE.CanvasTexture(c)
  glowTex.colorSpace = THREE.SRGBColorSpace
  return glowTex
}

const starVert = /* glsl */ `
  attribute float size; attribute vec3 color; varying vec3 vColor; varying float vAlpha; uniform float uScale;
  void main(){ vColor = color; vAlpha = clamp(size/3.0, 0.35, 1.0);
    vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = size * uScale; }`
const starFrag = /* glsl */ `
  varying vec3 vColor; varying float vAlpha;
  void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if(d>0.5) discard;
    float core = smoothstep(0.5, 0.0, d); float a = pow(core, 1.6) * vAlpha; gl_FragColor = vec4(vColor * (0.6 + core), a); }`

export function useStarCatalog(file: string) {
  const [stars, setStars] = useState<StarRow[] | null>(null)
  useEffect(() => { let on = true; loadStars(file).then((s) => on && setStars(s)); return () => { on = false } }, [file])
  return stars
}

/** Real star catalog (d3-celestial / Hipparcos-derived) placed on the celestial sphere with B−V colours */
export function StarField({ file, radius = 5000, dpr = 1 }: { file: string; radius?: number; dpr?: number }) {
  const stars = useStarCatalog(file)
  const geom = useMemo(() => {
    if (!stars) return null
    const pos = new Float32Array(stars.length * 3), col = new Float32Array(stars.length * 3), size = new Float32Array(stars.length)
    stars.forEach((s, i) => {
      const v = raDecToScene(s[0], s[1], radius)
      pos.set([v.x, v.y, v.z], i * 3)
      const [r, g, b] = bvToRgb(s[3]); col.set([r, g, b], i * 3)
      size[i] = Math.max(1.3, Math.min(9, (7.2 - s[2]) * 1.05))
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    g.setAttribute('size', new THREE.BufferAttribute(size, 1))
    return g
  }, [stars, radius])
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: starVert, fragmentShader: starFrag, uniforms: { uScale: { value: dpr } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }), [dpr])
  if (!geom) return null
  return <points geometry={geom} material={mat} frustumCulled={false} renderOrder={-2} />
}

// equatorial -> galactic rotation (J2000)
const GAL = [[-0.0548755604, -0.873437090, -0.4838350155], [0.4941094279, -0.44482963, 0.7469822445], [-0.867666149, -0.1980763734, 0.4559837762]]

/** Procedural Milky Way band placed along the real galactic plane, brightest toward Sagittarius */
export function MilkyWay({ count, radius = 4800 }: { count: number; radius?: number }) {
  const geom = useMemo(() => {
    const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), size = new Float32Array(count)
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd())
    let n = 0
    while (n < count) {
      const l = rnd() * 360
      const toCenter = Math.cos(THREE.MathUtils.degToRad(l)) // 1 at galactic centre
      const width = 4 + 7 * Math.max(0, toCenter)
      const b = gauss() * width
      // Great Rift dust lane
      if (Math.abs(b) < 1.6 && (l < 60 || l > 330) && rnd() < 0.75) continue
      if (rnd() > 0.35 + 0.65 * (0.5 + 0.5 * toCenter)) continue
      const lr = THREE.MathUtils.degToRad(l), br = THREE.MathUtils.degToRad(b)
      const gx = Math.cos(br) * Math.cos(lr), gy = Math.cos(br) * Math.sin(lr), gz = Math.sin(br)
      // eq = GAL^T * gal
      const ex = GAL[0][0] * gx + GAL[1][0] * gy + GAL[2][0] * gz
      const ey = GAL[0][1] * gx + GAL[1][1] * gy + GAL[2][1] * gz
      const ez = GAL[0][2] * gx + GAL[1][2] * gy + GAL[2][2] * gz
      const v = eqToScene(ex, ey, ez).multiplyScalar(radius)
      pos.set([v.x, v.y, v.z], n * 3)
      const warm = 0.5 + 0.5 * toCenter
      col.set([0.55 + 0.35 * warm, 0.55 + 0.2 * warm, 0.75 - 0.15 * warm].map((c) => c * (0.25 + 0.2 * rnd())), n * 3)
      size[n] = 1.6 + rnd() * 2.6
      n++
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    g.setAttribute('size', new THREE.BufferAttribute(size, 1))
    return g
  }, [count, radius])
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: starVert,
    fragmentShader: `varying vec3 vColor; varying float vAlpha; void main(){ float d = length(gl_PointCoord-0.5); if(d>0.5) discard; gl_FragColor = vec4(vColor, (0.5-d)*0.9); }`,
    uniforms: { uScale: { value: 1.6 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }), [])
  return <points geometry={geom} material={mat} frustumCulled={false} renderOrder={-3} />
}

export function useConstellations() {
  const [c, setC] = useState<Constellation[] | null>(null)
  useEffect(() => { loadConstellations().then(setC) }, [])
  return c
}

export function ConstellationLines({ radius = 4900, opacity = 0.22 }: { radius?: number; opacity?: number }) {
  const cons = useConstellations()
  const geom = useMemo(() => {
    if (!cons) return null
    const pts: number[] = []
    cons.forEach((c) => c.lines.forEach((seg) => {
      for (let i = 0; i < seg.length - 1; i++) {
        const a = raDecToScene(seg[i][0], seg[i][1], radius), b = raDecToScene(seg[i + 1][0], seg[i + 1][1], radius)
        pts.push(a.x, a.y, a.z, b.x, b.y, b.z)
      }
    }))
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return g
  }, [cons, radius])
  if (!geom) return null
  return (
    <lineSegments geometry={geom} frustumCulled={false} renderOrder={-1}>
      <lineBasicMaterial color="#7d9cff" transparent opacity={opacity} depthWrite={false} />
    </lineSegments>
  )
}
