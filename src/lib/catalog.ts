import messierRaw from '../messier.json'

export type ObjectKind = 'galaxy' | 'nebula' | 'snr' | 'cluster' | 'planet' | 'moon' | 'star' | 'sun' | 'constellation' | 'dso'

export interface DeepSkyObject {
  id: string
  name: string
  aka: string
  kind: ObjectKind
  typeLabel: string
  ra: number // degrees J2000
  dec: number // degrees J2000
  constellation: string
  distance: string
  distanceLy: number
  magnitude: number | null
  angularSize: string
  /** field of view (deg) for survey cutouts */
  fov: number
  nasaQuery: string
  /** words of which at least one must appear in a NASA result title/keywords */
  match: string[]
  esaskyTarget: string
  stellariumName: string
  color: string
  summary: string
  facts: string[]
}

export const FEATURED: DeepSkyObject[] = [
  {
    id: 'M31', name: 'Andromeda Galaxy', aka: 'M31 · NGC 224', kind: 'galaxy', typeLabel: 'Barred spiral galaxy',
    ra: 10.6847, dec: 41.2690, constellation: 'Andromeda', distance: '≈ 2.5 million light-years', distanceLy: 2.5e6,
    magnitude: 3.4, angularSize: '3.2° × 1.0°', fov: 3.2, nasaQuery: 'Andromeda galaxy', match: ['andromeda', 'm31', 'm 31'],
    esaskyTarget: 'M31', stellariumName: 'M31', color: '#c9d3ff',
    summary: 'The nearest large spiral galaxy to the Milky Way and the most distant object most people can see with the naked eye. From a dark site near Nalhati it appears as an elongated smudge high in the north-east on autumn evenings.',
    facts: ['Contains roughly one trillion stars', 'Approaching the Milky Way at ~110 km/s', 'Spans about 220,000 light-years', 'Best seen October–December evenings'],
  },
  {
    id: 'M42', name: 'Orion Nebula', aka: 'M42 · NGC 1976', kind: 'nebula', typeLabel: 'Emission / reflection nebula',
    ra: 83.8221, dec: -5.3911, constellation: 'Orion', distance: '≈ 1,344 light-years', distanceLy: 1344,
    magnitude: 4.0, angularSize: '65′ × 60′', fov: 1.2, nasaQuery: 'Orion Nebula', match: ['orion nebula', 'm42', 'm 42', 'orion'],
    esaskyTarget: 'M42', stellariumName: 'M42', color: '#ff9fc6',
    summary: 'The closest large star-forming region to Earth, visible to the naked eye as the fuzzy "middle star" of Orion\'s sword. The Trapezium cluster at its heart lights up the gas.',
    facts: ['Stellar nursery with ~700 young stars', 'About 24 light-years across', 'Naked-eye object from Nalhati in winter', 'Best seen December–February'],
  },
  {
    id: 'M16', name: 'Eagle Nebula', aka: 'M16 · NGC 6611', kind: 'nebula', typeLabel: 'Emission nebula + open cluster',
    ra: 274.7000, dec: -13.8167, constellation: 'Serpens', distance: '≈ 5,700 light-years', distanceLy: 5700,
    magnitude: 6.0, angularSize: '70′ × 50′', fov: 1.2, nasaQuery: 'Eagle Nebula', match: ['eagle', 'm16', 'm 16', 'pillars'],
    esaskyTarget: 'M16', stellariumName: 'M16', color: '#ffb07a',
    summary: 'A young open cluster embedded in glowing hydrogen. It contains the famous Pillars of Creation, sculpted by ultraviolet light from hot newborn stars.',
    facts: ['Cluster age about 1–2 million years', 'Home of the Pillars of Creation', 'Visible in binoculars from a dark site', 'Best seen June–August'],
  },
  {
    id: 'M1', name: 'Crab Nebula', aka: 'M1 · NGC 1952', kind: 'snr', typeLabel: 'Supernova remnant',
    ra: 83.6331, dec: 22.0145, constellation: 'Taurus', distance: '≈ 6,500 light-years', distanceLy: 6500,
    magnitude: 8.4, angularSize: '7′ × 5′', fov: 0.25, nasaQuery: 'Crab Nebula', match: ['crab', 'm1 ', 'm 1 ', 'messier 1'],
    esaskyTarget: 'M1', stellariumName: 'M1', color: '#9fe3ff',
    summary: 'The expanding debris of a star that exploded in 1054 CE — recorded by Chinese and other astronomers as a "guest star" visible in daylight. A pulsar spinning 30 times per second powers it.',
    facts: ['Supernova recorded in 1054 CE', 'Crab Pulsar rotates ~30 times/second', 'Expanding at ~1,500 km/s', 'Best seen November–February'],
  },
  {
    id: 'B33', name: 'Horsehead Nebula', aka: 'Barnard 33 · in IC 434', kind: 'nebula', typeLabel: 'Dark nebula',
    ra: 85.2458, dec: -2.4583, constellation: 'Orion', distance: '≈ 1,375 light-years', distanceLy: 1375,
    magnitude: null, angularSize: '8′ × 6′', fov: 0.5, nasaQuery: 'Horsehead Nebula', match: ['horsehead', 'barnard 33', 'b33'],
    esaskyTarget: 'Horsehead Nebula', stellariumName: 'Barnard 33', color: '#ff7a8a',
    summary: 'A cold, dense cloud of dust and gas silhouetted against the glowing red emission nebula IC 434, just south of Alnitak in Orion\'s belt.',
    facts: ['Part of the Orion Molecular Cloud complex', 'About 3.5 light-years tall', 'Very faint visually — a photographic target', 'Best seen December–February'],
  },
  {
    id: 'M51', name: 'Whirlpool Galaxy', aka: 'M51 · NGC 5194', kind: 'galaxy', typeLabel: 'Interacting grand-design spiral',
    ra: 202.4696, dec: 47.1952, constellation: 'Canes Venatici', distance: '≈ 23 million light-years', distanceLy: 2.3e7,
    magnitude: 8.4, angularSize: '11′ × 7′', fov: 0.3, nasaQuery: 'Whirlpool Galaxy', match: ['whirlpool', 'm51', 'm 51'],
    esaskyTarget: 'M51', stellariumName: 'M51', color: '#bcd0ff',
    summary: 'The first galaxy in which spiral structure was recognised (by Lord Rosse in 1845). Its arms are being stirred by the small companion galaxy NGC 5195.',
    facts: ['Interacting with companion NGC 5195', 'About 76,000 light-years across', 'Low in the north from Nalhati', 'Best seen April–June'],
  },
  {
    id: 'M104', name: 'Sombrero Galaxy', aka: 'M104 · NGC 4594', kind: 'galaxy', typeLabel: 'Spiral / lenticular galaxy',
    ra: 189.9976, dec: -11.6231, constellation: 'Virgo', distance: '≈ 31 million light-years', distanceLy: 3.1e7,
    magnitude: 8.0, angularSize: '8.7′ × 3.5′', fov: 0.25, nasaQuery: 'Sombrero Galaxy', match: ['sombrero', 'm104', 'm 104'],
    esaskyTarget: 'M104', stellariumName: 'M104', color: '#ffe0a8',
    summary: 'Seen almost edge-on, with a brilliant bulge and a dark dust lane that give it the look of a broad-brimmed hat. A supermassive black hole of ~1 billion solar masses sits at its centre.',
    facts: ['Bright central bulge with ~2,000 globular clusters', 'Prominent dust lane seen edge-on', 'Well placed from India in spring', 'Best seen March–June'],
  },
  {
    id: 'PILLARS', name: 'Pillars of Creation', aka: 'Inside M16 (Eagle Nebula)', kind: 'nebula', typeLabel: 'Star-forming gas columns',
    ra: 274.7125, dec: -13.8333, constellation: 'Serpens', distance: '≈ 5,700 light-years', distanceLy: 5700,
    magnitude: null, angularSize: '≈ 3′ region', fov: 0.12, nasaQuery: 'Pillars of Creation', match: ['pillars of creation', 'pillars', 'eagle'],
    esaskyTarget: 'M16', stellariumName: 'M16', color: '#ffc38a',
    summary: 'Towering columns of cool gas and dust in the Eagle Nebula, made famous by Hubble in 1995 and re-imaged by Hubble (2014) and Webb (2022). New stars are forming inside their tips.',
    facts: ['Tallest pillar is about 4 light-years long', 'Imaged by Hubble 1995/2014 and Webb 2022', 'Being slowly eroded by stellar radiation', 'Best seen June–August'],
  },
]

