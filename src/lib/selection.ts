import type { DeepSkyObject, MessierObject } from './catalog'
import type { SolarBody } from './astro'

export type Selection =
  | { type: 'dso'; obj: DeepSkyObject }
  | { type: 'messier'; obj: MessierObject }
  | { type: 'body'; name: SolarBody | 'Earth' }
  | { type: 'star'; name: string; ra: number; dec: number; mag: number; bv: number }
  | { type: 'constellation'; id: string; name: string; ra: number; dec: number }

export type View = 'universe' | 'deepspace' | 'moon' | 'sky' | 'live' | 'settings'

export const selectionKey = (s: Selection | null) =>
  !s ? '' : s.type === 'dso' || s.type === 'messier' ? s.obj.id : s.type === 'body' ? s.name : s.type === 'star' ? `star:${s.name}` : `con:${s.id}`

export const selectionName = (s: Selection) =>
  s.type === 'dso' ? s.obj.name : s.type === 'messier' ? (s.obj.name ? `${s.obj.id} · ${s.obj.name}` : s.obj.id) : s.type === 'body' ? s.name : s.name

/** RA/Dec of a fixed-position selection (null for solar-system bodies) */
export function selectionRaDec(s: Selection): { ra: number; dec: number } | null {
  if (s.type === 'dso' || s.type === 'messier') return { ra: s.obj.ra, dec: s.obj.dec }
  if (s.type === 'star' || s.type === 'constellation') return { ra: s.ra, dec: s.dec }
  return null
}
