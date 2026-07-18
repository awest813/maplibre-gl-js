#!/usr/bin/env python3
"""Fetch additional free public GIS layers for Eminence + New Castle."""

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

KY = "https://kygisserver.ky.gov/arcgis/rest/services/WGS84WM_Services"
KIPDA = "https://services5.arcgis.com/SRuaqVyoD8TEQJga/arcgis/rest/services"


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
        "outSR": "4326",
        "f": "geojson",
        "resultRecordCount": str(record_count),
    }


def write_geojson(path: Path, fc: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(fc, separators=(",", ":")))
    print(f"wrote {path.name}: {len(fc.get('features', []))} features, {path.stat().st_size} bytes")


def simplify_ring(ring, step=4):
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


def simplify_geom(geom, step=4):
    t = geom.get("type")
    if t == "Polygon":
        return {"type": t, "coordinates": [simplify_ring(r, step) for r in geom.get("coordinates", [])]}
    if t == "MultiPolygon":
        return {
            "type": t,
            "coordinates": [[simplify_ring(r, step) for r in poly] for poly in geom.get("coordinates", [])],
        }
    if t == "LineString":
        coords = geom.get("coordinates") or []
        if len(coords) <= 4:
            return geom
        kept = coords[:: max(1, step)]
        if kept[0] != coords[0]:
            kept = [coords[0]] + kept
        if kept[-1] != coords[-1]:
            kept.append(coords[-1])
        return {"type": t, "coordinates": kept}
    if t == "MultiLineString":
        return {
            "type": t,
            "coordinates": [
                simplify_geom({"type": "LineString", "coordinates": ls}, step)["coordinates"]
                for ls in geom.get("coordinates", [])
            ],
        }
    return geom


def clean_props(mapping: dict) -> dict:
    return {k: v for k, v in mapping.items() if v not in (None, "", [])}


def titleish(value) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    if text.isupper() or text.islower():
        return " ".join(part.capitalize() for part in text.replace("_", " ").split())
    return text


