# Eminence Planning and Zoning Explorer

Unofficial public planning tool for **Eminence, Kentucky**. Built with MapLibre GL JS and free Kentucky GIS services while parcel-level zoning is requested from Henry County.

> This is **not** an official city or county product. Current zoning and PVA parcels are placeholders until confirmed.

## What’s included (v1)

| Layer | Status |
| --- | --- |
| City limits | Ready (KY DGI) |
| Streets | Ready (KY 911) |
| Address points | Ready (KY 911) |
| Building footprints | Ready (ORNL / KY) |
| Streams & waterbodies | Ready (NHD) |
| Flood hazards | Ready (FEMA-derived Esri layer) |
| Current zoning | Request needed |
| Existing / future land use | Partial — placeholders |
| Parcels | Request needed |

Planning layers are intentionally separate toggles so zoning is never mixed with future land use.

## Run locally

From this folder:

```bash
python3 -m http.server 8080
```

Open http://localhost:8080/

No build step. Static HTML/CSS/JS + GeoJSON.

## Refresh base data

```bash
python3 scripts/fetch-ky-gis.py
```

Updates GeoJSON under `data/` from Kentucky ArcGIS REST services (and the Esri flood layer).

## Drop in county data later

1. Export zoning / parcels / land use as GeoJSON.
2. Replace the matching file under `data/placeholders/` (or add a new path in `layers.json`).
3. Set `status` to `ready` and update `verification_status`, `source`, and `updated` in `layers.json`.

Suggested parcel attributes are documented in `docs/parcel-schema.md`. Request letter templates are in `docs/data-requests.md`.

## Deploy

Any static host works (GitHub Pages, Cloudflare Pages, Netlify). Publish the contents of `eminence-planning-map/`.

## Design notes

- Labeled **Unofficial public planning tool** until Henry County confirms zoning.
- Every layer lists source and update date in the side panel.
- Correction form opens a pre-filled email (`contactEmail` in `layers.json`).
