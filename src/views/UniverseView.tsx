import { useRef } from 'react'
import { Icon } from '../components/ui'
import { FEATURED } from '../lib/catalog'
import { selectionKey, type Selection } from '../lib/selection'
import { useSettings } from '../lib/settings'
import { UniverseScene, type UniverseHandle } from '../three/UniverseScene'

export function UniverseView({ date, selection, onSelect }: { date: Date; selection: Selection | null; onSelect: (s: Selection) => void }) {
  const ref = useRef<UniverseHandle>(null)
  const { settings, update } = useSettings()
  return (
    <div className="absolute inset-0">
      <UniverseScene ref={ref} date={date} selectedKey={selectionKey(selection)} showConstellations={settings.showConstellations} labels={settings.showLabels}
        onSelectDso={(o) => onSelect({ type: 'dso', obj: o })} onSelectBody={(n) => onSelect({ type: 'body', name: n })} />
      <div className="pointer-events-none absolute left-3 top-16 md:top-3 max-w-xs md:left-4">
        <h1 className="font-display text-lg font-bold tracking-tight text-slate-100 drop-shadow">Interactive Universe</h1>
        <p className="text-[11px] leading-snug text-slate-400">Planets at their real positions for {date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} (distances compressed). {settings.quality === 'high' ? '41,000' : '5,000'} catalogue stars, Milky Way along the true galactic plane, deep-sky objects at their real sky coordinates.</p>
      </div>
      <div className={`absolute bottom-24 right-3 flex flex-col gap-1.5 md:bottom-4 ${selection ? 'md:right-[22.5rem]' : ''}`}>
        <button className="btn glass !p-2.5" onClick={() => ref.current?.zoom(0.6)} aria-label="Zoom in"><Icon name="plus" /></button>
        <button className="btn glass !p-2.5" onClick={() => ref.current?.zoom(1.6)} aria-label="Zoom out"><Icon name="minus" /></button>
        <button className="btn glass !p-2.5" onClick={() => ref.current?.reset()} aria-label="Reset view"><Icon name="reset" /></button>
      </div>
      <div className={`absolute bottom-24 left-3 flex max-w-[calc(100%-5rem)] flex-wrap gap-1.5 md:bottom-4 ${selection ? 'md:max-w-[calc(100%-27rem)]' : ''}`}>
        <button className={`btn glass ${settings.showConstellations ? 'btn-active' : ''}`} onClick={() => update({ showConstellations: !settings.showConstellations })}>Constellations</button>
        <button className={`btn glass ${settings.showLabels ? 'btn-active' : ''}`} onClick={() => update({ showLabels: !settings.showLabels })}>Labels</button>
        {FEATURED.slice(0, 8).map((o) => (
          <button key={o.id} className={`btn glass hidden lg:inline-flex ${selectionKey(selection) === o.id ? 'btn-active' : ''}`} onClick={() => onSelect({ type: 'dso', obj: o })}>{o.name.replace(' Galaxy', '').replace(' Nebula', '')}</button>
        ))}
      </div>
    </div>
  )
}
