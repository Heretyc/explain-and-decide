#!/usr/bin/env node
// The core skill (skills/explain-and-decide/) ships byte-identical to its
// source: these tests pin both files to their SHA-256 and guard the skill
// file's shape (frontmatter, size, encoding). The hidden length limit inside
// the script must stay hidden: it may appear once in ledger.ts and nowhere else.

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  readBytes, frontmatter, runLedger, makeTempDir, isAscii, hasBom, hasCr, sha256,
} = require('./helpers');

const SKILL = 'skills/explain-and-decide/SKILL.md';
const SCRIPT = 'skills/explain-and-decide/scripts/ledger.ts';
const SHA = {
  [SKILL]: '8f30a76c74692238ae100e98e78ebb97ec43c05047be90e6648d3887ee01384a',
  [SCRIPT]: 'ba8b75e6501a5fe5c07ea91a192036ef87dfc54b4e94c322514c4682910c86d9',
};
// Spelled in two parts so this file never carries the needle itself.
const NEEDLE = '1' + '000';

function lineCount(text) {
  return text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
}

function count(text, needle) {
  return text.split(needle).length - 1;
}

test('both core files exist and match the pinned SHA-256', () => {
  for (const rel of Object.keys(SHA)) {
    assert.equal(sha256(readBytes(rel)), SHA[rel], `${rel} differs from the source skill`);
  }
});

test('SKILL.md stays under 499 lines and 24000 bytes', () => {
  const buf = readBytes(SKILL);
  assert.ok(buf.length <= 24000, `${SKILL} is ${buf.length} bytes`);
  const lines = lineCount(buf.toString('utf8'));
  assert.ok(lines <= 499, `${SKILL} has ${lines} lines`);
});

test('SKILL.md frontmatter has exactly name and description', () => {
  const fm = frontmatter(readBytes(SKILL).toString('utf8'));
  assert.ok(fm, `${SKILL} has no frontmatter`);
  assert.deepEqual(Object.keys(fm.keys).sort(), ['description', 'name']);
  assert.equal(fm.keys.name, 'explain-and-decide', 'name must equal the folder name');
  assert.ok(fm.keys.description.length > 0, 'description must not be empty');
  assert.ok(fm.keys.description.length <= 750, `description is ${fm.keys.description.length} characters`);
});

test('both core files are ASCII with no CR and no BOM', () => {
  for (const rel of [SKILL, SCRIPT]) {
    const buf = readBytes(rel);
    assert.ok(!hasBom(buf), `${rel} starts with a BOM`);
    assert.ok(!hasCr(buf), `${rel} contains CR`);
    assert.ok(isAscii(buf), `${rel} contains non-ASCII bytes`);
  }
});

test('the hidden limit appears once in ledger.ts and never in SKILL.md or help', (t) => {
  assert.equal(count(readBytes(SCRIPT).toString('utf8'), NEEDLE), 1, `${SCRIPT} must carry the limit exactly once`);
  assert.equal(count(readBytes(SKILL).toString('utf8'), NEEDLE), 0, `${SKILL} must not state the limit`);
  const r = runLedger(['-h'], { cwd: makeTempDir(t) });
  assert.equal(r.status, 0);
  assert.equal(count(r.stdout, NEEDLE), 0, 'help output must not state the limit');
});
