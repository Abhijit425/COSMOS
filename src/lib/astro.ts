import * as A from 'astronomy-engine'

export const NALHATI = { name: 'Nalhati, West Bengal, India', lat: 24.2985, lon: 87.8325, elev: 40, tz: 'Asia/Kolkata' }
export const observer = new A.Observer(NALHATI.lat, NALHATI.lon, NALHATI.elev)

export type Vec3 = [number, number, number]
export type Mat3 = number[][]

export const fmtTime = (d: Date | null | undefined) =>
  d ? d.toLocaleTimeString('en-IN', { timeZone: NALHATI.tz, hour: '2-digit', minute: '2-digit', hour12: true }) : '—'
export const fmtDate = (d: Date | null | undefined) =>
  d ? d.toLocaleDateString('en-IN', { timeZone: NALHATI.tz, day: 'numeric', month: 'short', year: 'numeric' }) : '—'
export const fmtDateTime = (d: Date | null | undefined) => (d ? `${fmtDate(d)}, ${fmtTime(d)}` : '—')

/** J2000 equatorial unit vector from RA/Dec in degrees */
export function eqjVec(raDeg: number, decDeg: number): Vec3 {
  const ra = (raDeg * Math.PI) / 180, dec = (decDeg * Math.PI) / 180
  const c = Math.cos(dec)
  return [c * Math.cos(ra), c * Math.sin(ra), Math.sin(dec)]
}

/** Rotation from J2000 equatorial to local horizon (x=north, y=west, z=zenith) incl. precession/nutation/sidereal time */
export function horizonMatrix(date: Date): Mat3 {
  return A.Rotation_EQJ_HOR(date, observer).rot
}

/** Apply astronomy-engine rotation; returns horizon vector [north, west, up] */
export function rotate(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0][0] * v[0] + m[1][0] * v[1] + m[2][0] * v[2],
    m[0][1] * v[0] + m[1][1] * v[1] + m[2][1] * v[2],
    m[0][2] * v[0] + m[1][2] * v[1] + m[2][2] * v[2],
  ]
}

/** horizon vector -> alt/az (deg). az measured from north through east */
export function vecToAltAz(h: Vec3) {
  const alt = (Math.asin(Math.max(-1, Math.min(1, h[2]))) * 180) / Math.PI
  let az = (Math.atan2(-h[1], h[0]) * 180) / Math.PI
  if (az < 0) az += 360
  return { alt, az }
}

export function altAzOfRaDec(raDeg: number, decDeg: number, date: Date) {
  return vecToAltAz(rotate(horizonMatrix(date), eqjVec(raDeg, decDeg)))
}

export const compass = (az: number) => ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.round(az / 22.5) % 16]

export type SolarBody = 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune'
export const SOLAR_BODIES: SolarBody[] = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']

function startOfLocalDay(date: Date) {
  // local midnight in IST (UTC+5:30, no DST)
  const ist = new Date(date.getTime() + 5.5 * 3600e3)
  ist.setUTCHours(0, 0, 0, 0)
  return new Date(ist.getTime() - 5.5 * 3600e3)
}

function riseSet(body: A.Body, date: Date) {
  const day = startOfLocalDay(date)
  const rise = A.SearchRiseSet(body, observer, +1, day, 1.2)
  const set = A.SearchRiseSet(body, observer, -1, day, 1.2)
  const transit = A.SearchHourAngle(body, observer, 0, day, +1)
  return { rise: rise?.date ?? null, set: set?.date ?? null, transit: transit.time.date, transitAlt: transit.hor.altitude }
}

export interface BodyPosition {
  name: SolarBody
  ra: number; dec: number; alt: number; az: number
  mag: number | null
  distanceAu: number
  rise: Date | null; set: Date | null; transit: Date; transitAlt: number
  /** J2000 unit vector for the sky map */
  vec: Vec3
}

export function solarBodyPosition(name: SolarBody, date: Date): BodyPosition {
  const body = A.Body[name]
  const eqj = A.Equator(body, date, observer, false, true) // J2000, topocentric
  const eqd = A.Equator(body, date, observer, true, true)
  const hor = A.Horizon(date, observer, eqd.ra, eqd.dec, 'normal')
  let mag: number | null = null
  try { mag = A.Illumination(body, date).mag } catch { mag = null }
  return {
    name, ra: eqj.ra * 15, dec: eqj.dec, alt: hor.altitude, az: hor.azimuth, mag, distanceAu: eqj.dist,
    ...riseSet(body, date), vec: eqjVec(eqj.ra * 15, eqj.dec),
  }
}

/** Rise/set/transit for a fixed RA/Dec object (stars, deep sky) */
export function fixedObjectEvents(raDeg: number, decDeg: number, date: Date, distLy = 1000) {
  A.DefineStar(A.Body.Star1, raDeg / 15, decDeg, Math.max(distLy, 1))
  const r = riseSet(A.Body.Star1, date)
  const now = altAzOfRaDec(raDeg, decDeg, date)
  const lat = observer.latitude
  const circumpolar = decDeg > 90 - lat
  const neverRises = decDeg < -(90 - lat)
  return { ...r, ...now, circumpolar, neverRises }
}

/** Heliocentric J2000 equatorial position in AU */
export function helioPosition(name: Exclude<SolarBody, 'Sun' | 'Moon'> | 'Earth', date: Date): Vec3 {
  const v = A.HelioVector(A.Body[name], date)
  return [v.x, v.y, v.z]
}

export const PHASE_NAMES = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent']

export function moonInfo(date: Date) {
  const phaseAngle = A.MoonPhase(date) // 0 = new, 90 = first quarter, 180 = full
  const illum = A.Illumination(A.Body.Moon, date)
  const idx = Math.floor(((phaseAngle + 22.5) % 360) / 45)
  const geo = A.GeoMoon(date)
  const distKm = Math.hypot(geo.x, geo.y, geo.z) * A.KM_PER_AU
  const lib = A.Libration(date)
  const quarters: { name: string; date: Date }[] = []
  let q = A.SearchMoonQuarter(date)
  for (let i = 0; i < 4; i++) {
    quarters.push({ name: ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter'][q.quarter], date: q.time.date })
    q = A.NextMoonQuarter(q)
  }
  const pos = solarBodyPosition('Moon', date)
  return {
    phaseAngle, fraction: illum.phase_fraction, illumAngle: illum.phase_angle, phaseName: PHASE_NAMES[idx],
    ageDays: (phaseAngle / 360) * 29.530588, distanceKm: distKm, waxing: phaseAngle < 180,
    libLon: lib.elon, libLat: lib.elat, diamDeg: lib.diam_deg, quarters, pos, mag: illum.mag,
  }
}

export function constellationOf(raDeg: number, decDeg: number) {
  return A.Constellation(raDeg / 15, decDeg).name
}

/** Sun altitude → sky darkness label */
export function twilight(sunAlt: number) {
  if (sunAlt > 0) return { label: 'Daytime', dark: false }
  if (sunAlt > -6) return { label: 'Civil twilight', dark: false }
  if (sunAlt > -12) return { label: 'Nautical twilight', dark: false }
  if (sunAlt > -18) return { label: 'Astronomical twilight', dark: true }
  return { label: 'Astronomical night', dark: true }
}
