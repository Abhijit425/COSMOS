import { useState } from 'react'
import { Section } from '../components/ui'
import { NALHATI } from '../lib/astro'
import { stellariumSetNalhati } from '../lib/data'
import { useSettings, type Quality } from '../lib/settings'

export function SettingsView() {
  const { settings, update } = useSettings()
  const [msg, setMsg] = useState('')
  const gl = (() => {
    try { const c = document.createElement('canvas').getContext('webgl2'); const d = c?.getExtension('WEBGL_debug_renderer_info'); return d ? c!.getParameter(d.UNMASKED_RENDERER_WEBGL) : c ? 'WebGL 2 available' : 'WebGL 2 unavailable' } catch { return 'unknown' }
  })()
  return (
    <div className="absolute inset-0 overflow-y-auto scroll-thin">
      <div className="mx-auto max-w-2xl px-4 pb-28 pt-16 md:pb-8">
        <h1 className="mb-4 font-display text-2xl font-bold">Settings</h1>

        <div className="glass mb-4 rounded-2xl p-4">
          <Section title="Graphics quality">
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as Quality[]).map((q) => (
                <button key={q} onClick={() => update({ quality: q })} className={`btn flex-col !items-start !py-2 ${settings.quality === q ? 'btn-active' : ''}`}>
                  <span className="font-semibold capitalize">{q}</span>
                  <span className="text-[10px] text-slate-400">{q === 'low' ? '1k Moon · 5k stars · no AA' : q === 'medium' ? '2k Moon · 5k stars · tablets' : '4k Moon · 41k stars · laptops'}</span>
                </button>
              ))}
            </div>
            <label className="mt-3 flex items-center justify-between gap-3 text-sm">
              <span>Battery saver<span className="block text-[11px] text-slate-400">Only render 3D frames when you interact (planet spin pauses). Recommended on Android.</span></span>
              <input type="checkbox" checked={settings.powerSaver} onChange={(e) => update({ powerSaver: e.target.checked })} className="h-5 w-5 accent-[#6ef2d0]" />
            </label>
            <p className="mt-2 text-[11px] text-slate-500">GPU: {String(gl)}. High-resolution textures load only when you open the view that needs them; 3D views unmount when hidden so the GPU idles.</p>
          </Section>
        </div>

        <div className="glass mb-4 rounded-2xl p-4">
          <Section title="Observing location">
            <p className="text-sm">{NALHATI.name}</p>
            <p className="text-xs text-slate-400">{NALHATI.lat}° N, {NALHATI.lon}° E, ~{NALHATI.elev} m · Time zone IST (UTC+5:30)</p>
          </Section>
        </div>

        <div className="glass mb-4 rounded-2xl p-4">
          <Section title="NASA API key (optional, free)">
            <input value={settings.nasaApiKey} onChange={(e) => update({ nasaApiKey: e.target.value.trim() || 'DEMO_KEY' })} className="w-full rounded-lg border border-white/10 bg-space-800 px-3 py-2 font-mono text-sm" />
            <p className="mt-1 text-[11px] text-slate-400">Used only for Astronomy Picture of the Day. DEMO_KEY allows ~30 requests/hour. Get a free personal key in a minute at <a className="text-nebula underline" href="https://api.nasa.gov" target="_blank" rel="noreferrer">api.nasa.gov</a>. The NASA Image Library needs no key.</p>
          </Section>
        </div>

        <div className="glass mb-4 rounded-2xl p-4">
          <Section title="Stellarium desktop integration">
            <input value={settings.stellariumUrl} onChange={(e) => update({ stellariumUrl: e.target.value.trim() })} className="w-full rounded-lg border border-white/10 bg-space-800 px-3 py-2 font-mono text-sm" />
            <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-[11px] text-slate-400">
              <li>Install free Stellarium from stellarium.org on your laptop.</li>
              <li>Configuration (F2) → Plugins → Remote Control → "Load at startup", restart, then enable the server (port 8090) and tick "Enable CORS" with origin *.</li>
              <li>Use "Point Stellarium desktop" on any object in COSMOS. Works when COSMOS runs on the same laptop (or use the laptop's LAN IP from your phone).</li>
            </ol>
            <button className="btn mt-2" onClick={async () => { try { await stellariumSetNalhati(settings.stellariumUrl); setMsg('Stellarium location set to Nalhati ✓') } catch { setMsg('Could not reach Stellarium at that address.') } }}>Set Stellarium location to Nalhati</button>
            {msg && <p className="mt-1 text-[11px] text-slate-300">{msg}</p>}
          </Section>
        </div>

        <div className="glass rounded-2xl p-4 text-[11px] leading-relaxed text-slate-400">
          <Section title="Data sources & credits">
            <ul className="list-disc space-y-1 pl-4">
              <li>Photographs: NASA Image and Video Library (images-api.nasa.gov) and NASA APOD (api.nasa.gov). NASA imagery is generally not copyrighted; APOD items may carry the photographer's copyright, shown with the image.</li>
              <li>Sky surveys: CDS Strasbourg hips2fits / HiPS (DSS2, 2MASS, Pan-STARRS, ESA Herschel & XMM-Newton HiPS from ESA ESAC) — the same HiPS ecosystem ESA ESASky uses.</li>
              <li>Moon: NASA SVS CGI Moon Kit (LRO LROC WAC colour mosaic, LOLA elevation).</li>
              <li>Planet textures: Planet Pixel Emporium (James Hastings-Trew) via threex.planets; Earth: NASA Blue Marble via three.js.</li>
              <li>Stars & constellations: d3-celestial catalogue (Hipparcos/Yale BSC-derived) by Olaf Frohn.</li>
              <li>Ephemerides: astronomy-engine by Don Cross (MIT). Weather: Open-Meteo (CC BY 4.0).</li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  )
}
