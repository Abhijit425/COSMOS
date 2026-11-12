import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { eqjVec, horizonMatrix, rotate, vecToAltAz, type BodyPosition, type Vec3 } from '../lib/astro'
import { FEATURED, MESSIER } from '../lib/catalog'
import { bvToRgb, type Constellation, type StarRow } from '../lib/data'
import type { Selection } from '../lib/selection'

interface Props {
  date: Date
  stars: StarRow[] | null
  constellations: Constellation[] | null
  bodies: BodyPosition[]
  moonFraction: number
  showConstellations: boolean
  showLabels: boolean
  showMessier: boolean
  showGrid: boolean
  selected: Selection | null
  onSelect: (s: Selection) => void
}

export interface SkyMapHandle { centerOn: (ra: number, dec: number) => void; centerOnAltAz: (alt: number, az: number, zoom?: number) => void; zoom: (f: number) => void; reset: () => void }

interface Hit { x: number; y: number; r: number; sel: Selection; pri: number }

const D2R = Math.PI / 180

export const SkyMap = forwardRef<SkyMapHandle, Props>(function SkyMap(p, ref) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [view, setView] = useState({ az: 180, alt: 90, zoom: 1 })
  const hits = useRef<Hit[]>([])
  const [pulse, setPulse] = useState(0)

  // J2000 unit vectors for the catalog, computed once
  const starVecs = useMemo(() => {
    if (!p.stars) return null
    const a = new Float32Array(p.stars.length * 3)
    p.stars.forEach((s, i) => { const v = eqjVec(s[0], s[1]); a[i * 3] = v[0]; a[i * 3 + 1] = v[1]; a[i * 3 + 2] = v[2] })
    return a
  }, [p.stars])

  useEffect(() => {
    const el = wrap.current; if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el); return () => ro.disconnect()
  }, [])

  // gentle pulse on the selection marker
  useEffect(() => {
    if (!p.selected) return
    const id = setInterval(() => setPulse((x) => (x + 1) % 20), 90)
    return () => clearInterval(id)
  }, [p.selected])

  const M = useMemo(() => horizonMatrix(p.date), [p.date])

  const centerOnAltAz = (alt: number, az: number, zoom = 2.6) => setView({ alt: Math.min(89.5, Math.max(-10, alt)), az, zoom })
  useImperativeHandle(ref, () => ({
    centerOn: (ra, dec) => { const h = vecToAltAz(rotate(M, eqjVec(ra, dec))); centerOnAltAz(h.alt, h.az) },
    centerOnAltAz,
    zoom: (f) => setView((v) => ({ ...v, zoom: Math.min(40, Math.max(0.6, v.zoom * f)) })),
    reset: () => setView({ az: 180, alt: 90, zoom: 1 }),
  }))

  // ---------- drawing ----------
  useEffect(() => {
    const cv = canvas.current; if (!cv) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    cv.width = size.w * dpr; cv.height = size.h * dpr
    const g = cv.getContext('2d')!; g.setTransform(dpr, 0, 0, dpr, 0, 0)
    const W = size.w, H = size.h, cx = W / 2, cy = H / 2
    const scale = (Math.min(W, H) / 2 / 2) * 0.94 * view.zoom
    const newHits: Hit[] = []

    // camera basis in horizon frame (e = east, n = north, u = up) -> stored as [e, n, u]
    const a0 = view.az * D2R, h0 = view.alt * D2R
    const c: Vec3 = [Math.cos(h0) * Math.sin(a0), Math.cos(h0) * Math.cos(a0), Math.sin(h0)]
    let up: Vec3
    if (view.alt > 89) up = [Math.sin(a0 + Math.PI), Math.cos(a0 + Math.PI), 0] // zenith view: chosen azimuth at the bottom
    else { const d = c[2]; up = [-d * c[0], -d * c[1], 1 - d * c[2]]; const l = Math.hypot(...up); up = [up[0] / l, up[1] / l, up[2] / l] }
    // right = c × up
    const rt: Vec3 = [c[1] * up[2] - c[2] * up[1], c[2] * up[0] - c[0] * up[2], c[0] * up[1] - c[1] * up[0]]

    /** horizon vector [north, west, up] (astronomy-engine HOR) -> screen */
    const proj = (h: Vec3): [number, number, number] | null => {
      const e = -h[1], n = h[0], u = h[2]
      const cosc = e * c[0] + n * c[1] + u * c[2]
      if (cosc < -0.35) return null
      const k = 2 / (1 + cosc)
      const x = k * (e * rt[0] + n * rt[1] + u * rt[2]), y = k * (e * up[0] + n * up[1] + u * up[2])
      return [cx + x * scale, cy - y * scale, u]
    }
    const hor = (v: Vec3) => rotate(M, v)

    // sky background, tinted by the Sun's altitude
    const sun = p.bodies.find((b) => b.name === 'Sun')
    const sunAlt = sun?.alt ?? -30
    const t = Math.max(0, Math.min(1, (sunAlt + 18) / 18))
    const top = `rgb(${Math.round(3 + 30 * t)},${Math.round(5 + 50 * t)},${Math.round(14 + 110 * t)})`
    const bg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7)
    bg.addColorStop(0, top); bg.addColorStop(1, '#020309')
    g.fillStyle = bg; g.fillRect(0, 0, W, H)

    // horizon: longest contiguous run of projected points, sampled starting behind the viewer
    const ring: [number, number][] = []
    let closed = true
    {
      let cur: [number, number][] = []
      for (let k = -180; k <= 180; k += 2) {
        const a = (view.az + k) * D2R
        const pr = proj([Math.cos(a), -Math.sin(a), 0]) // north, west, up
        const last = cur[cur.length - 1]
        if (pr && (!last || Math.hypot(pr[0] - last[0], pr[1] - last[1]) < Math.max(W, H))) cur.push([pr[0], pr[1]])
        else { closed = false; if (cur.length > ring.length) ring.splice(0, ring.length, ...cur); cur = pr ? [[pr[0], pr[1]]] : [] }
      }
      if (cur.length > ring.length) ring.splice(0, ring.length, ...cur)
    }
    const downA = view.az * D2R
    const h0p = proj([Math.cos(downA), -Math.sin(downA), 0]), h1p = proj([Math.cos(downA) * 0.94, -Math.sin(downA) * 0.94, -0.34])
    let down: [number, number] = [0, 1]
    if (h0p && h1p) { const dx = h1p[0] - h0p[0], dy = h1p[1] - h0p[1], l = Math.hypot(dx, dy) || 1; down = [dx / l, dy / l] }

    // alt/az grid
    if (p.showGrid) {
      g.strokeStyle = 'rgba(143,179,255,0.12)'; g.lineWidth = 1
      for (const alt of [30, 60]) {
        g.beginPath(); let first = true
        for (let az = 0; az <= 360; az += 3) {
          const a = az * D2R, ca = Math.cos(alt * D2R)
          const pr = proj([ca * Math.cos(a), -ca * Math.sin(a), Math.sin(alt * D2R)])
          if (!pr) { first = true; continue }
          if (first) { g.moveTo(pr[0], pr[1]); first = false } else g.lineTo(pr[0], pr[1])
        }
        g.stroke()
      }
    }

    // constellations
    if (p.showConstellations && p.constellations) {
      g.strokeStyle = 'rgba(125,156,255,0.32)'; g.lineWidth = 1
      g.beginPath()
      for (const con of p.constellations) for (const seg of con.lines) {
        let prev: [number, number, number] | null = null
        for (const pt of seg) {
          const pr = proj(hor(eqjVec(pt[0], pt[1])))
          if (pr && prev && Math.hypot(pr[0] - prev[0], pr[1] - prev[1]) < W) { g.moveTo(prev[0], prev[1]); g.lineTo(pr[0], pr[1]) }
          prev = pr
        }
      }
      g.stroke()
      if (p.showLabels) {
        g.font = '600 10px Inter, sans-serif'; g.fillStyle = 'rgba(160,185,255,0.55)'; g.textAlign = 'center'
        for (const con of p.constellations) {
          const pr = proj(hor(eqjVec(con.label[0], con.label[1])))
          if (pr && pr[2] > -0.05) { g.fillText(con.name.toUpperCase(), pr[0], pr[1]); newHits.push({ x: pr[0], y: pr[1], r: 22, pri: 0, sel: { type: 'constellation', id: con.id, name: con.name, ra: con.label[0], dec: con.label[1] } }) }
        }
      }
    }

    // stars
    if (p.stars && starVecs) {
      const magLimit = 4.6 + Math.log2(view.zoom) * 1.6
      for (let i = 0; i < p.stars.length; i++) {
        const s = p.stars[i]
        if (s[2] > magLimit) break // sorted by magnitude
        const v: Vec3 = [starVecs[i * 3], starVecs[i * 3 + 1], starVecs[i * 3 + 2]]
        const pr = proj(hor(v)); if (!pr) continue
        if (pr[0] < -5 || pr[1] < -5 || pr[0] > W + 5 || pr[1] > H + 5) continue
        const below = pr[2] < 0
        const r = Math.max(0.55, (magLimit + 1.2 - s[2]) * 0.42 * Math.pow(view.zoom, 0.12))
        const [cr, cg, cb] = bvToRgb(s[3])
        g.fillStyle = `rgba(${cr * 255 | 0},${cg * 255 | 0},${cb * 255 | 0},${below ? 0.12 : Math.min(1, 0.45 + (magLimit - s[2]) * 0.18)})`
        if (r < 1.1) g.fillRect(pr[0] - r, pr[1] - r, r * 2, r * 2)
        else { g.beginPath(); g.arc(pr[0], pr[1], r, 0, 7); g.fill() }
        if (s[2] < 4.5) newHits.push({ x: pr[0], y: pr[1], r: Math.max(8, r + 6), pri: 1, sel: { type: 'star', name: s[4] || `Star (mag ${s[2].toFixed(1)})`, ra: s[0], dec: s[1], mag: s[2], bv: s[3] } })
        if (s[4] && p.showLabels && !below && (s[2] < 1.6 || view.zoom > 1.8)) {
          g.font = '11px Inter, sans-serif'; g.fillStyle = 'rgba(230,235,255,0.7)'; g.textAlign = 'left'; g.fillText(s[4], pr[0] + r + 3, pr[1] + 3)
        }
      }
    }

    // ground overlay
    if (ring.length > 3) {
      g.save(); g.beginPath()
      if (closed && view.alt > 60) {
        g.rect(0, 0, W, H); g.moveTo(ring[0][0], ring[0][1]); ring.forEach(([x, y]) => g.lineTo(x, y)); g.closePath(); g.fillStyle = 'rgba(6,12,10,0.86)'; g.fill('evenodd')
      } else {
        const F = 4 * Math.max(W, H)
        g.moveTo(ring[0][0], ring[0][1]); ring.forEach(([x, y]) => g.lineTo(x, y))
        const l = ring[ring.length - 1], f = ring[0]
        g.lineTo(l[0] + down[0] * F, l[1] + down[1] * F); g.lineTo(f[0] + down[0] * F, f[1] + down[1] * F); g.closePath()
        g.fillStyle = 'rgba(6,12,10,0.8)'; g.fill()
      }
      g.restore()
      g.strokeStyle = 'rgba(110,242,208,0.55)'; g.lineWidth = 1.4; g.beginPath()
      ring.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke()
      // cardinal points
      g.font = '700 13px "Space Grotesk", sans-serif'; g.fillStyle = '#6ef2d0'; g.textAlign = 'center'
      for (const [lab, az] of [['N', 0], ['NE', 45], ['E', 90], ['SE', 135], ['S', 180], ['SW', 225], ['W', 270], ['NW', 315]] as const) {
        const a = az * D2R
        const pr = proj([Math.cos(a) * 0.996, -Math.sin(a) * 0.996, -0.09])
        if (pr) { g.globalAlpha = lab.length === 1 ? 1 : 0.55; g.fillText(lab, pr[0], pr[1] + 4) }
      }
      g.globalAlpha = 1
    }

    // deep-sky objects
    const dsos = [...FEATURED.map((o) => ({ id: o.id, ra: o.ra, dec: o.dec, name: o.name, color: o.color, featured: true, sel: { type: 'dso', obj: o } as Selection })),
      ...(p.showMessier ? MESSIER.filter((m) => !FEATURED.some((f) => f.id === m.id)).map((m) => ({ id: m.id, ra: m.ra, dec: m.dec, name: m.name ? `${m.id} ${m.name}` : m.id, color: '#9fb4ff', featured: false, sel: { type: 'messier', obj: m } as Selection })) : [])]
    for (const d of dsos) {
      const pr = proj(hor(eqjVec(d.ra, d.dec))); if (!pr) continue
      const below = pr[2] < 0
      g.globalAlpha = below ? 0.25 : 1
      g.strokeStyle = d.color; g.lineWidth = d.featured ? 1.6 : 1
      g.beginPath(); g.ellipse(pr[0], pr[1], d.featured ? 7 : 4.5, d.featured ? 4.5 : 3, -0.5, 0, 7); g.stroke()
      if (p.showLabels && d.id !== 'PILLARS' && (d.featured || view.zoom > 2.2)) {
        g.font = d.featured ? '600 11px Inter, sans-serif' : '10px Inter, sans-serif'; g.fillStyle = d.color; g.textAlign = 'left'
        g.fillText(d.name, pr[0] + 9, pr[1] - 5)
      }
      g.globalAlpha = 1
      newHits.push({ x: pr[0], y: pr[1], r: 14, pri: d.featured ? 3 : 2, sel: d.sel })
    }

    // Sun, Moon, planets
    for (const b of p.bodies) {
      const pr = proj(hor(b.vec)); if (!pr) continue
      const below = pr[2] < 0
      g.globalAlpha = below ? 0.35 : 1
      if (b.name === 'Sun') {
        const gr = g.createRadialGradient(pr[0], pr[1], 0, pr[0], pr[1], 22); gr.addColorStop(0, '#fff6c8'); gr.addColorStop(0.3, '#ffcf6e'); gr.addColorStop(1, 'rgba(255,170,60,0)')
        g.fillStyle = gr; g.beginPath(); g.arc(pr[0], pr[1], 22, 0, 7); g.fill()
      } else if (b.name === 'Moon') {
        g.fillStyle = '#2a2d36'; g.beginPath(); g.arc(pr[0], pr[1], 9, 0, 7); g.fill()
        // lit part (approximate terminator, lit limb toward the Sun)
        if (sun) {
          const sp = proj(hor(sun.vec))
          const ang = sp ? Math.atan2(sp[1] - pr[1], sp[0] - pr[0]) : 0
          g.save(); g.translate(pr[0], pr[1]); g.rotate(ang)
          g.fillStyle = '#e9e4d6'; g.beginPath(); g.arc(0, 0, 9, -Math.PI / 2, Math.PI / 2)
          const k = 1 - 2 * p.moonFraction
          g.ellipse(0, 0, Math.abs(k) * 9, 9, 0, Math.PI / 2, -Math.PI / 2, k > 0); g.fill(); g.restore()
        }
      } else {
        const col: Record<string, string> = { Mercury: '#b8b0a6', Venus: '#fff1c4', Mars: '#ff7a4d', Jupiter: '#ffe0b0', Saturn: '#f2dc9b', Uranus: '#a8f0f5', Neptune: '#7d9bff' }
        const r = Math.max(2.4, 5.2 - (b.mag ?? 6) * 0.45)
        g.fillStyle = col[b.name]; g.beginPath(); g.arc(pr[0], pr[1], r, 0, 7); g.fill()
        g.strokeStyle = col[b.name]; g.globalAlpha *= 0.4; g.beginPath(); g.arc(pr[0], pr[1], r + 3, 0, 7); g.stroke(); g.globalAlpha = below ? 0.35 : 1
      }
      { g.font = '600 12px Inter, sans-serif'; g.fillStyle = b.name === 'Sun' ? '#ffcf6e' : '#ffe9b3'; g.textAlign = 'left'; g.fillText(b.name, pr[0] + 12, pr[1] + 4) }
      g.globalAlpha = 1
      newHits.push({ x: pr[0], y: pr[1], r: 18, pri: 4, sel: { type: 'body', name: b.name } })
    }

    // selection marker
    if (p.selected) {
      let v: Vec3 | null = null
      const s = p.selected
      if (s.type === 'dso' || s.type === 'messier') v = eqjVec(s.obj.ra, s.obj.dec)
      else if (s.type === 'star' || s.type === 'constellation') v = eqjVec(s.ra, s.dec)
      else { const b = p.bodies.find((x) => x.name === s.name); if (b) v = b.vec }
      const pr = v && proj(hor(v))
      if (pr) {
        const r = 16 + Math.sin(pulse / 20 * Math.PI * 2) * 3
        g.strokeStyle = '#6ef2d0'; g.lineWidth = 1.6
        g.beginPath(); g.arc(pr[0], pr[1], r, 0, 7); g.stroke()
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.beginPath(); g.moveTo(pr[0] + dx * (r + 3), pr[1] + dy * (r + 3)); g.lineTo(pr[0] + dx * (r + 10), pr[1] + dy * (r + 10)); g.stroke() }
      }
    }

    hits.current = newHits
  }, [size, view, M, p.stars, starVecs, p.constellations, p.bodies, p.showConstellations, p.showLabels, p.showMessier, p.showGrid, p.selected, p.moonFraction, pulse])

  // ---------- interaction: drag to look around, wheel/pinch to zoom, tap to identify ----------
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const drag = useRef({ moved: 0, pinch: 0 })
  const onDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); drag.current.moved = 0
    if (pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; drag.current.pinch = Math.hypot(a.x - b.x, a.y - b.y) }
  }
  const onMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId); if (!prev) return
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (drag.current.pinch) { const f = d / drag.current.pinch; setView((v) => ({ ...v, zoom: Math.min(40, Math.max(0.6, v.zoom * f)) })) }
      drag.current.pinch = d; drag.current.moved += 10; return
    }
    drag.current.moved += Math.abs(dx) + Math.abs(dy)
    const degPerPx = 115 / (Math.min(size.w, size.h) * view.zoom)
    setView((v) => {
      if (v.alt > 89) return { ...v, az: (v.az - dx * degPerPx * 1.2 + 360) % 360, alt: dy > 2 ? 88.9 : v.alt }
      return { ...v, az: (v.az - dx * degPerPx + 360) % 360, alt: Math.max(-10, Math.min(89.5, v.alt + dy * degPerPx)) }
    })
  }
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) drag.current.pinch = 0
    if (drag.current.moved < 6 && pointers.current.size === 0) {
      const rect = canvas.current!.getBoundingClientRect(); const x = e.clientX - rect.left, y = e.clientY - rect.top
      let best: Hit | null = null; let bestScore = Infinity
      for (const h of hits.current) {
        const d = Math.hypot(h.x - x, h.y - y)
        if (d <= h.r) { const sc = d - h.pri * 4; if (sc < bestScore) { bestScore = sc; best = h } }
      }
      if (best) p.onSelect(best.sel)
    }
  }
  const onWheel = (e: React.WheelEvent) => setView((v) => ({ ...v, zoom: Math.min(40, Math.max(0.6, v.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15))) }))

  return (
    <div ref={wrap} className="absolute inset-0">
      <canvas ref={canvas} style={{ width: size.w, height: size.h }} className="block cursor-grab active:cursor-grabbing"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel} />

    </div>
  )
})
