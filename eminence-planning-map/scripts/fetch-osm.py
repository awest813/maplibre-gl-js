#!/usr/bin/env python3
"""Fetch free OpenStreetMap features for Eminence + New Castle via Overpass."""

from __future__ import annotations

import json
import math
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
BBOX = "38.345,-85.205,38.450,-85.145"  # south,west,north,east (Eminence → New Castle)
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]


def overpass(query: str) -> dict:
    last_err = None
    body = urllib.parse.urlencode({"data": query}).encode()
    for url in OVERPASS_URLS:
        try:
            req = urllib.request.Request(
                url,
                data=body,
                headers={"User-Agent": "EminencePlanningMap/1.0"},
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.loads(resp.read().decode())
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            print(f"Overpass failed at {url}: {exc}")
    raise RuntimeError(last_err)


def write(name: str, feats: list, meta: dict | None = None) -> None:
    fc: dict = {"type": "FeatureCollection", "features": feats}
    if meta:
        fc["metadata"] = meta
    path = DATA / name
    path.write_text(json.dumps(fc, separators=(",", ":")))
    print(f"wrote {name}: {len(feats)} features, {path.stat().st_size} bytes")


def way_coords(way: dict, nodes: dict) -> list:
    coords = []
    for nid in way.get("nodes", []):
        node = nodes.get(nid)
        if node and "lon" in node:
            coords.append([node["lon"], node["lat"]])
    return coords


def way_feature(way: dict, nodes: dict, props: dict):
    coords = way_coords(way, nodes)
    if len(coords) < 2:
        return None
    tags = way.get("tags") or {}
    closed = len(coords) >= 4 and coords[0] == coords[-1]
    poly_ok = tags.get("leisure") in ("park", "playground", "pitch", "sports_centre") or tags.get(
        "amenity"
    ) == "parking" or tags.get("landuse") == "recreation_ground"
    geom = (
        {"type": "Polygon", "coordinates": [coords]}
        if closed and poly_ok
        else {"type": "LineString", "coordinates": coords}
    )
    return {"type": "Feature", "geometry": geom, "properties": props}


def point_in_ring(x, y, ring) -> bool:
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi + 1e-15) + xi):
            inside = not inside
        j = i
    return inside


def point_in_poly(pt, geom) -> bool:
    x, y = pt
    if geom["type"] == "Polygon":
        rings = geom["coordinates"]
        if not point_in_ring(x, y, rings[0]):
            return False
        return not any(point_in_ring(x, y, hole) for hole in rings[1:])
    if geom["type"] == "MultiPolygon":
        return any(point_in_poly(pt, {"type": "Polygon", "coordinates": p}) for p in geom["coordinates"])
    return False


