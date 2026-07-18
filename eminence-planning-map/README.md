# Eminence Planning and Zoning Explorer

Unofficial public planning tool for **Eminence, Kentucky**. Uses **only free, publicly accessible GIS data**—including public Henry County ArcGIS parcel and zoning/land-use layers.

> Not an official city or county product. Confirm zoning currency with Planning & Zoning. Analysis layers are heuristics. Parcel owner names are omitted.

## Run locally

```bash
cd eminence-planning-map
python3 -m http.server 8080
```

Open http://localhost:8080/

## Free layers

**Base:** Henry County, city limits, streets, addresses, buildings, streams, waterbodies, flood hazards  
**Planning:** zoning/land-use districts (`HenryCoZoning` / `Landuse_Henry`), parcels without owner names  
**Community:** railroads, bridges, schools, walking buffers, school districts, fire response areas, census tracts  
**Utilities:** wastewater plant, wastewater projects, water tanks, water projects (generalized—not pipe networks)  
**Places (OSM):** sidewalks/paths, parks, parking, civic/food amenities, shops  
**Analysis:** public/exempt parcels; zero-improvement parcels; unbuilt-address hints; unaddressed-building hints; possible missing sidewalks  

**Basemaps:** OpenStreetMap · Kentucky NAIP 2022 aerial tiles

## Features

- Quick-view presets (Overview, Zoning districts, Walkability, Vacancy hints, Public land, Utilities, Places)
- Shareable URL hash (center, zoom, basemap, visible layers)
- Address search
- Stats, legend, feature inspector
- Correction form (`contactEmail` in `layers.json`)

## Refresh free data

```bash
python3 scripts/fetch-ky-gis.py
python3 scripts/fetch-henry-gis.py
python3 scripts/fetch-osm.py
```

## Important caveat

The public `HenryCoZoning` service exposes a layer named **Landuse_Henry** with district codes (A2, R1–R3, B1–B3, I1–I2). Treat it as **unofficial until Henry County confirms** it is current zoning (vs. land use / an outdated extract). Optional request templates: `docs/data-requests.md`.
