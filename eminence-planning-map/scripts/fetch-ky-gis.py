#!/usr/bin/env python3
"""Refresh Eminence layers from free public ArcGIS / Kentucky GIS services."""

from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
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
WIDE_BBOX = {
    "xmin": -85.30,
    "ymin": 38.28,
    "xmax": -85.05,
    "ymax": 38.45,
    "spatialReference": {"wkid": 4326},
}


def query(url: str, params: dict) -> dict:
    full = url + "?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(full, timeout=180) as resp:
        return json.loads(resp.read().decode())


def bbox_params(bbox: dict, out_fields: str = "*", record_count: int = 5000) -> dict:
    return {
        "where": "1=1",
        "geometry": json.dumps(bbox),
        "geometryType": "esriGeometryEnvelope",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": out_fields,
        "returnGeometry": "true",
        "f": "geojson",
        "resultRecordCount": str(record_count),
    }


def write_geojson(path: Path, fc: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(fc, separators=(",", ":")))
    print(f"wrote {path.name}: {len(fc.get('features', []))} features, {path.stat().st_size} bytes")


def slim_features(fc: dict, keep: list[str], enrich=None) -> dict:
    for feat in fc.get("features", []):
        props = feat.get("properties") or {}
        new_props = {k: props.get(k) for k in keep if props.get(k) not in (None, "")}
        if enrich:
            new_props.update(enrich(props))
        feat["properties"] = new_props
    return fc


def road_enrich(props: dict) -> dict:
    parts = [props.get("St_PreDir"), props.get("St_Name"), props.get("St_PosTyp") or props.get("St_PosMod")]
    name = " ".join(x for x in parts if x)
    full = name.upper()
    kind = "local"
    if re.search(r"\bKY\b|\bUS\b|HIGHWAY|HWY", full):
        kind = "state"
    if (props.get("St_PosTyp") or "").lower() == "alley":
        kind = "alley"
    return {"name": name or props.get("St_Name") or "", "kind": kind, "muni": props.get("IncMuni_L") or ""}


def addr_enrich(props: dict) -> dict:
    num = props.get("Add_Number")
    parts = [
        str(num) if num not in (None, "") else None,
        props.get("St_PreDir"),
        props.get("St_Name"),
        props.get("St_PosTyp"),
    ]
    return {
        "address": " ".join(str(x) for x in parts if x),
        "muni": props.get("Inc_Muni") or "",
        "zip": props.get("Post_Code") or "",
    }


def fetch_paginated(url: str, out_fields: str, page: int = 1000) -> dict:
    features = []
    offset = 0
    while True:
        params = bbox_params(BBOX, out_fields, page)
        params["resultOffset"] = str(offset)
        params["orderByFields"] = "OBJECTID ASC"
        chunk = query(url, params)
        if "error" in chunk:
            raise RuntimeError(chunk["error"])
        feats = chunk.get("features", [])
        features.extend(feats)
        print(f"  offset {offset}: {len(feats)}")
        if len(feats) < page:
            break
        offset += len(feats)
    return {"type": "FeatureCollection", "features": features}


