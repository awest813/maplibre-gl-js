# Eminence & New Castle Planning and Zoning Explorer

Unofficial public planning tool for **Eminence** and **New Castle**, Kentucky (Henry County). Static site — no build step, no backend. Uses free public GIS (Kentucky GIS, OpenStreetMap, Henry County ArcGIS).

> Not an official city or county product. Confirm zoning currency with Planning & Zoning. Analysis layers are heuristics. Parcel owner names are omitted.

## Run locally

```bash
cd eminence-planning-map
python3 -m http.server 8080
```

Open http://localhost:8080/

Any static file server works (`npx serve .`, Caddy, nginx, etc.).

## Deploy (static hosting)

This folder is the website root. All asset paths are relative.

### GitHub Pages (included workflow)

The workflow [`.github/workflows/deploy-eminence-map.yml`](../.github/workflows/deploy-eminence-map.yml) publishes `eminence-planning-map/` to the `gh-pages` branch on pushes to `main` (or **Actions → Deploy Eminence & New Castle planning map → Run workflow**).

**One-time setup** (required — Actions cannot enable Pages without admin rights):

1. Open **Settings → Pages**
2. **Build and deployment → Source:** Deploy from a branch
3. **Branch:** `gh-pages` / **/ (root)** → Save

Site URL:

`https://awest813.github.io/maplibre-gl-js/`

### Cloudflare Pages

- **Framework preset:** None
- **Root directory:** `eminence-planning-map`
- **Build command:** leave empty
- **Build output directory:** `/` (or `.`)

`_headers` in this folder sets cache and GeoJSON content types.

### Netlify

- **Base directory:** `eminence-planning-map`
- **Build command:** none / use `netlify.toml`
- **Publish directory:** `.` (relative to base)

### Manual / any static host

Upload the contents of `eminence-planning-map/` (not the whole MapLibre repo) to your host’s web root.

## Free layers

**Base:** Henry County, city limits, streets, addresses, buildings, streams, waterbodies, flood hazards, wetlands, sinkholes, groundwater sensitivity  
**Planning:** zoning/land-use districts (`HenryCoZoning` / `Landuse_Henry`), parcels without owner names  
**Community:** railroads, bridges, schools, walking buffers, school districts, fire/EMS/law response areas, fire & police stations, courthouses, libraries, health centers, parks/open space, census tracts & block groups, magisterial districts, airports  
**Utilities:** wastewater plant, wastewater projects, water tanks, water projects (generalized—not pipe networks)  
**Places (OSM + regional):** sidewalks/paths, parks, parking, civic/food amenities, shops, EV chargers  
**Analysis:** public/exempt parcels; zero-improvement parcels; unbuilt-address hints; unaddressed-building hints; possible missing sidewalks  

**Basemaps:** OpenStreetMap · Kentucky NAIP 2022 aerial tiles

## Features

- Quick-view presets and shareable URL hash
- Address search, loading state, Escape-to-close panel/details
- Stats, legend, readable feature inspector
- Correction form (`contactEmail` in `layers.json`)
- Map tools: PNG export, click-to-measure (ft/mi), reset view, fullscreen
- Feature inspect (click), shareable URL hash, failed-layer status
- Boot error UI if MapLibre/WebGL or the catalog cannot load

Useful MapLibre ecosystem references: [awesome-maplibre](https://github.com/maplibre/awesome-maplibre) (e.g. `maplibre-gl-export`, `maplibre-gl-measures`, `maplibre-gl-opacity`, PMTiles). This static app keeps export/measure self-contained so hosting stays CDN-simple.

## Refresh free data (local / maintainer)

```bash
python3 scripts/fetch-ky-gis.py
python3 scripts/fetch-henry-gis.py
python3 scripts/fetch-extra-gis.py
python3 scripts/fetch-osm.py
```

Then commit updated GeoJSON under `data/` and redeploy.

## Important caveat

The public `HenryCoZoning` service exposes a layer named **Landuse_Henry**. Treat it as unofficial until Henry County confirms it is current zoning. Verification templates: [docs/data-requests.html](docs/data-requests.html).

## Runtime dependencies (CDN)

Loaded at runtime from the public internet (no npm install required to host):

- MapLibre GL JS 4.7.1 (unpkg)
- MapLibre demo glyphs
- Google Fonts (Fraunces, Sora)
- Basemap tiles: OpenStreetMap and/or Kentucky NAIP 2022
