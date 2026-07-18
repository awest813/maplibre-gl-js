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

const catalog = await fetch("layers.json").then((r) => r.json());
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

function formatPropValue(key, value) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (MONEY_KEYS.has(key) && typeof value === "number") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (key === "acres" && typeof value === "number") return value.toFixed(2);
  if (typeof value === "number" && Number.isFinite(value) && !Number.isInteger(value)) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  if (typeof value === "number") return value.toLocaleString("en-US");
  return String(value);
}

function humanizeKey(key) {
  return PROP_LABELS[key] || key.replaceAll("_", " ");
}

function setLoading(visible, detail) {
  const el = document.getElementById("loading");
  const detailEl = document.getElementById("loading-detail");
  if (!el) return;
  el.hidden = !visible;
  if (detail && detailEl) detailEl.textContent = detail;
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

const map = new maplibregl.Map({
  container: "map",
  style: buildStyle(defaultBasemap),
  center: catalog.center,
  zoom: catalog.zoom,
  maxBounds: [
    [catalog.bounds[0] - 0.08, catalog.bounds[1] - 0.08],
    [catalog.bounds[2] + 0.08, catalog.bounds[3] + 0.08],
  ],
});

map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-left");
map.addControl(new maplibregl.ScaleControl({ unit: "imperial" }), "bottom-left");

const featureCard = document.getElementById("feature-card");
const featureTitle = document.getElementById("feature-title");
const featureAttrs = document.getElementById("feature-attrs");
let searchIndex = [];
let searchMarker = null;

document.getElementById("feature-close").addEventListener("click", () => {
  featureCard.hidden = true;
});

function showFeature(title, props) {
  featureTitle.textContent = title;
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
}

async function loadGeoJSON(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`Could not load ${path}`, err);
    return EMPTY_FC;
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
    return pointStyle(id, "#7c3aed", 6);
  }

  if (id === "osm-shops") {
    return pointStyle(id, "#db2777", 5);
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

function setBasemap(basemapId) {
  for (const bm of catalog.basemaps || []) {
    const styleId = `basemap-${bm.id}`;
    if (map.getLayer(styleId)) {
      map.setLayoutProperty(styleId, "visibility", bm.id === basemapId ? "visible" : "none");
    }
  }
  const radio = document.querySelector(`input[name="basemap"][value="${basemapId}"]`);
  if (radio) radio.checked = true;
}

function renderBasemapControls() {
  const el = document.getElementById("basemap-list");
  el.innerHTML = "";
  for (const bm of catalog.basemaps || []) {
    const row = document.createElement("label");
    row.className = "basemap-row";
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
    if (checkbox) checkbox.checked = on;
    if (layer._styleIds) setLayerVisibility(layer._styleIds, on);
  }
  if (preset.basemap) setBasemap(preset.basemap);
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.preset === preset.id);
  });
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
      if (checkbox) checkbox.checked = on;
      if (layer._styleIds) setLayerVisibility(layer._styleIds, on);
    }
  }
  const z = Number(state.z);
  const lng = Number(state.lng);
  const lat = Number(state.lat);
  if (Number.isFinite(z) && Number.isFinite(lng) && Number.isFinite(lat)) {
    map.jumpTo({ center: [lng, lat], zoom: z });
  }
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
    row.className = "layer-row";
    let status = "ready";
    let statusLabel = "Free data";
    if (layer.verification_status === "estimated") {
      status = "estimated";
      statusLabel = "Heuristic";
    } else if (layer.verification_status === "public_arcgis_unverified_currency") {
      status = "partial";
      statusLabel = "Confirm currency";
    } else if (layer.verification_status === "community_mapped") {
      status = "partial";
      statusLabel = "OSM";
    }
    row.innerHTML = `
      <label>
        <input type="checkbox" data-layer="${layer.id}" ${layer.defaultVisible ? "checked" : ""} />
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
  showFeature(item.address, { address: item.address, muni: item.muni });
}

map.on("load", async () => {
  const urlState = readUrlState();
  setLoading(true, "Fetching free public layers…");
  renderStats();
  renderLegend();
  renderBasemapControls();
  renderPresets();
  renderLayerControls(catalog.layers);

  setLoading(true, `Loading ${catalog.layers.length} layers…`);
  const loaded = await Promise.all(
    catalog.layers.map(async (layer) => {
      const data = await loadGeoJSON(layer.path);
      return { layer, data };
    })
  );

  for (const { layer, data } of loaded) {
    map.addSource(layer.id, { type: "geojson", data });
    const styleIds = addLayerStyles(layer);
    layer._styleIds = styleIds;
    setLayerVisibility(styleIds, layer.defaultVisible);

    if (layer.id === "addresses") buildSearchIndex(data);

    for (const styleId of styleIds) {
      if (styleId.endsWith("-label")) continue;
      map.on("click", styleId, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const title =
          f.properties?.district_name ||
          f.properties?.district_code ||
          f.properties?.name ||
          f.properties?.address ||
          f.properties?.parcel_id ||
          f.properties?.PROP_ADDR ||
          f.properties?.bridge_id ||
          f.properties?.tract_id ||
          f.properties?.shop ||
          f.properties?.amenity ||
          layer.name;
        showFeature(title, f.properties);
      });
      map.on("mouseenter", styleId, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", styleId, () => {
        map.getCanvas().style.cursor = "";
      });
    }
  }

  restackLayers();

  document.querySelectorAll("input[data-layer]").forEach((input) => {
    input.addEventListener("change", () => {
      const layer = catalog.layers.find((l) => l.id === input.dataset.layer);
      if (!layer?._styleIds) return;
      setLayerVisibility(layer._styleIds, input.checked);
      document.querySelectorAll(".preset-btn").forEach((btn) => btn.classList.remove("active"));
      writeUrlState();
    });
  });

  if (urlState?.layers || urlState?.basemap || urlState?.z) {
    applyUrlState(urlState);
  } else {
    const city = loaded.find((item) => item.layer.id === "city-boundary")?.data;
    if (city?.features?.[0]) {
      const coords = [];
      const walk = (c) => {
        if (typeof c[0] === "number") coords.push(c);
        else c.forEach(walk);
      };
      walk(city.features[0].geometry.coordinates);
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      );
      map.fitBounds(bounds, { padding: 48, duration: 1200 });
    }
  }

  map.on("moveend", () => writeUrlState());
  writeUrlState();
  setLoading(false);

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
});

const panel = document.getElementById("side-panel");
const toggle = document.getElementById("panel-toggle");
const backdrop = document.getElementById("panel-backdrop");

function setPanelOpen(open) {
  panel.classList.toggle("open", open);
  toggle.setAttribute("aria-expanded", String(open));
  if (backdrop) backdrop.hidden = !open || !window.matchMedia("(max-width: 900px)").matches;
}

toggle.addEventListener("click", () => {
  setPanelOpen(!panel.classList.contains("open"));
});
backdrop?.addEventListener("click", () => setPanelOpen(false));

if (window.matchMedia("(max-width: 900px)").matches) {
  setPanelOpen(false);
} else {
  setPanelOpen(true);
}

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
