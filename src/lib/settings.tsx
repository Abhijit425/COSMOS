import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Quality = 'low' | 'medium' | 'high'

export interface Settings {
  quality: Quality
  /** Render 3D only when something changes (saves battery / GPU) */
  powerSaver: boolean
  nasaApiKey: string
  stellariumUrl: string
  showConstellations: boolean
  showLabels: boolean
}

const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)

const defaults: Settings = {
  quality: isMobile ? 'medium' : 'high',
  powerSaver: isMobile,
  nasaApiKey: 'DEMO_KEY',
  stellariumUrl: 'http://localhost:8090',
  showConstellations: true,
  showLabels: true,
}

const KEY = 'cosmos-settings-v1'

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...defaults, ...JSON.parse(raw) }
  } catch { /* storage unavailable */ }
  return defaults
}

interface Ctx { settings: Settings; update: (p: Partial<Settings>) => void }
const SettingsContext = createContext<Ctx>({ settings: defaults, update: () => {} })

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load)
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(settings)) } catch { /* ignore */ }
  }, [settings])
  return (
    <SettingsContext.Provider value={{ settings, update: (p) => setSettings((s) => ({ ...s, ...p })) }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)

/** Per-quality rendering budget */
export function qualityProfile(q: Quality) {
  switch (q) {
    case 'low':
      return { dpr: [0.75, 1] as [number, number], antialias: false, starFile: 'stars6.json', moonTex: 'moon_1k.jpg', moonSegments: 96, milkyWay: 6000, displacement: false }
    case 'medium':
      return { dpr: [1, 1.5] as [number, number], antialias: true, starFile: 'stars6.json', moonTex: 'moon_2k.jpg', moonSegments: 192, milkyWay: 26000, displacement: true }
    default:
      return { dpr: [1, 2] as [number, number], antialias: true, starFile: 'stars8.json', moonTex: 'moon_4k.jpg', moonSegments: 384, milkyWay: 55000, displacement: true }
  }
}

export const asset = (p: string) => `${import.meta.env.BASE_URL}${p}`
