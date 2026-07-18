# Eminence Planning and Zoning Explorer

Unofficial public planning tool for **Eminence, Kentucky**. Version 1 uses **only free, publicly accessible GIS data**—no paid PVA extracts and no county zoning files required to run.

> Not an official city or county product. Does not show authoritative current zoning until a free public zoning source is available.

## Free layers included

| Layer | Source |
| --- | --- |
| City limits | Kentucky DGI corporate boundaries |
| Streets | Kentucky 911 road centerlines |
| Address points | Kentucky 911 site addresses |
| Building footprints | ORNL / Kentucky |
| Streams & waterbodies | NHD via Kentucky GIS |
| Flood hazards | FEMA-derived (Esri public layer) |
| Railroads | Kentucky DGI |
| Schools & walking buffers | Kentucky schools |
| School districts | Kentucky school districts |
| Census tracts (2020) | Kentucky Census 2020 |
| Aerial basemap | Kentucky NAIP 2022 (free tiles) |
| Streets basemap | OpenStreetMap |

## Run locally

```bash
cd eminence-planning-map
python3 -m http.server 8080
```

Open http://localhost:8080/

## Refresh free data

```bash
python3 scripts/fetch-ky-gis.py
```

## Notes

- Parcel boundaries and current zoning are **not** in this build (not posted as free GIS for Henry County).
- Optional request templates remain in `docs/data-requests.md` if you later obtain those files.
- Correction form email is set in `layers.json` → `contactEmail`.
