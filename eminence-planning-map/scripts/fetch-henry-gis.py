#!/usr/bin/env python3
"""Fetch free public Henry County zoning/land-use and parcel layers (no owner names)."""

from __future__ import annotations

import json
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
BBOX = {
    "xmin": -85.21,
    "ymin": 38.34,
    "xmax": -85.14,
    "ymax": 38.39,
    "spatialReference": {"wkid": 4326},
}

ZONING_URL = (
    "https://services5.arcgis.com/SRuaqVyoD8TEQJga/arcgis/rest/services/"
    "HenryCoZoning/FeatureServer/19/query"
)
PARCELS_URL = (
    "https://services5.arcgis.com/SRuaqVyoD8TEQJga/arcgis/rest/services/"
    "HenryCoParcels/FeatureServer/13/query"
)

CODE_LABELS = {
    "A1": "Agricultural / rural (A1)",
    "A2": "Agricultural / rural (A2)",
    "A3": "Agricultural small community (A3)",
    "B1": "Business (B1)",
    "B2": "Business (B2)",
    "B3": "Business (B3)",
    "I1": "Industrial (I1)",
    "I2": "Industrial (I2)",
    "R1": "Residential (R1)",
    "R2": "Residential (R2)",
    "R3": "Residential (R3)",
}


def query_all(url: str, fields: str, order_field: str, page: int = 1000) -> dict:
    feats = []
    offset = 0
    while True:
        params = {
            "where": "1=1",
            "geometry": json.dumps(BBOX),
            "geometryType": "esriGeometryEnvelope",
            "inSR": "4326",
            "spatialRel": "esriSpatialRelIntersects",
            "outFields": fields,
            "returnGeometry": "true",
            "outSR": "4326",
            "f": "geojson",
            "resultOffset": str(offset),
            "resultRecordCount": str(page),
            "orderByFields": f"{order_field} ASC",
        }
        full = url + "?" + urllib.parse.urlencode(params)
        with urllib.request.urlopen(full, timeout=180) as resp:
            payload = json.loads(resp.read().decode())
        if "error" in payload:
            params.pop("orderByFields", None)
            full = url + "?" + urllib.parse.urlencode(params)
            with urllib.request.urlopen(full, timeout=180) as resp:
                payload = json.loads(resp.read().decode())
            if "error" in payload:
                raise RuntimeError(payload["error"])
        chunk = payload.get("features", [])
        print(f"  offset {offset}: {len(chunk)}")
        feats.extend(chunk)
        if len(chunk) < page:
            break
        offset += len(chunk)
    return {"type": "FeatureCollection", "features": feats}



def simplify_ring(ring, step=3):
    if len(ring) <= 4:
        return ring
    kept = ring[::step]
    if kept[0] != ring[0]:
        kept = [ring[0]] + kept
    if kept[-1] != ring[-1]:
        kept.append(ring[-1])
    if kept[0] != kept[-1]:
        kept.append(kept[0])
    return kept if len(kept) >= 4 else ring


def simplify_geom(geom, step=3):
    t = geom["type"]
    if t == "Polygon":
        return {"type": t, "coordinates": [simplify_ring(r, step) for r in geom["coordinates"]]}
    if t == "MultiPolygon":
        return {
            "type": t,
            "coordinates": [[simplify_ring(r, step) for r in poly] for poly in geom["coordinates"]],
        }
    return geom

def write(name: str, fc: dict) -> None:
    path = DATA / name
    path.write_text(json.dumps(fc, separators=(",", ":")))
    print(f"wrote {name}: {len(fc.get('features', []))} features, {path.stat().st_size} bytes")


def derive_parcel_analysis(parcels: dict) -> None:
    public = []
    low_imp = []
    for feat in parcels.get("features", []):
        props = feat.get("properties") or {}
        cls = str(props.get("class") or "").upper()
        if "EXEMPT" in cls and any(
            x in cls for x in ["CITY", "COUNTY", "STATE", "FEDERAL", "EDUCATIONAL", "RELIGIOUS", "OTHER"]
        ):
            p = dict(props)
            p["public_ownership"] = "likely_exempt_public_or_institutional"
            p["analysis"] = "public_or_exempt_parcel"
            public.append({"type": "Feature", "geometry": feat["geometry"], "properties": p})

        imp = props.get("improvement_value")
        land = props.get("land_value")
        if (
            cls in ("RESIDENTIAL", "COMMERCIAL", "FARM")
            and isinstance(imp, (int, float))
            and imp == 0
            and isinstance(land, (int, float))
            and land > 0
        ):
            p = dict(props)
            p["hint"] = "Assessed improvement value is 0"
            p["analysis"] = "possible_vacant_land_from_assessment"
            low_imp.append({"type": "Feature", "geometry": feat["geometry"], "properties": p})

    write(
        "analysis-public-exempt-parcels.geojson",
        {
            "type": "FeatureCollection",
            "features": public,
            "metadata": {
                "note": "Exempt class codes from public parcel layer. Not a verified public-land inventory."
            },
        },
    )
    write(
        "analysis-zero-improvement-parcels.geojson",
        {
            "type": "FeatureCollection",
            "features": low_imp,
            "metadata": {
                "note": "Land value > 0 and improvement value = 0. Heuristic vacant-land signal."
            },
        },
    )

    stats_path = DATA / "stats.json"
    stats = json.loads(stats_path.read_text()) if stats_path.exists() else {}
    stats["public_exempt_parcels"] = len(public)
    stats["zero_improvement_parcels"] = len(low_imp)
    stats_path.write_text(json.dumps(stats, indent=2))


