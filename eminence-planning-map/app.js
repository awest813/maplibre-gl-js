const VERIFY_LABELS = {
  verified_state_gis: "Public GIS",
  estimated: "Heuristic / estimated",
  public_arcgis_unverified_currency: "Public ArcGIS — confirm currency",
  community_mapped: "Community-mapped (OSM)",
};

const HIDDEN_PROP_KEYS = new Set([
  "source_layer",
  "layer_note",
  "verification_status",
  "analysis",
  "public_ownership",
  "hint",
  "FIPS",
  "CITYFIPS",
  "OBJECTID",
  "GlobalID",
  "SHAPE_Length",
  "SHAPE_Area",
  "Shape__Length",
  "Shape__Area",
]);

const PROP_LABELS = {
  district_code: "District",
  district_name: "District name",
  parcel_id: "Parcel ID",
  pidn: "PIDN",
  address: "Address",
  city: "City",
  zip: "ZIP",
  acres: "Acres",
  class: "Class",
  CLASS: "Class",
  tax_district: "Tax district",
  fire_district: "Fire district",
  land_value: "Land value",
  improvement_value: "Improvement value",
  taxable: "Taxable value",
  fair_cash: "Fair cash value",
  description: "Description",
  year: "Year",
  name: "Name",
  NAME: "Name",
  amenity: "Amenity",
  shop: "Shop",
  bridge_id: "Bridge ID",
  tract_id: "Census tract",
  block_group_id: "Block group",
  pop_2020: "Population (2020)",
  POP2010: "Population (2010)",
  near_school: "Near school",
  muni: "Municipality",
  wetland_type: "Wetland type",
  sensitivity: "Sensitivity",
  sensitivity_label: "Sensitivity",
  population: "Population",
  pct_lack_access: "% lacking broadband",
  avg_speed: "Avg. speed",
  hazard_class: "Hazard class",
  truck_percent: "Truck %",
  total_units: "Total units",
  former_use: "Former use",
  projected_reuse: "Projected reuse",
  COUNTY: "County",
  INCORP: "Incorporated",
  LAST_UPDT: "Last updated",
  Area_SqMiles: "Area (sq mi)",
};

const MONEY_KEYS = new Set([
  "land_value",
  "improvement_value",
  "taxable",
  "fair_cash",
]);

const GROUP_TARGETS = {
  boundaries: "layers-boundaries",
  environment: "layers-environment",
  planning: "layers-planning",
  safety: "layers-safety",
  community: "layers-community",
  mobility: "layers-mobility",
  utilities: "layers-utilities",
  places: "layers-places",
  analysis: "layers-analysis",
};

const GROUP_LABELS = {
  boundaries: "Boundaries",
  environment: "Environment",
  planning: "Planning",
  safety: "Safety & services",
  community: "Community",
  mobility: "Mobility",
  utilities: "Utilities",
  places: "Places",
  analysis: "Analysis",
};

const ZONING_COLORS = [
  "match",
  ["upcase", ["to-string", ["get", "district_code"]]],
  "A1", "#a3b18a",
  "A2", "#8a9a6d",
  "A3", "#b5c99a",
  "R1", "#f2cc8f",
  "R2", "#e9c46a",
  "R3", "#f4a261",
  "B1", "#90cdf4",
  "B2", "#63b3ed",
  "B3", "#4299e1",
  "I1", "#78716c",
  "I2", "#57534e",
  "#9ca3af",
];

/** Primary legend swatches keyed to map paint colors in addLayerStyles(). */
const LEGEND_META = {
  "henry-county": { kind: "fill", color: "#9a6b2f", opacity: 0.35 },
  "city-boundary": { kind: "line", color: "#2f4a32" },
  parcels: { kind: "line", color: "#78716c" },
  "magisterial-districts": { kind: "fill", color: "#9a6b2f", opacity: 0.35 },
  "voting-precincts": { kind: "fill", color: "#6b5b4a", opacity: 0.35 },
  "census-tracts": { kind: "fill", color: "#3d6f7a", opacity: 0.35 },
  "census-block-groups": { kind: "fill", color: "#5b8a8f", opacity: 0.35 },
  "school-districts": { kind: "fill", color: "#9a6b2f", opacity: 0.35 },
  streams: { kind: "line", color: "#3d6f7a" },
  waterbodies: { kind: "fill", color: "#6fa0ab", opacity: 0.55 },
  "flood-hazards": { kind: "fill", color: "#c45c26", opacity: 0.45 },
  wetlands: { kind: "fill", color: "#2f6f6a", opacity: 0.45 },
  sinkholes: { kind: "fill", color: "#7c3a2d", opacity: 0.5 },
  "sinkhole-drainage": { kind: "fill", color: "#8b5e3c", opacity: 0.45 },
  "karst-potential": { kind: "fill", color: "#a67c52", opacity: 0.4 },
  "groundwater-sensitivity": {
    items: [
      { label: "Groundwater · low", kind: "fill", color: "#d9e0d2" },
      { label: "Groundwater · moderate", kind: "fill", color: "#e9c46a" },
      { label: "Groundwater · high", kind: "fill", color: "#b45309" },
    ],
  },
  dams: { kind: "dot", color: "#7c3a2d" },
  "priority-watersheds": { kind: "fill", color: "#3d6f7a", opacity: 0.35 },
  "henry-landuse-zoning": {
    items: [
      { label: "Agricultural", kind: "fill", color: "#8a9a6d" },
      { label: "Residential", kind: "fill", color: "#e9c46a" },
      { label: "Business", kind: "fill", color: "#63b3ed" },
      { label: "Industrial", kind: "fill", color: "#57534e" },
    ],
  },
  brownfields: { kind: "dot", color: "#b45309" },
  "industrial-parks": { kind: "fill", color: "#57534e", opacity: 0.45 },
  "sewer-planning-units": { kind: "fill", color: "#0f766e", opacity: 0.35 },
  "social-vulnerability": { kind: "fill", color: "#9a3412", opacity: 0.4 },
  broadband: {
    items: [
      { label: "Broadband gap · low", kind: "fill", color: "#86efac" },
      { label: "Broadband gap · moderate", kind: "fill", color: "#e9c46a" },
      { label: "Broadband gap · high", kind: "fill", color: "#b45309" },
    ],
  },
  "fire-districts": { kind: "fill", color: "#b45309", opacity: 0.35 },
  "fire-stations": { kind: "dot", color: "#b45309" },
  "police-stations": { kind: "dot", color: "#1d4e89" },
  "law-districts": { kind: "fill", color: "#1d4e89", opacity: 0.35 },
  "ems-districts": { kind: "fill", color: "#9a3412", opacity: 0.35 },
  "ems-agencies": { kind: "dot", color: "#9a3412" },
  courthouses: { kind: "dot", color: "#2f4a32" },
  "health-centers": { kind: "dot", color: "#0f766e" },
  "nursing-homes": { kind: "dot", color: "#7a4e2d" },
  schools: { kind: "dot", color: "#2f4a32" },
  "school-buffers": { kind: "fill", color: "#4a6b4e", opacity: 0.35 },
  libraries: { kind: "dot", color: "#9a6b2f" },
  "parks-open-space": { kind: "fill", color: "#4a6b4e", opacity: 0.45 },
  "public-housing": { kind: "dot", color: "#0f766e" },
  airports: { kind: "dot", color: "#57534e" },
  roads: {
    items: [
      { label: "Local roads", kind: "line", color: "#3a342c" },
      { label: "State roads", kind: "line", color: "#9a6b2f" },
    ],
  },
  railroads: { kind: "line", color: "#4a3a2a" },
  bridges: { kind: "dot", color: "#6b5b4a" },
  "traffic-counts": { kind: "dot", color: "#b45309" },
  buildings: { kind: "fill", color: "#6b5b4a", opacity: 0.65 },
  "osm-sidewalks": { kind: "line", color: "#15803d" },
  trails: { kind: "line", color: "#166534" },
  "ev-chargers": { kind: "dot", color: "#15803d" },
  wwtp: { kind: "dot", color: "#3d6f7a" },
  "ww-improvements": { kind: "dot", color: "#0f766e" },
  "water-tanks": { kind: "dot", color: "#3d6f7a" },
  "water-pump-stations": { kind: "dot", color: "#3d6f7a" },
  "water-improvements": { kind: "dot", color: "#0f766e" },
  addresses: { kind: "dot", color: "#3d6f7a" },
  "osm-parks": { kind: "fill", color: "#4ade80", opacity: 0.55 },
  "osm-parking": { kind: "fill", color: "#64748b", opacity: 0.55 },
  "osm-amenities": { kind: "dot", color: "#9a6b2f" },
  "osm-shops": { kind: "dot", color: "#b45309" },
  "analysis-public-exempt-parcels": { kind: "fill", color: "#0f766e", opacity: 0.55 },
  "analysis-zero-improvement-parcels": { kind: "fill", color: "#ea580c", opacity: 0.5 },
  "analysis-unbuilt-addresses": { kind: "dot", color: "#b45309" },
  "analysis-unaddressed-buildings": { kind: "fill", color: "#b45309", opacity: 0.55 },
  "analysis-missing-sidewalks": { kind: "line", color: "#b45309" },
};