export interface MessierObject { id: string; ngc: string; name: string; type: string; mag: number; ra: number; dec: number }
export const MESSIER = messierRaw as MessierObject[]

export const MESSIER_TYPE: Record<string, string> = {
  s: 'Spiral galaxy', e: 'Elliptical galaxy', i: 'Irregular galaxy', l: 'Lenticular galaxy', sb: 'Barred spiral',
  gc: 'Globular cluster', oc: 'Open cluster', pn: 'Planetary nebula', bn: 'Bright nebula', en: 'Emission nebula',
  rn: 'Reflection nebula', sfr: 'Star-forming region', snr: 'Supernova remnant', ds: 'Double star', as: 'Asterism',
  pos: 'Star cloud', dn: 'Dark nebula',
}

export const PLANETS = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'] as const
export type PlanetName = (typeof PLANETS)[number]

export const PLANET_INFO: Record<PlanetName | 'Earth' | 'Sun', { radiusKm: number; color: string; tex: string; summary: string }> = {
  Sun: { radiusKm: 696340, color: '#ffcc66', tex: 'sun.jpg', summary: 'Our star — a G2V main-sequence star 4.6 billion years old. Never look at it without a certified solar filter.' },
  Mercury: { radiusKm: 2439.7, color: '#a9a39b', tex: 'mercury.jpg', summary: 'The smallest planet and closest to the Sun. Best caught low in twilight near greatest elongation.' },
  Venus: { radiusKm: 6051.8, color: '#e8c58a', tex: 'venus.jpg', summary: 'Shrouded in sulphuric-acid clouds; the brightest planet in our sky and shows phases like the Moon.' },
  Earth: { radiusKm: 6371, color: '#4f7cff', tex: 'earth.jpg', summary: 'Home. Nalhati sits at 24.3° N, 87.8° E.' },
  Mars: { radiusKm: 3389.5, color: '#d0643b', tex: 'mars.jpg', summary: 'The red planet, with polar caps and the largest volcano in the Solar System, Olympus Mons.' },
  Jupiter: { radiusKm: 69911, color: '#d8b48a', tex: 'jupiter.jpg', summary: 'The largest planet. Its four Galilean moons are visible in ordinary binoculars.' },
  Saturn: { radiusKm: 58232, color: '#e3cf9a', tex: 'saturn.jpg', summary: 'The ringed planet. Its rings are mostly water ice, yet only tens of metres thick.' },
  Uranus: { radiusKm: 25362, color: '#9fe0e8', tex: 'uranus.jpg', summary: 'An ice giant tipped on its side, just at the edge of naked-eye visibility.' },
  Neptune: { radiusKm: 24622, color: '#5b7cff', tex: 'neptune.jpg', summary: 'The most distant planet, with the fastest winds measured in the Solar System.' },
}

export function raToHms(raDeg: number) {
  const h = ((raDeg / 15) % 24 + 24) % 24
  const hh = Math.floor(h); const m = (h - hh) * 60; const mm = Math.floor(m); const ss = Math.round((m - mm) * 60)
  return `${hh}h ${String(mm).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s`
}
export function decToDms(dec: number) {
  const s = dec < 0 ? '−' : '+'; const a = Math.abs(dec); const d = Math.floor(a); const m = Math.floor((a - d) * 60)
  return `${s}${d}° ${String(m).padStart(2, '0')}′`
}