def main() -> None:
    DATA.mkdir(parents=True, exist_ok=True)

    print("Henry zoning / land-use districts…")
    zoning = query_all(ZONING_URL, "OBJECTID,DRAWCODE,LUCODE,Acres,MUID", "OBJECTID")
    for feat in zoning["features"]:
        p = feat.get("properties") or {}
        code = (p.get("LUCODE") or p.get("DRAWCODE") or "").strip().upper().replace("-", "").replace(" ", "")
        raw = (p.get("LUCODE") or "").strip().upper()
        feat["properties"] = {
            k: v
            for k, v in {
                "district_code": raw or code or None,
                "district_name": CODE_LABELS.get(code) or CODE_LABELS.get(raw) or (raw or "Unknown"),
                "acres": p.get("Acres"),
                "source_layer": "Landuse_Henry (HenryCoZoning FeatureServer)",
                "verification_status": "public_arcgis_unverified_currency",
                "layer_note": (
                    "From public HenryCoZoning service (layer name Landuse_Henry). "
                    "Confirm with Planning & Zoning before treating as official current zoning."
                ),
            }.items()
            if v not in (None, "")
        }
    write("henry-landuse-zoning.geojson", zoning)

    print("Henry parcels (owner names omitted)…")
    parcels = query_all(
        PARCELS_URL,
        "FID,PIDN,PARCEL_ID,ACRES,CLASS,TAX_DIST,FIRE_DIST,Address1,Address2,City,State,Zip,"
        "TAXABLE,FAIRCASH,Land,Improvemen,Descriptio,Year,Class_1,PRINT_ID,MAP,BLOCK,PARCEL",
        "FID",
    )
    for feat in parcels["features"]:
        p = feat.get("properties") or {}
        if "Name" in p:
            p.pop("Name", None)
        addr = " ".join(x for x in [p.get("Address1"), p.get("Address2")] if x and str(x).strip())
        feat["properties"] = {
            k: v
            for k, v in {
                "parcel_id": p.get("PARCEL_ID") or p.get("PIDN") or p.get("PRINT_ID"),
                "pidn": p.get("PIDN"),
                "address": addr or None,
                "city": p.get("City"),
                "zip": p.get("Zip"),
                "acres": p.get("ACRES"),
                "class": p.get("CLASS") or p.get("Class_1"),
                "tax_district": p.get("TAX_DIST"),
                "fire_district": p.get("FIRE_DIST"),
                "land_value": p.get("Land"),
                "improvement_value": p.get("Improvemen"),
                "taxable": p.get("TAXABLE"),
                "fair_cash": p.get("FAIRCASH"),
                "description": p.get("Descriptio"),
                "year": p.get("Year"),
                "map": p.get("MAP"),
                "block": p.get("BLOCK"),
                "parcel": p.get("PARCEL"),
                "verification_status": "public_arcgis_unverified_currency",
                "source_layer": "HenryCoParcels FeatureServer",
            }.items()
            if v not in (None, "")
        }
    for feat in parcels["features"]:
        feat["geometry"] = simplify_geom(feat["geometry"], 3)
        z = str((feat.get("properties") or {}).get("zip") or "")
        if z.endswith("-"):
            feat["properties"]["zip"] = z.rstrip("-")
    write("parcels.geojson", parcels)

    derive_parcel_analysis(parcels)

    stats_path = DATA / "stats.json"
    stats = json.loads(stats_path.read_text()) if stats_path.exists() else {}
    stats["parcels"] = len(parcels["features"])
    stats["zoning_polygons"] = len(zoning["features"])
    stats["zoning_codes"] = Counter(
        f["properties"].get("district_code") for f in zoning["features"]
    ).most_common()
    stats_path.write_text(json.dumps(stats, indent=2))
    print("district codes", stats["zoning_codes"])
    print("Done.")


if __name__ == "__main__":
    main()