def main() -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    base = "https://kygisserver.ky.gov/arcgis/rest/services/WGS84WM_Services"

    print("City boundary…")
    city = query(
        f"{base}/Ky_CityBnd_Polygon_WGS84WM/MapServer/0/query",
        {
            "where": "NAME LIKE '%EMINENCE%'",
            "outFields": "NAME,FIPS,COUNTY,INCORP,CLASS,Area_SqMiles,POP2010,LAST_UPDT,CITYFIPS",
            "returnGeometry": "true",
            "f": "geojson",
        },
    )
    write_geojson(
        DATA / "city-boundary.geojson",
        slim_features(
            city,
            ["NAME", "FIPS", "COUNTY", "INCORP", "CLASS", "Area_SqMiles", "POP2010", "LAST_UPDT", "CITYFIPS"],
        ),
    )

    print("Roads…")
    roads = query(f"{base}/Ky_911_Road_Centerlines_WGS84WM/MapServer/0/query", bbox_params(BBOX))
    write_geojson(
        DATA / "roads.geojson",
        slim_features(
            roads,
            ["St_Name", "St_PreDir", "St_PosTyp", "IncMuni_L", "SpeedLimit", "OneWay", "DateUpdate"],
            road_enrich,
        ),
    )

    print("Addresses…")
    addrs = query(f"{base}/Ky_911_Site_Structure_Address_Points_WGS84WM/MapServer/0/query", bbox_params(BBOX))
    write_geojson(
        DATA / "addresses.geojson",
        slim_features(
            addrs,
            ["Add_Number", "St_Name", "St_PreDir", "St_PosTyp", "Inc_Muni", "Post_Code", "Place_Type", "DateUpdate"],
            addr_enrich,
        ),
    )

    print("Buildings…")
    buildings = fetch_paginated(
        f"{base}/Ky_ORNL_Building_Footprints_WGS84WM/MapServer/0/query",
        "OBJECTID,BUILD_ID,OCC_CLS,PRIM_OCC,PROP_ADDR,PROP_CITY,HEIGHT,SQFEET,PROD_DATE,SOURCE",
    )
    write_geojson(
        DATA / "buildings.geojson",
        slim_features(
            buildings,
            ["BUILD_ID", "OCC_CLS", "PRIM_OCC", "PROP_ADDR", "PROP_CITY", "HEIGHT", "SQFEET", "PROD_DATE", "SOURCE"],
        ),
    )

    print("Streams…")
    streams = query(
        f"{base}/Ky_24K_NHD_Blueline_Streams_WGS84WM/MapServer/0/query",
        bbox_params(BBOX, "OBJECTID,GNIS_Name,FType,FCode"),
    )
    write_geojson(DATA / "streams.geojson", slim_features(streams, ["OBJECTID", "GNIS_Name", "FType", "FCode"]))

    print("Waterbodies…")
    water = query(
        f"{base}/Ky_24K_NHD_Waterbodies_WGS84WM/MapServer/0/query",
        bbox_params(BBOX, "OBJECTID,GNIS_Name,FType,FCode,AreaSqKm"),
    )
    write_geojson(
        DATA / "waterbodies.geojson",
        slim_features(water, ["OBJECTID", "GNIS_Name", "FType", "FCode", "AreaSqKm"]),
    )

    print("Flood hazards…")
    flood = query(
        "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/"
        "USA_Flood_Hazard_Reduced_Set_gdb/FeatureServer/0/query",
        bbox_params(BBOX, "OBJECTID,FLD_ZONE,ZONE_SUBTY,SFHA_TF", 2000),
    )
    write_geojson(DATA / "flood-hazards.geojson", slim_features(flood, ["FLD_ZONE", "ZONE_SUBTY", "SFHA_TF"]))

    print("Railroads…")
    rail = query(f"{base}/Ky_Railroads_WGS84WM/MapServer/0/query", bbox_params(WIDE_BBOX, "*"))
    for feat in rail.get("features", []):
        p = feat.get("properties") or {}
        feat["properties"] = {
            k: p[k]
            for k in [
                "RR_Class",
                "RR_Status",
                "RR_Management_Company",
                "Track_Name",
                "CNTY_NAME",
            ]
            if p.get(k) not in (None, "")
        }
    write_geojson(DATA / "railroads.geojson", rail)

    print("Schools…")
    schools = query(
        f"{base}/Ky_Schools_WGS84WM/MapServer/0/query",
        {
            "where": "UPPER(CITY) = 'EMINENCE' OR UPPER(COUNTY) = 'HENRY'",
            "geometry": json.dumps(WIDE_BBOX),
            "geometryType": "esriGeometryEnvelope",
            "inSR": "4326",
            "spatialRel": "esriSpatialRelIntersects",
            "outFields": "SCHNAME,STREETADDRESS,CITY,ZIP,COUNTY,SCHTYPE,CLASSIFICA,LOW_GRADE,HIGH_GRADE,KDEDIST_NM",
            "returnGeometry": "true",
            "f": "geojson",
            "resultRecordCount": "1000",
        },
    )
    for feat in schools.get("features", []):
        p = feat.get("properties") or {}
        feat["properties"] = {
            "name": p.get("SCHNAME"),
            "address": p.get("STREETADDRESS"),
            "city": p.get("CITY"),
            "zip": p.get("ZIP"),
            "county": p.get("COUNTY"),
            "type": p.get("SCHTYPE"),
            "classification": p.get("CLASSIFICA"),
            "grades": f"{p.get('LOW_GRADE') or ''}-{p.get('HIGH_GRADE') or ''}".strip("-"),
            "district": p.get("KDEDIST_NM"),
        }
    write_geojson(DATA / "schools.geojson", schools)

    print("School buffers…")
    buffers = query(
        f"{base}/Ky_Public_School_Buffers_WGS84WM/MapServer/0/query",
        {
            "where": "UPPER(CITY)='EMINENCE'",
            "outFields": "*",
            "returnGeometry": "true",
            "f": "geojson",
            "resultRecordCount": "100",
        },
    )
    for feat in buffers.get("features", []):
        p = feat.get("properties") or {}
        feat["properties"] = {
            k: v
            for k, v in {
                "name": p.get("SCHNAME"),
                "address": p.get("STREETADDRESS"),
                "city": p.get("CITY"),
                "type": p.get("SCHTYPE"),
                "district": p.get("KDEDIST_NM"),
            }.items()
            if v
        }
    write_geojson(DATA / "school-buffers.geojson", buffers)

    print("School districts…")
    districts = query(
        f"{base}/Ky_School_Districts_WGS84WM/MapServer/0/query",
        {
            "where": "UPPER(NAME) LIKE '%EMINENCE%' OR UPPER(NAME) LIKE '%HENRY%'",
            "outFields": "NAME",
            "returnGeometry": "true",
            "f": "geojson",
        },
    )
    for feat in districts.get("features", []):
        feat["properties"] = {"name": (feat.get("properties") or {}).get("NAME")}
    write_geojson(DATA / "school-districts.geojson", districts)

    print("Census tracts…")
    tracts = query(
        f"{base}/Ky_Census_Tracts_2020_WGS84WM/MapServer/0/query",
        bbox_params(BBOX, "Tract_ID,County_Name,Pop2020"),
    )
    for feat in tracts.get("features", []):
        p = feat.get("properties") or {}
        feat["properties"] = {
            "tract_id": p.get("Tract_ID"),
            "county": p.get("County_Name"),
            "pop_2020": p.get("Pop2020"),
        }
    write_geojson(DATA / "census-tracts.geojson", tracts)

    print("Done (free public layers only).")


if __name__ == "__main__":
    main()
