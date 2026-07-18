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
  tax_district: "Tax district",
  fire_district: "Fire district",
  land_value: "Land value",
  improvement_value: "Improvement value",
  taxable: "Taxable value",
  fair_cash: "Fair cash value",
  description: "Description",
  year: "Year",
  name: "Name",
  amenity: "Amenity",
  shop: "Shop",
  bridge_id: "Bridge ID",
  tract_id: "Census tract",
  pop_2020: "Population (2020)",
  near_school: "Near school",
  muni: "Municipality",
};

const MONEY_KEYS = new Set([
  "land_value",
  "improvement_value",
  "taxable",
  "fair_cash",
]);

const GROUP_TARGETS = {
  base: "layers-base",
  planning: "layers-planning",
  community: "layers-community",
  utilities: "layers-utilities",
  places: "layers-places",
  analysis: "layers-analysis",
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
  "I1", "#c4b5fd",
  "I2", "#a78bfa",
  "#9ca3af",
];

const LEGEND = [
  { label: "City limits", color: "#2f4a32", kind: "line" },
  { label: "Parcels", color: "#78716c", kind: "line" },
  { label: "Residential districts", color: "#e9c46a", kind: "fill" },
  { label: "Business districts", color: "#63b3ed", kind: "fill" },
  { label: "Industrial districts", color: "#a78bfa", kind: "fill" },
  { label: "Agricultural districts", color: "#8a9a6d", kind: "fill" },
  { label: "Buildings", color: "#6b5b4a", kind: "fill" },
  { label: "Flood hazard", color: "#c45c26", kind: "fill" },
  { label: "Public / exempt parcels", color: "#0f766e", kind: "fill" },
  { label: "Vacancy / sidewalk hints", color: "#b45309", kind: "dot" },
];

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