def derive_missing_sidewalks(sidewalk_feats: list) -> None:
    roads = json.loads((DATA / "roads.geojson").read_text())
    buffers = json.loads((DATA / "school-buffers.geojson").read_text())
    city = json.loads((DATA / "city-boundary.geojson").read_text())
    city_geoms = [f["geometry"] for f in city.get("features", []) if f.get("geometry")]
    buf_geoms = [f["geometry"] for f in buffers["features"]]

    sw_pts = []
    for feat in sidewalk_feats:
        geom = feat["geometry"]
        if geom["type"] == "LineString":
            sw_pts.extend(geom["coordinates"])
        elif geom["type"] == "MultiLineString":
            for ls in geom["coordinates"]:
                sw_pts.extend(ls)

    lat = 38.39
    m_lat = 111320
    m_lon = 111320 * math.cos(math.radians(lat))

    def dist_m(a, b):
        return math.hypot((a[0] - b[0]) * m_lon, (a[1] - b[1]) * m_lat)

    def in_any_city(pt) -> bool:
        return any(point_in_poly(pt, g) for g in city_geoms)

    missing = []
    for feat in roads["features"]:
        geom = feat["geometry"]
        coords = geom["coordinates"] if geom["type"] == "LineString" else []
        if geom["type"] == "MultiLineString":
            coords = [pt for ls in geom["coordinates"] for pt in ls]
        if not coords:
            continue
        c = (sum(p[0] for p in coords) / len(coords), sum(p[1] for p in coords) / len(coords))
        if not in_any_city(c):
            continue
        name = (feat["properties"].get("name") or "").upper()
        kind = feat["properties"].get("kind")
        near_school = any(point_in_poly(c, g) for g in buf_geoms)
        important = (
            near_school
            or kind == "state"
            or any(
                k in name
                for k in ["MAIN", "BROADWAY", "ELM", "BALLARD", "HIGHWAY", "KY", "COURT", "MAIN CROSS"]
            )
        )
        if not important:
            continue
        sample = coords[:: max(1, len(coords) // 8)]
        has = False
        for pt in sample:
            if any(dist_m(pt, s) < 40 for s in sw_pts):
                has = True
                break
        if has:
            continue
        props = dict(feat["properties"])
        props["hint"] = "No OSM sidewalk/footway within ~40m"
        props["near_school"] = near_school
        props["analysis"] = "possible_missing_sidewalk"
        missing.append({"type": "Feature", "geometry": geom, "properties": props})

    write(
        "analysis-missing-sidewalks.geojson",
        missing,
        {
            "note": "Heuristic: city roads near schools/main corridors with no mapped OSM sidewalk nearby."
        },
    )

    stats_path = DATA / "stats.json"
    stats = json.loads(stats_path.read_text()) if stats_path.exists() else {}
    stats["missing_sidewalk_hints"] = len(missing)
    stats["mapped_sidewalk_ways"] = len(sidewalk_feats)
    stats_path.write_text(json.dumps(stats, indent=2))


def main() -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    query = f"""
    [out:json][timeout:90];
    (
      way["highway"="footway"]({BBOX});
      way["highway"="steps"]({BBOX});
      way["highway"="path"]["foot"!="no"]({BBOX});
      way["highway"="pedestrian"]({BBOX});
      way["highway"="cycleway"]({BBOX});
      way["footway"]({BBOX});
      way["amenity"="parking"]({BBOX});
      node["amenity"="parking"]({BBOX});
      way["leisure"~"park|playground|pitch|sports_centre"]({BBOX});
      node["leisure"~"park|playground|pitch"]({BBOX});
      way["landuse"="recreation_ground"]({BBOX});
      node["amenity"~"place_of_worship|library|townhall|fire_station|police|post_office|clinic|pharmacy|cafe|restaurant|fast_food|bank|fuel|community_centre"]({BBOX});
      way["amenity"~"place_of_worship|library|townhall|fire_station|police|post_office|clinic|pharmacy|cafe|restaurant|fast_food|bank|fuel|community_centre"]({BBOX});
      node["shop"]({BBOX});
      way["shop"]({BBOX});
    );
    out body;
    >;
    out skel qt;
    """
    print("Querying Overpass…")
    raw = overpass(query)
    print(f"elements: {len(raw.get('elements', []))}")

    nodes = {}
    ways = {}
    for el in raw.get("elements", []):
        if el["type"] == "node":
            nodes[el["id"]] = el
        elif el["type"] == "way":
            ways[el["id"]] = el

    amenity_keep = {
        "place_of_worship",
        "library",
        "townhall",
        "fire_station",
        "police",
        "post_office",
        "clinic",
        "pharmacy",
        "cafe",
        "restaurant",
        "fast_food",
        "bank",
        "fuel",
        "community_centre",
    }

    sidewalks = []
    parks = []
    parking = []
    amenities = []
    shops = []

    for way in ways.values():
        tags = way.get("tags") or {}
        if not tags:
            continue
        name = tags.get("name")
        hwy = tags.get("highway")
        leisure = tags.get("leisure")
        amenity = tags.get("amenity")
        landuse = tags.get("landuse")

        if hwy in ("footway", "steps", "pedestrian", "cycleway") or tags.get("footway"):
            props = {
                k: v
                for k, v in {
                    "name": name,
                    "highway": hwy,
                    "footway": tags.get("footway"),
                    "surface": tags.get("surface"),
                    "source": "OpenStreetMap",
                }.items()
                if v
            }
            feat = way_feature(way, nodes, props)
            if feat:
                sidewalks.append(feat)

        if leisure in ("park", "playground", "pitch", "sports_centre") or landuse == "recreation_ground":
            props = {
                k: v
                for k, v in {
                    "name": name or leisure or landuse,
                    "leisure": leisure or landuse,
                    "source": "OpenStreetMap",
                }.items()
                if v
            }
            feat = way_feature(way, nodes, props)
            if feat:
                parks.append(feat)

        if amenity == "parking":
            props = {
                k: v
                for k, v in {
                    "name": name or "Parking",
                    "access": tags.get("access"),
                    "source": "OpenStreetMap",
                }.items()
                if v
            }
            feat = way_feature(way, nodes, props)
            if feat:
                parking.append(feat)

        if amenity in amenity_keep:
            coords = way_coords(way, nodes)
            if len(coords) >= 2:
                lon = sum(c[0] for c in coords) / len(coords)
                lat = sum(c[1] for c in coords) / len(coords)
                amenities.append(
                    {
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [lon, lat]},
                        "properties": {
                            k: v
                            for k, v in {
                                "name": name or amenity.replace("_", " ").title(),
                                "amenity": amenity,
                                "religion": tags.get("religion"),
                                "source": "OpenStreetMap",
                            }.items()
                            if v
                        },
                    }
                )

        if tags.get("shop"):
            coords = way_coords(way, nodes)
            if len(coords) >= 2:
                lon = sum(c[0] for c in coords) / len(coords)
                lat = sum(c[1] for c in coords) / len(coords)
                shops.append(
                    {
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [lon, lat]},
                        "properties": {
                            k: v
                            for k, v in {
                                "name": name or tags.get("shop"),
                                "shop": tags.get("shop"),
                                "source": "OpenStreetMap",
                            }.items()
                            if v
                        },
                    }
                )

    for node in nodes.values():
        tags = node.get("tags") or {}
        if not tags or "lon" not in node:
            continue
        geom = {"type": "Point", "coordinates": [node["lon"], node["lat"]]}
        amenity = tags.get("amenity")
        leisure = tags.get("leisure")
        if amenity in amenity_keep:
            amenities.append(
                {
                    "type": "Feature",
                    "geometry": geom,
                    "properties": {
                        k: v
                        for k, v in {
                            "name": tags.get("name") or amenity.replace("_", " ").title(),
                            "amenity": amenity,
                            "religion": tags.get("religion"),
                            "source": "OpenStreetMap",
                        }.items()
                        if v
                    },
                }
            )
        if amenity == "parking":
            parking.append(
                {
                    "type": "Feature",
                    "geometry": geom,
                    "properties": {"name": tags.get("name") or "Parking", "source": "OpenStreetMap"},
                }
            )
        if leisure in ("park", "playground", "pitch"):
            parks.append(
                {
                    "type": "Feature",
                    "geometry": geom,
                    "properties": {
                        "name": tags.get("name") or leisure,
                        "leisure": leisure,
                        "source": "OpenStreetMap",
                    },
                }
            )
        if tags.get("shop"):
            shops.append(
                {
                    "type": "Feature",
                    "geometry": geom,
                    "properties": {
                        k: v
                        for k, v in {
                            "name": tags.get("name") or tags.get("shop"),
                            "shop": tags.get("shop"),
                            "source": "OpenStreetMap",
                        }.items()
                        if v
                    },
                }
            )

    write("osm-sidewalks.geojson", sidewalks, {"note": "OSM footways/cycleways/pedestrian paths."})
    write("osm-parks.geojson", parks)
    write("osm-parking.geojson", parking)
    write("osm-amenities.geojson", amenities)
    write("osm-shops.geojson", shops)
    print("amenities", Counter(f["properties"].get("amenity") for f in amenities).most_common())

    derive_missing_sidewalks(sidewalks)

    stats_path = DATA / "stats.json"
    stats = json.loads(stats_path.read_text()) if stats_path.exists() else {}
    stats["osm_amenities"] = len(amenities)
    stats["osm_shops"] = len(shops)
    stats_path.write_text(json.dumps(stats, indent=2))
    print("Done.")


if __name__ == "__main__":
    main()
