#!/usr/bin/env node
// scripts/build-skill-archive.js writes dist/explain-and-decide.skill, a zip
// holding the core skill under one top-level folder. The archive is read back
// here with a minimal central-directory parser so names, sizes and CRC-32s are
// checked against the real files, independent of the builder.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { root, readBytes, mustExist, runNode } = require('./helpers');

const BUILDER = 'scripts/build-skill-archive.js';
const ARCHIVE = path.join(root, 'dist', 'explain-and-decide.skill');
const EXPECTED = {
  'explain-and-decide/SKILL.md': 16406,
  'explain-and-decide/scripts/ledger.ts': 20215,
  'explain-and-decide/scripts/package.json': 23,
  'explain-and-decide/LICENSE': readBytes('LICENSE').length,
  'explain-and-decide/NOTICE': readBytes('NOTICE').length,
};

// Central directory entries: [name, crc32, uncompressed size].
function zipEntries(buf) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  assert.ok(eocd >= 0, 'end of central directory record not found');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = [];
  for (let i = 0; i < count; i++) {
    assert.equal(buf.readUInt32LE(p), 0x02014b50, `central directory entry ${i} has a bad signature`);
    const crc = buf.readUInt32LE(p + 16);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    out.push([buf.toString('utf8', p + 46, p + 46 + nameLen), crc, size]);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

const entryName = (e) => (typeof e === 'string' ? e : e.name || e.path || e.fileName);

test('build-skill-archive.js writes the archive and listZipEntries matches its contents', (t) => {
  t.after(() => fs.rmSync(path.join(root, 'dist'), { recursive: true, force: true }));
  const r = runNode(BUILDER);
  assert.equal(r.status, 0, `builder failed:\n${r.stdout}${r.stderr}`);
  assert.ok(fs.existsSync(ARCHIVE), `missing file: dist/explain-and-decide.skill`);

  const { listZipEntries } = require(mustExist(BUILDER));
  assert.equal(typeof listZipEntries, 'function', `${BUILDER} must export listZipEntries`);
  const listed = (listZipEntries(ARCHIVE) || []).map(entryName).sort();
  assert.deepEqual(listed, Object.keys(EXPECTED).sort());

  const parsed = zipEntries(fs.readFileSync(ARCHIVE));
  assert.deepEqual(parsed.map(([n]) => n).sort(), Object.keys(EXPECTED).sort());
  for (const [name, crc, size] of parsed) {
    assert.equal(name.split('/')[0], 'explain-and-decide', `${name} is not under the skill folder`);
    assert.equal(size, EXPECTED[name], `${name} size`);
    const rel = name.slice('explain-and-decide/'.length);
    const bytes = readBytes(rel === 'LICENSE' || rel === 'NOTICE'
      ? rel : path.join('skills', ...name.split('/')));
    assert.equal(bytes.length, EXPECTED[name], `${name} source size`);
    assert.equal(crc, zlib.crc32(bytes), `${name} CRC-32`);
  }
});
