#!/usr/bin/env python3
"""Refresh Eminence + New Castle layers from free public ArcGIS / Kentucky GIS services."""

from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

# Eminence (south) through New Castle (county seat, north) with a small pad.
BBOX = {
    "xmin": -85.21,
    "ymin": 38.34,
    "xmax": -85.14,
    "ymax": 38.45,
    "spatialReference": {"wkid": 4326},
}
WIDE_BBOX = {
    "xmin": -85.30,
    "ymin": 38.28,
    "xmax": -85.05,
    "ymax": 38.50,
    "spatialReference": {"wkid": 4326},
}
FOCUS_MUNIS = {"eminence", "new castle"}


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

    print("City boundaries (Eminence + New Castle)…")
    city = query(
        f"{base}/Ky_CityBnd_Polygon_WGS84WM/MapServer/0/query",
        {
            "where": (
                "UPPER(COUNTY) LIKE '%HENRY%' AND "
                "(UPPER(NAME)='EMINENCE' OR UPPER(NAME)='NEW CASTLE')"
            ),
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
    flood = slim_features(flood, ["FLD_ZONE", "ZONE_SUBTY", "SFHA_TF"])

    def simplify_ring(ring, step=5):
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

    for feat in flood.get("features", []):
        geom = feat.get("geometry") or {}
        t = geom.get("type")
        if t == "Polygon":
            feat["geometry"] = {
                "type": t,
                "coordinates": [simplify_ring(r) for r in geom.get("coordinates", [])],
            }
        elif t == "MultiPolygon":
            feat["geometry"] = {
                "type": t,
                "coordinates": [[simplify_ring(r) for r in poly] for poly in geom.get("coordinates", [])],
            }
    write_geojson(DATA / "flood-hazards.geojson", flood)

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
            "where": "UPPER(CITY) IN ('EMINENCE','NEW CASTLE')",
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

    print("Henry County…")
    county = query(
        f"{base}/Ky_CountyShading_WGS84WM/MapServer/0/query",
        {
            "where": "UPPER(NAME)='HENRY'",
            "outFields": "NAME,NAME2,SEAT,POP10,MILES_SQ,ADDNAME",
            "returnGeometry": "true",
            "f": "geojson",
        },
    )
    for feat in county.get("features", []):
        p = feat.get("properties") or {}
        feat["properties"] = {
            "name": p.get("NAME2") or p.get("NAME"),
            "seat": p.get("SEAT"),
            "pop_2010": p.get("POP10"),
            "sq_miles": p.get("MILES_SQ"),
            "add": p.get("ADDNAME"),
        }
    write_geojson(DATA / "henry-county.geojson", county)

    print("Fire districts…")
    fire = query(
        f"{base}/Ky_911_RSB_Fire_WGS84WM/MapServer/0/query",
        bbox_params(BBOX, "DsplayName,Agency_ID,ServiceNum,State,DateUpdate"),
    )
    for feat in fire.get("features", []):
        p = feat.get("properties") or {}
        name = p.get("DsplayName") or ""
        lower = name.lower()
        if lower == "eminence fd":
            name = "Eminence Fire Department"
        elif lower in ("new castle fd", "newcastle fd"):
            name = "New Castle Fire Department"
        feat["properties"] = {
            "name": name,
            "agency": p.get("Agency_ID"),
            "service": p.get("ServiceNum"),
        }
    write_geojson(DATA / "fire-districts.geojson", fire)

    print("Bridges…")
    bridges = query(
        f"{base}/Ky_Bridge_Points_WGS84WM/MapServer/0/query",
        bbox_params(WIDE_BBOX, "*"),
    )
    near = []
    for feat in bridges.get("features", []):
        p = feat.get("properties") or {}
        coords = (feat.get("geometry") or {}).get("coordinates") or []
        if len(coords) < 2:
            continue
        lon, lat = coords[0], coords[1]
        if not (-85.25 <= lon <= -85.10 and 38.32 <= lat <= 38.46):
            continue
        feat["properties"] = {
            "bridge_id": p.get("BRIDGE_ID"),
            "name": p.get("BRLOC_LOCAL") or p.get("LOCATION") or p.get("RT_DESCR"),
            "route": p.get("FACILITY_7") or p.get("RT_DESCR"),
            "feature": p.get("FEATINT"),
            "year_built": p.get("YEARBUILT"),
            "length_ft": p.get("LENGTH"),
            "county": p.get("CNTY_NAME"),
            "historic": p.get("D_HISTSIGN"),
            "posted": p.get("D_OPPOSTCL"),
        }
        near.append(feat)
    write_geojson(DATA / "bridges.geojson", {"type": "FeatureCollection", "features": near})

    print("Wastewater / water utilities…")
    wwtp = query(
        f"{base}/Ky_Wastewater_WGS84WM/MapServer/1/query",
        bbox_params(WIDE_BBOX, "*"),
    )
    wwtp_keep = []
    for feat in wwtp.get("features", []):
        p = feat.get("properties") or {}
        name = p.get("STPNAME") or p.get("SYS_NAME") or ""
        upper = name.upper()
        if "EMINENCE" not in upper and "NEW CASTLE" not in upper and "NEWCASTLE" not in upper:
            continue
        feat["properties"] = {
            "name": name,
            "system": p.get("SYS_NAME"),
            "type": p.get("OTHTYPE") or p.get("TYPE"),
            "treatment": p.get("TREATMNT"),
            "design_mgd": p.get("DES_CAP"),
            "avg_flow_mgd": p.get("AVGDFL"),
            "kpdes": p.get("KPDES"),
            "effluent_to": p.get("EFDESTNAME"),
        }
        feat["properties"] = {k: v for k, v in feat["properties"].items() if v not in (None, "")}
        wwtp_keep.append(feat)
    write_geojson(DATA / "wwtp.geojson", {"type": "FeatureCollection", "features": wwtp_keep})

    ww_imp = query(
        f"{base}/Ky_Wastewater_WGS84WM/MapServer/0/query",
        bbox_params(WIDE_BBOX, "*"),
    )
    for feat in ww_imp.get("features", []):
        p = feat.get("properties") or {}
        feat["properties"] = {
            k: v
            for k, v in {
                "name": p.get("Sys_Name") or p.get("PNum") or "Wastewater improvement",
                "type": p.get("Type") or p.get("OthType"),
                "status": p.get("Status"),
                "purpose": p.get("Purpose"),
            }.items()
            if v
        }
    write_geojson(DATA / "ww-improvements.geojson", ww_imp)

    tanks = query(
        f"{base}/Ky_Water_WGS84WM/MapServer/7/query",
        bbox_params(BBOX, "*"),
    )
    for feat in tanks.get("features", []):
        p = feat.get("properties") or {}
        feat["properties"] = {
            k: v
            for k, v in {
                "name": p.get("TANKNAME") or p.get("SYS_NAME") or "Water tank",
                "system": p.get("SYS_NAME"),
                "type": p.get("TYPE") or p.get("OTHTYPE"),
                "capacity": p.get("CAPACITY"),
            }.items()
            if v
        }
    write_geojson(DATA / "water-tanks.geojson", tanks)

    w_imp = query(
        f"{base}/Ky_Water_WGS84WM/MapServer/0/query",
        bbox_params(WIDE_BBOX, "*"),
    )
    for feat in w_imp.get("features", []):
        p = feat.get("properties") or {}
        feat["properties"] = {
            k: v
            for k, v in {
                "name": p.get("Sys_Name") or p.get("SYS_NAME") or p.get("PNum") or "Water improvement",
                "type": p.get("Type") or p.get("OthType"),
                "status": p.get("Status"),
                "purpose": p.get("Purpose"),
            }.items()
            if v
        }
    write_geojson(DATA / "water-improvements.geojson", w_imp)

    print("Derived vacancy heuristics…")
    derive_analysis()

    print("Done (free public layers only).")


def derive_analysis() -> None:
    import math
    from collections import Counter

    buildings = json.loads((DATA / "buildings.geojson").read_text())
    addresses = json.loads((DATA / "addresses.geojson").read_text())
    roads = json.loads((DATA / "roads.geojson").read_text())
    schools = json.loads((DATA / "schools.geojson").read_text())
    bridges = json.loads((DATA / "bridges.geojson").read_text())

    def centroid(geom):
        coords = []

        def walk(c):
            if isinstance(c[0], (int, float)):
                coords.append(c)
            else:
                for x in c:
                    walk(x)

        walk(geom["coordinates"])
        if not coords:
            return None
        xs = [c[0] for c in coords]
        ys = [c[1] for c in coords]
        return (sum(xs) / len(xs), sum(ys) / len(ys))

    lat = 38.36
    m_per_deg_lat = 111320
    m_per_deg_lon = 111320 * math.cos(math.radians(lat))

    def dist_m(a, b):
        dx = (a[0] - b[0]) * m_per_deg_lon
        dy = (a[1] - b[1]) * m_per_deg_lat
        return math.hypot(dx, dy)

    b_cent = []
    for i, feat in enumerate(buildings.get("features", [])):
        c = centroid(feat["geometry"])
        if c:
            b_cent.append((i, c, feat))

    a_pts = []
    for i, feat in enumerate(addresses.get("features", [])):
        g = feat.get("geometry") or {}
        if g.get("type") == "Point":
            a_pts.append((i, tuple(g["coordinates"]), feat))

    cell = 0.002
    b_grid = {}
    for item in b_cent:
        key = (int(item[1][0] / cell), int(item[1][1] / cell))
        b_grid.setdefault(key, []).append(item)
    a_grid = {}
    for item in a_pts:
        key = (int(item[1][0] / cell), int(item[1][1] / cell))
        a_grid.setdefault(key, []).append(item)

    def nearby(grid, pt, radius_m):
        gx, gy = int(pt[0] / cell), int(pt[1] / cell)
        out = []
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for item in grid.get((gx + dx, gy + dy), []):
                    if dist_m(pt, item[1]) <= radius_m:
                        out.append(item)
        return out

    vacant_addr = []
    for _, pt, feat in a_pts:
        muni = (feat.get("properties") or {}).get("muni", "").lower().strip()
        if muni not in FOCUS_MUNIS:
            continue
        if not nearby(b_grid, pt, 50):
            props = dict(feat.get("properties") or {})
            props["hint"] = "No building footprint within ~50m"
            props["analysis"] = "possible_vacant_or_missing_footprint"
            vacant_addr.append({"type": "Feature", "geometry": feat["geometry"], "properties": props})

    vacant_bldg = []
    for _, c, feat in b_cent:
        sq = (feat.get("properties") or {}).get("SQFEET") or 0
        if sq < 800:
            continue
        if not nearby(a_grid, c, 55):
            props = dict(feat.get("properties") or {})
            props["hint"] = "No address point within ~55m"
            props["analysis"] = "possible_vacant_building_or_accessory"
            vacant_bldg.append({"type": "Feature", "geometry": feat["geometry"], "properties": props})

    write_geojson(
        DATA / "analysis-unbuilt-addresses.geojson",
        {
            "type": "FeatureCollection",
            "features": vacant_addr,
            "metadata": {
                "note": (
                    "Eminence and New Castle address points with no building footprint "
                    "within ~50m. Heuristic only."
                )
            },
        },
    )
    write_geojson(
        DATA / "analysis-unaddressed-buildings.geojson",
        {
            "type": "FeatureCollection",
            "features": vacant_bldg,
            "metadata": {
                "note": "Buildings ≥800 sqft with no address within ~55m. Heuristic only."
            },
        },
    )

    occ = Counter((f.get("properties") or {}).get("OCC_CLS") or "Unknown" for f in buildings.get("features", []))
    by_muni = Counter(
        ((f.get("properties") or {}).get("muni") or "unknown").strip() or "unknown"
        for f in addresses.get("features", [])
    )
    stats = {
        "generated": "2026-07-18",
        "city": "Eminence & New Castle",
        "cities": ["Eminence", "New Castle"],
        "buildings": len(buildings.get("features", [])),
        "addresses": len(addresses.get("features", [])),
        "addresses_by_muni": by_muni.most_common(),
        "roads": len(roads.get("features", [])),
        "schools": len(schools.get("features", [])),
        "bridges": len(bridges.get("features", [])),
        "unbuilt_addresses": len(vacant_addr),
        "unaddressed_buildings": len(vacant_bldg),
        "building_occupancy": occ.most_common(10),
        "notes": "Vacancy hints are heuristics from free public GIS, not official condemned/vacant lists.",
    }
    (DATA / "stats.json").write_text(json.dumps(stats, indent=2))
    print(f"wrote stats.json ({stats['unbuilt_addresses']} unbuilt addr, {stats['unaddressed_buildings']} unaddressed bldg)")


if __name__ == "__main__":
    main()