/** Higher score = preferred when features overlap under the cursor. */
function inspectPriority(styleId) {
  if (!styleId) return 0;
  if (
    styleId.startsWith("addresses") ||
    styleId.startsWith("schools") ||
    styleId.startsWith("bridges") ||
    styleId.startsWith("fire-stations") ||
    styleId.startsWith("police-stations") ||
    styleId.startsWith("libraries") ||
    styleId.startsWith("courthouses") ||
    styleId.startsWith("health-centers") ||
    styleId.startsWith("ems-agencies") ||
    styleId.startsWith("ev-chargers") ||
    styleId.startsWith("airports") ||
    styleId.startsWith("nursing-homes") ||
    styleId.startsWith("public-housing") ||
    styleId.startsWith("brownfields") ||
    styleId.startsWith("traffic-counts") ||
    styleId.startsWith("dams") ||
    styleId.startsWith("water-pump")
  ) {
    return 100;
  }
  if (styleId.startsWith("osm-") || styleId.startsWith("wwtp") || styleId.startsWith("water-tanks")) return 95;
  if (styleId.startsWith("analysis-")) return 90;
  if (styleId.startsWith("henry-landuse-zoning")) return 85;
  if (styleId.startsWith("parcels")) return 80;
  if (styleId.startsWith("buildings")) return 70;
  if (styleId.startsWith("ww-") || styleId.startsWith("water-improvements")) return 65;
  if (
    styleId.startsWith("flood") ||
    styleId.startsWith("wetlands") ||
    styleId.startsWith("sinkholes") ||
    styleId.startsWith("school-buffers")
  ) {
    return 40;
  }
  if (
    styleId.startsWith("roads") ||
    styleId.startsWith("railroads") ||
    styleId.startsWith("streams") ||
    styleId.startsWith("groundwater") ||
    styleId.startsWith("ems-districts") ||
    styleId.startsWith("law-districts") ||
    styleId.startsWith("fire-districts") ||
    styleId.startsWith("magisterial") ||
    styleId.startsWith("census-")
  ) {
    return 35;
  }
  if (styleId.startsWith("city-boundary")) return 8;
  if (styleId.startsWith("henry-county")) return 4;
  return 20;
}

const EMPTY_FC = { type: "FeatureCollection", features: [] };

function setLoading(visible, detail, progress) {
  const el = document.getElementById("loading");
  const detailEl = document.getElementById("loading-detail");
  const bar = document.getElementById("loading-bar");
  if (!el) return;
  el.hidden = !visible;
  if (detail && detailEl) detailEl.textContent = detail;
  if (bar && typeof progress === "number") {
    bar.style.width = `${Math.max(6, Math.min(100, progress))}%`;
  }
}

function showBootError(message) {
  const el = document.getElementById("boot-error");
  const detail = document.getElementById("boot-error-detail");
  if (detail) detail.textContent = message;
  if (el) el.hidden = false;
  setLoading(false);
}

if (typeof maplibregl === "undefined") {
  showBootError("MapLibre GL JS failed to load. Check your network connection and reload.");
  throw new Error("maplibregl missing");
}

let catalog;
try {
  const res = await fetch("layers.json");
  if (!res.ok) throw new Error(`layers.json HTTP ${res.status}`);
  catalog = await res.json();
} catch (err) {
  showBootError(`Could not load map catalog (${err.message}).`);
  throw err;
}

const stats = await fetch("data/stats.json")
  .then((r) => (r.ok ? r.json() : null))
  .catch(() => null);

document.getElementById("disclaimer-text").textContent = catalog.disclaimer;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function coerceNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function titleCaseWords(text) {
  return String(text)
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

function formatPropValue(key, value) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const num = coerceNumber(value);
  if (
    num !== null &&
    num > 1e11 &&
    /date|updt|update|time/i.test(key)
  ) {
    const ms = num > 1e12 ? num : num * 1000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }
  if (MONEY_KEYS.has(key) && num !== null) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(num);
  }
  if ((key === "acres" || key === "Area_SqMiles") && num !== null) {
    return num.toFixed(2);
  }
  if (num !== null && !Number.isInteger(num)) {
    return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  if (num !== null) return num.toLocaleString("en-US");
  const text = String(value);
  if (/^[A-Z0-9][A-Z0-9\s/&.-]{2,}$/.test(text) && /[A-Z]/.test(text) && text === text.toUpperCase()) {
    return titleCaseWords(text);
  }
  return text;
}

function humanizeKey(key) {
  return PROP_LABELS[key] || key.replaceAll("_", " ");
}

function buildStyle(basemapId) {
  const basemaps = catalog.basemaps || [];
  const chosen =
    basemaps.find((b) => b.id === basemapId) ||
    basemaps.find((b) => b.default) ||
    basemaps[0];

  const sources = {};
  const layers = [];

  for (const bm of basemaps) {
    sources[bm.id] = {
      type: "raster",
      tiles: bm.tiles,
      tileSize: bm.tileSize || 256,
      attribution: bm.attribution || "",
      maxzoom: bm.maxzoom || 22,
    };
    layers.push({
      id: `basemap-${bm.id}`,
      type: "raster",
      source: bm.id,
      layout: { visibility: bm.id === chosen.id ? "visible" : "none" },
      paint:
        bm.id === "osm"
          ? {
              "raster-saturation": -0.35,
              "raster-brightness-min": 0.08,
              "raster-brightness-max": 0.92,
            }
          : {},
    });
  }

  return {
    version: 8,
    name: "Eminence & New Castle free data",
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources,
    layers,
  };
}

const defaultBasemap =
  catalog.basemaps?.find((b) => b.default)?.id || catalog.basemaps?.[0]?.id || "osm";

let map;
try {
  map = new maplibregl.Map({
    container: "map",
    style: buildStyle(defaultBasemap),
    center: catalog.center,
    zoom: catalog.zoom,
    preserveDrawingBuffer: true,
    maxBounds: [
      [catalog.bounds[0] - 0.08, catalog.bounds[1] - 0.08],
      [catalog.bounds[2] + 0.08, catalog.bounds[3] + 0.08],
    ],
  });
} catch (err) {
  console.error(err);
  showBootError(
    "This browser could not start the map. WebGL is required — try Chrome, Firefox, or Edge, and enable hardware acceleration."
  );
  throw err;
}

map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-left");
map.addControl(new maplibregl.ScaleControl({ unit: "imperial" }), "bottom-left");
map.addControl(new maplibregl.FullscreenControl(), "top-left");

map.on("error", (e) => {
  const msg = e?.error?.message || String(e?.error || "");
  if (/Failed to initialize WebGL|webglcontextcreationerror/i.test(msg)) {
    showBootError(
      "WebGL failed while starting the map. Try another browser or enable hardware acceleration."
    );
    return;
  }
  if (msg && !/Failed to fetch|AJAXError|tile/i.test(msg)) {
    console.warn("Map error:", e.error || e);
  }
});

const featureCard = document.getElementById("feature-card");
const featureTitle = document.getElementById("feature-title");
const featureAttrs = document.getElementById("feature-attrs");
const featureKicker = document.getElementById("feature-kicker");
const mapHint = document.getElementById("map-hint");
let searchIndex = [];
let searchMarker = null;
let measuring = false;
let cityBounds = null;
let hasInspectedFeature = false;
let lastFeatureCopyText = "";
let searchHits = [];
let searchActiveIndex = -1;
const interactiveStyleIds = [];
const failedLayers = new Set();

document.getElementById("feature-close").addEventListener("click", () => {
  featureCard.hidden = true;
});

document.getElementById("feature-copy-btn")?.addEventListener("click", async () => {
  const btn = document.getElementById("feature-copy-btn");
  if (!lastFeatureCopyText) return;
  try {
    await navigator.clipboard.writeText(lastFeatureCopyText);
    if (btn) {
      const prev = btn.textContent;
      btn.textContent = "Copied";
      window.setTimeout(() => {
        btn.textContent = prev;
      }, 1600);
    }
  } catch {
    setToolStatus("Could not copy details.");
  }
});

function showFeature(title, props, layerName = "") {
  featureTitle.textContent = title;
  if (featureKicker) featureKicker.textContent = layerName || "";
  featureAttrs.innerHTML = "";
  const notes = [];
  if (props?.hint) notes.push(String(props.hint));
  if (props?.layer_note) notes.push(String(props.layer_note));

  const entries = Object.entries(props || {}).filter(
    ([key, v]) =>
      !HIDDEN_PROP_KEYS.has(key) && v !== null && v !== undefined && v !== ""
  );
  const copyLines = [];
  if (layerName) copyLines.push(`Layer: ${layerName}`);
  copyLines.push(title);

  if (!entries.length && !notes.length) {
    const div = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = "Info";
    dd.textContent = "No attributes";
    div.append(dt, dd);
    featureAttrs.appendChild(div);
  } else {
    for (const [key, value] of entries.slice(0, 12)) {
      const div = document.createElement("div");
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      const label = humanizeKey(key);
      const formatted = formatPropValue(key, value);
      dt.textContent = label;
      dd.textContent = formatted;
      div.append(dt, dd);
      featureAttrs.appendChild(div);
      copyLines.push(`${label}: ${formatted}`);
    }
  }

  if (notes.length) {
    const note = document.createElement("p");
    note.className = "feature-note";
    note.textContent = notes.join(" ");
    featureAttrs.appendChild(note);
    copyLines.push(...notes);
  }
  lastFeatureCopyText = copyLines.join("\n");
  featureCard.hidden = false;
  hasInspectedFeature = true;
  if (mapHint && !measuring) mapHint.hidden = true;
}

