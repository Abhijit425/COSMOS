import { NALHATI } from './astro'

/* ---------------- NASA Image and Video Library (images-api.nasa.gov, free, no key) ---------------- */

export interface NasaImage {
  nasaId: string
  title: string
  description: string
  dateCreated: Date
  center: string
  photographer: string
  keywords: string[]
  thumb: string
  medium: string
  original: string
  telescope: string
  pageUrl: string
}

const TELESCOPES: [RegExp, string][] = [
  [/\bwebb\b|\bjwst\b|nircam|miri\b/i, 'James Webb Space Telescope'],
  [/\bhubble\b|\bhst\b|wfc3|acs\b|wfpc/i, 'Hubble Space Telescope'],
  [/\bchandra\b/i, 'Chandra X-ray Observatory'],
  [/\bspitzer\b/i, 'Spitzer Space Telescope'],
  [/\bgalex\b/i, 'GALEX'],
  [/\bwise\b|\bneowise\b/i, 'WISE'],
  [/\bherschel\b/i, 'ESA Herschel'],
  [/\bplanck\b/i, 'ESA Planck'],
  [/\bnustar\b/i, 'NuSTAR'],
  [/\bixpe\b/i, 'IXPE'],
  [/\bfermi\b/i, 'Fermi'],
  [/\bswift\b/i, 'Swift'],
  [/\blro\b|lunar reconnaissance orbiter|lroc/i, 'Lunar Reconnaissance Orbiter'],
  [/\bapollo\b/i, 'Apollo mission camera'],
  [/\bvery large telescope\b|\bvlt\b/i, 'ESO Very Large Telescope'],
  [/\bkitt peak\b|\bnoirlab\b/i, 'Kitt Peak / NOIRLab'],
]

export function detectTelescope(text: string): string {
  for (const [re, name] of TELESCOPES) if (re.test(text)) return name
  return 'Not stated in NASA metadata'
}

const cache = new Map<string, Promise<NasaImage[]>>()

export function searchNasaImages(query: string, opts: { yearStart?: number; pageSize?: number } = {}): Promise<NasaImage[]> {
  const params = new URLSearchParams({ q: query, media_type: 'image', page_size: String(opts.pageSize ?? 40) })
  if (opts.yearStart) params.set('year_start', String(opts.yearStart))
  const url = `https://images-api.nasa.gov/search?${params}`
  if (!cache.has(url)) {
    const p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`NASA Image API ${r.status}`)
        return r.json()
      })
      .then((j) => {
        const items = (j?.collection?.items ?? []) as any[]
        return items
          .filter((it) => it.data?.[0] && it.links?.[0]?.href)
          .map((it): NasaImage => {
            const d = it.data[0]
            const thumb: string = it.links.find((l: any) => l.rel === 'preview')?.href ?? it.links[0].href
            const base = thumb.replace(/~thumb\.(jpg|png)$/i, '')
            const text = `${d.title} ${d.description ?? ''} ${(d.keywords ?? []).join(' ')} ${d.secondary_creator ?? ''}`
            return {
              nasaId: d.nasa_id,
              title: d.title ?? 'Untitled',
              description: stripHtml(d.description ?? ''),
              dateCreated: new Date(d.date_created),
              center: d.center ?? '',
              photographer: d.photographer ?? d.secondary_creator ?? '',
              keywords: d.keywords ?? [],
              thumb: thumb.replace(/^http:/, 'https:'),
              medium: `${base}~medium.jpg`.replace(/^http:/, 'https:'),
              original: `${base}~orig.jpg`.replace(/^http:/, 'https:'),
              telescope: detectTelescope(text),
              pageUrl: `https://images.nasa.gov/details/${encodeURIComponent(d.nasa_id)}`,
            }
          })
      })
    p.catch(() => cache.delete(url))
    cache.set(url, p)
  }
  return cache.get(url)!
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
}

