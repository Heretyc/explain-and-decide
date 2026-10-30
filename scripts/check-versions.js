#!/usr/bin/env node
// Version guard. The project version is declared in eight files across several
// host ecosystems, and every release bumps all of them by hand. This check fails
// when any file is missing, is not a pinned X.Y.Z version, or disagrees with the
// others, so a half-bumped release cannot ship unnoticed.
//
// Run:  node scripts/check-versions.js

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PINNED_SEMVER = /^\d+\.\d+\.\d+$/;

// Every file that declares the project version. Add a host manifest here so it
// cannot drift unnoticed.
const VERSION_FILES = [
  '.claude-plugin/plugin.json',  // Claude Code plugin
  '.codex-plugin/plugin.json',   // Codex plugin
  '.devin-plugin/plugin.json',   // Devin plugin
  '.github/plugin/plugin.json',  // GitHub Copilot plugin
  '.qoder-plugin/plugin.json',   // Qoder plugin
  'gemini-extension.json',       // Gemini CLI extension
  'package.json',                // npm and pi package
  'plugin.yaml',                 // Hermes Agent plugin
];

function readVersion(relPath) {
  // Strip a UTF-8 byte order mark some Windows editors prepend; it breaks JSON.parse.
  const text = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const raw = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  if (relPath.endsWith('.yaml')) {
    const m = raw.split(/\r?\n/).map((l) => l.match(/^version:\s*(.+)$/)).find(Boolean);
    if (!m) throw new Error('no version line');
    return m[1].trim().replace(/^(["'])(.*)\1$/, '$2');
  }
  return JSON.parse(raw).version;
}

let failed = false;
const versions = [];
for (const relPath of VERSION_FILES) {
  let version;
  try {
    version = readVersion(relPath);
  } catch (e) {
    console.error(`${relPath}: ${e.message}`);
    failed = true;
    continue;
  }
  if (typeof version !== 'string' || !PINNED_SEMVER.test(version)) {
    console.error(`${relPath}: version must be a pinned X.Y.Z, got ${JSON.stringify(version)}`);
    failed = true;
  }
  versions.push([relPath, version]);
}

// Every file must declare the same version.
const distinct = [...new Set(versions.map(([, v]) => v))];
if (distinct.length > 1) {
  console.error('Version mismatch. Every manifest must share one version:');
  for (const [relPath, version] of versions) console.error(`  ${version}\t${relPath}`);
  failed = true;
}

if (failed) process.exit(1);
console.log(`${distinct[0]} ok`);