async function loadGeoJSON(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    if (!data || data.type !== "FeatureCollection") {
      throw new Error("invalid GeoJSON");
    }
    return { ok: true, data };
  } catch (err) {
    console.warn(`Could not load ${path}`, err);
    return { ok: false, data: EMPTY_FC };
  }
}

function pointStyle(sourceId, color, radius = 6) {
  map.addLayer({
    id: `${sourceId}-circle`,
    type: "circle",
    source: sourceId,
    paint: {
      "circle-radius": radius,
      "circle-color": color,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#f3eee4",
    },
  });
  return [`${sourceId}-circle`];
}

function fillLine(sourceId, fill, line, fillOpacity = 0.2) {
  map.addLayer({
    id: `${sourceId}-fill`,
    type: "fill",
    source: sourceId,
    paint: { "fill-color": fill, "fill-opacity": fillOpacity },
  });
  map.addLayer({
    id: `${sourceId}-line`,
    type: "line",
    source: sourceId,
    paint: { "line-color": line, "line-width": 1.4 },
  });
  return [`${sourceId}-fill`, `${sourceId}-line`];
}

function addLayerStyles(layer) {
  const id = layer.id;

  if (id === "henry-county") {
    return fillLine(id, "#9a6b2f", "#9a6b2f", 0.04);
  }

  if (id === "city-boundary") {
    map.addLayer({
      id: `${id}-fill`,
      type: "fill",
      source: id,
      paint: { "fill-color": "#2f4a32", "fill-opacity": 0.08 },
    });
    map.addLayer({
      id: `${id}-line`,
      type: "line",
      source: id,
      paint: {
        "line-color": "#2f4a32",
        "line-width": 2.5,
        "line-dasharray": [1.2, 1],
      },
    });
    map.addLayer({
      id: `${id}-label`,
      type: "symbol",
      source: id,
      minzoom: 11.2,
      layout: {
        "text-field": ["coalesce", ["get", "label"], ["get", "NAME"], ["get", "name"], ""],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 11.2, 12, 14, 16],
        "text-letter-spacing": 0.02,
        "text-max-width": 10,
      },
      paint: {
        "text-color": "#2f4a32",
        "text-halo-color": "#f3eee4",
        "text-halo-width": 1.4,
      },
    });
    return [`${id}-fill`, `${id}-line`, `${id}-label`];
  }

  if (id === "roads") {
    map.addLayer({
      id: `${id}-local`,
      type: "line",
      source: id,
      filter: ["!=", ["get", "kind"], "state"],
      paint: {
        "line-color": "#3a342c",
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.8, 16, 2.4],
        "line-opacity": 0.85,
      },
    });
    map.addLayer({
      id: `${id}-state`,
      type: "line",
      source: id,
      filter: ["==", ["get", "kind"], "state"],
      paint: {
        "line-color": "#9a6b2f",
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 1.8, 16, 4],
      },
    });
    map.addLayer({
      id: `${id}-label`,
      type: "symbol",
      source: id,
      minzoom: 13.5,
      layout: {
        "symbol-placement": "line",
        "text-field": ["get", "name"],
        "text-size": 11,
        "text-font": ["Noto Sans Regular"],
      },
      paint: {
        "text-color": "#3a342c",
        "text-halo-color": "#f3eee4",
        "text-halo-width": 1.2,
      },
    });
    return [`${id}-local`, `${id}-state`, `${id}-label`];
  }

  if (id === "addresses") {
    map.addLayer({
      id: `${id}-circle`,
      type: "circle",
      source: id,
      minzoom: 13,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 1.5, 17, 4],
        "circle-color": "#3d6f7a",
        "circle-opacity": 0.8,
        "circle-stroke-width": 0.5,
        "circle-stroke-color": "#f3eee4",
      },
    });
    return [`${id}-circle`];
  }

  if (id === "buildings") {
    return fillLine(id, "#6b5b4a", "#4a3f34", 0.55).map((styleId, i) => {
      if (i === 1) {
        map.setPaintProperty(styleId, "line-width", 0.6);
        map.setPaintProperty(styleId, "line-opacity", 0.7);
      }
      return styleId;
    });
  }

  if (id === "streams") {
    map.addLayer({
      id: `${id}-line`,
      type: "line",
      source: id,
      paint: { "line-color": "#3d6f7a", "line-width": 1.2, "line-opacity": 0.75 },
    });
    return [`${id}-line`];
  }

  if (id === "waterbodies") {
    map.addLayer({
      id: `${id}-fill`,
      type: "fill",
      source: id,
      paint: { "fill-color": "#6fa0ab", "fill-opacity": 0.45 },
    });
    return [`${id}-fill`];
  }

  if (id === "flood-hazards") {
    return fillLine(id, "#c45c26", "#9a3f14", 0.28);
  }

  if (id === "wetlands") {
    return fillLine(id, "#2f6f6a", "#1f4f4b", 0.35);
  }

  if (id === "sinkholes") {
    return fillLine(id, "#7c3a2d", "#5c291f", 0.4);
  }

  if (id === "groundwater-sensitivity") {
    map.addLayer({
      id: `${id}-fill`,
      type: "fill",
      source: id,
      paint: {
        "fill-color": [
          "match",
          ["to-string", ["get", "sensitivity"]],
          "1",
          "#d9e0d2",
          "2",
          "#b7c7a8",
          "3",
          "#e9c46a",
          "4",
          "#e07a3d",
          "5",
          "#b45309",
          "#c4b59a",
        ],
        "fill-opacity": 0.28,
      },
    });
    map.addLayer({
      id: `${id}-line`,
      type: "line",
      source: id,
      paint: { "line-color": "#6b5b4a", "line-width": 1 },
    });
    return [`${id}-fill`, `${id}-line`];
  }

  if (id === "sinkhole-drainage") {
    return fillLine(id, "#8b5e3c", "#6b4423", 0.28);
  }

  if (id === "karst-potential") {
    return fillLine(id, "#a67c52", "#7a5734", 0.18);
  }

  if (id === "priority-watersheds") {
    return fillLine(id, "#3d6f7a", "#2a4f57", 0.12);
  }

  if (id === "dams") {
    return pointStyle(id, "#7c3a2d", 7);
  }

  if (id === "railroads") {
    map.addLayer({
      id: `${id}-line`,
      type: "line",
      source: id,
      paint: {
        "line-color": "#4a3a2a",
        "line-width": 2.2,
        "line-dasharray": [1, 1.2],
      },
    });
    return [`${id}-line`];
  }

  if (id === "bridges") {
    return pointStyle(id, "#6b5b4a", 5);
  }

  if (id === "schools") {
    const ids = pointStyle(id, "#2f4a32", 7);
    map.addLayer({
      id: `${id}-label`,
      type: "symbol",
      source: id,
      minzoom: 12.5,
      layout: {
        "text-field": ["get", "name"],
        "text-size": 11,
        "text-offset": [0, 1.2],
        "text-font": ["Noto Sans Regular"],
      },
      paint: {
        "text-color": "#1c2418",
        "text-halo-color": "#f3eee4",
        "text-halo-width": 1.4,
      },
    });
    return [...ids, `${id}-label`];
  }

  if (id === "school-buffers") {
    map.addLayer({
      id: `${id}-fill`,
      type: "fill",
      source: id,
      paint: { "fill-color": "#4a6b4e", "fill-opacity": 0.12 },
    });
    map.addLayer({
      id: `${id}-line`,
      type: "line",
      source: id,
      paint: { "line-color": "#2f4a32", "line-width": 1, "line-dasharray": [2, 1] },
    });
    return [`${id}-fill`, `${id}-line`];
  }

  if (id === "school-districts") {
    return fillLine(id, "#9a6b2f", "#9a6b2f", 0.08);
  }

  if (id === "fire-districts") {
    return fillLine(id, "#b45309", "#9a3412", 0.08);
  }

  if (id === "fire-stations") {
    return pointStyle(id, "#b45309", 7);
  }

  if (id === "police-stations") {
    return pointStyle(id, "#1d4e89", 7);
  }

  if (id === "law-districts") {
    return fillLine(id, "#1d4e89", "#163a66", 0.08);
  }

  if (id === "ems-districts") {
    return fillLine(id, "#9a3412", "#7f1d1d", 0.08);
  }

  if (id === "ems-agencies") {
    return pointStyle(id, "#9a3412", 7);
  }

  if (id === "courthouses") {
    return pointStyle(id, "#2f4a32", 7);
  }

  if (id === "libraries") {
    return pointStyle(id, "#9a6b2f", 7);
  }

  if (id === "health-centers") {
    return pointStyle(id, "#0f766e", 7);
  }

  if (id === "parks-open-space") {
    return fillLine(id, "#4a6b4e", "#2f4a32", 0.28);
  }

  if (id === "census-tracts") {
    return fillLine(id, "#3d6f7a", "#3d6f7a", 0.1);
  }

  if (id === "census-block-groups") {
    return fillLine(id, "#5b8a8f", "#3d6f7a", 0.1);
  }

  if (id === "magisterial-districts") {
    return fillLine(id, "#9a6b2f", "#7a5224", 0.08);
  }

  if (id === "airports") {
    return pointStyle(id, "#57534e", 7);
  }

  if (id === "nursing-homes") {
    return pointStyle(id, "#7a4e2d", 7);
  }

  if (id === "public-housing") {
    return pointStyle(id, "#0f766e", 7);
  }

  if (id === "traffic-counts") {
    return pointStyle(id, "#b45309", 5);
  }

  if (id === "voting-precincts") {
    return fillLine(id, "#6b5b4a", "#4a3f35", 0.06);
  }

  if (id === "social-vulnerability") {
    return fillLine(id, "#9a3412", "#7f1d1d", 0.16);
  }

  if (id === "broadband") {
    map.addLayer({
      id: `${id}-fill`,
      type: "fill",
      source: id,
      paint: {
        "fill-color": [
          "interpolate",
          ["linear"],
          ["coalesce", ["to-number", ["get", "pct_lack_access"]], 0],
          0,
          "#86efac",
          10,
          "#e9c46a",
          25,
          "#e07a3d",
          40,
          "#b45309",
        ],
        "fill-opacity": 0.28,
      },
    });
    map.addLayer({
      id: `${id}-line`,
      type: "line",
      source: id,
      paint: { "line-color": "#3f6212", "line-width": 1 },
    });
    return [`${id}-fill`, `${id}-line`];
  }

  if (id === "wwtp" || id === "water-tanks" || id === "water-pump-stations") {
    return pointStyle(id, "#3d6f7a", 8);
  }

  if (id === "sewer-planning-units") {
    return fillLine(id, "#0f766e", "#115e59", 0.12);
  }

  if (id === "ww-improvements" || id === "water-improvements") {
    map.addLayer({
      id: `${id}-circle`,
      type: "circle",
      source: id,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-radius": 6,
        "circle-color": "#0f766e",
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#f3eee4",
      },
    });
    map.addLayer({
      id: `${id}-line`,
      type: "line",
      source: id,
      filter: ["in", ["geometry-type"], ["literal", ["LineString", "MultiLineString"]]],
      paint: { "line-color": "#0f766e", "line-width": 2 },
    });
    map.addLayer({
      id: `${id}-fill`,
      type: "fill",
      source: id,
      filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]],
      paint: { "fill-color": "#0f766e", "fill-opacity": 0.2 },
    });
    return [`${id}-circle`, `${id}-line`, `${id}-fill`];
  }

  if (id === "brownfields") {
    return pointStyle(id, "#b45309", 8);
  }

  if (id === "industrial-parks") {
    return fillLine(id, "#57534e", "#44403c", 0.28);
  }

  if (id === "henry-landuse-zoning") {
    map.addLayer({
      id: `${id}-fill`,
      type: "fill",
      source: id,
      paint: {
        "fill-color": ZONING_COLORS,
        "fill-opacity": 0.45,
      },
    });
    map.addLayer({
      id: `${id}-line`,
      type: "line",
      source: id,
      paint: { "line-color": "#44403c", "line-width": 0.8, "line-opacity": 0.7 },
    });
    map.addLayer({
      id: `${id}-label`,
      type: "symbol",
      source: id,
      minzoom: 13,
      layout: {
        "text-field": ["get", "district_code"],
        "text-size": 12,
        "text-font": ["Noto Sans Regular"],
      },
      paint: {
        "text-color": "#1c2418",
        "text-halo-color": "#f3eee4",
        "text-halo-width": 1.4,
      },
    });
    return [`${id}-fill`, `${id}-line`, `${id}-label`];
  }

  if (id === "parcels") {
    map.addLayer({
      id: `${id}-fill`,
      type: "fill",
      source: id,
      paint: { "fill-color": "#a8a29e", "fill-opacity": 0.05 },
    });
    map.addLayer({
      id: `${id}-line`,
      type: "line",
      source: id,
      paint: {
        "line-color": "#78716c",
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.2, 16, 1],
        "line-opacity": 0.85,
      },
    });
    return [`${id}-fill`, `${id}-line`];
  }

  if (id === "analysis-public-exempt-parcels") {
    return fillLine(id, "#0f766e", "#115e59", 0.45);
  }

  if (id === "analysis-zero-improvement-parcels") {
    return fillLine(id, "#ea580c", "#c2410c", 0.4);
  }

  if (id === "analysis-unbuilt-addresses") {
    map.addLayer({
      id: `${id}-circle`,
      type: "circle",
      source: id,
      paint: {
        "circle-radius": 5,
        "circle-color": "#b45309",
        "circle-opacity": 0.9,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#fff7ed",
      },
    });
    return [`${id}-circle`];
  }

  if (id === "analysis-unaddressed-buildings") {
    return fillLine(id, "#b45309", "#9a3412", 0.45);
  }

  if (id === "analysis-missing-sidewalks") {
    map.addLayer({
      id: `${id}-line`,
      type: "line",
      source: id,
      paint: {
        "line-color": "#b45309",
        "line-width": 3,
        "line-opacity": 0.85,
      },
    });
    return [`${id}-line`];
  }

  if (id === "osm-sidewalks" || id === "trails") {
    map.addLayer({
      id: `${id}-line`,
      type: "line",
      source: id,
      paint: {
        "line-color": id === "trails" ? "#166534" : "#15803d",
        "line-width": id === "trails" ? 3.5 : 3,
        "line-opacity": 0.9,
      },
    });
    return [`${id}-line`];
  }

  if (id === "osm-parks") {
    map.addLayer({
      id: `${id}-fill`,
      type: "fill",
      source: id,
      filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]],
      paint: { "fill-color": "#4ade80", "fill-opacity": 0.35 },
    });
    map.addLayer({
      id: `${id}-circle`,
      type: "circle",
      source: id,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-radius": 6,
        "circle-color": "#16a34a",
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#f3eee4",
      },
    });
    return [`${id}-fill`, `${id}-circle`];
  }

  if (id === "osm-parking") {
    map.addLayer({
      id: `${id}-fill`,
      type: "fill",
      source: id,
      filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]],
      paint: { "fill-color": "#64748b", "fill-opacity": 0.35 },
    });
    map.addLayer({
      id: `${id}-circle`,
      type: "circle",
      source: id,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-radius": 5,
        "circle-color": "#475569",
        "circle-stroke-width": 1.2,
        "circle-stroke-color": "#f3eee4",
      },
    });
    return [`${id}-fill`, `${id}-circle`];
  }

  if (id === "osm-amenities") {
    return pointStyle(id, "#9a6b2f", 6);
  }

  if (id === "osm-shops") {
    return pointStyle(id, "#b45309", 5);
  }

  if (id === "ev-chargers") {
    return pointStyle(id, "#15803d", 7);
  }

  map.addLayer({
    id: `${id}-line`,
    type: "line",
    source: id,
    paint: { "line-color": "#9a6b2f", "line-width": 1.5 },
  });
  return [`${id}-line`];
}