/** Ranks results: must mention one of the match words, then prefer space-telescope imagery and recent captures */
export function rankForObject(images: NasaImage[], match: string[]) {
  const scored = images
    .map((img) => {
      const hay = ` ${img.title} ${img.keywords.join(' ')} `.toLowerCase()
      const hits = match.filter((m) => hay.includes(m.toLowerCase())).length
      let score = hits * 10
      if (/hubble|webb/i.test(img.telescope)) score += 6
      if (/chandra|spitzer|herschel/i.test(img.telescope)) score += 3
      if (/poster|logo|artist|illustration|concept|model|animation|graphic/i.test(img.title)) score -= 12
      if (/team|meeting|award|workshop|employee/i.test(img.title)) score -= 20
      return { img, score, hits }
    })
    .filter((s) => s.hits > 0)
  scored.sort((a, b) => b.score - a.score)
  return scored.map((s) => s.img)
}

/** Archival vs recent label — every library image is an archived capture, never a live feed */
export function recencyLabel(d: Date) {
  const days = (Date.now() - d.getTime()) / 86400e3
  if (days < 45) return { label: 'Recently released', tone: 'recent' as const }
  return { label: 'Archival image', tone: 'archival' as const }
}

/* ---------------- NASA APOD (api.nasa.gov, free key; DEMO_KEY works with low rate limits) ---------------- */

export interface Apod {
  date: string; title: string; explanation: string; url: string; hdurl?: string; media_type: string; copyright?: string; thumbnail_url?: string
}

export async function fetchApod(apiKey: string): Promise<Apod> {
  const r = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(apiKey || 'DEMO_KEY')}&thumbs=true`)
  if (!r.ok) throw new Error(r.status === 429 ? 'APOD rate limit reached (DEMO_KEY). Add your free api.nasa.gov key in Settings.' : `APOD error ${r.status}`)
  return r.json()
}

/* ---------------- Sky survey cutouts (CDS hips2fits, the HiPS service behind ESA ESASky & Aladin) ---------------- */

export interface Survey { id: string; label: string; hips: string; note: string }
export const SURVEYS: Survey[] = [
  { id: 'dss2', label: 'DSS2 colour (optical)', hips: 'CDS/P/DSS2/color', note: 'Digitized Sky Survey — Palomar/UK Schmidt photographic plates, 1980s–1990s' },
  { id: 'panstarrs', label: 'Pan-STARRS DR1 (optical)', hips: 'CDS/P/PanSTARRS/DR1/color-z-zg-g', note: 'Pan-STARRS1 3π survey, Hawaiʻi, 2010–2014 (north of −30° only)' },
  { id: '2mass', label: '2MASS (near-infrared)', hips: 'CDS/P/2MASS/color', note: 'Two Micron All Sky Survey, 1997–2001' },
  { id: 'herschel', label: 'ESA Herschel PACS (far-IR)', hips: 'ESAVO/P/HERSCHEL/PACS-color', note: 'ESA Herschel Space Observatory, 2009–2013 (partial sky coverage)' },
  { id: 'xmm', label: 'ESA XMM-Newton (X-ray)', hips: 'ESAVO/P/XMM/EPIC-RGB', note: 'ESA XMM-Newton EPIC, archival pointings (partial sky coverage)' },
]

export function surveyCutoutUrl(hips: string, ra: number, dec: number, fovDeg: number, size = 640) {
  const p = new URLSearchParams({ hips, ra: ra.toFixed(5), dec: dec.toFixed(5), fov: String(fovDeg), width: String(size), height: String(size), projection: 'TAN', format: 'jpg' })
  return `https://alasky.cds.unistra.fr/hips-image-services/hips2fits?${p}`
}

export const esaskyUrl = (target: string, fov: number) =>
  `https://sky.esa.int/esasky/?target=${encodeURIComponent(target)}&hips=DSS2+color&fov=${fov}&cooframe=J2000&sci=true&lang=en`
export const stellariumWebUrl = (name: string) => `https://stellarium-web.org/skysource/${encodeURIComponent(name.replace(/\s+/g, ''))}`

/* ---------------- Stellarium desktop (Remote Control plugin, free & local) ---------------- */

