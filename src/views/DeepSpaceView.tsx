import { useEffect, useState } from 'react'
import { StellariumButtons, VisibilityBlock } from '../components/InfoPanel'
import { Icon, NasaImageCard, NasaImg, ProvenanceBadge, Section, Spinner, Stat } from '../components/ui'
import { FEATURED, decToDms, raToHms, type DeepSkyObject } from '../lib/catalog'
import { SURVEYS, esaskyUrl, rankForObject, searchNasaImages, surveyCutoutUrl, type NasaImage } from '../lib/data'
import type { Selection } from '../lib/selection'

function useObjectImages(o: DeepSkyObject) {
  const [s, setS] = useState<{ loading: boolean; images: NasaImage[]; error?: string }>({ loading: true, images: [] })
  useEffect(() => {
    let alive = true; setS({ loading: true, images: [] })
    searchNasaImages(o.nasaQuery, { pageSize: 60 }).then((imgs) => alive && setS({ loading: false, images: rankForObject(imgs, o.match) }))
      .catch((e) => alive && setS({ loading: false, images: [], error: e.message }))
    return () => { alive = false }
  }, [o])
  return s
}

function Thumb({ o }: { o: DeepSkyObject }) {
  const [img, setImg] = useState<NasaImage | null>(null)
  useEffect(() => { searchNasaImages(o.nasaQuery, { pageSize: 60 }).then((i) => setImg(rankForObject(i, o.match)[0] ?? null)).catch(() => {}) }, [o])
  return img ? <img src={img.thumb} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <div className="h-full w-full" style={{ background: `radial-gradient(circle, ${o.color}55, transparent 70%)` }} />
}