function setLayerVisibility(layerIds, visible) {
  const value = visible ? "visible" : "none";
  for (const styleId of layerIds) {
    if (map.getLayer(styleId)) map.setLayoutProperty(styleId, "visibility", value);
  }
}

function renderStats() {
  const el = document.getElementById("stats-grid");
  if (!stats) {
    el.innerHTML = "<p class='hint'>Stats unavailable.</p>";
    return;
  }
  const byMuni = Object.fromEntries(stats.addresses_by_muni || []);
  const eminenceAddrs = Number(byMuni.Eminence) || 0;
  const newCastleAddrs = Number(byMuni["New Castle"]) || 0;
  const items = [
    [stats.parcels ?? 0, "Parcels"],
    [stats.zoning_polygons ?? 0, "Zoning polygons"],
    [stats.buildings, "Buildings"],
    [stats.addresses, "Addresses (both)"],
    [eminenceAddrs, "Eminence addresses"],
    [newCastleAddrs, "New Castle addresses"],
    [stats.zero_improvement_parcels ?? 0, "Zero-improvement parcels"],
    [stats.public_exempt_parcels ?? 0, "Public / exempt parcels"],
  ];
  el.innerHTML = items
    .map(([n, label]) => {
      const value =
        typeof n === "number" && Number.isFinite(n)
          ? n.toLocaleString()
          : escapeHtml(n ?? "—");
      return `<div class="stat-card"><strong>${value}</strong><span>${label}</span></div>`;
    })
    .join("");
}

