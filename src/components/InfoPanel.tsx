import { useEffect, useMemo, useState } from 'react'
import { compass, constellationOf, fixedObjectEvents, fmtTime, solarBodyPosition, type SolarBody } from '../lib/astro'
import { MESSIER_TYPE, PLANET_INFO, decToDms, raToHms } from '../lib/catalog'
import { esaskyUrl, rankForObject, searchNasaImages, stellariumFocus, stellariumWebUrl, type NasaImage } from '../lib/data'
import { selectionName, selectionRaDec, type Selection, type View } from '../lib/selection'
import { useSettings } from '../lib/settings'
import { Icon, NasaImageCard, Section, Spinner, Stat } from './ui'

export function VisibilityBlock({ ra, dec, date, distLy }: { ra: number; dec: number; date: Date; distLy?: number }) {
  const ev = useMemo(() => { try { return fixedObjectEvents(ra, dec, date, distLy) } catch { return null } }, [ra, dec, date, distLy])
  if (!ev) return null
  const up = ev.alt > 0
  return (
    <Section title="From Nalhati right now">
      <div className="mb-2 flex items-center gap-2 text-sm">
        <span className={`h-2 w-2 rounded-full ${up ? 'bg-aurora' : 'bg-slate-500'}`} />
        {up ? <span>Above the horizon — <b>{ev.alt.toFixed(1)}°</b> high in the <b>{compass(ev.az)}</b></span> : <span className="text-slate-400">Below the horizon ({ev.alt.toFixed(1)}°)</span>}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <Stat label="Rises" value={ev.circumpolar ? 'Always up' : ev.neverRises ? 'Never' : fmtTime(ev.rise)} />
        <Stat label="Highest" value={fmtTime(ev.transit)} sub={`${ev.transitAlt.toFixed(0)}° alt`} />
        <Stat label="Sets" value={ev.circumpolar ? '—' : ev.neverRises ? '—' : fmtTime(ev.set)} />
      </div>
      <p className="mt-1.5 text-[10px] text-slate-500">Times in IST for 24.30° N, 87.83° E. Computed locally with astronomy-engine.</p>
    </Section>
  )
}

export function StellariumButtons({ target, stellariumName }: { target: string; stellariumName?: string }) {
  const { settings } = useSettings()
  const [msg, setMsg] = useState('')
  return (
    <div className="flex flex-wrap gap-1.5">
      <a className="btn" href={stellariumWebUrl(stellariumName ?? target)} target="_blank" rel="noreferrer"><Icon name="ext" className="h-4 w-4" />Stellarium Web</a>
      <button className="btn" onClick={async () => {
        setMsg('Contacting Stellarium…')
        try { await stellariumFocus(settings.stellariumUrl, stellariumName ?? target); setMsg('Stellarium is now pointing at ' + target) }
        catch { setMsg('Stellarium desktop not reachable — enable its Remote Control plugin (see Settings).') }
      }}><Icon name="target" className="h-4 w-4" />Point Stellarium desktop</button>
      {msg && <p className="w-full text-[11px] text-slate-400">{msg}</p>}
    </div>
  )
}

function usePhotos(sel: Selection) {
  const [state, setState] = useState<{ loading: boolean; images: NasaImage[]; error?: string }>({ loading: true, images: [] })
  useEffect(() => {
    let q = '', match: string[] = []
    if (sel.type === 'dso') { q = sel.obj.nasaQuery; match = sel.obj.match }
    else if (sel.type === 'messier') { q = sel.obj.name ? `${sel.obj.name}` : `Messier ${sel.obj.id.slice(1)}`; match = [sel.obj.id.toLowerCase(), `messier ${sel.obj.id.slice(1)}`, ...(sel.obj.name ? [sel.obj.name.toLowerCase()] : [])] }
    else if (sel.type === 'body') { q = sel.name === 'Moon' ? 'Moon lunar surface' : sel.name; match = [sel.name.toLowerCase()] }
    else if (sel.type === 'star' && !sel.name.startsWith('Star (')) { q = `${sel.name} star`; match = [sel.name.toLowerCase()] }
    else if (sel.type === 'constellation') { q = `${sel.name} constellation`; match = [sel.name.toLowerCase()] }
    if (!q) { setState({ loading: false, images: [] }); return }
    let alive = true
    setState({ loading: true, images: [] })
    searchNasaImages(q).then((imgs) => alive && setState({ loading: false, images: rankForObject(imgs, match).slice(0, 9) }))
      .catch((e) => alive && setState({ loading: false, images: [], error: String(e.message ?? e) }))
    return () => { alive = false }
  }, [sel])
  return state
}

