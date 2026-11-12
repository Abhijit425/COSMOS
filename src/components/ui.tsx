import { useEffect, useState, type ReactNode } from 'react'
import { fmtDate } from '../lib/astro'
import { recencyLabel, type NasaImage } from '../lib/data'

export function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const id = setInterval(() => setNow(new Date()), intervalMs); return () => clearInterval(id) }, [intervalMs])
  return now
}

const paths: Record<string, string> = {
  universe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0c2.5 2.7 3.8 5.7 3.8 9S14.5 18.3 12 21m0-18C9.5 5.7 8.2 8.7 8.2 12s1.3 6.3 3.8 9M3.5 9h17M3.5 15h17',
  deepspace: 'M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M4 12c0-3 3.6-5.5 8-5.5S20 9 20 12s-3.6 5.5-8 5.5S4 15 4 12Zm3.5-6.5c3-1.8 7.8 1 10.6 5.8M16.5 18.5c-3 1.8-7.8-1-10.6-5.8',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z',
  sky: 'M3 18h18M5 18a7 7 0 0 1 14 0M12 4v2M5.6 7.6 7 9M18.4 7.6 17 9M8 14l.01 0M12 12l.01 0M16 14.5l.01 0',
  live: 'M4 6h16v12H4zM4 15l4-4 4 4 3-3 5 5M15.5 9.5h.01',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2.2-1.3L14.4 3h-4l-.4 2.4a7.6 7.6 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1c.7.5 1.4 1 2.2 1.3l.4 2.4h4l.4-2.4c.8-.3 1.5-.8 2.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.3Z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.2-4.2',
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', reset: 'M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4',
  full: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', close: 'M6 6l12 12M18 6 6 18', ext: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  layers: 'M12 3 3 8l9 5 9-5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5', info: 'M12 8h.01M11 12h1v5h1M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
  refresh: 'M20 11a8 8 0 0 0-14.8-4M4 4v4h4M4 13a8 8 0 0 0 14.8 4M20 20v-4h-4', target: 'M12 2v4M12 18v4M2 12h4M18 12h4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  cloud: 'M7 18a4 4 0 0 1-.6-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1 0 9H7Z', menu: 'M4 7h16M4 12h16M4 17h16',
}
export function Icon({ name, className = 'h-5 w-5' }: { name: keyof typeof paths | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={paths[name] ?? paths.info} />
    </svg>
  )
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-nebula/80">{title}</h3>{right}
      </div>
      {children}
    </section>
  )
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-lg bg-white/[0.035] px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className="text-sm font-semibold text-slate-100">{value}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-nebula/30 border-t-nebula" />{label}
    </div>
  )
}

export function ProvenanceBadge({ date }: { date: Date }) {
  const r = recencyLabel(date)
  return (
    <span className={`badge ${r.tone === 'recent' ? 'bg-aurora/15 text-aurora' : 'bg-nebula/12 text-nebula'}`} title="Images from NASA's library are archived captures — not live camera feeds">
      {r.label} · {fmtDate(date)}
    </span>
  )
}

/** Progressive image: thumbnail first, then the larger rendition, falling back gracefully */
export function NasaImg({ img, large = false, className = '' }: { img: NasaImage; large?: boolean; className?: string }) {
  const [src, setSrc] = useState(img.thumb)
  useEffect(() => {
    setSrc(img.thumb)
    if (!large) return
    const im = new Image(); im.src = img.medium
    im.onload = () => setSrc(img.medium)
  }, [img, large])
  return <img src={src} alt={img.title} loading="lazy" referrerPolicy="no-referrer" className={className} />
}

export function NasaImageCard({ img, onOpen, compact = false }: { img: NasaImage; onOpen: (i: NasaImage) => void; compact?: boolean }) {
  return (
    <button onClick={() => onOpen(img)} className="group overflow-hidden rounded-xl border border-white/5 bg-white/[0.03] text-left transition hover:border-nebula/40">
      <div className={`${compact ? 'aspect-square' : 'aspect-[4/3]'} overflow-hidden bg-black`}>
        <NasaImg img={img} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      </div>
      {!compact && (
        <div className="space-y-1 p-2">
          <div className="line-clamp-2 text-xs font-medium text-slate-100">{img.title}</div>
          <div className="text-[10px] text-slate-400">{img.telescope}{img.center ? ` · ${img.center}` : ''}</div>
          <ProvenanceBadge date={img.dateCreated} />
        </div>
      )}
    </button>
  )
}

export function ImageViewer({ img, onClose }: { img: NasaImage | null; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [onClose])
  if (!img) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/92 backdrop-blur" onClick={onClose}>
      <div className="flex items-center justify-between gap-3 p-3" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0">
          <div className="truncate font-display text-base font-semibold">{img.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <ProvenanceBadge date={img.dateCreated} /><span>Telescope / source: <b className="text-slate-200">{img.telescope}</b></span>
            {img.center && <span>NASA center: {img.center}</span>}<span>ID: {img.nasaId}</span>
          </div>
        </div>
        <button className="btn shrink-0" onClick={onClose}><Icon name="close" className="h-4 w-4" /></button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-2" onClick={(e) => e.stopPropagation()}>
        <NasaImg img={img} large className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
      </div>
      <div className="max-h-[28vh] overflow-y-auto p-3 text-xs leading-relaxed text-slate-300 scroll-thin" onClick={(e) => e.stopPropagation()}>
        <p className="mb-2 text-[11px] text-amber-200/80">Archived photograph from the NASA Image and Video Library — this is not a live camera feed. Date shown is NASA's recorded creation/capture date.</p>
        {img.description.slice(0, 1200)}{img.description.length > 1200 ? '…' : ''}
        <div className="mt-2 flex gap-2">
          <a className="btn" href={img.pageUrl} target="_blank" rel="noreferrer"><Icon name="ext" className="h-4 w-4" /> View on images.nasa.gov</a>
          <a className="btn" href={img.original} target="_blank" rel="noreferrer">Full resolution</a>
        </div>
      </div>
    </div>
  )
}
