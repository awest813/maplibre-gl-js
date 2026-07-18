# Eminence Planning and Zoning Explorer

Unofficial public planning tool for **Eminence, Kentucky**. Uses **only free, publicly accessible GIS data**.

> Not an official city or county product. Analysis layers are heuristics, not official vacancy lists.

## Run locally

```bash
cd eminence-planning-map
python3 -m http.server 8080
```

Open http://localhost:8080/

## Free layers

**Base:** Henry County, city limits, streets, addresses, buildings, streams, waterbodies, flood hazards  
**Community:** railroads, bridges, schools, walking buffers, school districts, fire response areas, census tracts  
**Utilities:** wastewater plant, wastewater projects, water tanks, water projects (generalized—not pipe networks)  
**Places (OSM):** sidewalks/paths, parks, parking, civic/food amenities, shops  
**Analysis:** unbuilt-address hints; unaddressed-building hints; possible missing sidewalks  

**Basemaps:** OpenStreetMap · Kentucky NAIP 2022 aerial tiles

## Features

- Quick-view presets (Overview, Walkability, Vacancy hints, Utilities, Places)
- Shareable URL hash (center, zoom, basemap, visible layers)
- Address search
- Stats, legend, feature inspector
- Correction form (`contactEmail` in `layers.json`)

## Refresh free data

```bash
python3 scripts/fetch-ky-gis.py
python3 scripts/fetch-osm.py
```

Rebuilds Kentucky GIS extracts, OSM places, and derived heuristics.

## Not included (yet)

Parcel boundaries and authoritative current zoning are not posted as free Henry County GIS. Optional request templates: `docs/data-requests.md`.