interface Props { sel: Selection; date: Date; onOpenImage: (i: NasaImage) => void; onNavigate: (v: View, s: Selection) => void; onClose: () => void; currentView: View }

export function InfoPanel({ sel, date, onOpenImage, onNavigate, onClose, currentView }: Props) {
  const rd = selectionRaDec(sel)
  const photos = usePhotos(sel)
  const body = useMemo(() => (sel.type === 'body' && sel.name !== 'Earth' ? solarBodyPosition(sel.name as SolarBody, date) : null), [sel, date])

  let typeLabel = '', summary = ''
  if (sel.type === 'dso') { typeLabel = `${sel.obj.typeLabel} · ${sel.obj.aka}`; summary = sel.obj.summary }
  else if (sel.type === 'messier') { typeLabel = `${MESSIER_TYPE[sel.obj.type] ?? 'Deep-sky object'} · ${sel.obj.ngc}`; summary = `Messier catalogue object ${sel.obj.id}${sel.obj.mag ? `, visual magnitude ${sel.obj.mag}` : ''}.` }
  else if (sel.type === 'body') { typeLabel = sel.name === 'Sun' ? 'Star' : sel.name === 'Moon' ? "Earth's natural satellite" : 'Planet'; summary = sel.name === 'Moon' ? 'Open the Moon Observatory for a detailed 3D surface built from NASA LRO imagery.' : PLANET_INFO[sel.name as keyof typeof PLANET_INFO]?.summary ?? '' }
  else if (sel.type === 'star') { typeLabel = `Star · magnitude ${sel.mag.toFixed(2)} · B−V ${sel.bv.toFixed(2)}`; summary = `Located in ${constellationOf(sel.ra, sel.dec)}.` }
  else { typeLabel = 'Constellation (IAU)'; summary = `One of the 88 modern constellations.` }

  const stelName = sel.type === 'dso' ? sel.obj.stellariumName : sel.type === 'messier' ? sel.obj.id : selectionName(sel)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-white/5 p-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold leading-tight">{selectionName(sel)}</h2>
          <p className="mt-0.5 text-xs text-slate-400">{typeLabel}</p>
        </div>
        <button onClick={onClose} className="btn !p-1.5" aria-label="Close"><Icon name="close" className="h-4 w-4" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 scroll-thin">
        {summary && <p className="mb-4 text-sm leading-relaxed text-slate-300">{summary}</p>}

        {sel.type === 'dso' && (
          <div className="mb-4 grid grid-cols-2 gap-1.5">
            <Stat label="Distance" value={sel.obj.distance} />
            <Stat label="Constellation" value={sel.obj.constellation} />
            <Stat label="Apparent size" value={sel.obj.angularSize} />
            <Stat label="Magnitude" value={sel.obj.magnitude ?? 'Faint'} />
          </div>
        )}

        {rd && (
          <div className="mb-4 grid grid-cols-2 gap-1.5">
            <Stat label="Right ascension (J2000)" value={raToHms(rd.ra)} />
            <Stat label="Declination (J2000)" value={decToDms(rd.dec)} />
          </div>
        )}
        {rd && <VisibilityBlock ra={rd.ra} dec={rd.dec} date={date} distLy={sel.type === 'dso' ? sel.obj.distanceLy : undefined} />}

        {body && (
          <Section title="From Nalhati right now">
            <div className="mb-2 text-sm">{body.alt > 0 ? <>Up — <b>{body.alt.toFixed(1)}°</b> high in the <b>{compass(body.az)}</b></> : <span className="text-slate-400">Below the horizon ({body.alt.toFixed(1)}°)</span>}</div>
            <div className="grid grid-cols-3 gap-1.5">
              <Stat label="Rises" value={fmtTime(body.rise)} /><Stat label="Highest" value={fmtTime(body.transit)} sub={`${body.transitAlt.toFixed(0)}°`} /><Stat label="Sets" value={fmtTime(body.set)} />
              <Stat label="Magnitude" value={body.mag?.toFixed(1) ?? '—'} />
              <Stat label="Distance" value={sel.type === 'body' && sel.name === 'Moon' ? `${Math.round(body.distanceAu * 149597870.7).toLocaleString()} km` : `${body.distanceAu.toFixed(3)} AU`} />
              <Stat label="RA / Dec" value={<span className="text-xs">{raToHms(body.ra).slice(0, 7)} {decToDms(body.dec)}</span>} />
            </div>
            {sel.type === 'body' && sel.name === 'Sun' && <p className="mt-2 text-xs text-amber-300">⚠ Never observe the Sun without a certified solar filter.</p>}
          </Section>
        )}

        <Section title="Real photographs · NASA Image Library">
          {photos.loading ? <Spinner label="Searching NASA archive…" /> : photos.error ? <p className="text-xs text-rose-300">Could not reach NASA: {photos.error}</p>
            : photos.images.length === 0 ? <p className="text-xs text-slate-500">No matching NASA photographs for this object.</p>
              : <div className="grid grid-cols-3 gap-1.5">{photos.images.map((i) => <NasaImageCard key={i.nasaId} img={i} compact onOpen={onOpenImage} />)}</div>}
          {photos.images.length > 0 && <p className="mt-1.5 text-[10px] text-slate-500">Archived NASA imagery — tap for telescope, date and full resolution. Not a live feed.</p>}
        </Section>

        <Section title="Explore further">
          <div className="flex flex-wrap gap-1.5">
            {sel.type === 'dso' && currentView !== 'deepspace' && <button className="btn btn-active" onClick={() => onNavigate('deepspace', sel)}><Icon name="deepspace" className="h-4 w-4" />Deep Space Observatory</button>}
            {currentView !== 'sky' && sel.type !== 'body' && <button className="btn" onClick={() => onNavigate('sky', sel)}><Icon name="sky" className="h-4 w-4" />Find in Nalhati sky</button>}
            {currentView !== 'sky' && sel.type === 'body' && sel.name !== 'Earth' && <button className="btn" onClick={() => onNavigate('sky', sel)}><Icon name="sky" className="h-4 w-4" />Find in Nalhati sky</button>}
            {sel.type === 'body' && sel.name === 'Moon' && <button className="btn btn-active" onClick={() => onNavigate('moon', sel)}><Icon name="moon" className="h-4 w-4" />Moon Observatory</button>}
            {currentView !== 'universe' && (sel.type === 'dso' || (sel.type === 'body' && sel.name !== 'Moon')) && <button className="btn" onClick={() => onNavigate('universe', sel)}><Icon name="universe" className="h-4 w-4" />Fly to in 3D</button>}
            {rd && <a className="btn" href={esaskyUrl(sel.type === 'dso' ? sel.obj.esaskyTarget : `${rd.ra.toFixed(4)} ${rd.dec.toFixed(4)}`, sel.type === 'dso' ? sel.obj.fov : 2)} target="_blank" rel="noreferrer"><Icon name="ext" className="h-4 w-4" />ESA ESASky</a>}
          </div>
          <div className="mt-2"><StellariumButtons target={selectionName(sel)} stellariumName={stelName} /></div>
        </Section>
      </div>
    </div>
  )
}
