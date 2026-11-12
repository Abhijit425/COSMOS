import { useEffect, useMemo, useRef, useState } from 'react'
import { SOLAR_BODIES } from '../lib/astro'
import { FEATURED, MESSIER, MESSIER_TYPE } from '../lib/catalog'
import { loadConstellations, loadStars, type Constellation, type StarRow } from '../lib/data'
import type { Selection } from '../lib/selection'
import { Icon } from './ui'

interface Item { label: string; sub: string; keys: string; sel: Selection; rank: number }

export function SearchBox({ onPick, className = '' }: { onPick: (s: Selection) => void; className?: string }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [cons, setCons] = useState<Constellation[]>([])
  const [stars, setStars] = useState<StarRow[]>([])
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { loadConstellations().then(setCons); loadStars('stars6.json').then(setStars) }, [])
  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  const index = useMemo<Item[]>(() => {
    const items: Item[] = []
    FEATURED.forEach((o) => items.push({ label: o.name, sub: `${o.typeLabel} · ${o.aka}`, keys: `${o.name} ${o.aka} ${o.id}`.toLowerCase(), sel: { type: 'dso', obj: o }, rank: 0 }))
    SOLAR_BODIES.forEach((b) => items.push({ label: b, sub: b === 'Sun' ? 'Star' : b === 'Moon' ? 'Natural satellite' : 'Planet', keys: b.toLowerCase(), sel: { type: 'body', name: b }, rank: 0 }))
    MESSIER.filter((m) => !FEATURED.some((f) => f.id === m.id)).forEach((m) => items.push({ label: m.name ? `${m.id} · ${m.name}` : m.id, sub: `${MESSIER_TYPE[m.type] ?? 'Deep-sky'} · ${m.ngc}`, keys: `${m.id} messier ${m.id.slice(1)} ${m.ngc} ${m.name}`.toLowerCase(), sel: { type: 'messier', obj: m }, rank: 1 }))
    cons.forEach((c) => items.push({ label: c.name, sub: 'Constellation', keys: `${c.name} ${c.id} constellation`.toLowerCase(), sel: { type: 'constellation', id: c.id, name: c.name, ra: c.label[0], dec: c.label[1] }, rank: 1 }))
    stars.filter((s) => s[4]).forEach((s) => items.push({ label: s[4]!, sub: `Star · mag ${s[2].toFixed(1)}`, keys: `${s[4]} star`.toLowerCase(), sel: { type: 'star', name: s[4]!, ra: s[0], dec: s[1], mag: s[2], bv: s[3] }, rank: 2 }))
    return items
  }, [cons, stars])

  const results = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return index.filter((i) => i.rank === 0).slice(0, 10)
    return index
      .map((i) => ({ i, s: i.label.toLowerCase().startsWith(t) ? 0 : i.keys.split(' ').some((w) => w.startsWith(t)) ? 1 : i.keys.includes(t) ? 2 : 9 }))
      .filter((x) => x.s < 9).sort((a, b) => a.s - b.s || a.i.rank - b.i.rank).slice(0, 12).map((x) => x.i)
  }, [q, index])

  const pick = (it: Item) => { onPick(it.sel); setQ(''); setOpen(false); (document.activeElement as HTMLElement)?.blur() }

  return (
    <div ref={box} className={`relative ${className}`}>
      <div className="glass flex items-center gap-2 rounded-xl px-3 py-2">
        <Icon name="search" className="h-4 w-4 text-nebula" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0) }} onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { setActive((a) => Math.min(a + 1, results.length - 1)); e.preventDefault() }
            if (e.key === 'ArrowUp') { setActive((a) => Math.max(a - 1, 0)); e.preventDefault() }
            if (e.key === 'Enter' && results[active]) pick(results[active])
            if (e.key === 'Escape') setOpen(false)
          }}
          placeholder="Search planets, stars, nebulae, galaxies, Messier…" className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none" />
      </div>
      {open && results.length > 0 && (
        <div className="glass absolute left-0 right-0 top-full z-40 mt-1 max-h-[60vh] overflow-y-auto rounded-xl p-1 scroll-thin">
          {results.map((r, i) => (
            <button key={r.label + r.sub} onMouseEnter={() => setActive(i)} onClick={() => pick(r)}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left ${i === active ? 'bg-nebula/15' : ''}`}>
              <span className="truncate text-sm text-slate-100">{r.label}</span><span className="shrink-0 text-[11px] text-slate-400">{r.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
