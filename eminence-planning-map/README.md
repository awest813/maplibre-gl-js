# Eminence Planning and Zoning Explorer

Unofficial public planning tool for **Eminence, Kentucky**. Static site — no build step, no backend. Uses free public GIS (Kentucky GIS, OpenStreetMap, Henry County ArcGIS).

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

1. Merge to `main`.
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The workflow [`.github/workflows/deploy-eminence-map.yml`](../.github/workflows/deploy-eminence-map.yml) publishes `eminence-planning-map/` on pushes to `main` (or run **Actions → Deploy Eminence planning map → Run workflow**).

Site URL will look like:

`https://<user>.github.io/<repo>/`

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

**Base:** Henry County, city limits, streets, addresses, buildings, streams, waterbodies, flood hazards  
**Planning:** zoning/land-use districts (`HenryCoZoning` / `Landuse_Henry`), parcels without owner names  
**Community:** railroads, bridges, schools, walking buffers, school districts, fire response areas, census tracts  
**Utilities:** wastewater plant, wastewater projects, water tanks, water projects (generalized—not pipe networks)  
**Places (OSM):** sidewalks/paths, parks, parking, civic/food amenities, shops  
**Analysis:** public/exempt parcels; zero-improvement parcels; unbuilt-address hints; unaddressed-building hints; possible missing sidewalks  

**Basemaps:** OpenStreetMap · Kentucky NAIP 2022 aerial tiles

## Features

- Quick-view presets and shareable URL hash
- Address search, loading state, Escape-to-close panel/details
- Stats, legend, readable feature inspector
- Correction form (`contactEmail` in `layers.json`)

## Refresh free data (local / maintainer)

```bash
python3 scripts/fetch-ky-gis.py
python3 scripts/fetch-henry-gis.py
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