export async function stellariumFocus(base: string, target: string) {
  const body = new URLSearchParams({ target })
  const r = await fetch(`${base.replace(/\/$/, '')}/api/main/focus`, { method: 'POST', body })
  if (!r.ok) throw new Error(`Stellarium responded ${r.status}`)
  return r.text()
}
export async function stellariumSetNalhati(base: string) {
  const body = new URLSearchParams({ latitude: String(NALHATI.lat), longitude: String(NALHATI.lon), altitude: String(NALHATI.elev), name: 'Nalhati', country: 'India' })
  const r = await fetch(`${base.replace(/\/$/, '')}/api/location/setlocationfields`, { method: 'POST', body })
  if (!r.ok) throw new Error(`Stellarium responded ${r.status}`)
}

/* ---------------- Weather / sky conditions (Open-Meteo, free, no key) ---------------- */

export interface SkyConditions {
  time: Date; cloud: number; cloudLow: number; cloudMid: number; cloudHigh: number; humidity: number; temp: number; visibilityKm: number; wind: number; isDay: boolean
  hourly: { time: Date; cloud: number }[]
}

export async function fetchSkyConditions(): Promise<SkyConditions> {
  const p = new URLSearchParams({
    latitude: String(NALHATI.lat), longitude: String(NALHATI.lon),
    current: 'temperature_2m,relative_humidity_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,wind_speed_10m,is_day',
    hourly: 'cloud_cover', forecast_hours: '18', timezone: 'Asia/Kolkata', timeformat: 'unixtime',
  })
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?${p}`)
  if (!r.ok) throw new Error(`Open-Meteo ${r.status}`)
  const j = await r.json()
  const c = j.current
  return {
    time: new Date(c.time * 1000), cloud: c.cloud_cover, cloudLow: c.cloud_cover_low, cloudMid: c.cloud_cover_mid, cloudHigh: c.cloud_cover_high,
    humidity: c.relative_humidity_2m, temp: c.temperature_2m, visibilityKm: (c.visibility ?? 0) / 1000, wind: c.wind_speed_10m, isDay: !!c.is_day,
    hourly: (j.hourly?.time ?? []).map((t: number, i: number) => ({ time: new Date(t * 1000), cloud: j.hourly.cloud_cover[i] })),
  }
}

export function observingScore(c: SkyConditions) {
  let s = 100 - c.cloud * 0.85
  if (c.humidity > 80) s -= (c.humidity - 80) * 0.8
  if (c.visibilityKm < 10) s -= (10 - c.visibilityKm) * 3
  s = Math.max(0, Math.min(100, Math.round(s)))
  const label = s > 75 ? 'Excellent' : s > 55 ? 'Good' : s > 35 ? 'Fair' : s > 15 ? 'Poor' : 'Overcast'
  return { score: s, label }
}

/* ---------------- shared star catalog loader ---------------- */
export type StarRow = [number, number, number, number, string?] // ra, dec, mag, bv, name
const starCache = new Map<string, Promise<StarRow[]>>()
export function loadStars(file: string) {
  if (!starCache.has(file)) starCache.set(file, fetch(`${import.meta.env.BASE_URL}data/${file}`).then((r) => r.json()))
  return starCache.get(file)!
}
export interface Constellation { id: string; name: string; label: [number, number]; lines: [number, number][][] }
let consCache: Promise<Constellation[]> | null = null
export function loadConstellations() {
  if (!consCache) consCache = fetch(`${import.meta.env.BASE_URL}data/constellations.json`).then((r) => r.json())
  return consCache
}

/** B−V colour index → RGB */
export function bvToRgb(bv: number): [number, number, number] {
  const t = Math.max(-0.4, Math.min(2.0, bv))
  let r: number, g: number, b: number
  if (t < 0) { r = 0.61 + 0.39 * ((t + 0.4) / 0.4); g = 0.70 + 0.3 * ((t + 0.4) / 0.4); b = 1 }
  else if (t < 0.4) { r = 1; g = 1 - 0.05 * (t / 0.4); b = 1 - 0.25 * (t / 0.4) }
  else if (t < 1.6) { const k = (t - 0.4) / 1.2; r = 1; g = 0.95 - 0.35 * k; b = 0.75 - 0.55 * k }
  else { r = 1; g = 0.6; b = 0.2 }
  return [r, g, b]
}