function hexToRgba(hex, opacity = 1) {
  const raw = String(hex || "").replace("#", "");
  if (raw.length !== 3 && raw.length !== 6) return hex;
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const n = Number.parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function legendItemsForLayer(layer) {
  const meta = LEGEND_META[layer.id];
  if (!meta) return [{ label: layer.name, kind: "fill", color: "#9a6b2f", opacity: 0.45 }];
  if (Array.isArray(meta.items)) return meta.items;
  return [
    {
      label: layer.name,
      kind: meta.kind || "fill",
      color: meta.color || "#9a6b2f",
      opacity: meta.opacity,
    },
  ];
}

function swatchHtml(item) {
  const kind = item.kind || "fill";
  const cls = kind === "line" ? "swatch line" : kind === "dot" ? "swatch dot" : "swatch";
  const color = item.color || "#9a6b2f";
  const style =
    kind === "line"
      ? `border-top-color:${color}`
      : `background:${kind === "fill" && item.opacity != null ? hexToRgba(color, item.opacity) : color}`;
  return `<span class="${cls}" style="${style}" aria-hidden="true"></span>`;
}

function renderLegend() {
  const el = document.getElementById("legend-list");
  const countEl = document.getElementById("legend-count");
  if (!el) return;

  const active = (catalog?.layers || []).filter((layer) => {
    if (failedLayers.has(layer.id)) return false;
    return !!document.querySelector(`input[data-layer="${layer.id}"]`)?.checked;
  });

  if (!active.length) {
    el.innerHTML = `<p class="hint legend-empty">Turn on layers to see their colors here.</p>`;
    if (countEl) {
      countEl.textContent = "";
      countEl.classList.remove("has-on");
    }
    return;
  }

  const byGroup = new Map();
  for (const layer of active) {
    const group = layer.group || "boundaries";
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group).push(layer);
  }

  const groupOrder = Object.keys(GROUP_TARGETS);
  let itemCount = 0;
  const sections = [];
  for (const group of groupOrder) {
    const layers = byGroup.get(group);
    if (!layers?.length) continue;
    const rows = [];
    for (const layer of layers) {
      for (const item of legendItemsForLayer(layer)) {
        itemCount += 1;
        rows.push(
          `<li class="legend-item" data-legend-layer="${escapeHtml(layer.id)}" title="Toggle ${escapeHtml(layer.name)}">
            ${swatchHtml(item)}
            <span>${escapeHtml(item.label)}</span>
          </li>`
        );
      }
    }
    sections.push(`
      <div class="legend-group">
        <p class="legend-group-label">${escapeHtml(GROUP_LABELS[group] || group)}</p>
        <ul class="legend-list">${rows.join("")}</ul>
      </div>
    `);
  }

  el.innerHTML = sections.join("");
  if (countEl) {
    countEl.textContent = itemCount ? `${itemCount}` : "";
    countEl.classList.toggle("has-on", itemCount > 0);
  }

  el.querySelectorAll(".legend-item[data-legend-layer]").forEach((row) => {
    row.addEventListener("click", () => {
      const layerId = row.dataset.legendLayer;
      const input = document.querySelector(`input[data-layer="${layerId}"]`);
      if (!input || input.disabled) return;
      setLayerChecked(layerId, !input.checked);
      updateLayerCount();
      openFoldsForActiveLayers();
      writeUrlState();
    });
  });
}

function currentBasemapId() {
  const checked = document.querySelector('input[name="basemap"]:checked');
  return checked?.value || defaultBasemap;
}

function syncBasemapRows(basemapId) {
  document.querySelectorAll(".basemap-row").forEach((row) => {
    const input = row.querySelector('input[name="basemap"]');
    row.classList.toggle("active", input?.value === basemapId);
  });
}

function setBasemap(basemapId) {
  for (const bm of catalog.basemaps || []) {
    const styleId = `basemap-${bm.id}`;
    if (map.getLayer(styleId)) {
      map.setLayoutProperty(styleId, "visibility", bm.id === basemapId ? "visible" : "none");
    }
  }
  const radio = document.querySelector(`input[name="basemap"][value="${basemapId}"]`);
  if (radio) radio.checked = true;
  syncBasemapRows(basemapId);
}

function renderBasemapControls() {
  const el = document.getElementById("basemap-list");
  el.innerHTML = "";
  for (const bm of catalog.basemaps || []) {
    const row = document.createElement("label");
    row.className = `basemap-row${bm.id === defaultBasemap ? " active" : ""}`;
    row.innerHTML = `
      <input type="radio" name="basemap" value="${bm.id}" ${bm.id === defaultBasemap ? "checked" : ""} />
      <span>${bm.name}</span>
    `;
    el.appendChild(row);
  }
  el.querySelectorAll('input[name="basemap"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      setBasemap(input.value);
      writeUrlState();
    });
  });
}

function applyPreset(preset) {
  const enabled = new Set(preset.layers || []);
  for (const layer of catalog.layers) {
    const on = enabled.has(layer.id);
    const checkbox = document.querySelector(`input[data-layer="${layer.id}"]`);
    if (checkbox) {
      checkbox.checked = on;
      syncLayerRowState(checkbox);
    }
    if (layer._styleIds) setLayerVisibility(layer._styleIds, on);
  }
  if (preset.basemap) setBasemap(preset.basemap);
  if (preset.fitCities) {
    fitCityBounds({ duration: 900 });
  } else if (Array.isArray(preset.center) && preset.center.length >= 2) {
    map.easeTo({
      center: preset.center,
      zoom: typeof preset.zoom === "number" ? preset.zoom : map.getZoom(),
      duration: 900,
    });
  } else if (typeof preset.zoom === "number") {
    map.easeTo({ zoom: preset.zoom, duration: 900 });
  }
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.preset === preset.id);
  });
  updateLayerCount();
  openFoldsForActiveLayers();
  writeUrlState();
}

function renderPresets() {
  const el = document.getElementById("preset-list");
  el.innerHTML = "";
  const placeIds = new Set(["overview", "eminence", "new-castle"]);
  const places = (catalog.presets || []).filter((p) => placeIds.has(p.id));
  const themes = (catalog.presets || []).filter((p) => !placeIds.has(p.id));

  const appendGroup = (label, presets) => {
    if (!presets.length) return;
    const group = document.createElement("div");
    group.className = "preset-group";
    const title = document.createElement("p");
    title.className = "preset-group-label";
    title.textContent = label;
    group.appendChild(title);
    const row = document.createElement("div");
    row.className = "preset-group-row";
    for (const preset of presets) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "preset-btn";
      btn.dataset.preset = preset.id;
      btn.textContent = preset.name;
      btn.addEventListener("click", () => applyPreset(preset));
      row.appendChild(btn);
    }
    group.appendChild(row);
    el.appendChild(group);
  };

  appendGroup("Place", places);
  appendGroup("Theme", themes);
}

function restackLayers() {
  // Keep fills under buildings/roads; keep labels/points on top.
  const underBuildings = [
    "henry-county-fill",
    "henry-county-line",
    "groundwater-sensitivity-fill",
    "groundwater-sensitivity-line",
    "karst-potential-fill",
    "karst-potential-line",
    "priority-watersheds-fill",
    "priority-watersheds-line",
    "broadband-fill",
    "broadband-line",
    "social-vulnerability-fill",
    "social-vulnerability-line",
    "flood-hazards-fill",
    "flood-hazards-line",
    "wetlands-fill",
    "wetlands-line",
    "sinkholes-fill",
    "sinkholes-line",
    "sinkhole-drainage-fill",
    "sinkhole-drainage-line",
    "school-districts-fill",
    "school-districts-line",
    "magisterial-districts-fill",
    "magisterial-districts-line",
    "voting-precincts-fill",
    "voting-precincts-line",
    "sewer-planning-units-fill",
    "sewer-planning-units-line",
    "fire-districts-fill",
    "fire-districts-line",
    "ems-districts-fill",
    "ems-districts-line",
    "law-districts-fill",
    "law-districts-line",
    "census-tracts-fill",
    "census-tracts-line",
    "census-block-groups-fill",
    "census-block-groups-line",
    "school-buffers-fill",
    "school-buffers-line",
    "parks-open-space-fill",
    "parks-open-space-line",
    "industrial-parks-fill",
    "industrial-parks-line",
    "henry-landuse-zoning-fill",
    "henry-landuse-zoning-line",
    "parcels-fill",
    "parcels-line",
    "analysis-public-exempt-parcels-fill",
    "analysis-public-exempt-parcels-line",
    "analysis-zero-improvement-parcels-fill",
    "analysis-zero-improvement-parcels-line",
    "analysis-unaddressed-buildings-fill",
    "analysis-unaddressed-buildings-line",
    "waterbodies-fill",
    "streams-line",
  ];
  const aboveBuildings = [
    "buildings-fill",
    "buildings-line",
    "roads-local",
    "roads-state",
    "railroads-line",
    "analysis-missing-sidewalks-line",
    "osm-sidewalks-line",
    "trails-line",
    "osm-parks-fill",
    "osm-parking-fill",
    "addresses-circle",
    "bridges-circle",
    "schools-circle",
    "fire-stations-circle",
    "police-stations-circle",
    "ems-agencies-circle",
    "courthouses-circle",
    "libraries-circle",
    "health-centers-circle",
    "nursing-homes-circle",
    "public-housing-circle",
    "brownfields-circle",
    "traffic-counts-circle",
    "dams-circle",
    "airports-circle",
    "ev-chargers-circle",
    "wwtp-circle",
    "water-tanks-circle",
    "water-pump-stations-circle",
    "ww-improvements-circle",
    "ww-improvements-line",
    "ww-improvements-fill",
    "water-improvements-circle",
    "water-improvements-line",
    "water-improvements-fill",
    "osm-amenities-circle",
    "osm-shops-circle",
    "osm-parks-circle",
    "osm-parking-circle",
    "analysis-unbuilt-addresses-circle",
    "city-boundary-fill",
    "city-boundary-line",
    "city-boundary-label",
    "henry-landuse-zoning-label",
    "roads-label",
    "schools-label",
  ];

  for (const id of underBuildings) {
    if (map.getLayer(id) && map.getLayer("buildings-fill")) {
      map.moveLayer(id, "buildings-fill");
    }
  }
  for (const id of aboveBuildings) {
    if (map.getLayer(id)) map.moveLayer(id);
  }
}

