# COSMOS – My Personal Space Observatory

Explore the universe from your Android phone or laptop — no telescope, no paid APIs.

**Live app:** https://abhijit425.github.io/COSMOS/

## Features
- **Interactive Universe** – React Three Fiber 3D scene: 41k real catalogue stars (B−V colours), Milky Way on the true galactic plane, Sun + planets at their real heliocentric positions for today (astronomy-engine), orbits, Saturn's rings, deep-sky objects at their real RA/Dec with NASA photos hung in space. Zoom / rotate / pan / fly-to, touch friendly.
- **Deep Space Observatory** – Andromeda, Orion, Eagle, Crab, Horsehead, Whirlpool, Sombrero, Pillars of Creation: real photographs from the NASA Image and Video Library (title, date, telescope, NASA center, archival/recent badge), sky-survey cutouts (DSS2, Pan-STARRS, 2MASS, ESA Herschel, ESA XMM-Newton) via CDS hips2fits / HiPS — the same ecosystem ESA ESASky uses — plus ESASky deep links.
- **Moon Observatory** – NASA LRO LROC 4k colour mosaic + LOLA elevation, real-time phase lighting and libration, rise/set, upcoming phases, 15 named features (incl. Chandrayaan-3 site), tap anywhere to zoom to the surface.
- **Live Sky from Nalhati** (24.30° N, 87.83° E) – all-sky stereographic map for the current IST time (or ±12 h), stars, constellations, planets, Moon phase, Messier objects, search & centre, rise/transit/set, Open-Meteo cloud/humidity/visibility with an observing score.
- **Real Astronomy Data** – NASA APOD (hourly re-check), latest NASA releases by mission (auto refresh every 30 min), full NASA library search. Nothing is ever presented as a live camera feed.
- **Stellarium** – Stellarium Web links for every object, and "Point Stellarium desktop" via the free Remote Control plugin.
- **Performance** – Low / Medium / High quality (texture size, star count, DPR, antialias, displacement), battery-saver on-demand rendering, lazy-loaded views and textures, 3D canvases unmount when hidden.

## Run locally
```bash
npm install
npm run dev        # http://localhost:5173  (also on your LAN – open the Network URL on your phone)
npm run build && npm run preview
```

## Data & credits
NASA Image and Video Library, NASA APOD, NASA SVS CGI Moon Kit (LRO), CDS Strasbourg hips2fits/HiPS (incl. ESA ESAC HiPS), ESA ESASky, Open-Meteo, d3-celestial star/constellation data (Olaf Frohn), astronomy-engine (Don Cross), Planet Pixel Emporium textures via threex.planets, three.js.
