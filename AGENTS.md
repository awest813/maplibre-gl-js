# AGENTS.md

## Cursor Cloud specific instructions

This repo contains two products:

1. **MapLibre GL JS** (repo root) — the TypeScript WebGL maps library. Standard commands live in `package.json` scripts; setup is in `CONTRIBUTING.md`; tests in `test/README.md`.
2. **Eminence Planning and Zoning Explorer** (`eminence-planning-map/`) — a static, no-build-step web app. Run/deploy notes are in `eminence-planning-map/README.md`.

### Node / toolchain

- Node version is pinned by `.nvmrc` (currently 24.11). The VM ships a shell-infra node at `/exec-daemon/node` (v22) that appears **first** on `PATH`, so `nvm use` alone is not enough — the exec-daemon node keeps shadowing it. Prepend the nvm bin explicitly for library work: `export PATH="$HOME/.nvm/versions/node/v24.11.1/bin:$PATH"` (adjust the version to match `.nvmrc`). Verify with `node --version`.
- `.npmrc` sets `engine-strict = true`; `package.json` engines allow node >=16.14, so v22 satisfies the engine check, but use the `.nvmrc` version to match CI (`node-version-file: '.nvmrc'`).
- `npm install` runs `prepare` → `codegen` (shaders, unicode data, struct arrays, style code, typings). This is expected and required; do not skip it.

### Running the apps (dev)

- MapLibre library dev loop: `npm start` (runs `watch-css` + `watch-dev` + a static server on `http://localhost:9966`). Open examples that use the local dev build, e.g. `http://localhost:9966/test/examples/display-a-map.html` (it imports `dist/maplibre-gl-dev.mjs`). Requires internet for `demotiles.maplibre.org` tiles/glyphs.
- Eminence app: `cd eminence-planning-map && python3 -m http.server 8080`, then open `http://localhost:8080/`. No npm/build step. It loads MapLibre GL JS 4.7.1, fonts, glyphs and basemap tiles from the public internet (unpkg, Google Fonts, OpenStreetMap, Kentucky NAIP), so it needs outbound network access; planning layers come from local `data/*.geojson`.

### Lint / test / build

- Core library lint/test/build all work: `npx eslint src`, `npm run test-unit` (jsdom + webgl mocks, no display needed), `npm run build-dev` / `npm run build-dist`.
- KNOWN CAVEAT: `npm run lint` and `npm run lint-css` currently FAIL, but only because of files under `eminence-planning-map/` (its `app.js` isn't in the tsconfig project service, and its `styles.css` doesn't follow MapLibre's `maplibregl-*` selector convention). The lint configs in `eslint.config.js` / `.stylelintrc.json` do not ignore that folder. Core `src` lints clean (`npx eslint src`). This is a pre-existing repo-code issue, not an environment problem — do not "fix" it as part of environment setup.
- Render/integration/browser tests use Puppeteer/Chromium and need `Xvfb` on Linux (`xvfb-run -a ...`, or `nohup Xvfb & export DISPLAY=:0`). The `gl` (headless-gl) npm module is not installed and is not required — browser tests use Puppeteer.
- Docs (`npm run docs` / `npm run start-docs`) require Docker (Zensical image) and are optional for core dev.
