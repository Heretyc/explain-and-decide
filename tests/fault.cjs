// Preload for tests/concurrency.test.js (node --require). It makes the ledger
// script meet storage faults that are hard to cause on demand, on the
// descriptor it opens for appending to LEDGER.md only. EAD_FAULT=short: the
// first write stores half its bytes, then the disk is full. EAD_FAULT=fsync:
// the write succeeds and fsync fails with EIO.
const fs = require('node:fs');
const { syncBuiltinESMExports } = require('node:module');

const { openSync, writeSync, fsyncSync } = fs;
const fault = process.env.EAD_FAULT;
let ledgerFd = -1, full = false;

fs.openSync = (file, flags, ...rest) => {
  const fd = openSync(file, flags, ...rest);
  if (typeof flags === 'number' && String(file).endsWith('LEDGER.md')) ledgerFd = fd;
  return fd;
};
fs.writeSync = (fd, data, ...rest) => {
  if (fault !== 'short' || fd !== ledgerFd) return writeSync(fd, data, ...rest);
  if (full) return 0;
  full = true;
  const off = rest[0] || 0;
  return writeSync(fd, data, off, Math.ceil((data.length - off) / 2));
};
fs.fsyncSync = (fd) => {
  if (fault === 'fsync' && fd === ledgerFd) throw Object.assign(new Error('i/o error'), { code: 'EIO' });
  return fsyncSync(fd);
};
syncBuiltinESMExports();
