import { useMemo, useRef, useState } from 'react'
import { StellariumButtons } from '../components/InfoPanel'
import { Icon, NasaImageCard, Section, Spinner, Stat } from '../components/ui'
import { compass, fmtDateTime, fmtTime, moonInfo } from '../lib/astro'
import { rankForObject, searchNasaImages, type NasaImage } from '../lib/data'
import { MoonScene, LUNAR_FEATURES, type MoonHandle, type LunarFeature } from '../three/MoonScene'
import { useEffect } from 'react'

function PhaseIcon({ fraction, waxing }: { fraction: number; waxing: boolean }) {
  const k = 1 - 2 * fraction // terminator ellipse x-radius factor
  const r = 26
  const lit = waxing ? 1 : -1
  const d = `M 30 ${30 - r} A ${r} ${r} 0 0 ${lit > 0 ? 1 : 0} 30 ${30 + r} A ${Math.abs(k) * r} ${r} 0 0 ${(k > 0) === (lit > 0) ? 0 : 1} 30 ${30 - r} Z`
  return (
    <svg viewBox="0 0 60 60" className="h-16 w-16 shrink-0">
      <circle cx="30" cy="30" r={r} fill="#1d2029" /><path d={d} fill="#ece6d6" /><circle cx="30" cy="30" r={r} fill="none" stroke="#ffffff22" />
    </svg>
  )
}