export function DeepSpaceView({ date, selection, onSelect, onOpenImage }: { date: Date; selection: Selection | null; onSelect: (s: Selection) => void; onOpenImage: (i: NasaImage) => void }) {
  const obj = selection?.type === 'dso' ? selection.obj : FEATURED[0]
  const { loading, images, error } = useObjectImages(obj)
  const [heroIdx, setHeroIdx] = useState(0)
  const [survey, setSurvey] = useState(SURVEYS[0])
  const [surveyState, setSurveyState] = useState<'loading' | 'ok' | 'err'>('loading')
  useEffect(() => setHeroIdx(0), [obj])
  useEffect(() => setSurveyState('loading'), [obj, survey])
  const hero = images[heroIdx]

  return (
    <div className="absolute inset-0 overflow-y-auto scroll-thin">
      <div className="mx-auto max-w-7xl px-3 pb-28 pt-16 md:px-6 md:pb-8">
        <h1 className="font-display text-2xl font-bold">Deep Space Observatory</h1>
        <p className="mb-3 text-xs text-slate-400">Real photographs from NASA's Image and Video Library and sky-survey data served through the HiPS service used by ESA ESASky. Every image is archival — dates and telescopes are shown.</p>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scroll-thin">
          {FEATURED.map((o) => (
            <button key={o.id} onClick={() => onSelect({ type: 'dso', obj: o })}
              className={`group relative h-24 w-32 shrink-0 overflow-hidden rounded-xl border text-left transition ${o.id === obj.id ? 'border-aurora/70 ring-2 ring-aurora/30' : 'border-white/10 hover:border-nebula/50'}`}>
              <Thumb o={o} />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                <div className="text-[11px] font-semibold leading-tight">{o.name}</div><div className="text-[9px] text-slate-400">{o.aka.split('·')[0]}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <div className="glass relative overflow-hidden rounded-2xl">
              <div className="flex aspect-[4/3] items-center justify-center bg-black md:aspect-[16/10]">
                {loading ? <Spinner label="Fetching NASA photographs…" /> : error ? <p className="p-6 text-sm text-rose-300">NASA Image API unreachable: {error}</p>
                  : hero ? <button className="h-full w-full" onClick={() => onOpenImage(hero)}><NasaImg key={hero.nasaId} img={hero} large className="h-full w-full object-contain" /></button>
                    : <p className="p-6 text-sm text-slate-400">No matching NASA photograph found.</p>}
              </div>
              {hero && (
                <div className="space-y-1.5 border-t border-white/5 p-3">
                  <div className="text-sm font-semibold">{hero.title}</div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <ProvenanceBadge date={hero.dateCreated} />
                    <span>Telescope: <b className="text-slate-200">{hero.telescope}</b></span>
                    {hero.center && <span>NASA center: {hero.center}</span>}
                    <button className="ml-auto text-nebula hover:underline" onClick={() => onOpenImage(hero)}>Details & full resolution →</button>
                  </div>
                  <p className="line-clamp-3 text-xs text-slate-400">{hero.description}</p>
                </div>
              )}
            </div>

            {images.length > 1 && (
              <Section title={`More NASA photographs (${images.length})`}>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {images.slice(0, 16).map((im, i) => (
                    <div key={im.nasaId} className={i === heroIdx ? 'rounded-xl ring-2 ring-aurora/60' : ''} onDoubleClick={() => onOpenImage(im)}>
                      <NasaImageCard img={im} onOpen={() => setHeroIdx(i)} />
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>

          <div className="space-y-4">
            <div className="glass rounded-2xl p-4">
              <h2 className="font-display text-2xl font-bold" style={{ color: obj.color }}>{obj.name}</h2>
              <p className="text-xs text-slate-400">{obj.typeLabel} · {obj.aka}</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{obj.summary}</p>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                <Stat label="Distance" value={obj.distance} /><Stat label="Constellation" value={obj.constellation} />
                <Stat label="Apparent size" value={obj.angularSize} /><Stat label="Magnitude" value={obj.magnitude ?? 'Faint'} />
                <Stat label="RA (J2000)" value={raToHms(obj.ra)} /><Stat label="Dec (J2000)" value={decToDms(obj.dec)} />
              </div>
              <ul className="mt-3 space-y-1 text-xs text-slate-300">{obj.facts.map((f) => <li key={f} className="flex gap-2"><span className="text-aurora">✦</span>{f}</li>)}</ul>
            </div>

            <div className="glass rounded-2xl p-4">
              <VisibilityBlock ra={obj.ra} dec={obj.dec} date={date} distLy={obj.distanceLy} />
            </div>

            <div className="glass rounded-2xl p-4">
              <Section title="Sky survey view · ESA ESASky / CDS HiPS" right={<a className="text-[11px] text-nebula hover:underline" href={esaskyUrl(obj.esaskyTarget, obj.fov)} target="_blank" rel="noreferrer">Open in ESASky ↗</a>}>
                <select value={survey.id} onChange={(e) => setSurvey(SURVEYS.find((s) => s.id === e.target.value)!)} className="mb-2 w-full rounded-lg border border-white/10 bg-space-800 px-2 py-1.5 text-xs">
                  {SURVEYS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <div className="relative aspect-square overflow-hidden rounded-xl bg-black">
                  <img key={survey.id + obj.id} src={surveyCutoutUrl(survey.hips, obj.ra, obj.dec, obj.fov)} alt={`${obj.name} – ${survey.label}`} referrerPolicy="no-referrer"
                    onLoad={() => setSurveyState('ok')} onError={() => setSurveyState('err')} className="h-full w-full object-cover" />
                  {surveyState === 'loading' && <div className="absolute inset-0 flex items-center justify-center"><Spinner label="Rendering survey cutout…" /></div>}
                  {surveyState === 'err' && <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-slate-400">This survey has no coverage here or is temporarily unavailable — try another.</div>}
                  <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] text-slate-300">FOV {obj.fov}° · real survey pixels</div>
                </div>
                <p className="mt-1.5 text-[10px] text-slate-500"><span className="badge bg-nebula/12 text-nebula">Archival survey</span> {survey.note}. Generated on demand by hips2fits (CDS Strasbourg).</p>
              </Section>
            </div>

            <div className="glass rounded-2xl p-4">
              <Section title="Stellarium"><StellariumButtons target={obj.name} stellariumName={obj.stellariumName} /></Section>
              <a className="btn mt-1" href={`https://images.nasa.gov/search?q=${encodeURIComponent(obj.nasaQuery)}&media=image`} target="_blank" rel="noreferrer"><Icon name="ext" className="h-4 w-4" />Browse all on images.nasa.gov</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