function readUrlState() {
  const hash = location.hash.replace(/^#/, "");
  if (!hash) return null;
  try {
    return Object.fromEntries(new URLSearchParams(hash));
  } catch {
    return null;
  }
}

function writeUrlState() {
  const center = map.getCenter();
  const params = new URLSearchParams();
  params.set("z", map.getZoom().toFixed(2));
  params.set("lng", center.lng.toFixed(5));
  params.set("lat", center.lat.toFixed(5));
  params.set("basemap", currentBasemapId());
  const on = catalog.layers
    .filter((l) => document.querySelector(`input[data-layer="${l.id}"]`)?.checked)
    .map((l) => l.id);
  if (on.length) params.set("layers", on.join(","));
  history.replaceState(null, "", `#${params.toString()}`);
}

function applyUrlState(state) {
  if (!state) return;
  if (state.basemap) setBasemap(state.basemap);
  if (state.layers) {
    const enabled = new Set(state.layers.split(",").filter(Boolean));
    for (const layer of catalog.layers) {
      const on = enabled.has(layer.id);
      const checkbox = document.querySelector(`input[data-layer="${layer.id}"]`);
      if (checkbox) {
        checkbox.checked = on;
        syncLayerRowState(checkbox);
      }
      if (layer._styleIds) setLayerVisibility(layer._styleIds, on);
    }
    updateLayerCount();
  }
  const z = Number(state.z);
  const lng = Number(state.lng);
  const lat = Number(state.lat);
  if (Number.isFinite(z) && Number.isFinite(lng) && Number.isFinite(lat)) {
    map.jumpTo({ center: [lng, lat], zoom: z });
  }
}

function openFoldsForActiveLayers() {
  for (const [group, listId] of Object.entries(GROUP_TARGETS)) {
    const list = document.getElementById(listId);
    const fold = list?.closest("details");
    if (!fold) continue;
    const hasOn = catalog.layers.some(
      (layer) =>
        layer.group === group &&
        document.querySelector(`input[data-layer="${layer.id}"]`)?.checked
    );
    if (hasOn) fold.open = true;
  }
}

function layerStatusMeta(layer) {
  if (failedLayers.has(layer.id)) {
    return { status: "failed", statusLabel: "Failed to load" };
  }
  if (layer.verification_status === "estimated") {
    return { status: "estimated", statusLabel: "Heuristic" };
  }
  if (layer.verification_status === "public_arcgis_unverified_currency") {
    return { status: "partial", statusLabel: "Confirm currency" };
  }
  if (layer.verification_status === "community_mapped") {
    return { status: "partial", statusLabel: "OSM" };
  }
  return { status: "ready", statusLabel: "Free data" };
}

function updateFoldCounts() {
  for (const fold of document.querySelectorAll(".panel-fold[data-group]")) {
    const group = fold.dataset.group;
    const badge = fold.querySelector(`[data-fold-count="${group}"]`);
    if (!badge) continue;
    const inputs = [...fold.querySelectorAll("input[data-layer]:not(:disabled)")];
    const on = inputs.filter((input) => input.checked).length;
    badge.textContent = on ? `${on} on` : "";
    badge.classList.toggle("has-on", on > 0);
  }
}

function updateLayerCount() {
  const label = document.getElementById("layer-count-label");
  const inputs = [...document.querySelectorAll("input[data-layer]:not(:disabled)")];
  const on = inputs.filter((input) => input.checked).length;
  if (label) label.textContent = `${on} of ${inputs.length} on`;
  const toggleBtn = document.getElementById("panel-toggle");
  const sidePanel = document.getElementById("side-panel");
  const panelOpen = sidePanel?.classList.contains("open");
  if (toggleBtn && window.matchMedia("(max-width: 900px)").matches) {
    toggleBtn.textContent = panelOpen ? "Close" : on ? `Layers · ${on}` : "Layers";
  }
  updateFoldCounts();
  renderLegend();
}

function syncLayerRowState(input) {
  const row = input.closest(".layer-row");
  if (row) row.classList.toggle("on", input.checked);
}

function filterLayerList(query) {
  const q = query.trim().toLowerCase();
  let visible = 0;
  for (const row of document.querySelectorAll(".layer-row")) {
    const name = row.querySelector(".layer-name")?.textContent?.toLowerCase() || "";
    const meta = row.querySelector(".layer-meta")?.textContent?.toLowerCase() || "";
    const match = !q || name.includes(q) || meta.includes(q);
    row.hidden = !match;
    if (match) visible += 1;
  }
  for (const fold of document.querySelectorAll(".panel-fold[data-group]")) {
    const anyVisible = [...fold.querySelectorAll(".layer-row")].some((row) => !row.hidden);
    fold.classList.toggle("filter-empty", Boolean(q) && !anyVisible);
    if (q && anyVisible) fold.open = true;
  }
  const meta = document.getElementById("layer-filter-meta");
  if (meta) meta.textContent = q ? `${visible} shown` : "";
}

function setLayerChecked(layerId, on) {
  const layer = catalog.layers.find((l) => l.id === layerId);
  const input = document.querySelector(`input[data-layer="${layerId}"]`);
  if (!layer || !input || input.disabled) return;
  input.checked = on;
  syncLayerRowState(input);
  if (layer._styleIds) setLayerVisibility(layer._styleIds, on);
}

function applyDefaultLayers() {
  for (const layer of catalog.layers) {
    setLayerChecked(layer.id, !!layer.defaultVisible && !failedLayers.has(layer.id));
  }
  document.querySelectorAll(".preset-btn").forEach((btn) => btn.classList.remove("active"));
  updateLayerCount();
  openFoldsForActiveLayers();
  writeUrlState();
  setToolStatus("Restored default layers.");
}

function clearOverlayLayers() {
  for (const layer of catalog.layers) {
    const keep =
      layer.id === "city-boundary" ||
      layer.id === "roads" ||
      layer.id === "buildings" ||
      layer.id === "streams" ||
      layer.id === "waterbodies";
    setLayerChecked(layer.id, keep && !failedLayers.has(layer.id));
  }
  document.querySelectorAll(".preset-btn").forEach((btn) => btn.classList.remove("active"));
  updateLayerCount();
  openFoldsForActiveLayers();
  writeUrlState();
  setToolStatus("Cleared overlays. Base map layers kept.");
}

function renderLayerControls(layers) {
  for (const id of Object.values(GROUP_TARGETS)) {
    document.getElementById(id).innerHTML = "";
  }
  const sourceEl = document.getElementById("source-list");
  sourceEl.innerHTML = "";

  for (const layer of layers) {
    const targetId = GROUP_TARGETS[layer.group] || "layers-boundaries";
    const row = document.createElement("div");
    const on = !!layer.defaultVisible && !failedLayers.has(layer.id);
    row.className = `layer-row${on ? " on" : ""}`;
    const { status, statusLabel } = layerStatusMeta(layer);
    row.innerHTML = `
      <label>
        <input type="checkbox" data-layer="${layer.id}" ${layer.defaultVisible ? "checked" : ""} ${failedLayers.has(layer.id) ? "disabled" : ""} />
        <span class="layer-name">${escapeHtml(layer.name)}</span>
        <span class="status ${status}">${statusLabel}</span>
        <span class="layer-meta">${escapeHtml(VERIFY_LABELS[layer.verification_status] || "Public GIS")}</span>
      </label>
    `;
    const target = document.getElementById(targetId);
    if (target) target.appendChild(row);

    const li = document.createElement("li");
    const date = layer.updated ? ` · Updated ${layer.updated}` : "";
    li.innerHTML = `<strong>${escapeHtml(layer.name)}</strong><br />
      <a href="${escapeHtml(layer.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(layer.source)}</a>${escapeHtml(date)}
      ${layer.notes ? `<br /><span>${escapeHtml(layer.notes)}</span>` : ""}`;
    sourceEl.appendChild(li);
  }
  updateLayerCount();
}

function featureTitleFrom(props, fallback) {
  const raw =
    props?.district_name ||
    props?.district_code ||
    props?.name ||
    props?.NAME ||
    props?.address ||
    props?.parcel_id ||
    props?.PROP_ADDR ||
    props?.bridge_id ||
    props?.tract_id ||
    props?.shop ||
    props?.amenity ||
    fallback ||
    "Feature";
  const text = String(raw);
  if (text === text.toUpperCase() && /[A-Z]/.test(text) && text.length > 2) {
    return titleCaseWords(text);
  }
  return text;
}

function styleIdToLayer(styleId) {
  return catalog.layers.find((layer) => layer._styleIds?.includes(styleId));
}

function activeInspectLayers() {
  return interactiveStyleIds.filter((id) => map.getLayer(id));
}

function bestInspectHit(point) {
  const layers = activeInspectLayers();
  if (!layers.length) return null;
  const hits = map.queryRenderedFeatures(point, { layers });
  if (!hits.length) return null;
  hits.sort((a, b) => inspectPriority(b.layer?.id) - inspectPriority(a.layer?.id));
  return hits[0];
}

function setupFeatureInspect() {
  map.on("click", (e) => {
    if (measuring) return;
    const f = bestInspectHit(e.point);
    if (!f) {
      featureCard.hidden = true;
      return;
    }
    const layer = styleIdToLayer(f.layer.id);
    showFeature(featureTitleFrom(f.properties, layer?.name), f.properties, layer?.name || "");
  });

  let hoverRaf = 0;
  let lastHoverPoint = null;
  map.on("mousemove", (e) => {
    if (measuring) {
      map.getCanvas().style.cursor = "crosshair";
      return;
    }
    lastHoverPoint = e.point;
    if (hoverRaf) return;
    hoverRaf = window.requestAnimationFrame(() => {
      hoverRaf = 0;
      if (!lastHoverPoint) return;
      const hit = bestInspectHit(lastHoverPoint);
      map.getCanvas().style.cursor = hit ? "pointer" : "";
    });
  });
}

function computeCityBounds(cityData) {
  const features = cityData?.features || [];
  if (!features.length) return null;
  const coords = [];
  const walk = (c) => {
    if (typeof c[0] === "number") coords.push(c);
    else c.forEach(walk);
  };
  for (const feature of features) {
    if (feature?.geometry?.coordinates) walk(feature.geometry.coordinates);
  }
  if (!coords.length) return null;
  return coords.reduce(
    (b, c) => b.extend(c),
    new maplibregl.LngLatBounds(coords[0], coords[0])
  );
}

function fitCityBounds(options = {}) {
  if (!cityBounds) return;
  const mobile = window.matchMedia("(max-width: 900px)").matches;
  map.fitBounds(cityBounds, {
    padding: mobile
      ? { top: 150, bottom: 72, left: 28, right: 28 }
      : { top: 110, bottom: 48, left: 48, right: 48 },
    duration: 1200,
    ...options,
  });
}

function setToolStatus(message, { sticky = false } = {}) {
  const el = document.getElementById("tool-status");
  if (!el) return;
  if (!message) {
    el.hidden = true;
    el.textContent = "";
    if (mapHint && !hasInspectedFeature && !measuring) mapHint.hidden = false;
    return;
  }
  el.hidden = false;
  el.textContent = message;
  if (mapHint) mapHint.hidden = true;
  if (!sticky) {
    window.clearTimeout(setToolStatus._timer);
    setToolStatus._timer = window.setTimeout(() => {
      if (el.textContent === message && !measuring) {
        el.hidden = true;
        if (mapHint && !hasInspectedFeature) mapHint.hidden = false;
      }
    }, 4000);
  }
}

function buildSearchIndex(addressData) {
  searchIndex = (addressData.features || [])
    .filter((f) => f.geometry?.type === "Point" && f.properties?.address)
    .map((f) => ({
      address: String(f.properties.address),
      muni: f.properties.muni || "",
      coordinates: f.geometry.coordinates,
    }));
}

function highlightSearchResult(index) {
  const resultsEl = document.getElementById("search-results");
  const buttons = [...resultsEl.querySelectorAll("button[data-idx]")];
  buttons.forEach((btn, i) => {
    btn.classList.toggle("active", i === index);
    if (i === index) btn.setAttribute("aria-selected", "true");
    else btn.removeAttribute("aria-selected");
  });
  if (index >= 0 && buttons[index]) buttons[index].scrollIntoView({ block: "nearest" });
}

function runSearch(query) {
  const q = query.trim().toLowerCase();
  const resultsEl = document.getElementById("search-results");
  searchActiveIndex = -1;
  if (!q) {
    searchHits = [];
    resultsEl.hidden = true;
    resultsEl.innerHTML = "";
    return;
  }
  const scored = [];
  for (const item of searchIndex) {
    const addr = item.address.toLowerCase();
    const muni = String(item.muni || "").toLowerCase();
    const haystack = `${addr} ${muni}`.trim();
    if (!haystack.includes(q) && !muni.includes(q)) continue;
    let score = 3;
    if (addr.startsWith(q)) score = 0;
    else if (addr.split(/\s+/).some((w) => w.startsWith(q))) score = 1;
    else if (muni && (muni === q || muni.startsWith(q))) score = 1;
    else if (addr.includes(q)) score = 2;
    scored.push({ item, score });
  }
  scored.sort((a, b) => a.score - b.score || a.item.address.localeCompare(b.item.address));
  searchHits = scored.slice(0, 8).map((row) => row.item);
  if (!searchHits.length) {
    resultsEl.hidden = false;
    resultsEl.innerHTML = `<li><button type="button" disabled>No matches</button></li>`;
    return;
  }
  resultsEl.hidden = false;
  resultsEl.innerHTML = searchHits
    .map((item, i) => {
      const label = escapeHtml(item.address) + (item.muni ? ` · ${escapeHtml(item.muni)}` : "");
      return `<li><button type="button" role="option" data-idx="${i}">${label}</button></li>`;
    })
    .join("");
  resultsEl.querySelectorAll("button[data-idx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = searchHits[Number(btn.dataset.idx)];
      flyToAddress(item);
      resultsEl.hidden = true;
    });
  });
}