function formatPropValue(key, value) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const num = coerceNumber(value);
  if (MONEY_KEYS.has(key) && num !== null) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(num);
  }
  if (key === "acres" && num !== null) return num.toFixed(2);
  if (num !== null && !Number.isInteger(num)) {
    return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  if (num !== null) return num.toLocaleString("en-US");
  return String(value);
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
    name: "Eminence free data",
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
const interactiveStyleIds = [];
const failedLayers = new Set();

document.getElementById("feature-close").addEventListener("click", () => {
  featureCard.hidden = true;
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
      dt.textContent = humanizeKey(key);
      dd.textContent = formatPropValue(key, value);
      div.append(dt, dd);
      featureAttrs.appendChild(div);
    }
  }

  if (notes.length) {
    const note = document.createElement("p");
    note.className = "feature-note";
    note.textContent = notes.join(" ");
    featureAttrs.appendChild(note);
  }
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
    return [`${id}-fill`, `${id}-line`];
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
        "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
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
        "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
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

  if (id === "census-tracts") {
    return fillLine(id, "#3d6f7a", "#3d6f7a", 0.1);
  }

  if (id === "wwtp" || id === "water-tanks") {
    return pointStyle(id, "#3d6f7a", 8);
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
        "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
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

  if (id === "osm-sidewalks") {
    map.addLayer({
      id: `${id}-line`,
      type: "line",
      source: id,
      paint: {
        "line-color": "#15803d",
        "line-width": 3,
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
  const items = [
    [stats.parcels ?? 0, "Parcels"],
    [stats.zoning_polygons ?? 0, "Zoning polygons"],
    [stats.buildings, "Buildings"],
    [stats.addresses, "Addresses"],
    [stats.zero_improvement_parcels ?? 0, "Zero-improvement parcels"],
    [stats.public_exempt_parcels ?? 0, "Public / exempt parcels"],
  ];
  el.innerHTML = items
    .map(
      ([n, label]) =>
        `<div class="stat-card"><strong>${Number(n).toLocaleString()}</strong><span>${label}</span></div>`
    )
    .join("");
}

function renderLegend() {
  const el = document.getElementById("legend-list");
  el.innerHTML = LEGEND.map((item) => {
    const cls = item.kind === "line" ? "swatch line" : item.kind === "dot" ? "swatch dot" : "swatch";
    const style =
      item.kind === "line"
        ? `border-top-color:${item.color}`
        : `background:${item.color}`;
    return `<li><span class="${cls}" style="${style}"></span><span>${item.label}</span></li>`;
  }).join("");
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
  for (const preset of catalog.presets || []) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-btn";
    btn.dataset.preset = preset.id;
    btn.textContent = preset.name;
    btn.addEventListener("click", () => applyPreset(preset));
    el.appendChild(btn);
  }
}

function restackLayers() {
  // Keep fills under buildings/roads; keep labels/points on top.
  const underBuildings = [
    "henry-county-fill",
    "henry-county-line",
    "flood-hazards-fill",
    "flood-hazards-line",
    "school-districts-fill",
    "school-districts-line",
    "fire-districts-fill",
    "fire-districts-line",
    "census-tracts-fill",
    "census-tracts-line",
    "school-buffers-fill",
    "school-buffers-line",
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
    "osm-parks-fill",
    "osm-parking-fill",
    "addresses-circle",
    "bridges-circle",
    "schools-circle",
    "wwtp-circle",
    "water-tanks-circle",
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
  const groupToFold = {
    base: "layers-base",
    planning: "layers-planning",
    community: "layers-community",
    utilities: "layers-utilities",
    places: "layers-places",
    analysis: "layers-analysis",
  };
  for (const [group, listId] of Object.entries(groupToFold)) {
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

function updateLayerCount() {
  const label = document.getElementById("layer-count-label");
  if (!label) return;
  const inputs = [...document.querySelectorAll("input[data-layer]:not(:disabled)")];
  const on = inputs.filter((input) => input.checked).length;
  label.textContent = `${on} of ${inputs.length} layers on`;
}

function syncLayerRowState(input) {
  const row = input.closest(".layer-row");
  if (row) row.classList.toggle("on", input.checked);
}

function renderLayerControls(layers) {
  for (const id of Object.values(GROUP_TARGETS)) {
    document.getElementById(id).innerHTML = "";
  }
  const sourceEl = document.getElementById("source-list");
  sourceEl.innerHTML = "";

  for (const layer of layers) {
    const targetId = GROUP_TARGETS[layer.group] || "layers-base";
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
  return (
    props?.district_name ||
    props?.district_code ||
    props?.name ||
    props?.address ||
    props?.parcel_id ||
    props?.PROP_ADDR ||
    props?.bridge_id ||
    props?.tract_id ||
    props?.shop ||
    props?.amenity ||
    fallback ||
    "Feature"
  );
}

function styleIdToLayer(styleId) {
  return catalog.layers.find((layer) => layer._styleIds?.includes(styleId));
}

function setupFeatureInspect() {
  map.on("click", (e) => {
    if (measuring) return;
    if (!interactiveStyleIds.length) return;
    const hits = map.queryRenderedFeatures(e.point, { layers: interactiveStyleIds.filter((id) => map.getLayer(id)) });
    const f = hits[0];
    if (!f) {
      featureCard.hidden = true;
      return;
    }
    const layer = styleIdToLayer(f.layer.id);
    showFeature(featureTitleFrom(f.properties, layer?.name), f.properties, layer?.name || "");
  });

  map.on("mousemove", (e) => {
    if (measuring) {
      map.getCanvas().style.cursor = "crosshair";
      return;
    }
    if (!interactiveStyleIds.length) return;
    const hits = map.queryRenderedFeatures(e.point, { layers: interactiveStyleIds.filter((id) => map.getLayer(id)) });
    map.getCanvas().style.cursor = hits.length ? "pointer" : "";
  });
}

function computeCityBounds(cityData) {
  const feature = cityData?.features?.[0];
  if (!feature?.geometry?.coordinates) return null;
  const coords = [];
  const walk = (c) => {
    if (typeof c[0] === "number") coords.push(c);
    else c.forEach(walk);
  };
  walk(feature.geometry.coordinates);
  if (!coords.length) return null;
  return coords.reduce(
    (b, c) => b.extend(c),
    new maplibregl.LngLatBounds(coords[0], coords[0])
  );
}

function fitCityBounds(options = {}) {
  if (!cityBounds) return;
  map.fitBounds(cityBounds, { padding: 48, duration: 1200, ...options });
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

function runSearch(query) {
  const q = query.trim().toLowerCase();
  const resultsEl = document.getElementById("search-results");
  if (!q) {
    resultsEl.hidden = true;
    resultsEl.innerHTML = "";
    return;
  }
  const hits = searchIndex
    .filter((item) => item.address.toLowerCase().includes(q))
    .slice(0, 8);
  if (!hits.length) {
    resultsEl.hidden = false;
    resultsEl.innerHTML = `<li><button type="button" disabled>No matches</button></li>`;
    return;
  }
  resultsEl.hidden = false;
  resultsEl.innerHTML = hits
    .map((item, i) => {
      const label = escapeHtml(item.address) + (item.muni ? ` · ${escapeHtml(item.muni)}` : "");
      return `<li><button type="button" data-idx="${i}">${label}</button></li>`;
    })
    .join("");
  resultsEl.querySelectorAll("button[data-idx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = hits[Number(btn.dataset.idx)];
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
  });

  document.getElementById("reset-view-btn")?.addEventListener("click", () => {
    fitCityBounds();
    setToolStatus("Returned to city overview.");
  });

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
  const measureBtn = document.getElementById("measure-btn");
  const clearBtn = document.getElementById("measure-clear-btn");
  const measureCoords = [];

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
        link.download = `eminence-planning-map-${new Date().toISOString().slice(0, 10)}.png`;
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

function setPanelOpen(open) {
  panel.classList.toggle("open", open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.textContent = open ? "Close" : "Layers";
  if (backdrop) backdrop.hidden = !open || !window.matchMedia("(max-width: 900px)").matches;
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
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  featureCard.hidden = true;
  document.getElementById("search-results").hidden = true;
  if (window.matchMedia("(max-width: 900px)").matches) setPanelOpen(false);
});

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
searchInput.addEventListener("input", () => runSearch(searchInput.value));
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = searchInput.value.trim().toLowerCase();
  const hit = searchIndex.find((item) => item.address.toLowerCase().includes(q));
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
  const subject = encodeURIComponent("Eminence map correction");
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
      "Sent from the Eminence Planning and Zoning Explorer (unofficial).",
    ].join("\n")
  );
  const to = catalog.contactEmail || "";
  if (!to) {
    alert("No contact email is configured yet. Update contactEmail in layers.json.");
    return;
  }
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
});
