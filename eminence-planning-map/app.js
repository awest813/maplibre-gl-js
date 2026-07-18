const STATUS_LABELS = {
  ready: "Ready",
  partial: "Partial",
  request_needed: "Request needed",
};

const VERIFY_LABELS = {
  verified_state_gis: "Verified by Kentucky GIS",
  awaiting_confirmation: "Awaiting confirmation",
  digitized_from_pdf: "Digitized from official PDF",
  verified_ordinance: "Verified through ordinance",
  estimated: "Estimated",
};

const EMPTY_FC = { type: "FeatureCollection", features: [] };

const catalog = await fetch("layers.json").then((r) => r.json());

document.getElementById("disclaimer-text").textContent = catalog.disclaimer;

const map = new maplibregl.Map({
  container: "map",
  style: {
    version: 8,
    name: "Eminence base",
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    },
    layers: [
      {
        id: "osm",
        type: "raster",
        source: "osm",
        paint: {
          "raster-saturation": -0.35,
          "raster-brightness-min": 0.08,
          "raster-brightness-max": 0.92,
        },
      },
    ],
  },
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

document.getElementById("feature-close").addEventListener("click", () => {
  featureCard.hidden = true;
});

function showFeature(title, props) {
  featureTitle.textContent = title;
  featureAttrs.innerHTML = "";
  const entries = Object.entries(props || {}).filter(
    ([, v]) => v !== null && v !== undefined && v !== ""
  );
  if (!entries.length) {
    const div = document.createElement("div");
    div.innerHTML = "<dt>Info</dt><dd>No attributes</dd>";
    featureAttrs.appendChild(div);
  } else {
    for (const [key, value] of entries.slice(0, 12)) {
      const div = document.createElement("div");
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = key;
      dd.textContent = String(value);
      div.append(dt, dd);
      featureAttrs.appendChild(div);
    }
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

function addLayerStyles(layer) {
  const sourceId = layer.id;
  if (layer.id === "city-boundary") {
    map.addLayer({
      id: `${sourceId}-fill`,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": "#2f4a32",
        "fill-opacity": 0.08,
      },
    });
    map.addLayer({
      id: `${sourceId}-line`,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": "#2f4a32",
        "line-width": 2.5,
        "line-dasharray": [1.2, 1],
      },
    });
    return [`${sourceId}-fill`, `${sourceId}-line`];
  }

  if (layer.id === "roads") {
    map.addLayer({
      id: `${sourceId}-local`,
      type: "line",
      source: sourceId,
      filter: ["!=", ["get", "kind"], "state"],
      paint: {
        "line-color": "#3a342c",
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.8, 16, 2.4],
        "line-opacity": 0.85,
      },
    });
    map.addLayer({
      id: `${sourceId}-state`,
      type: "line",
      source: sourceId,
      filter: ["==", ["get", "kind"], "state"],
      paint: {
        "line-color": "#9a6b2f",
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 1.8, 16, 4],
      },
    });
    map.addLayer({
      id: `${sourceId}-label`,
      type: "symbol",
      source: sourceId,
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
    return [`${sourceId}-local`, `${sourceId}-state`, `${sourceId}-label`];
  }

  if (layer.id === "addresses") {
    map.addLayer({
      id: `${sourceId}-circle`,
      type: "circle",
      source: sourceId,
      minzoom: 13,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 1.5, 17, 4],
        "circle-color": "#3d6f7a",
        "circle-opacity": 0.8,
        "circle-stroke-width": 0.5,
        "circle-stroke-color": "#f3eee4",
      },
    });
    return [`${sourceId}-circle`];
  }

  if (layer.id === "buildings") {
    map.addLayer({
      id: `${sourceId}-fill`,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": "#6b5b4a",
        "fill-opacity": 0.55,
      },
    });
    map.addLayer({
      id: `${sourceId}-line`,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": "#4a3f34",
        "line-width": 0.6,
        "line-opacity": 0.7,
      },
    });
    return [`${sourceId}-fill`, `${sourceId}-line`];
  }

  if (layer.id === "streams") {
    map.addLayer({
      id: `${sourceId}-line`,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": "#3d6f7a",
        "line-width": 1.2,
        "line-opacity": 0.75,
      },
    });
    return [`${sourceId}-line`];
  }

  if (layer.id === "waterbodies") {
    map.addLayer({
      id: `${sourceId}-fill`,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": "#6fa0ab",
        "fill-opacity": 0.45,
      },
    });
    return [`${sourceId}-fill`];
  }

  if (layer.id === "flood-hazards") {
    map.addLayer({
      id: `${sourceId}-fill`,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": "#c45c26",
        "fill-opacity": 0.28,
      },
    });
    map.addLayer({
      id: `${sourceId}-line`,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": "#9a3f14",
        "line-width": 1,
      },
    });
    return [`${sourceId}-fill`, `${sourceId}-line`];
  }

  // Placeholder planning layers — ready for data drop-in
  map.addLayer({
    id: `${sourceId}-fill`,
    type: "fill",
    source: sourceId,
    paint: {
      "fill-color": "#9a6b2f",
      "fill-opacity": 0.25,
    },
  });
  map.addLayer({
    id: `${sourceId}-line`,
    type: "line",
    source: sourceId,
    paint: {
      "line-color": "#9a6b2f",
      "line-width": 1.5,
    },
  });
  return [`${sourceId}-fill`, `${sourceId}-line`];
}

