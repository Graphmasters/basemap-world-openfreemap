# basemap-world-openfreemap

An unofficial MapLibre style that brings the BKG
[basemap.world Web Vektor](https://basemap.de/produkte-und-dienste/web-vektor-world/) cartography
to [OpenFreeMap](https://openfreemap.org) vector tiles. Map data come only from OpenStreetMap via
OpenFreeMap. No BKG vector tiles are used.

This style is maintained by Graphmasters. It is **not** an official BKG or basemap.de product.

- Preview: <https://graphmasters.github.io/basemap-world-openfreemap/>
- Style: <https://graphmasters.github.io/basemap-world-openfreemap/style.json>
- Credits: <https://graphmasters.github.io/basemap-world-openfreemap/attribution.html>

It is the shared base map for `nap-roadworks-viewer` and `nap-roads-explorer` (NAP Roadworks
Explorer). Those apps load the hosted style and keep no copy of it.

## Usage

```js
const styleBase = 'https://graphmasters.github.io/basemap-world-openfreemap';
const map = new maplibregl.Map({
  container: 'map',
  style: `${styleBase}/style.json`,
  attributionControl: {
    compact: false,
    customAttribution:
      `<a href="${styleBase}/attribution.html" target="_blank" rel="noopener noreferrer">` +
      'Map style: basemap.world / BKG (CC BY 4.0), adapted by Graphmasters</a>'
  }
});
```

The source attribution in `style.json` already shows the OpenFreeMap, OpenMapTiles and OSM credits
plus the BKG notice. MapLibre will not link to the full credits page on its own, so add the
`customAttribution` above. Keep the attribution visible and do not collapse it in a way that hides
the BKG notice.

### Feature picking

Roads are in source `openfreemap`, source-layer `transportation`. That is the OpenMapTiles schema,
z0–14, overzoomed beyond z14. The layer ids are the upstream BKG ids, which are German names such as
`wrKontur_Autobahn_getrennt`. Query by source-layer, not by layer id.

## How it is built

`upstream/bm_web_wld_col.json` is a pinned snapshot of the BKG style.
`scripts/build-style.mjs` turns it into `docs/style.json`:

1. It keeps `background` and the 290 layers on BKG's world source. That source uses the
   OpenMapTiles schema, so every filter field also exists in OpenFreeMap.
2. It drops the 549 layers on BKG's Germany-only source, which uses its own schema and BKG data.
3. It re-points the remaining layers at `https://tiles.openfreemap.org/planet` and removes filter
   clauses on the BKG-only attribute `klasse`.

Sprites and glyphs keep their absolute BKG URLs. OpenFreeMap's glyph server has no Roboto or
Noto Sans ExtraCondensed, which the style uses.

```bash
npm ci
npm run build       # upstream/ → docs/style.json (offline, deterministic)
npm run validate    # style spec + OpenFreeMap schema + sprite + glyph checks (online)
npm run refresh     # re-download the upstream BKG style, then build
```

After `npm run refresh`, review the upstream diff, run `validate`, and check the preview. The
preview has an "Upstream BKG" toggle for side-by-side comparison.

CI (`check.yml`) rebuilds on every PR, fails if `docs/style.json` is stale, and runs the
validator. `deploy.yml` publishes `docs/` to GitHub Pages on every push to `main`.

### Known differences from upstream

- **Germany:** upstream draws BKG's detailed national cartography from its own tiles. Here
  Germany renders with the world layers, like every other country.
- **Detail above z14:** OpenFreeMap tiles stop at z14 and are overzoomed beyond that.

## Licences

- Style files (`docs/style.json`, `upstream/`): [CC BY 4.0](LICENSES/CC-BY-4.0.txt), after
  © GeoBasis-DE / BKG. See [ATTRIBUTION.md](ATTRIBUTION.md).
- Scripts and preview pages: [Apache-2.0](LICENSE).
- Map data: © OpenStreetMap contributors, ODbL. Tile schema: © OpenMapTiles. Tiles: OpenFreeMap.
