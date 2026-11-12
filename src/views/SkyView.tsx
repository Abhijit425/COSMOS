import { useEffect, useMemo, useRef, useState } from 'react'
import { SkyMap, type SkyMapHandle } from '../components/SkyMap'
import { Icon, Section, Spinner, Stat } from '../components/ui'
import { NALHATI, SOLAR_BODIES, compass, fmtDateTime, fmtTime, moonInfo, solarBodyPosition, twilight } from '../lib/astro'
import { fetchSkyConditions, observingScore, type SkyConditions } from '../lib/data'
import { selectionRaDec, type Selection } from '../lib/selection'
import { qualityProfile, useSettings } from '../lib/settings'
import { useConstellations, useStarCatalog } from '../three/common'

function Conditions() {
  const [c, setC] = useState<SkyConditions | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    const load = () => fetchSkyConditions().then((x) => { setC(x); setErr('') }).catch((e) => setErr(e.message))
    load(); const id = setInterval(load, 15 * 60e3); return () => clearInterval(id)
  }, [])
  if (err) return <p className="text-xs text-rose-300">Weather service unreachable ({err}). Sky positions below are still exact.</p>
  if (!c) return <Spinner label="Fetching current conditions…" />
  const sc = observingScore(c)
  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 rounded-full" style={{ background: `conic-gradient(#6ef2d0 ${sc.score * 3.6}deg, rgba(255,255,255,.08) 0)` }}>
          <div className="absolute inset-1 flex items-center justify-center rounded-full bg-space-900 text-sm font-bold">{sc.score}</div>
        </div>
        <div><div className="text-sm font-semibold">{sc.label} observing</div><div className="text-[11px] text-slate-400">Cloud {c.cloud}% · Humidity {c.humidity}% · {c.temp.toFixed(0)}°C</div></div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <Stat label="Low cloud" value={`${c.cloudLow}%`} /><Stat label="Mid cloud" value={`${c.cloudMid}%`} /><Stat label="High cloud" value={`${c.cloudHigh}%`} />
        <Stat label="Visibility" value={`${c.visibilityKm.toFixed(0)} km`} /><Stat label="Wind" value={`${c.wind.toFixed(0)} km/h`} /><Stat label="Updated" value={fmtTime(c.time)} />
      </div>
      <div className="mt-2 flex h-10 items-end gap-[2px]" title="Cloud cover forecast, next 18 hours">
        {c.hourly.map((h) => <div key={h.time.getTime()} className="flex-1 rounded-t bg-nebula/40" style={{ height: `${Math.max(4, h.cloud)}%` }} title={`${fmtTime(h.time)}: ${h.cloud}%`} />)}
      </div>
      <div className="flex justify-between text-[9px] text-slate-500"><span>now</span><span>cloud cover next 18 h</span><span>+18h</span></div>
      <p className="mt-1 text-[10px] text-slate-500">Model data from Open-Meteo (free), refreshed every 15 min — a forecast estimate, not an all-sky camera.</p>
    </div>
  )
}

