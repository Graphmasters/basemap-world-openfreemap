#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
//
// Builds docs/style.json from the pinned BKG basemap.world style snapshot in upstream/.
//
//   node scripts/build-style.mjs            # offline, deterministic
//   node scripts/build-style.mjs --refresh  # re-download the upstream snapshot first
//
// The transform keeps only the layers that use BKG's OpenMapTiles-schema world source and
// re-points them at OpenFreeMap. The Germany-only layers (BKG's own schema, BKG tile data) are
// dropped, so no BKG vector-tile data are ever referenced.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const UPSTREAM_URL =
  'https://sgx.geodatenzentrum.de/gdz_basemapworld_vektor/styles/bm_web_wld_col.json';
export const OPENFREEMAP_TILEJSON = 'https://tiles.openfreemap.org/planet';
export const PAGES_BASE = 'https://graphmasters.github.io/basemap-world-openfreemap';

const UPSTREAM_WORLD_SOURCE = 'smarttiles_wld';
const SOURCE_ID = 'openfreemap';
// Attributes that exist only in BKG's own tiles. Filter clauses on them are removed.
const BKG_ONLY_PROPERTIES = new Set(['klasse']);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const upstreamFile = path.join(root, 'upstream', 'bm_web_wld_col.json');
const snapshotFile = path.join(root, 'upstream', 'SNAPSHOT');
const outFile = path.join(root, 'docs', 'style.json');

const ATTRIBUTION = [
  '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a>',
  '<a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a>',
  '<a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
  // BKG source notice and notice of changes (nutzungsbedingungen_basemapde.pdf, §3), for the style
  // only: BKG and CC BY 4.0 linked as §3 requires. "GeoBasis-DE" and the year of the last data
  // download are left out because no BKG geodata is used (see ATTRIBUTION.md). "modified" links
  // the full credits and the list of changes.
  'Style: &copy; <a href="https://www.bkg.bund.de" target="_blank">BKG</a> ' +
    '<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank">CC BY 4.0</a>, ' +
    `<a href="${PAGES_BASE}/attribution.html" target="_blank">modified</a>`,
].join(' | ');

/** Returns true if a legacy or expression filter clause only tests a BKG-only property. */
function isBkgOnlyClause(clause) {
  return (
    Array.isArray(clause) &&
    ['==', '!=', 'in', '!in', 'has', '!has'].includes(clause[0]) &&
    typeof clause[1] === 'string' &&
    BKG_ONLY_PROPERTIES.has(clause[1])
  );
}

/** Removes clauses on BKG-only properties. Returns undefined if nothing is left to filter. */
export function cleanFilter(filter) {
  if (filter === undefined) return undefined;
  if (isBkgOnlyClause(filter)) return undefined;
  if (Array.isArray(filter) && filter[0] === 'all') {
    const rest = filter.slice(1).filter((c) => !isBkgOnlyClause(c));
    if (rest.length === 0) return undefined;
    if (rest.length === 1) return rest[0];
    return ['all', ...rest];
  }
  return filter;
}

export function transform(upstream, snapshotDate) {
  const layers = [];
  let dropped = 0;
  for (const layer of upstream.layers) {
    if (layer.type === 'background') {
      layers.push(layer);
      continue;
    }
    if (layer.source !== UPSTREAM_WORLD_SOURCE) {
      dropped++;
      continue;
    }
    const out = { ...layer, source: SOURCE_ID };
    const filter = cleanFilter(layer.filter);
    if (filter === undefined) delete out.filter;
    else out.filter = filter;
    layers.push(out);
  }

  return {
    version: 8,
    name: 'basemap.world (OpenFreeMap adaptation)',
    id: 'basemap-world-openfreemap',
    metadata: {
      'graphmasters:about': `${PAGES_BASE}/`,
      'graphmasters:attribution': `${PAGES_BASE}/attribution.html`,
      'graphmasters:upstream': {
        url: UPSTREAM_URL,
        id: upstream.id,
        styleVersion: upstream.metadata?.['basemapde:style-version'],
        snapshotDate,
        layersKept: layers.length,
        layersDropped: dropped,
      },
      'graphmasters:changes': [
        'Removed all layers of the Germany-only source smarttiles_de (BKG schema and BKG tile data).',
        'Replaced the smarttiles_wld source with OpenFreeMap vector tiles (OpenMapTiles schema).',
        'Removed filter clauses on the BKG-only attribute "klasse".',
        'Replaced style name, id, metadata and source attribution.',
      ],
    },
    center: upstream.center,
    zoom: upstream.zoom,
    sprite: upstream.sprite,
    glyphs: upstream.glyphs,
    sources: {
      [SOURCE_ID]: {
        type: 'vector',
        url: OPENFREEMAP_TILEJSON,
        attribution: ATTRIBUTION,
      },
    },
    layers,
  };
}

async function refresh() {
  const res = await fetch(UPSTREAM_URL);
  if (!res.ok) throw new Error(`GET ${UPSTREAM_URL}: HTTP ${res.status}`);
  const json = await res.json();
  await writeFile(upstreamFile, JSON.stringify(json, null, 2) + '\n');
  await writeFile(snapshotFile, new Date().toISOString().slice(0, 10) + '\n');
  console.log(`refreshed ${path.relative(root, upstreamFile)}`);
}

async function main() {
  if (process.argv.includes('--refresh')) await refresh();
  const upstream = JSON.parse(await readFile(upstreamFile, 'utf8'));
  const snapshotDate = (await readFile(snapshotFile, 'utf8')).trim();
  const style = transform(upstream, snapshotDate);
  await writeFile(outFile, JSON.stringify(style, null, 2) + '\n');
  const m = style.metadata['graphmasters:upstream'];
  console.log(
    `wrote ${path.relative(root, outFile)}: ${m.layersKept} layers kept, ${m.layersDropped} dropped`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