function flyToAddress(item) {
  map.flyTo({ center: item.coordinates, zoom: 17, duration: 900 });
  if (searchMarker) searchMarker.remove();
  searchMarker = new maplibregl.Marker({ color: "#2f4a32" })
    .setLngLat(item.coordinates)
    .setPopup(new maplibregl.Popup().setText(item.address))
    .addTo(map);
  searchMarker.togglePopup();
  showFeature(item.address, { address: item.address, muni: item.muni }, "Address");
}

map.on("load", async () => {
  const urlState = readUrlState();
  setLoading(true, "Fetching free public layers…", 10);
  renderStats();
  renderLegend();
  renderBasemapControls();
  renderPresets();
  renderLayerControls(catalog.layers);

  const total = catalog.layers.length;
  let done = 0;
  const loaded = await Promise.all(
    catalog.layers.map(async (layer) => {
      const result = await loadGeoJSON(layer.path);
      done += 1;
      setLoading(true, `Loading layers ${done}/${total}…`, 10 + (done / total) * 85);
      if (!result.ok) failedLayers.add(layer.id);
      return { layer, data: result.data, ok: result.ok };
    })
  );

  if (failedLayers.size) renderLayerControls(catalog.layers);

  for (const { layer, data, ok } of loaded) {
    if (!ok) continue;
    map.addSource(layer.id, { type: "geojson", data });
    const styleIds = addLayerStyles(layer);
    layer._styleIds = styleIds;
    setLayerVisibility(styleIds, layer.defaultVisible);

    if (layer.id === "addresses") buildSearchIndex(data);
    if (layer.id === "city-boundary") cityBounds = computeCityBounds(data);

    for (const styleId of styleIds) {
      if (styleId.endsWith("-label")) continue;
      interactiveStyleIds.push(styleId);
    }
  }

  restackLayers();
  setupFeatureInspect();

  document.querySelectorAll("input[data-layer]").forEach((input) => {
    syncLayerRowState(input);
    input.addEventListener("change", () => {
      const layer = catalog.layers.find((l) => l.id === input.dataset.layer);
      if (!layer?._styleIds) return;
      setLayerVisibility(layer._styleIds, input.checked);
      syncLayerRowState(input);
      document.querySelectorAll(".preset-btn").forEach((btn) => btn.classList.remove("active"));
      updateLayerCount();
      writeUrlState();
    });
  });

  if (urlState?.layers || urlState?.basemap || urlState?.z) {
    applyUrlState(urlState);
  } else {
    fitCityBounds();
  }

  document.querySelectorAll("input[data-layer]").forEach(syncLayerRowState);
  updateLayerCount();

  map.on("moveend", () => writeUrlState());
  window.addEventListener("hashchange", () => {
    applyUrlState(readUrlState());
    document.querySelectorAll("input[data-layer]").forEach(syncLayerRowState);
    updateLayerCount();
  });
  writeUrlState();
  setLoading(false, "Ready", 100);
  resizeMapSoon();

  let shareTimer = 0;
  document.getElementById("share-btn").addEventListener("click", async () => {
    writeUrlState();
    const status = document.getElementById("share-status");
    try {
      await navigator.clipboard.writeText(location.href);
      status.hidden = false;
      status.textContent = "Share link copied.";
    } catch {
      status.hidden = false;
      status.textContent = "Copy the URL from the address bar.";
    }
    window.clearTimeout(shareTimer);
    shareTimer = window.setTimeout(() => {
      status.hidden = true;
    }, 3200);
  });

  document.getElementById("dock-reset-btn")?.addEventListener("click", () => {
    fitCityBounds();
    setToolStatus("Returned to city overview.");
  });

  document.getElementById("layers-defaults-btn")?.addEventListener("click", () => {
    applyDefaultLayers();
  });
  document.getElementById("layers-clear-btn")?.addEventListener("click", () => {
    clearOverlayLayers();
  });
  document.getElementById("layer-filter")?.addEventListener("input", (e) => {
    filterLayerList(e.target.value);
  });

  openFoldsForActiveLayers();
  updateFoldCounts();
  setupMapTools();
});

