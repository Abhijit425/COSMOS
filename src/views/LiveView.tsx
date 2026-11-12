import { useCallback, useEffect, useState } from 'react'
import { Icon, NasaImageCard, Section, Spinner } from '../components/ui'
import { fmtTime } from '../lib/astro'
import { fetchApod, searchNasaImages, type Apod, type NasaImage } from '../lib/data'
import { useSettings } from '../lib/settings'

const REFRESH_MS = 30 * 60e3
const FEEDS = [
  { id: 'webb', label: 'James Webb', q: 'Webb telescope' },
  { id: 'hubble', label: 'Hubble', q: 'Hubble' },
  { id: 'chandra', label: 'Chandra', q: 'Chandra' },
  { id: 'planetary', label: 'Planetary', q: 'Jupiter Saturn Mars planetary' },
  { id: 'moon', label: 'Moon', q: 'moon lunar' },
]

export function LiveView({ onOpenImage }: { onOpenImage: (i: NasaImage) => void }) {
  const { settings } = useSettings()
  const [apod, setApod] = useState<Apod | null>(null)
  const [apodErr, setApodErr] = useState('')
  const [feed, setFeed] = useState(FEEDS[0])
  const [latest, setLatest] = useState<NasaImage[] | null>(null)
  const [latestErr, setLatestErr] = useState('')
  const [updated, setUpdated] = useState<Date | null>(null)
  const [nextIn, setNextIn] = useState(REFRESH_MS)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NasaImage[] | null>(null)
  const [searching, setSearching] = useState(false)

  const loadLatest = useCallback(async () => {
    setLatestErr('')
    try {
      const y = new Date().getFullYear()
      let imgs = await searchNasaImages(feed.q, { yearStart: y, pageSize: 100 })
      if (imgs.length < 6) imgs = await searchNasaImages(feed.q, { yearStart: y - 1, pageSize: 100 })
      imgs = [...imgs].sort((a, b) => b.dateCreated.getTime() - a.dateCreated.getTime())
      setLatest(imgs.slice(0, 24)); setUpdated(new Date()); setNextIn(REFRESH_MS)
    } catch (e) { setLatestErr((e as Error).message) }
  }, [feed])

  useEffect(() => { setLatest(null); loadLatest() }, [loadLatest])
  useEffect(() => {
    const id = setInterval(() => setNextIn((n) => { if (n <= 1000) { loadLatest(); return REFRESH_MS } return n - 1000 }), 1000)
    return () => clearInterval(id)
  }, [loadLatest])

  useEffect(() => {
    const load = () => fetchApod(settings.nasaApiKey).then((a) => { setApod(a); setApodErr('') }).catch((e) => setApodErr(e.message))
    load(); const id = setInterval(load, 60 * 60e3); return () => clearInterval(id)
  }, [settings.nasaApiKey])

  const search = async (e: React.FormEvent) => {
    e.preventDefault(); if (!query.trim()) return
    setSearching(true)
    try { setResults(await searchNasaImages(query.trim(), { pageSize: 60 })) } catch { setResults([]) } finally { setSearching(false) }
  }

  const mm = Math.floor(nextIn / 60000), ss = Math.floor((nextIn % 60000) / 1000)

  return (
    <div className="absolute inset-0 overflow-y-auto scroll-thin">
      <div className="mx-auto max-w-7xl px-3 pb-28 pt-16 md:px-6 md:pb-8">
        <h1 className="font-display text-2xl font-bold">Real Astronomy Data</h1>
        <p className="mb-4 text-xs text-slate-400">Live connections to free NASA services. Images are archived observations with their real capture/release dates — no feed here is a live telescope camera.</p>

        <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <div className="glass overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-nebula/80">NASA Astronomy Picture of the Day</span>
              {apod && <span className="badge bg-aurora/15 text-aurora">Today's pick · {apod.date}</span>}
            </div>
            {apodErr ? <p className="p-4 text-sm text-rose-300">{apodErr}</p> : !apod ? <div className="p-6"><Spinner label="Loading APOD…" /></div> : (
              <div>
                {apod.media_type === 'image'
                  ? <a href={apod.hdurl ?? apod.url} target="_blank" rel="noreferrer"><img src={apod.url} alt={apod.title} referrerPolicy="no-referrer" className="max-h-[60vh] w-full bg-black object-contain" /></a>
                  : apod.thumbnail_url ? <a href={apod.url} target="_blank" rel="noreferrer"><img src={apod.thumbnail_url} alt={apod.title} className="w-full" /></a> : <a className="btn m-4" href={apod.url} target="_blank" rel="noreferrer">Watch today's video ↗</a>}
                <div className="p-4">
                  <h2 className="font-display text-lg font-bold">{apod.title}</h2>
                  {apod.copyright && <p className="text-[11px] text-slate-400">Image credit & copyright: {apod.copyright.trim()}</p>}
                  <p className="mt-2 line-clamp-[8] text-xs leading-relaxed text-slate-300">{apod.explanation}</p>
                  <p className="mt-2 text-[10px] text-amber-200/70">APOD is selected daily by NASA editors; the photo itself may have been taken at any time. Re-checked every hour.</p>
                </div>
              </div>
            )}
          </div>

          <div className="glass rounded-2xl p-4">
            <Section title="Latest NASA releases" right={<button className="btn !px-2 !py-1 !text-[11px]" onClick={loadLatest}><Icon name="refresh" className="h-3.5 w-3.5" />Refresh</button>}>
              <div className="mb-2 flex flex-wrap gap-1">
                {FEEDS.map((f) => <button key={f.id} className={`btn !px-2 !py-1 !text-[11px] ${feed.id === f.id ? 'btn-active' : ''}`} onClick={() => setFeed(f)}>{f.label}</button>)}
              </div>
              <p className="mb-2 text-[10px] text-slate-500">Newest items in NASA's library (sorted by capture/creation date){updated && <> · fetched {fmtTime(updated)} · auto-refresh in {mm}:{String(ss).padStart(2, '0')}</>}</p>
              {latestErr ? <p className="text-xs text-rose-300">{latestErr}</p> : !latest ? <Spinner label="Querying NASA…" /> : (
                <div className="grid grid-cols-2 gap-2">{latest.slice(0, 8).map((i) => <NasaImageCard key={i.nasaId} img={i} onOpen={onOpenImage} />)}</div>
              )}
            </Section>
          </div>
        </div>

        <div className="glass mt-4 rounded-2xl p-4">
          <Section title="Search the NASA Image and Video Library">
            <form onSubmit={search} className="mb-3 flex gap-2">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Carina Nebula, Saturn rings, Ring Nebula, Apollo 15…" className="flex-1 rounded-lg border border-white/10 bg-space-800 px-3 py-2 text-sm focus:border-nebula/50 focus:outline-none" />
              <button className="btn btn-active">Search</button>
            </form>
            {searching ? <Spinner label="Searching…" /> : results && (results.length === 0 ? <p className="text-xs text-slate-500">No images found.</p> : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{results.slice(0, 36).map((i) => <NasaImageCard key={i.nasaId} img={i} onOpen={onOpenImage} />)}</div>
            ))}
          </Section>
        </div>

        {latest && latest.length > 8 && (
          <div className="glass mt-4 rounded-2xl p-4">
            <Section title={`More recent ${feed.label} imagery`}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{latest.slice(8).map((i) => <NasaImageCard key={i.nasaId} img={i} onOpen={onOpenImage} />)}</div>
            </Section>
          </div>
        )}
      </div>
    </div>
  )
}
