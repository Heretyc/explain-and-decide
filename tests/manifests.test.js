#!/usr/bin/env node
// Every host adapter is a declarative manifest. This is a pure skill: no
// manifest may register hooks (programs a host runs on events), every one that
// carries a version carries the same one, and the icon, rules, context and
// system prompt paths checked below must exist in the repo.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, readJson, runNode } = require('./helpers');

const NAME = 'explain-and-decide';
const VERSION = '1.1.0';
const VERSIONED = [
  '.claude-plugin/plugin.json',
  '.codex-plugin/plugin.json',
  '.devin-plugin/plugin.json',
  '.github/plugin/plugin.json',
  '.qoder-plugin/plugin.json',
  'gemini-extension.json',
  'package.json',
];
const OTHER = [
  '.claude-plugin/marketplace.json',
  '.agents/plugins/marketplace.json',
  'opencode.json',
  '.github/plugin/marketplace.json',
  '.grok-plugin/marketplace.json',
  '.kimi-plugin/plugin.json',
  'skills/plugin.json',
  'plugin.json',
];
const ALL = [...VERSIONED, ...OTHER];

function keysNamed(value, wanted, trail = '') {
  if (Array.isArray(value)) return value.flatMap((v, i) => keysNamed(v, wanted, `${trail}[${i}]`));
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([k, v]) => {
    const here = `${trail}.${k}`;
    return (k === wanted ? [here] : []).concat(keysNamed(v, wanted, here));
  });
}

function exists(rel, from = root) {
  return fs.existsSync(path.resolve(from, rel));
}

test('every manifest parses and names the plugin', () => {
  for (const rel of ALL) {
    const m = readJson(rel);
    if (m.name !== undefined) assert.equal(m.name, NAME, `${rel} name`);
  }
});

test('every versioned manifest carries the project version', () => {
  for (const rel of VERSIONED) assert.equal(readJson(rel).version, VERSION, `${rel} version`);
});

test('no manifest registers hooks and no hooks/hooks.json exists', () => {
  for (const rel of ALL) {
    assert.deepEqual(keysNamed(readJson(rel), 'hooks'), [], `${rel} declares hooks`);
  }
  assert.ok(!exists('hooks/hooks.json'), 'hooks/hooks.json must not exist');
});

test('Codex manifest: Instructions only, icon and logo exist', () => {
  const m = readJson('.codex-plugin/plugin.json');
  assert.deepEqual(m.interface.capabilities, ['Instructions']);
  for (const key of ['composerIcon', 'logo']) {
    assert.ok(m.interface[key], `interface.${key} missing`);
    assert.ok(exists(m.interface[key]), `interface.${key} points at a missing file: ${m.interface[key]}`);
  }
});

test('Gemini manifest reuses AGENTS.md as the context file', () => {
  const m = readJson('gemini-extension.json');
  assert.equal(m.contextFileName, 'AGENTS.md');
  assert.ok(exists('AGENTS.md'), 'AGENTS.md missing');
});

test('Kimi manifest points at an existing system prompt file', () => {
  const m = readJson('.kimi-plugin/plugin.json');
  assert.ok(m.systemPromptPath, 'systemPromptPath missing');
  assert.ok(exists(m.systemPromptPath), `missing: ${m.systemPromptPath}`);
});

test('Qoder manifest points at an existing rules folder', () => {
  const m = readJson('.qoder-plugin/plugin.json');
  assert.ok(m.rules, 'rules missing');
  assert.ok(exists(m.rules), `missing: ${m.rules}`);
});

test('.agents marketplace source url ends with explain-and-decide.git', () => {
  const m = readJson('.agents/plugins/marketplace.json');
  const plugin = (m.plugins || []).find((p) => p.name === NAME);
  assert.ok(plugin, 'no plugin entry named explain-and-decide');
  assert.ok(String(plugin.source.url).endsWith('explain-and-decide.git'), `url: ${plugin.source.url}`);
});

test('.claude-plugin marketplace plugin source is the repo root', () => {
  const m = readJson('.claude-plugin/marketplace.json');
  const plugin = (m.plugins || []).find((p) => p.name === NAME);
  assert.ok(plugin, 'no plugin entry named explain-and-decide');
  assert.equal(plugin.source, './');
});

test('scripts/check-versions.js exits 0 and prints the version', () => {
  const r = runNode('scripts/check-versions.js');
  assert.equal(r.status, 0, `check-versions failed:\n${r.stdout}${r.stderr}`);
  assert.ok(r.stdout.includes(VERSION), `stdout must name ${VERSION}: ${r.stdout}`);
});

test('package.json is private, has test/check/build scripts and a Node 22 engine floor', () => {
  const pkg = readJson('package.json');
  assert.equal(pkg.private, true);
  for (const s of ['test', 'check', 'build']) {
    assert.ok(pkg.scripts && typeof pkg.scripts[s] === 'string' && pkg.scripts[s].length > 0, `scripts.${s} missing`);
  }
  assert.ok(pkg.engines && typeof pkg.engines.node === 'string' && pkg.engines.node.startsWith('>=22'), `engines.node: ${pkg.engines && pkg.engines.node}`);
});