function haversineMiles(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 3958.7613;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function setupMapTools() {
  const exportBtn = document.getElementById("export-png-btn");
  const measureBtn = document.getElementById("dock-measure-btn");
  const clearBtn = document.getElementById("dock-measure-clear-btn");
  const measureCoords = [];
  if (!measureBtn || !clearBtn || !exportBtn) return;

  map.addSource("measure-line", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });
  map.addLayer({
    id: "measure-line",
    type: "line",
    source: "measure-line",
    paint: {
      "line-color": "#9a3412",
      "line-width": 2.5,
      "line-dasharray": [1.5, 1.2],
    },
  });
  map.addLayer({
    id: "measure-points",
    type: "circle",
    source: "measure-line",
    filter: ["==", ["geometry-type"], "Point"],
    paint: {
      "circle-radius": 5,
      "circle-color": "#9a3412",
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#f3eee4",
    },
  });
  if (map.getLayer("measure-line")) map.moveLayer("measure-line");
  if (map.getLayer("measure-points")) map.moveLayer("measure-points");

  function measureGeoJSON() {
    const features = measureCoords.map((c) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: c },
      properties: {},
    }));
    if (measureCoords.length >= 2) {
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: measureCoords },
        properties: {},
      });
    }
    return { type: "FeatureCollection", features };
  }

  function updateMeasure() {
    map.getSource("measure-line").setData(measureGeoJSON());
    if (!measureCoords.length) {
      clearBtn.hidden = true;
      if (measuring) setToolStatus("Click the map to start measuring.", { sticky: true });
      else setToolStatus("");
      return;
    }
    clearBtn.hidden = false;
    if (measureCoords.length === 1) {
      setToolStatus("Click another point to measure distance.", { sticky: true });
      return;
    }
    let miles = 0;
    for (let i = 1; i < measureCoords.length; i += 1) {
      miles += haversineMiles(measureCoords[i - 1], measureCoords[i]);
    }
    const feet = miles * 5280;
    const text =
      feet < 5280
        ? `Distance: ${feet.toFixed(0)} ft (${miles.toFixed(3)} mi)`
        : `Distance: ${miles.toFixed(2)} mi (${feet.toFixed(0)} ft)`;
    setToolStatus(text, { sticky: true });
  }

  function setMeasuring(on) {
    measuring = on;
    measureBtn.setAttribute("aria-pressed", String(on));
    measureBtn.classList.toggle("active", on);
    map.getCanvas().style.cursor = on ? "crosshair" : "";
    if (on) {
      featureCard.hidden = true;
      if (mapHint) mapHint.hidden = true;
      setToolStatus("Click the map to start measuring.", { sticky: true });
    } else if (!measureCoords.length) {
      setToolStatus("");
    } else {
      // Keep last measurement visible briefly when turning measure off.
      setToolStatus(document.getElementById("tool-status")?.textContent || "");
    }
  }

  exportBtn.addEventListener("click", () => {
    setToolStatus("Preparing PNG…", { sticky: true });
    const exportOnce = () => {
      try {
        const canvas = map.getCanvas();
        const href = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `henry-planning-map-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = href;
        link.click();
        setToolStatus("PNG downloaded.");
      } catch (err) {
        console.warn("Export failed", err);
        setToolStatus("Export blocked by tile CORS. Try the browser print dialog instead.");
      }
    };
    if (map.loaded()) {
      map.once("idle", exportOnce);
      map.triggerRepaint();
    } else {
      exportOnce();
    }
  });

  measureBtn.addEventListener("click", () => setMeasuring(!measuring));
  clearBtn.addEventListener("click", () => {
    measureCoords.length = 0;
    updateMeasure();
  });

  map.on("click", (e) => {
    if (!measuring) return;
    measureCoords.push([e.lngLat.lng, e.lngLat.lat]);
    updateMeasure();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && measuring) setMeasuring(false);
  });
}

const panel = document.getElementById("side-panel");
const toggle = document.getElementById("panel-toggle");
const panelClose = document.getElementById("panel-close");
const backdrop = document.getElementById("panel-backdrop");

function resizeMapSoon() {
  window.requestAnimationFrame(() => {
    try {
      map.resize();
    } catch {
      /* map may not be ready during early boot */
    }
  });
}

function setPanelOpen(open) {
  panel.classList.toggle("open", open);
  toggle.setAttribute("aria-expanded", String(open));
  if (window.matchMedia("(max-width: 900px)").matches) {
    if (open) toggle.textContent = "Close";
    else updateLayerCount();
  } else {
    toggle.textContent = "Layers";
  }
  if (backdrop) backdrop.hidden = !open || !window.matchMedia("(max-width: 900px)").matches;
  resizeMapSoon();
}

toggle.addEventListener("click", () => {
  setPanelOpen(!panel.classList.contains("open"));
});
panelClose?.addEventListener("click", () => setPanelOpen(false));
backdrop?.addEventListener("click", () => setPanelOpen(false));

const mobilePanelQuery = window.matchMedia("(max-width: 900px)");
if (mobilePanelQuery.matches) {
  setPanelOpen(false);
} else {
  setPanelOpen(true);
}
mobilePanelQuery.addEventListener("change", (e) => {
  setPanelOpen(!e.matches);
  resizeMapSoon();
});
window.addEventListener("resize", resizeMapSoon);

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  featureCard.hidden = true;
  document.getElementById("search-results").hidden = true;
  if (window.matchMedia("(max-width: 900px)").matches) setPanelOpen(false);
});

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
searchInput.addEventListener("input", () => runSearch(searchInput.value));
searchInput.addEventListener("keydown", (e) => {
  const resultsEl = document.getElementById("search-results");
  if (resultsEl.hidden || !searchHits.length) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    searchActiveIndex = Math.min(searchHits.length - 1, searchActiveIndex + 1);
    highlightSearchResult(searchActiveIndex);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    searchActiveIndex = Math.max(0, searchActiveIndex - 1);
    highlightSearchResult(searchActiveIndex);
  } else if (e.key === "Enter" && searchActiveIndex >= 0) {
    e.preventDefault();
    flyToAddress(searchHits[searchActiveIndex]);
    resultsEl.hidden = true;
  }
});
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (searchActiveIndex >= 0 && searchHits[searchActiveIndex]) {
    flyToAddress(searchHits[searchActiveIndex]);
    document.getElementById("search-results").hidden = true;
    return;
  }
  const q = searchInput.value.trim().toLowerCase();
  const hit =
    searchHits[0] ||
    searchIndex.find(
      (item) =>
        item.address.toLowerCase().includes(q) ||
        String(item.muni || "")
          .toLowerCase()
          .includes(q)
    );
  if (hit) {
    flyToAddress(hit);
    document.getElementById("search-results").hidden = true;
  } else {
    runSearch(searchInput.value);
  }
});
document.addEventListener("click", (e) => {
  if (!searchForm.contains(e.target)) {
    document.getElementById("search-results").hidden = true;
  }
});

document.getElementById("correction-form").addEventListener("submit", (e) => {
  e.preventDefault();
  writeUrlState();
  const fd = new FormData(e.target);
  const subject = encodeURIComponent("Eminence & New Castle map correction");
  const body = encodeURIComponent(
    [
      `Name: ${fd.get("name")}`,
      `Email: ${fd.get("email")}`,
      `Parcel / address: ${fd.get("location") || "(not provided)"}`,
      "",
      "Correction:",
      fd.get("message"),
      "",
      `Map link: ${location.href}`,
      "",
      "Sent from the Eminence & New Castle Planning and Zoning Explorer (unofficial).",
    ].join("\n")
  );
  const to = catalog.contactEmail || "";
  if (!to) {
    alert("No contact email is configured yet. Update contactEmail in layers.json.");
    return;
  }
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
});
