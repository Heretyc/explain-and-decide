#!/usr/bin/env node
// Build dist/explain-and-decide.skill, a ZIP archive holding the core skill
// (SKILL.md, scripts/ledger.ts and scripts/package.json, which marks the script
// as an ES module, under one explain-and-decide/ folder) for
// hosts that install a skill from a single archive file. Node built-ins only:
// the ZIP container is written by hand and entries are compressed with deflate.
//
// Run:  node scripts/build-skill-archive.js

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.join(__dirname, '..');
const SKILL = 'explain-and-decide';
const SRC = path.join(ROOT, 'skills', SKILL);
const OUT = path.join(ROOT, 'dist', `${SKILL}.skill`);
const FILES = ['SKILL.md', 'scripts/ledger.ts', 'scripts/package.json'];

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const END_SIG = 0x06054b50;

// MS-DOS date and time fields as the ZIP format stores them: local time, two-second resolution.
function dosDateTime(date) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  return { dosDate, dosTime };
}

// Little-endian record from [byteWidth, value] pairs; the widths must add up to size.
function record(size, fields) {
  const b = Buffer.alloc(size);
  let o = 0;
  for (const [width, value] of fields) {
    if (width === 2) b.writeUInt16LE(value, o); else b.writeUInt32LE(value, o);
    o += width;
  }
  if (o !== size) throw new Error(`record is ${o} bytes, expected ${size}`);
  return b;
}

// entries: [{ name, data: Buffer, mtime: Date }] in archive order.
function buildZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data, mtime } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const deflated = zlib.deflateRawSync(data);
    const { dosDate, dosTime } = dosDateTime(mtime);
    // flags, method 8 (deflate), time, date, crc32, compressed size, size, name length, extra length
    const common = [[2, 0], [2, 8], [2, dosTime], [2, dosDate], [4, zlib.crc32(data)],
      [4, deflated.length], [4, data.length], [2, nameBuf.length], [2, 0]];
    const local = Buffer.concat([record(30, [[4, LOCAL_SIG], [2, 20], ...common]), nameBuf, deflated]);
    // comment length, disk number, internal attributes, external attributes, local header offset
    const central = Buffer.concat([
      record(46, [[4, CENTRAL_SIG], [2, 20], [2, 20], ...common, [2, 0], [2, 0], [2, 0], [4, 0], [4, offset]]),
      nameBuf,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const cd = Buffer.concat(centrals);
  const end = record(22, [[4, END_SIG], [2, 0], [2, 0], [2, entries.length], [2, entries.length],
    [4, cd.length], [4, offset], [2, 0]]);
  return Buffer.concat([...locals, cd, end]);
}

// Entry list read from the central directory: [{ name, size, crc32 }].
function listZipEntries(file) {
  const buf = fs.readFileSync(file);
  let end = buf.length - 22;
  while (end >= 0 && buf.readUInt32LE(end) !== END_SIG) end--;
  if (end < 0) throw new Error(`${file}: no end of central directory record`);
  const count = buf.readUInt16LE(end + 10);
  let o = buf.readUInt32LE(end + 16);
  const entries = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(o) !== CENTRAL_SIG) throw new Error(`${file}: bad central directory header at ${o}`);
    const nameLen = buf.readUInt16LE(o + 28);
    const extraLen = buf.readUInt16LE(o + 30);
    const commentLen = buf.readUInt16LE(o + 32);
    entries.push({
      name: buf.toString('utf8', o + 46, o + 46 + nameLen),
      size: buf.readUInt32LE(o + 24),
      crc32: buf.readUInt32LE(o + 16),
    });
    o += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function build() {
  const entries = FILES.map((rel) => {
    const abs = path.join(SRC, rel);
    return { name: `${SKILL}/${rel}`, data: fs.readFileSync(abs), mtime: fs.statSync(abs).mtime };
  });
  const zip = buildZip(entries);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, zip);
  return zip.length;
}

module.exports = { build, buildZip, listZipEntries, OUT, FILES };

if (require.main === module) {
  const bytes = build();
  console.log(path.relative(ROOT, OUT).replace(/\\/g, '/'), bytes, 'bytes');
  for (const e of listZipEntries(OUT)) console.log(' ', e.name);
}
