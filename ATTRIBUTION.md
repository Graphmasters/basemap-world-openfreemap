# Attribution

This file is the durable record of the credits shown on
<https://graphmasters.github.io/basemap-world-openfreemap/attribution.html>. Keep both in sync.

> **Unofficial adaptation.** This style is maintained by Graphmasters. It is not an official
> product of the Bundesamt für Kartographie und Geodäsie (BKG) or basemap.de, and BKG does not
> endorse it.

## 1. Map design: basemap.world / BKG, CC BY 4.0, adapted by Graphmasters

The cartographic design comes from the
[basemap.world Web Vektor](https://basemap.de/produkte-und-dienste/web-vektor-world/) colour style
`bm_web_wld_col` (style version 5.0.2, snapshot date in `upstream/SNAPSHOT`), source
`https://sgx.geodatenzentrum.de/gdz_basemapworld_vektor/styles/bm_web_wld_col.json`.

Source notice and notice of changes, after the
[basemap.de terms of use](https://sgx.geodatenzentrum.de/public/gdz/lizenz/deu/nutzungsbedingungen_basemapde.pdf) §3,
as shown in the map attribution:

> Style: © [BKG](https://www.bkg.bund.de) [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), modified

"modified" links this page; the changes are listed in section 6. §3 prescribes
"© GeoBasis-DE / BKG (year of the last data download) CC BY 4.0" for BKG *data*. This style uses no
BKG geodata (section 6), so "GeoBasis-DE" and the year are left out; BKG and CC BY 4.0 stay linked
as §3 requires. The PDF lists the basemap.de products and does not name basemap.world, but the
[basemap.world Web Vektor page](https://basemap.de/produkte-und-dienste/web-vektor-world/) links it
under "Lizenz- und Nutzungsbedingungen", so it applies to this style.

## 2. Map data: © OpenStreetMap contributors, ODbL

Every feature on the map comes from [OpenStreetMap](https://www.openstreetmap.org/copyright),
licensed under the [ODbL](https://opendatacommons.org/licenses/odbl/).

## 3. Vector-tile schema: OpenMapTiles

The tiles follow the [OpenMapTiles](https://openmaptiles.org/schema/) schema, © OpenMapTiles.

## 4. Tile delivery: OpenFreeMap

[OpenFreeMap](https://openfreemap.org) serves the tiles via the TileJSON at
`https://tiles.openfreemap.org/planet`.

## 5. Sprites and fonts: hosted by BKG

The sprite (`…/gdz_basemapde_vektor/sprites/v2/bm_web_col_sprite`) and glyphs
(`…/gdz_basemapde_vektor/fonts/v2/{fontstack}/{range}.pbf`) load from BKG at request time. They are
not copied into this repository. The fonts are Noto Sans and Roboto, both under open font licences.

## 6. Changes to the original style

- Removed all layers of the Germany-only source `smarttiles_de` (BKG schema). Germany therefore
  renders with the world layers, not BKG's detailed national cartography.
- Replaced the world source `smarttiles_wld` with OpenFreeMap vector tiles. Paint, layout, zoom
  ranges and layer order are unchanged.
- Removed filter clauses on the BKG-only attribute `klasse`.
- Replaced the style name, id, metadata and source attribution.

**No BKG vector-tile data or BKG geodata are used.**

## Open points

- Confirm that BKG allows third-party pages to use the sprite and glyph endpoints directly.
