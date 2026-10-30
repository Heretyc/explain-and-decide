#!/usr/bin/env node
// Whole-repo scan. Every text file is plain ASCII, UTF-8 without a byte order
// mark, LF-only. The hidden length limit lives only in the ledger script. No
// hooks file exists. A decision ledger at the root never reaches git: when a
// root LEDGER.md exists beside a .git folder, it must be listed in
// .git/info/exclude, while the sample under examples/ stays committable.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { root, readText, listFiles, isAscii, hasBom, hasCr } = require('./helpers');

const SKIP_DIRS = ['.git', 'node_modules', 'dist', 'assets', '__pycache__'];
const BINARY = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.skill', '.zip', '.pyc', '.woff', '.woff2']);
const NEEDLE = '1' + '000';

// The user's private ledger and its marker live at the root but are not repo files.
const PRIVATE = new Set([path.join(root, 'LEDGER.md'), path.join(root, '.no-ledger')]);

const rel = (p) => path.relative(root, p).replace(/\\/g, '/');
const textFiles = () => listFiles(root, SKIP_DIRS)
  .filter((p) => !BINARY.has(path.extname(p).toLowerCase()) && !PRIVATE.has(p));

test('every text file is ASCII, LF-only and has no BOM', () => {
  const bad = [];
  for (const p of textFiles()) {
    const buf = fs.readFileSync(p);
    if (hasBom(buf)) bad.push(`${rel(p)}: BOM`);
    if (hasCr(buf)) bad.push(`${rel(p)}: CR`);
    if (!isAscii(buf)) bad.push(`${rel(p)}: non-ASCII`);
  }
  assert.deepEqual(bad, []);
});

test('the hidden limit appears only in ledger.ts, once per copy', () => {
  const hits = [];
  for (const p of textFiles()) {
    const n = fs.readFileSync(p, 'utf8').split(NEEDLE).length - 1;
    if (n === 0) continue;
    if (path.basename(p) !== 'ledger.ts' || n !== 1) hits.push(`${rel(p)}: ${n}`);
  }
  assert.deepEqual(hits, []);
});

test('LICENSE is MIT and names the author', () => {
  const text = readText('LICENSE');
  assert.ok(text.includes('MIT License'), 'LICENSE must contain "MIT License"');
  assert.ok(text.includes('Heretyc'), 'LICENSE must name Heretyc');
});

test('no file named hooks.json anywhere', () => {
  const hooks = listFiles(root, ['.git', 'node_modules']).filter((p) => path.basename(p) === 'hooks.json');
  assert.deepEqual(hooks.map(rel), []);
});

test('a root LEDGER.md, when present beside .git, is excluded and invisible to git', (t) => {
  if (!fs.existsSync(path.join(root, '.git'))) return t.skip('no .git folder yet; nothing to exclude from');
  if (!fs.existsSync(path.join(root, 'LEDGER.md'))) return t.skip('no root LEDGER.md present');
  const git = (...args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  const probe = git('rev-parse', '--git-path', 'info/exclude');
  const excludePath = !probe.error && probe.status === 0
    ? path.resolve(root, probe.stdout.trim())
    : path.join(root, '.git', 'info', 'exclude');
  assert.ok(fs.existsSync(excludePath), `missing file: ${rel(excludePath)}`);
  const listed = fs.readFileSync(excludePath, 'utf8').split(/\r?\n/).some((l) => l.trim() === 'LEDGER.md');
  assert.ok(listed, `${rel(excludePath)} must list LEDGER.md so the ledger never reaches a commit`);
  const status = git('status', '--porcelain', '--', 'LEDGER.md');
  if (!status.error && status.status === 0) assert.equal(status.stdout.trim(), '', 'LEDGER.md shows up in git status');
});

// The ledger script adds a bare "LEDGER.md" line to .git/info/exclude, which
// matches in every folder. The committed .gitignore must re-include the sample
// examples/LEDGER.md while a root LEDGER.md stays ignored.
test('the sample examples/LEDGER.md stays committable while a root LEDGER.md is ignored', (t) => {
  const os = require('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ead-ignore-'));
  try {
    const git = (...args) => spawnSync('git', args, {
      cwd: dir, encoding: 'utf8', env: { ...process.env, GIT_CEILING_DIRECTORIES: os.tmpdir() },
    });
    const init = git('init', '-q');
    if (init.error || init.status !== 0) return t.skip('git is not available');
    fs.copyFileSync(path.join(root, '.gitignore'), path.join(dir, '.gitignore'));
    const exclude = path.join(dir, '.git', 'info', 'exclude');
    fs.mkdirSync(path.dirname(exclude), { recursive: true });
    fs.appendFileSync(exclude, 'LEDGER.md\n');
    assert.equal(git('check-ignore', '-q', '--no-index', 'LEDGER.md').status, 0, 'root LEDGER.md must be ignored');
    assert.equal(git('check-ignore', '-q', '--no-index', 'examples/LEDGER.md').status, 1,
      'examples/LEDGER.md must not be ignored');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