def fetch_paginated(url: str, bbox: dict, out_fields: str = "*", page: int = 1000) -> dict:
    features = []
    offset = 0
    while True:
        params = bbox_params(bbox, out_fields, page)
        params["resultOffset"] = str(offset)
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

    print("Wetlands…")
    wetlands = fetch_paginated(
        f"{KY}/Ky_WaterResources_Polygons_WGS84WM/MapServer/0/query",
        BBOX,
        "OBJECTID,ATTRIBUTE,WETLAND_TYPE,ACRES",
    )
    for feat in wetlands["features"]:
        p = feat.get("properties") or {}
        feat["properties"] = clean_props(
            {
                "wetland_type": p.get("WETLAND_TYPE") or p.get("ATTRIBUTE"),
                "attribute": p.get("ATTRIBUTE"),
                "acres": p.get("ACRES"),
            }
        )
        feat["geometry"] = simplify_geom(feat.get("geometry") or {}, 6)
    write_geojson(DATA / "wetlands.geojson", wetlands)

    print("Sinkholes…")
    sinkholes = query(
        f"{KY}/Ky_WaterResources_Polygons_WGS84WM/MapServer/1/query",
        bbox_params(BBOX, "OBJECTID,ACRES,HECTARES"),
    )
    for feat in sinkholes.get("features", []):
        p = feat.get("properties") or {}
        feat["properties"] = clean_props({"acres": p.get("ACRES"), "hectares": p.get("HECTARES")})
    write_geojson(DATA / "sinkholes.geojson", sinkholes)

    print("Groundwater sensitivity…")
    gw = query(
        f"{KY}/Ky_Groundwater_Sensitivity_Regions_WGS84WM/MapServer/0/query",
        bbox_params(BBOX, "OBJECTID,SQMILES,SENSITIVIT,KYGEONET"),
    )
    labels = {
        "1": "Lowest sensitivity",
        "2": "Low sensitivity",
        "3": "Moderate sensitivity",
        "4": "High sensitivity",
        "5": "Highest sensitivity",
    }
    for feat in gw.get("features", []):
        p = feat.get("properties") or {}
        code = str(p.get("SENSITIVIT") or "").strip()
        feat["properties"] = clean_props(
            {
                "sensitivity": code,
                "sensitivity_label": labels.get(code, code or "Unknown"),
                "sq_miles": p.get("SQMILES"),
            }
        )
        feat["geometry"] = simplify_geom(feat.get("geometry") or {}, 5)
    write_geojson(DATA / "groundwater-sensitivity.geojson", gw)

    print("Census block groups…")
    bgs = query(
        f"{KY}/Ky_Census_Block_Groups_2020_WGS84WM/MapServer/0/query",
        bbox_params(
            BBOX,
            "OBJECTID,BlockGroup_ID,Tract_ID,County_Name,Pop2020,White,Black,Asian,Hispanic,Multi_Race",
        ),
    )
    for feat in bgs.get("features", []):
        p = feat.get("properties") or {}
        feat["properties"] = clean_props(
            {
                "block_group_id": p.get("BlockGroup_ID"),
                "tract_id": p.get("Tract_ID"),
                "county": p.get("County_Name"),
                "pop_2020": p.get("Pop2020"),
                "white": p.get("White"),
                "black": p.get("Black"),
                "asian": p.get("Asian"),
                "hispanic": p.get("Hispanic"),
                "multi_race": p.get("Multi_Race"),
            }
        )
        feat["geometry"] = simplify_geom(feat.get("geometry") or {}, 3)
    write_geojson(DATA / "census-block-groups.geojson", bgs)

    print("EMS response areas…")
    ems = query(
        f"{KY}/Ky_911_RSB_EMS_WGS84WM/MapServer/0/query",
        bbox_params(BBOX, "DsplayName,Agency_ID,ServiceNum,State,DateUpdate"),
    )
    ems_keep = []
    for feat in ems.get("features", []):
        p = feat.get("properties") or {}
        agency = str(p.get("Agency_ID") or p.get("DsplayName") or "")
        if "shelby" in agency.lower():
            continue
        name = titleish(p.get("DsplayName") or p.get("Agency_ID") or "EMS")
        if "henry" in name.lower():
            name = "Henry County EMS"
        feat["properties"] = clean_props(
            {"name": name, "agency": p.get("Agency_ID"), "service": p.get("ServiceNum")}
        )
        feat["geometry"] = simplify_geom(feat.get("geometry") or {}, 4)
        ems_keep.append(feat)
    write_geojson(DATA / "ems-districts.geojson", {"type": "FeatureCollection", "features": ems_keep})

    print("Law response areas…")
    law = query(
        f"{KY}/Ky_911_RSB_Law_WGS84WM/MapServer/0/query",
        bbox_params(BBOX, "DsplayName,Agency_ID,ServiceNum,State,DateUpdate"),
    )
    law_keep = []
    for feat in law.get("features", []):
        p = feat.get("properties") or {}
        raw = p.get("DsplayName") or p.get("Agency_ID") or "Law"
        if "shelby" in str(raw).lower() or "shelby" in str(p.get("Agency_ID") or "").lower():
            continue
        name = titleish(raw)
        replacements = {
            "Eminence Pd": "Eminence Police Department",
            "New Castle Pd": "New Castle Police Department",
            "Henry Co So": "Henry County Sheriff",
            "Ksp 05": "Kentucky State Police Post 5",
        }
        name = replacements.get(name, name)
        for src, dst in replacements.items():
            if titleish(src) == name:
                name = dst
        feat["properties"] = clean_props(
            {"name": name, "agency": p.get("Agency_ID"), "service": p.get("ServiceNum")}
        )
        feat["geometry"] = simplify_geom(feat.get("geometry") or {}, 4)
        law_keep.append(feat)
    write_geojson(DATA / "law-districts.geojson", {"type": "FeatureCollection", "features": law_keep})

    print("Airports…")
    airports = query(
        f"{KY}/Ky_Airports_WGS84WM/MapServer/0/query",
        bbox_params(WIDE_BBOX, "SiteNumber,Type,LocationID,County,City,FacilityNa,Ownership"),
    )
    kept_airports = []
    for feat in airports.get("features", []):
        p = feat.get("properties") or {}
        county = str(p.get("County") or "").upper()
        if "HENRY" not in county:
            continue
        feat["properties"] = clean_props(
            {
                "name": titleish(p.get("FacilityNa") or p.get("LocationID") or "Airport"),
                "type": p.get("Type"),
                "location_id": p.get("LocationID"),
                "city": titleish(p.get("City")),
                "county": titleish(p.get("County")),
                "ownership": p.get("Ownership"),
            }
        )
        kept_airports.append(feat)
    write_geojson(DATA / "airports.geojson", {"type": "FeatureCollection", "features": kept_airports})

    print("Fire stations…")
    fire = query(f"{KIPDA}/Fire_Departments/FeatureServer/0/query", bbox_params(WIDE_BBOX, "*"))
    fire_keep = []
    for feat in fire.get("features", []):
        p = feat.get("properties") or {}
        county = str(p.get("County") or "").upper()
        city = str(p.get("City") or "").upper()
        name = p.get("DepartmentName") or "Fire department"
        if county and "HENRY" not in county and city not in {"EMINENCE", "NEW CASTLE", "PLEASUREVILLE"}:
            continue
        if "SHELBY" in name.upper() and "HENRY" not in county:
            continue
        feat["properties"] = clean_props(
            {
                "name": name,
                "station": p.get("StationNumber"),
                "address": p.get("StreetAddress"),
                "city": titleish(p.get("City")),
                "zip": p.get("Zipcode"),
                "county": titleish(p.get("County")),
            }
        )
        fire_keep.append(feat)
    write_geojson(DATA / "fire-stations.geojson", {"type": "FeatureCollection", "features": fire_keep})

    print("Police stations…")
    police = query(f"{KIPDA}/Police_Departments/FeatureServer/0/query", bbox_params(WIDE_BBOX, "*"))
    for feat in police.get("features", []):
        p = feat.get("properties") or {}
        addr_parts = [p.get("ADDR_NUMBE"), p.get("RDPREFIX"), p.get("RDNAME"), p.get("RDSUFFIX")]
        feat["properties"] = clean_props(
            {
                "name": titleish(p.get("NAME") or "Police"),
                "address": " ".join(str(x) for x in addr_parts if x),
                "city": titleish(p.get("CITY")),
                "zip": p.get("ZIP"),
                "phone": p.get("PHONE") or p.get("DISP_PHONE"),
            }
        )
    write_geojson(DATA / "police-stations.geojson", police)

    print("Libraries…")
    libraries = query(f"{KIPDA}/Libraries/FeatureServer/0/query", bbox_params(WIDE_BBOX, "*"))
    for feat in libraries.get("features", []):
        p = feat.get("properties") or {}
        feat["properties"] = clean_props(
            {
                "name": p.get("Library_Na") or "Library",
                "address": p.get("Mailing_Ad"),
                "city": titleish(p.get("City")),
                "county": titleish(p.get("County")),
                "type": p.get("Type_"),
            }
        )
    write_geojson(DATA / "libraries.geojson", libraries)

    print("Parks & open space…")
    parks = query(f"{KIPDA}/Parks_and_Open_Spaces/FeatureServer/3/query", bbox_params(WIDE_BBOX, "*"))
    for feat in parks.get("features", []):
        p = feat.get("properties") or {}
        name = p.get("NAME") or p.get("NAME_1") or p.get("TYPE") or "Park / open space"
        feat["properties"] = clean_props(
            {
                "name": titleish(name) if isinstance(name, str) and name else "Park / open space",
                "type": p.get("TYPE"),
                "owner": p.get("OWNER"),
                "address": p.get("ADDRESS"),
                "city": titleish(p.get("CITY") or p.get("City")),
                "zip": p.get("ZIP"),
                "county": titleish(p.get("County")),
            }
        )
        feat["geometry"] = simplify_geom(feat.get("geometry") or {}, 3)
    write_geojson(DATA / "parks-open-space.geojson", parks)

    print("Courthouses…")
    courts = query(f"{KIPDA}/Courthouses/FeatureServer/0/query", bbox_params(WIDE_BBOX, "*"))
    for feat in courts.get("features", []):
        p = feat.get("properties") or {}
        addr_parts = [p.get("ADDR_NUMBE"), p.get("RDPREFIX"), p.get("RDNAME"), p.get("RDSUFFIX")]
        feat["properties"] = clean_props(
            {
                "name": titleish(p.get("NAME") or "Courthouse"),
                "address": " ".join(str(x) for x in addr_parts if x),
                "city": titleish(p.get("CITY")),
                "zip": p.get("ZIP"),
                "phone": p.get("PHONE"),
            }
        )
    write_geojson(DATA / "courthouses.geojson", courts)

    print("Health centers…")
    health = query(f"{KIPDA}/Health_Department/FeatureServer/0/query", bbox_params(WIDE_BBOX, "*"))
    for feat in health.get("features", []):
        p = feat.get("properties") or {}
        feat["properties"] = clean_props(
            {
                "name": p.get("Name") or "Health center",
                "address": p.get("Address"),
                "city": titleish(p.get("City")),
                "zip": p.get("Zipcode"),
                "county": titleish(p.get("County")),
                "director": p.get("DirectorName"),
            }
        )
    write_geojson(DATA / "health-centers.geojson", health)

    print("EMS agencies…")
    ems_pts = query(f"{KIPDA}/EMS_Agencies/FeatureServer/0/query", bbox_params(WIDE_BBOX, "*"))
    for feat in ems_pts.get("features", []):
        p = feat.get("properties") or {}
        name = p.get("PlaceName") or p.get("ShortLabel") or p.get("LongLabel") or "EMS agency"
        addr = p.get("Place_addr") or p.get("Match_addr")
        if isinstance(name, str) and name[:1].isdigit() and addr and "eminence" in str(addr).lower():
            name = "Henry County EMS"
        feat["properties"] = clean_props(
            {
                "name": name,
                "address": addr,
                "phone": p.get("Phone"),
                "url": p.get("URL"),
            }
        )
    write_geojson(DATA / "ems-agencies.geojson", ems_pts)

    print("EV chargers…")
    ev = query(f"{KIPDA}/EV_ChargeStation_KIPDA_KY/FeatureServer/0/query", bbox_params(WIDE_BBOX, "*"))
    for feat in ev.get("features", []):
        p = feat.get("properties") or {}
        feat["properties"] = clean_props(
            {
                "name": p.get("Station_Na") or "EV charger",
                "address": p.get("Street_Add"),
                "city": titleish(p.get("City")),
                "zip": p.get("ZIP"),
                "phone": p.get("Station_Ph"),
                "fuel_type": p.get("Fuel_Type_"),
                "level1": p.get("EV_Level1_"),
                "level2": p.get("EV_Level2_"),
                "access": p.get("Access_Day") or p.get("Groups_Wit"),
            }
        )
    write_geojson(DATA / "ev-chargers.geojson", ev)

    print("Magisterial districts…")
    mag = query(f"{KIPDA}/HenryCoPrecincts/FeatureServer/0/query", bbox_params(WIDE_BBOX, "*"))
    for feat in mag.get("features", []):
        p = feat.get("properties") or {}
        raw = str(p.get("Magisteria") or "").rstrip(":")
        feat["properties"] = clean_props(
            {
                "name": raw or "Magisterial district",
                "population": p.get("SUM_TotalPop"),
            }
        )
        feat["geometry"] = simplify_geom(feat.get("geometry") or {}, 4)
    write_geojson(DATA / "magisterial-districts.geojson", mag)

    print("Nursing / assisted living…")
    nursing = query(
        f"{KIPDA}/Nursing_Home_and_Assisted_Living_Facilities/FeatureServer/0/query",
        bbox_params(WIDE_BBOX, "*"),
    )
    for feat in nursing.get("features", []):
        p = feat.get("properties") or {}
        name = p.get("PlaceName") or p.get("LongLabel") or p.get("ShortLabel") or "Care facility"
        if isinstance(name, str) and "," in name:
            name = name.split(",")[0].strip()
        feat["properties"] = clean_props(
            {
                "name": name,
                "address": p.get("Place_addr") or p.get("Match_addr"),
                "phone": p.get("Phone"),
                "type": p.get("Type") or "Nursing / assisted living",
            }
        )
    write_geojson(DATA / "nursing-homes.geojson", nursing)

    print("Public housing…")
    housing = query(
        f"{KIPDA}/Public_Housing_Developments/FeatureServer/0/query",
        bbox_params(WIDE_BBOX, "*"),
    )
    for feat in housing.get("features", []):
        p = feat.get("properties") or {}
        feat["properties"] = clean_props(
            {
                "name": p.get("FORMAL_PAR") or p.get("PROJECT_NA") or "Public housing",
                "development": p.get("DEVELOPMEN") or p.get("PROJECT_NA"),
                "total_units": p.get("TOTAL_UNIT") or p.get("TOTAL_DWEL"),
                "occupied_units": p.get("TOTAL_OCCU"),
                "pct_occupied": p.get("PCT_OCCUPI"),
                "status": p.get("PD_STATUS_"),
            }
        )
    write_geojson(DATA / "public-housing.geojson", housing)

    print("Brownfield sites…")
    brownfields = query(f"{KIPDA}/CED_Brownfield_Sites/FeatureServer/0/query", bbox_params(WIDE_BBOX, "*"))
    for feat in brownfields.get("features", []):
        p = feat.get("properties") or {}
        feat["properties"] = clean_props(
            {
                "name": p.get("Site_Name") or "Brownfield site",
                "address": p.get("Address"),
                "city": titleish(p.get("City")),
                "zip": p.get("ZIP"),
                "county": titleish(p.get("County")),
                "acres": p.get("Acres"),
                "building_size": p.get("Building_Size"),
                "former_use": p.get("Former_Property_Use"),
                "current_use": p.get("Current_Property_Use"),
                "projected_reuse": p.get("Projected_Reuse"),
                "ownership": p.get("Ownership__Private_or_Public"),
                "program": p.get("Program_Activities"),
            }
        )
    write_geojson(DATA / "brownfields.geojson", brownfields)

    print("Industrial parks…")
    industrial = query(f"{KIPDA}/Kipda_Industrial_parks/FeatureServer/0/query", bbox_params(WIDE_BBOX, "*"))
    for feat in industrial.get("features", []):
        p = feat.get("properties") or {}
        feat["properties"] = clean_props(
            {
                "name": p.get("NAME") or p.get("LANDUSE_ID") or "Industrial park",
                "county": titleish(p.get("COUNTY")),
                "landuse_id": p.get("LANDUSE_ID"),
            }
        )
        feat["geometry"] = simplify_geom(feat.get("geometry") or {}, 3)
    write_geojson(DATA / "industrial-parks.geojson", industrial)

    print("Traffic counts…")
    traffic = query(f"{KIPDA}/KIPDA_TrafficCounts2024/FeatureServer/0/query", bbox_params(BBOX, "*"))
    for feat in traffic.get("features", []):
        p = feat.get("properties") or {}
        route = str(p.get("Route") or "").strip()
        feat["properties"] = clean_props(
            {
                "name": route or "Traffic count",
                "route": route,
                "year": p.get("Year"),
                "count": p.get("Count_"),
                "truck_aadt": p.get("Truck_AADT"),
                "truck_percent": p.get("Truck_Percent"),
                "county": titleish(p.get("County")),
                "source": p.get("Source"),
            }
        )
    write_geojson(DATA / "traffic-counts.geojson", traffic)

    print("Trails / multi-use paths…")
    trails = query(f"{KIPDA}/MultiUsePath/FeatureServer/0/query", bbox_params(WIDE_BBOX, "*"))
    for feat in trails.get("features", []):
        p = feat.get("properties") or {}
        name = str(p.get("TRAIL_NAME") or "Trail").replace("EMINEMCE", "EMINENCE")
        feat["properties"] = clean_props(
            {
                "name": titleish(name),
                "owner": p.get("OWNER") or p.get("MANAGER"),
                "surface": p.get("SURFACE") or p.get("OTHSURFACE"),
                "hiking": p.get("HIKING"),
                "biking": p.get("BIKING"),
                "ada_access": p.get("ADA_ACCESS"),
            }
        )
    write_geojson(DATA / "trails.geojson", trails)

    print("Voting precincts…")
    precincts = query(f"{KIPDA}/HenryPecincts2023/FeatureServer/0/query", bbox_params(WIDE_BBOX, "*"))
    for feat in precincts.get("features", []):
        p = feat.get("properties") or {}
        feat["properties"] = clean_props(
            {
                "name": titleish(p.get("PREC_NAME") or "Precinct"),
                "vtd": p.get("VTD"),
            }
        )
        feat["geometry"] = simplify_geom(feat.get("geometry") or {}, 5)
    write_geojson(DATA / "voting-precincts.geojson", precincts)

    print("Social vulnerability…")
    svi = query(
        f"{KIPDA}/KIPDA_Social_Vulnerability_Index/FeatureServer/0/query",
        bbox_params(BBOX, "*"),
    )
    svi_keep = []
    for feat in svi.get("features", []):
        p = feat.get("properties") or {}
        if str(p.get("COUNTY") or "").upper() not in {"HENRY", "HENRY COUNTY"}:
            continue
        feat["properties"] = clean_props(
            {
                "name": p.get("LOCATION") or p.get("FIPS") or "SVI area",
                "county": titleish(p.get("COUNTY")),
                "fips": p.get("FIPS"),
                "population": p.get("E_TOTPOP"),
                "poverty": p.get("E_POV"),
                "unemployed": p.get("E_UNEMP"),
                "area_sqmi": p.get("AREA_SQMI"),
            }
        )
        feat["geometry"] = simplify_geom(feat.get("geometry") or {}, 4)
        svi_keep.append(feat)
    write_geojson(DATA / "social-vulnerability.geojson", {"type": "FeatureCollection", "features": svi_keep})

    print("Broadband coverage…")
    broadband = query(
        f"{KIPDA}/KIPDA_Region_Broadband_KY/FeatureServer/0/query",
        bbox_params(BBOX, "*"),
    )
    for feat in broadband.get("features", []):
        p = feat.get("properties") or {}
        zcta = p.get("ZCTA5CE10") or p.get("GEOID10")
        feat["properties"] = clean_props(
            {
                "name": f"ZIP {zcta}" if zcta else "Broadband area",
                "zip": zcta,
                "pct_lack_access": p.get("Per_Lack"),
                "avg_speed": p.get("Av_Speed"),
            }
        )
        feat["geometry"] = simplify_geom(feat.get("geometry") or {}, 6)
    write_geojson(DATA / "broadband.geojson", broadband)

    print("Regulated dams…")
    dams = query(f"{KIPDA}/DOW_Regulated_Dams_KIPDA/FeatureServer/1/query", bbox_params(WIDE_BBOX, "*"))
    dam_keep = []
    for feat in dams.get("features", []):
        p = feat.get("properties") or {}
        if "HENRY" not in str(p.get("COUNTY") or "").upper():
            continue
        feat["properties"] = clean_props(
            {
                "name": titleish(p.get("DAMNAME") or p.get("DAMID") or "Dam"),
                "hazard_class": p.get("HAZCLASS"),
                "county": titleish(p.get("COUNTY")),
                "eap_status": p.get("EAPSTATUS"),
                "nid": p.get("NID"),
                "dam_id": p.get("DAMID"),
            }
        )
        dam_keep.append(feat)
    write_geojson(DATA / "dams.geojson", {"type": "FeatureCollection", "features": dam_keep})

    print("Priority watersheds…")
    watersheds = query(
        f"{KY}/Ky_DOW_Priority_Watersheds_WGS84WM/MapServer/0/query",
        bbox_params(WIDE_BBOX, "OBJECTID,huc12,HUC12_Name,Type"),
    )
    for feat in watersheds.get("features", []):
        p = feat.get("properties") or {}
        feat["properties"] = clean_props(
            {
                "name": p.get("HUC12_Name") or p.get("huc12") or "Watershed",
                "huc12": p.get("huc12"),
                "type": p.get("Type"),
            }
        )
        feat["geometry"] = simplify_geom(feat.get("geometry") or {}, 5)
    write_geojson(DATA / "priority-watersheds.geojson", watersheds)

    print("Sinkhole drainage areas…")
    sink_drain = query(
        f"{KY}/Ky_WaterResources_Polygons_WGS84WM/MapServer/2/query",
        bbox_params(BBOX, "OBJECTID"),
    )
    for i, feat in enumerate(sink_drain.get("features", []), start=1):
        feat["properties"] = {"name": f"Sinkhole drainage {i}"}
        feat["geometry"] = simplify_geom(feat.get("geometry") or {}, 4)
    write_geojson(DATA / "sinkhole-drainage.geojson", sink_drain)

    print("Karst potential…")
    karst = query(f"{KIPDA}/Karst_Potential_KIPDA_HMP/FeatureServer/2/query", bbox_params(BBOX, "*"))
    for feat in karst.get("features", []):
        p = feat.get("properties") or {}
        feat["properties"] = clean_props(
            {
                "name": p.get("DESCRIPTIO") or "Karst potential",
                "acres": p.get("ACRES"),
                "area_miles": p.get("AREA_MILES"),
            }
        )
        feat["geometry"] = simplify_geom(feat.get("geometry") or {}, 8)
    write_geojson(DATA / "karst-potential.geojson", karst)

    print("Sewer planning units…")
    sewer = query(f"{KIPDA}/Wastewater_Systems/FeatureServer/9/query", bbox_params(WIDE_BBOX, "*"))
    sewer_keep = []
    for feat in sewer.get("features", []):
        p = feat.get("properties") or {}
        if str(p.get("NAME") or p.get("ADDNAME") or "").upper() != "HENRY":
            continue
        feat["properties"] = clean_props(
            {
                "name": f"{titleish(p.get('NAME') or 'Henry')} sewer planning unit",
                "population": p.get("POPULATION"),
                "pop_served": p.get("POP_SERVED"),
                "households_served": p.get("HSH_SERVED"),
                "pct_served": p.get("PCT_SERVED"),
                "systems": p.get("NO_SYSTEMS"),
            }
        )
        feat["geometry"] = simplify_geom(feat.get("geometry") or {}, 5)
        sewer_keep.append(feat)
    write_geojson(DATA / "sewer-planning-units.geojson", {"type": "FeatureCollection", "features": sewer_keep})

    print("Water pump stations…")
    pumps = query(f"{KIPDA}/Water_System_Data/FeatureServer/2/query", bbox_params(WIDE_BBOX, "*"))
    for feat in pumps.get("features", []):
        p = feat.get("properties") or {}
        feat["properties"] = clean_props(
            {
                "name": p.get("SYS_NAME") or p.get("PSTAT_ID") or "Water pump station",
                "system": p.get("SYS_NAME"),
                "pwsid": p.get("PWSID"),
                "capacity": p.get("WP_CAP"),
                "use": p.get("WP_USE") or p.get("WP_OTHUSE"),
                "type": p.get("WP_TYPE") or p.get("WP_OTHTYPE"),
                "pumps": p.get("NO_PUMPS"),
            }
        )
    write_geojson(DATA / "water-pump-stations.geojson", pumps)

    stats_path = DATA / "stats.json"
    stats = json.loads(stats_path.read_text()) if stats_path.exists() else {}
    stats.update(
        {
            "wetlands": len(wetlands.get("features", [])),
            "sinkholes": len(sinkholes.get("features", [])),
            "groundwater_regions": len(gw.get("features", [])),
            "census_block_groups": len(bgs.get("features", [])),
            "fire_stations": len(fire_keep),
            "police_stations": len(police.get("features", [])),
            "libraries": len(libraries.get("features", [])),
            "parks_open_space": len(parks.get("features", [])),
            "courthouses": len(courts.get("features", [])),
            "health_centers": len(health.get("features", [])),
            "ev_chargers": len(ev.get("features", [])),
            "magisterial_districts": len(mag.get("features", [])),
            "airports": len(kept_airports),
            "nursing_homes": len(nursing.get("features", [])),
            "public_housing": len(housing.get("features", [])),
            "brownfields": len(brownfields.get("features", [])),
            "industrial_parks": len(industrial.get("features", [])),
            "traffic_counts": len(traffic.get("features", [])),
            "trails": len(trails.get("features", [])),
            "voting_precincts": len(precincts.get("features", [])),
            "social_vulnerability_areas": len(svi_keep),
            "broadband_areas": len(broadband.get("features", [])),
            "dams": len(dam_keep),
            "priority_watersheds": len(watersheds.get("features", [])),
            "wetland_types": Counter(
                (f.get("properties") or {}).get("wetland_type") for f in wetlands.get("features", [])
            ).most_common(),
        }
    )
    stats_path.write_text(json.dumps(stats, indent=2))
    print("updated stats.json")
    print("Done.")


if __name__ == "__main__":
    main()
