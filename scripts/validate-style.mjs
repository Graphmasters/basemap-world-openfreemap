#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
//
// Validates docs/style.json:
//   1. MapLibre style-spec validation (offline).
//   2. Every source-layer and every referenced feature property exists in the OpenFreeMap
//      TileJSON (online).
//   3. Every icon-image / fill-pattern exists in the sprite, and every font stack is served by the
//      glyph endpoint (online).
//   4. No BKG vector-tile source or tile URL remains (offline).
//
//   node scripts/validate-style.mjs            # all checks
//   node scripts/validate-style.mjs --offline  # checks 1 and 4 only

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const style = JSON.parse(await readFile(path.join(root, 'docs', 'style.json'), 'utf8'));
const offline = process.argv.includes('--offline');

const errors = [];
const fail = (msg) => errors.push(msg);

// 1. Style spec.
for (const e of validateStyleMin(style)) fail(`style-spec: ${e.message}`);

// 4. No BKG tile data.
const raw = JSON.stringify({ sources: style.sources, layers: style.layers });
if (/smarttiles_/.test(raw)) fail('a smarttiles_* reference remains in sources or layers');
if (/geodatenzentrum\.de\/[^"]*\/tiles\//.test(raw)) fail('a BKG tile URL remains');
for (const [id, src] of Object.entries(style.sources)) {
  const urls = [src.url, ...(src.tiles ?? [])].filter(Boolean);
  if (urls.some((u) => !u.startsWith('https://tiles.openfreemap.org/'))) {
    fail(`source ${id} does not point at OpenFreeMap: ${urls.join(', ')}`);
  }
}

// Collects feature property names referenced by a filter or expression.
// Negated legacy clauses (!=, !in, !has) are skipped: they evaluate to true when the property is
// absent, so they cannot hide features. Upstream itself uses e.g. ["!=","ramp",1] on
// transportation_name, which has no ramp field in either BKG's or OpenFreeMap's tiles.
const LEGACY_OPS = new Set(['==', '<', '>', '<=', '>=', 'in', 'has']);
function collectProps(node, out) {
  if (!Array.isArray(node)) {
    // Legacy token strings such as "{name}" in text-field.
    if (typeof node === 'string') for (const m of node.matchAll(/\{([^}]+)\}/g)) out.add(m[1]);
    else if (node && typeof node === 'object') {
      if (node.property) out.add(node.property);
      for (const v of Object.values(node)) collectProps(v, out);
    }
    return;
  }
  const [op, arg] = node;
  if ((op === 'get' || op === 'has') && typeof arg === 'string' && node.length === 2) out.add(arg);
  else if (LEGACY_OPS.has(op) && typeof arg === 'string') out.add(arg);
  for (const child of node) if (Array.isArray(child) || typeof child === 'object') collectProps(child, out);
}

if (!offline) {
  const getJson = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url}: HTTP ${res.status}`);
    return res.json();
  };

  // 2. Tile schema.
  for (const [id, src] of Object.entries(style.sources)) {
    const tilejson = await getJson(src.url);
    const fields = new Map(
      tilejson.vector_layers.map((l) => [l.id, new Set(Object.keys(l.fields ?? {}))]),
    );
    for (const layer of style.layers.filter((l) => l.source === id)) {
      const known = fields.get(layer['source-layer']);
      if (!known) {
        fail(`${layer.id}: source-layer "${layer['source-layer']}" not in ${src.url}`);
        continue;
      }
      const props = new Set();
      collectProps(layer.filter, props);
      collectProps(layer.layout, props);
      collectProps(layer.paint, props);
      for (const p of props) {
        if (p.startsWith('$') || p.startsWith('name')) continue;
        if (!known.has(p)) fail(`${layer.id}: property "${p}" not in ${layer['source-layer']}`);
      }
    }
  }

  // 3a. Sprite icons.
  const sprite = await getJson(`${style.sprite}.json`);
  const sprite2x = await getJson(`${style.sprite}@2x.json`);
  for (const layer of style.layers) {
    for (const key of ['icon-image', 'fill-pattern', 'line-pattern']) {
      const v = layer.layout?.[key] ?? layer.paint?.[key];
      if (v === undefined) continue;
      if (typeof v !== 'string' || v.includes('{')) {
        fail(`${layer.id}: ${key} is not a constant; extend the validator`);
        continue;
      }
      if (!sprite[v]) fail(`${layer.id}: ${key} "${v}" missing from sprite`);
      if (!sprite2x[v]) fail(`${layer.id}: ${key} "${v}" missing from @2x sprite`);
    }
  }

  // 3b. Glyphs.
  const stacks = new Set(
    style.layers.map((l) => l.layout?.['text-font']).filter(Boolean).map((f) => f.join(',')),
  );
  for (const stack of stacks) {
    const url = style.glyphs
      .replace('{fontstack}', encodeURIComponent(stack))
      .replace('{range}', '0-255');
    const res = await fetch(url);
    if (!res.ok) fail(`glyphs for "${stack}": HTTP ${res.status} (${url})`);
  }
}

if (errors.length) {
  console.error(`${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`style.json OK (${style.layers.length} layers${offline ? ', offline checks only' : ''})`);