export function MoonView({ date, onOpenImage }: { date: Date; onOpenImage: (i: NasaImage) => void }) {
  const ref = useRef<MoonHandle>(null)
  const info = useMemo(() => moonInfo(date), [date])
  const [realPhase, setRealPhase] = useState(true)
  const [picked, setPicked] = useState<{ lat: number; lon: number } | null>(null)
  const [feature, setFeature] = useState<LunarFeature | null>(null)
  const [panel, setPanel] = useState(() => window.innerWidth >= 768)
  const [photos, setPhotos] = useState<NasaImage[] | null>(null)
  const [note, setNote] = useState('')
  const isLit = (lat: number, lon: number) => {
    const ss = (180 - info.phaseAngle) * Math.PI / 180
    return Math.cos(lat * Math.PI / 180) * Math.cos(lon * Math.PI / 180 - ss) > 0.02
  }
  const ensureLight = (lat: number, lon: number) => {
    if (realPhase && !isLit(lat, lon)) { setRealPhase(false); setNote('That spot is in lunar night right now — switched to full illumination so you can explore it.') }
    else setNote('')
  }
  useEffect(() => {
    searchNasaImages('Lunar Reconnaissance Orbiter moon').then((i) => setPhotos(rankForObject(i, ['moon', 'lunar', 'crater']).slice(0, 9))).catch(() => setPhotos([]))
  }, [])

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 md:right-[22.5rem]">
      <MoonScene ref={ref} phaseAngle={info.phaseAngle} realPhase={realPhase} libLon={info.libLon} libLat={info.libLat}
        onPick={(lat, lon) => { setPicked({ lat, lon }); setFeature(null); ensureLight(lat, lon) }} />
      </div>

      <div className="pointer-events-none absolute left-3 top-16 xl:top-3 md:left-4">
        <h1 className="font-display text-lg font-bold drop-shadow">Moon Observatory</h1>
        <p className="text-[11px] text-slate-400">NASA LRO LROC colour mosaic + LOLA elevation. Tap the surface to zoom in.</p>
        {note && <p className="mt-1 max-w-xs text-[11px] text-amber-200/90">{note}</p>}
      </div>

      <div className="absolute bottom-24 left-3 flex flex-wrap gap-1.5 md:bottom-4">
        <button className={`btn glass ${realPhase ? 'btn-active' : ''}`} onClick={() => { setRealPhase(true); setNote('') }}>Tonight's phase</button>
        <button className={`btn glass ${!realPhase ? 'btn-active' : ''}`} onClick={() => setRealPhase(false)}>Fully lit</button>
        <button className="btn glass md:hidden" onClick={() => setPanel((p) => !p)}><Icon name="info" className="h-4 w-4" />Info</button>
      </div>
      <div className="absolute bottom-24 right-3 flex flex-col gap-1.5 md:bottom-4 md:right-[22.5rem]">
        <button className="btn glass !p-2.5" onClick={() => ref.current?.zoom(0.7)} aria-label="Zoom in"><Icon name="plus" /></button>
        <button className="btn glass !p-2.5" onClick={() => ref.current?.zoom(1.4)} aria-label="Zoom out"><Icon name="minus" /></button>
        <button className="btn glass !p-2.5" onClick={() => { ref.current?.reset(); setPicked(null); setFeature(null) }} aria-label="Reset"><Icon name="reset" /></button>
      </div>

      <aside className={`glass absolute z-20 inset-x-2 bottom-20 top-auto max-h-[55vh] overflow-y-auto rounded-2xl p-4 scroll-thin md:inset-x-auto md:bottom-3 md:right-3 md:top-[4.25rem] md:max-h-none md:w-[21rem] ${panel ? '' : 'hidden md:block'}`}>
        <div className="mb-4 flex items-center gap-3">
          <PhaseIcon fraction={info.fraction} waxing={info.waxing} />
          <div>
            <div className="font-display text-xl font-bold">{info.phaseName}</div>
            <div className="text-sm text-slate-300">{(info.fraction * 100).toFixed(1)}% illuminated</div>
            <div className="text-[11px] text-slate-500">{fmtDateTime(date)} IST</div>
          </div>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-1.5">
          <Stat label="Moon age" value={`${info.ageDays.toFixed(1)} days`} />
          <Stat label="Distance" value={`${Math.round(info.distanceKm).toLocaleString('en-IN')} km`} />
          <Stat label="Moonrise" value={fmtTime(info.pos.rise)} /><Stat label="Moonset" value={fmtTime(info.pos.set)} />
          <Stat label="Now from Nalhati" value={info.pos.alt > 0 ? `${info.pos.alt.toFixed(0)}° ${compass(info.pos.az)}` : 'Below horizon'} />
          <Stat label="Libration" value={`${info.libLon.toFixed(1)}° / ${info.libLat.toFixed(1)}°`} sub="lon / lat (applied to 3D)" />
        </div>
        <Section title="Upcoming phases">
          <div className="space-y-1">{info.quarters.map((q) => <div key={q.name + q.date.toISOString()} className="flex justify-between text-xs"><span className="text-slate-300">{q.name}</span><span className="text-slate-400">{fmtDateTime(q.date)}</span></div>)}</div>
        </Section>

        {(feature || picked) && (
          <Section title="Selected location">
            {feature ? (<><div className="text-sm font-semibold">{feature.name} <span className="text-xs font-normal text-slate-400">· {feature.kind}</span></div><p className="text-xs text-slate-300">{feature.info}</p><p className="mt-1 text-[11px] text-slate-500">{feature.lat.toFixed(2)}°, {feature.lon.toFixed(2)}°</p></>)
              : picked && <p className="text-xs text-slate-300">Selenographic latitude <b>{picked.lat.toFixed(2)}°</b>, longitude <b>{picked.lon.toFixed(2)}°</b>{(() => { const n = LUNAR_FEATURES.map((f) => ({ f, d: Math.hypot(f.lat - picked.lat, (f.lon - picked.lon) * Math.cos(picked.lat * Math.PI / 180)) })).sort((a, b) => a.d - b.d)[0]; return n && n.d < 25 ? <> — near <b>{n.f.name}</b></> : null })()}</p>}
          </Section>
        )}

        <Section title="Fly to a feature">
          <div className="flex flex-wrap gap-1.5">
            {LUNAR_FEATURES.map((f) => <button key={f.name} className={`btn !px-2 !py-1 !text-[11px] ${feature?.name === f.name ? 'btn-active' : ''}`} onClick={() => { setFeature(f); setPicked(null); ensureLight(f.lat, f.lon); ref.current?.flyToFeature(f) }}>{f.name}</button>)}
          </div>
        </Section>

        <Section title="NASA lunar photographs">
          {!photos ? <Spinner label="Loading…" /> : photos.length === 0 ? <p className="text-xs text-slate-500">NASA archive unavailable.</p>
            : <div className="grid grid-cols-3 gap-1.5">{photos.map((p) => <NasaImageCard key={p.nasaId} img={p} compact onOpen={onOpenImage} />)}</div>}
        </Section>
        <StellariumButtons target="Moon" />
        <p className="mt-3 text-[10px] text-slate-500">Surface texture: NASA Scientific Visualization Studio CGI Moon Kit (LRO LROC WAC mosaic; LOLA elevation). Phase, libration and rise/set computed for your location.</p>
      </aside>
    </div>
  )
}
