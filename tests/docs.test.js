#!/usr/bin/env node
// The documents a reader meets first must be clean ASCII with no dashes that
// hint at machine authorship, no attribution lines, no dead relative links,
// and every example entry file must be accepted by the switch its name promises.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, readBytes, mustExist, runLedger, makeTempDir, isAscii, hasBom, hasCr } = require('./helpers');

const DOCS = ['README.md', 'INSTALL.md', 'docs/agent-portability.md', '.github/CONTRIBUTING.md', 'examples/README.md'];
const EM_DASH = Buffer.from([0xe2, 0x80, 0x94]);
const EN_DASH = Buffer.from([0xe2, 0x80, 0x93]);
const SWITCH_BY_PREFIX = { human: '-decision-human', agent: '-decision-agent', external: '-decision-external' };
// Spelled in parts so this file never carries an attribution line itself.
const ATTRIBUTION = ['Co-Authored' + '-By', 'Generated' + ' with'];

test('docs are ASCII, LF-only, BOM-free, dash-free and carry no attribution lines', () => {
  for (const rel of DOCS) {
    const buf = readBytes(rel);
    assert.ok(!hasBom(buf), `${rel} starts with a BOM`);
    assert.ok(!hasCr(buf), `${rel} contains CR`);
    assert.ok(!buf.includes(EM_DASH), `${rel} contains an em dash`);
    assert.ok(!buf.includes(EN_DASH), `${rel} contains an en dash`);
    assert.ok(isAscii(buf), `${rel} contains non-ASCII bytes`);
    const text = buf.toString('utf8');
    for (const needle of ATTRIBUTION) assert.ok(!text.includes(needle), `${rel} carries an attribution line (${needle})`);
  }
});

test('every relative markdown link in README.md and INSTALL.md resolves', () => {
  for (const rel of ['README.md', 'INSTALL.md']) {
    const text = readBytes(rel).toString('utf8');
    const targets = [
      ...[...text.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((m) => m[1]),
      ...[...text.matchAll(/^\[[^\]]+\]:\s*(\S+)/gm)].map((m) => m[1]),
    ];
    for (const raw of targets) {
      const target = raw.replace(/^<|>$/g, '');
      if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) continue;
      const file = target.split('#')[0];
      if (!file) continue;
      const resolved = path.resolve(path.dirname(path.join(root, rel)), decodeURIComponent(file));
      assert.ok(fs.existsSync(resolved), `${rel} links to a missing path: ${target}`);
    }
  }
});

test('every examples/entry-files/*.txt is accepted by the switch its name promises', (t) => {
  const dir = mustExist('examples/entry-files');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.txt')).sort();
  for (const expected of ['agent.txt', 'external-email.txt', 'external-meeting.txt', 'human.txt']) {
    assert.ok(files.includes(expected), `missing file: examples/entry-files/${expected}`);
  }
  for (const file of files) {
    const sw = SWITCH_BY_PREFIX[file.split(/[-.]/)[0]];
    assert.ok(sw, `examples/entry-files/${file} does not start with human, agent or external`);
    const r = runLedger([sw], { cwd: makeTempDir(t), inputFile: path.join(dir, file) });
    assert.equal(r.status, 0, `${sw} rejected examples/entry-files/${file}:\n${r.stderr}`);
  }
});