export function SkyView({ selection, onSelect }: { selection: Selection | null; onSelect: (s: Selection) => void }) {
  const { settings, update } = useSettings()
  const q = qualityProfile(settings.quality)
  const [offsetH, setOffsetH] = useState(0)
  const [tick, setTick] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setTick(Date.now()), 30e3); return () => clearInterval(id) }, [])
  const date = useMemo(() => new Date(tick + offsetH * 3600e3), [tick, offsetH])
  const stars = useStarCatalog(q.starFile)
  const cons = useConstellations()
  const bodies = useMemo(() => SOLAR_BODIES.map((b) => solarBodyPosition(b, date)), [date])
  const moon = useMemo(() => moonInfo(date), [date])
  const sun = bodies[0]
  const tw = twilight(sun.alt)
  const map = useRef<SkyMapHandle>(null)
  const [showMessier, setShowMessier] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [panel, setPanel] = useState(true)

  // centre on objects chosen via search / other views
  const lastKey = useRef('')
  useEffect(() => {
    if (!selection) return
    const k = JSON.stringify(selection).slice(0, 80)
    if (k === lastKey.current) return
    lastKey.current = k
    const rd = selectionRaDec(selection)
    if (rd) map.current?.centerOn(rd.ra, rd.dec)
    else if (selection.type === 'body') { const b = bodies.find((x) => x.name === selection.name); if (b) map.current?.centerOnAltAz(b.alt, b.az) }
  }, [selection, bodies])

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 md:right-[22.5rem]">
      <SkyMap ref={map} date={date} stars={stars} constellations={cons} bodies={bodies} moonFraction={moon.fraction}
        showConstellations={settings.showConstellations} showLabels={settings.showLabels} showMessier={showMessier} showGrid={showGrid} selected={selection} onSelect={onSelect} />
      </div>

      <div className="pointer-events-none absolute left-3 top-16 xl:top-3 md:left-4">
        <h1 className="font-display text-lg font-bold drop-shadow">Live Sky from Nalhati</h1>
        <p className="text-[11px] text-slate-400">{NALHATI.lat.toFixed(2)}° N, {NALHATI.lon.toFixed(2)}° E · {fmtDateTime(date)} IST {offsetH === 0 ? '· live' : `· ${offsetH > 0 ? '+' : ''}${offsetH} h`}</p>
        <p className="text-[11px] text-aurora/90">{tw.label} — Sun {sun.alt.toFixed(1)}°</p>
        <p className="hidden text-[10px] text-slate-500 md:block">Drag to look around · scroll/pinch to zoom · tap any object</p>
      </div>

      <div className="absolute right-3 top-16 flex flex-col gap-1.5 md:right-[22.5rem]">
        <button className="btn glass !p-2.5" onClick={() => map.current?.zoom(1.4)} aria-label="Zoom in"><Icon name="plus" /></button>
        <button className="btn glass !p-2.5" onClick={() => map.current?.zoom(1 / 1.4)} aria-label="Zoom out"><Icon name="minus" /></button>
        <button className="btn glass !p-2.5" onClick={() => map.current?.reset()} aria-label="Whole sky"><Icon name="reset" /></button>
      </div>

      <div className="glass absolute bottom-24 left-2 right-2 rounded-xl p-2 md:bottom-3 md:left-3 md:right-[22.5rem]">
        <div className="flex flex-wrap items-center gap-1.5">
          <button className={`btn !py-1 ${offsetH === 0 ? 'btn-active' : ''}`} onClick={() => { setOffsetH(0); setTick(Date.now()) }}>Now</button>
          <input type="range" min={-12} max={12} step={0.25} value={offsetH} onChange={(e) => setOffsetH(parseFloat(e.target.value))} className="min-w-28 flex-1 accent-[#6ef2d0]" aria-label="Time offset" />
          <span className="w-14 text-center text-[11px] text-slate-300">{fmtTime(date)}</span>
          <button className={`btn !py-1 ${settings.showConstellations ? 'btn-active' : ''}`} onClick={() => update({ showConstellations: !settings.showConstellations })}>Lines</button>
          <button className={`btn !py-1 ${settings.showLabels ? 'btn-active' : ''}`} onClick={() => update({ showLabels: !settings.showLabels })}>Labels</button>
          <button className={`btn !py-1 ${showMessier ? 'btn-active' : ''}`} onClick={() => setShowMessier(!showMessier)}>Messier</button>
          <button className={`btn !py-1 ${showGrid ? 'btn-active' : ''}`} onClick={() => setShowGrid(!showGrid)}>Grid</button>
          <button className="btn !py-1 md:hidden" onClick={() => setPanel(!panel)}><Icon name="cloud" className="h-4 w-4" /></button>
        </div>
      </div>

      {!selection && (
        <aside className={`glass absolute z-20 left-2 right-2 top-24 max-h-[calc(100%-13rem)] overflow-y-auto rounded-2xl p-4 scroll-thin md:bottom-3 md:left-auto md:right-3 md:top-[4.25rem] md:max-h-none md:w-[21rem] ${panel ? 'hidden md:block' : ''}`}>
          <Section title="Sky conditions · Nalhati"><Conditions /></Section>
          <Section title="Planets & Moon tonight">
            <div className="space-y-0.5">
              {bodies.map((b) => (
                <button key={b.name} onClick={() => onSelect({ type: 'body', name: b.name })} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs hover:bg-white/5">
                  <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${b.alt > 0 ? 'bg-aurora' : 'bg-slate-600'}`} /><b className="text-slate-100">{b.name}</b></span>
                  <span className="text-slate-400">{b.alt > 0 ? `${b.alt.toFixed(0)}° ${compass(b.az)}` : `rises ${fmtTime(b.rise)}`} · mag {b.mag?.toFixed(1) ?? '—'}</span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-slate-500">Positions computed in your browser (astronomy-engine, VSOP87-based) — accurate to arcseconds, independent of internet.</p>
          </Section>
        </aside>
      )}
    </div>
  )
}
