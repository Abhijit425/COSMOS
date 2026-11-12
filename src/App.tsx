import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { InfoPanel } from './components/InfoPanel'
import { SearchBox } from './components/SearchBox'
import { Icon, ImageViewer, Spinner, useNow } from './components/ui'
import { fmtTime } from './lib/astro'
import type { NasaImage } from './lib/data'
import type { Selection, View } from './lib/selection'
import { SettingsProvider } from './lib/settings'

const UniverseView = lazy(() => import('./views/UniverseView').then((m) => ({ default: m.UniverseView })))
const MoonView = lazy(() => import('./views/MoonView').then((m) => ({ default: m.MoonView })))
const DeepSpaceView = lazy(() => import('./views/DeepSpaceView').then((m) => ({ default: m.DeepSpaceView })))
const SkyView = lazy(() => import('./views/SkyView').then((m) => ({ default: m.SkyView })))
const LiveView = lazy(() => import('./views/LiveView').then((m) => ({ default: m.LiveView })))
const SettingsView = lazy(() => import('./views/SettingsView').then((m) => ({ default: m.SettingsView })))

const NAV: { id: View; label: string; short: string }[] = [
  { id: 'universe', label: 'Interactive Universe', short: 'Universe' },
  { id: 'deepspace', label: 'Deep Space Observatory', short: 'Deep Space' },
  { id: 'moon', label: 'Moon Observatory', short: 'Moon' },
  { id: 'sky', label: 'Live Sky · Nalhati', short: 'Sky' },
  { id: 'live', label: 'Real Astronomy Data', short: 'Data' },
  { id: 'settings', label: 'Settings', short: 'Settings' },
]

const viewFromHash = (): View => {
  const h = location.hash.replace('#', '') as View
  return NAV.some((n) => n.id === h) ? h : 'universe'
}

function Shell() {
  const [view, setViewState] = useState<View>(viewFromHash)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [image, setImage] = useState<NasaImage | null>(null)
  const [isFull, setFull] = useState(false)
  const now = useNow(60000)

  useEffect(() => {
    const h = () => setViewState(viewFromHash())
    window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h)
  }, [])
  useEffect(() => {
    const f = () => setFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', f); return () => document.removeEventListener('fullscreenchange', f)
  }, [])

  const setView = useCallback((v: View) => { if (location.hash !== `#${v}`) location.hash = v; setViewState(v) }, [])
  const navigate = useCallback((v: View, s: Selection | null) => { setSelection(s); setView(v) }, [setView])

  const onSearch = (s: Selection) => {
    const canShow = (v: View) =>
      v === 'sky' ? !(s.type === 'body' && s.name === 'Earth')
        : v === 'universe' ? s.type === 'dso' || (s.type === 'body' && s.name !== 'Moon')
          : v === 'deepspace' ? s.type === 'dso' : v === 'moon' ? s.type === 'body' && s.name === 'Moon' : false
    if (canShow(view)) { setSelection(s); return }
    if (s.type === 'dso') navigate('deepspace', s)
    else if (s.type === 'body' && s.name === 'Moon') navigate('moon', s)
    else navigate('sky', s)
  }

  const toggleFull = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen() } catch { /* not allowed */ }
  }

  const showPanel = !!selection && (view === 'universe' || view === 'sky')

  return (
    <div className="fixed inset-0 flex bg-space-950 font-sans text-slate-100">
      {/* left navigation (tablet/desktop) */}
      <nav className="glass z-30 hidden w-56 shrink-0 flex-col border-y-0 border-l-0 md:flex">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <img src="./favicon.svg" alt="" className="h-9 w-9" />
          <div><div className="font-display text-lg font-bold leading-none tracking-wide">COSMOS</div><div className="text-[10px] text-slate-400">My Personal Space Observatory</div></div>
        </div>
        <div className="flex-1 space-y-0.5 px-2">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setView(n.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${view === n.id ? 'bg-nebula/15 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
              <Icon name={n.id} className={`h-5 w-5 ${view === n.id ? 'text-aurora' : ''}`} />{n.label}
            </button>
          ))}
        </div>
        <div className="space-y-1 p-4 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-aurora" />Nalhati · {fmtTime(now)} IST</div>
          <div>24.30° N · 87.83° E</div>
        </div>
      </nav>

      <main className="relative min-w-0 flex-1">
        <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center"><Spinner label="Loading observatory…" /></div>}>
          {view === 'universe' && <UniverseView date={now} selection={selection} onSelect={setSelection} />}
          {view === 'deepspace' && <DeepSpaceView date={now} selection={selection} onSelect={setSelection} onOpenImage={setImage} />}
          {view === 'moon' && <MoonView date={now} onOpenImage={setImage} />}
          {view === 'sky' && <SkyView selection={selection} onSelect={setSelection} />}
          {view === 'live' && <LiveView onOpenImage={setImage} />}
          {view === 'settings' && <SettingsView />}
        </Suspense>

        {/* top bar: search + fullscreen */}
        {view !== 'settings' && (
          <div className={`pointer-events-none absolute left-0 right-0 top-0 z-20 flex justify-end gap-2 p-2 md:p-3`}>
            <div className="pointer-events-auto flex w-full max-w-md items-start gap-2 ">
              <SearchBox onPick={onSearch} className="flex-1" />
              <button className="btn glass !p-2.5" onClick={toggleFull} aria-label="Full screen"><Icon name={isFull ? 'close' : 'full'} className="h-4 w-4" /></button>
            </div>
          </div>
        )}

        {showPanel && selection && (
          <aside className="glass absolute inset-x-0 bottom-16 z-30 max-h-[58vh] rounded-t-2xl md:inset-x-auto md:bottom-3 md:right-3 md:top-[4.25rem] md:max-h-none md:w-[21rem] md:rounded-2xl">
            <InfoPanel sel={selection} date={view === 'sky' ? new Date() : now} currentView={view} onOpenImage={setImage} onNavigate={navigate} onClose={() => setSelection(null)} />
          </aside>
        )}
      </main>

      {/* bottom tab bar (phones) */}
      <nav className="glass fixed inset-x-0 bottom-0 z-40 flex justify-around border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.map((n) => (
          <button key={n.id} onClick={() => setView(n.id)} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${view === n.id ? 'text-aurora' : 'text-slate-400'}`}>
            <Icon name={n.id} className="h-5 w-5" />{n.short}
          </button>
        ))}
      </nav>

      <ImageViewer img={image} onClose={() => setImage(null)} />
    </div>
  )
}

export default function App() {
  return <SettingsProvider><Shell /></SettingsProvider>
}