function setLayerVisibility(layerIds, visible) {
  const value = visible ? "visible" : "none";
  for (const id of layerIds) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", value);
  }
}

function renderLayerControls(layers) {
  const baseEl = document.getElementById("layers-base");
  const planningEl = document.getElementById("layers-planning");
  const sourceEl = document.getElementById("source-list");

  for (const layer of layers) {
    const row = document.createElement("div");
    row.className = "layer-row";
    const disabled = layer.type === "placeholder" && layer.status !== "ready";
    row.innerHTML = `
      <label>
        <input type="checkbox" data-layer="${layer.id}" ${layer.defaultVisible ? "checked" : ""} ${disabled && !layer.defaultVisible ? "" : ""} />
        <span class="layer-name">${layer.name}</span>
        <span class="status ${layer.status}">${STATUS_LABELS[layer.status] || layer.status}</span>
        <span class="layer-meta">${VERIFY_LABELS[layer.verification_status] || layer.verification_status}</span>
      </label>
    `;
    (layer.group === "planning" ? planningEl : baseEl).appendChild(row);

    const li = document.createElement("li");
    const date = layer.updated ? ` · Updated ${layer.updated}` : " · Not yet loaded";
    li.innerHTML = `<strong>${layer.name}</strong><br />
      <a href="${layer.sourceUrl}" target="_blank" rel="noopener noreferrer">${layer.source}</a>${date}
      ${layer.notes ? `<br /><span>${layer.notes}</span>` : ""}`;
    sourceEl.appendChild(li);
  }
}

const interactiveIds = [];

map.on("load", async () => {
  renderLayerControls(catalog.layers);

  for (const layer of catalog.layers) {
    const data = await loadGeoJSON(layer.path);
    map.addSource(layer.id, { type: "geojson", data });
    const styleIds = addLayerStyles(layer);
    layer._styleIds = styleIds;
    setLayerVisibility(styleIds, layer.defaultVisible);

    for (const styleId of styleIds) {
      if (styleId.endsWith("-label")) continue;
      interactiveIds.push(styleId);
      map.on("click", styleId, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const title =
          f.properties?.name ||
          f.properties?.address ||
          f.properties?.PROP_ADDR ||
          f.properties?.NAME ||
          f.properties?.GNIS_Name ||
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

  document.querySelectorAll("input[data-layer]").forEach((input) => {
    input.addEventListener("change", () => {
      const layer = catalog.layers.find((l) => l.id === input.dataset.layer);
      if (!layer?._styleIds) return;
      setLayerVisibility(layer._styleIds, input.checked);
    });
  });

  // Fit to city boundary once available
  const city = map.getSource("city-boundary");
  if (city) {
    const data = await loadGeoJSON("data/city-boundary.geojson");
    if (data.features?.[0]) {
      const coords = [];
      const walk = (c) => {
        if (typeof c[0] === "number") coords.push(c);
        else c.forEach(walk);
      };
      walk(data.features[0].geometry.coordinates);
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      );
      map.fitBounds(bounds, { padding: 48, duration: 1200 });
    }
  }
});

// Mobile panel toggle
const panel = document.getElementById("side-panel");
const toggle = document.getElementById("panel-toggle");
toggle.addEventListener("click", () => {
  const open = panel.classList.toggle("open");
  toggle.setAttribute("aria-expanded", String(open));
});
if (window.matchMedia("(max-width: 900px)").matches) {
  panel.classList.remove("open");
  toggle.setAttribute("aria-expanded", "false");
} else {
  panel.classList.add("open");
}

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
