#!/usr/bin/env node
// Shared helpers for the test suite. Zero dependencies: node:test, node:assert
// and the standard library only. Every reader of a repo file fails with the
// missing path in the message, so an absent file is a loud failure, never a skip.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const ledgerScript = path.join(root, 'skills', 'explain-and-decide', 'scripts', 'ledger.ts');
const SKILL_NAMES = ['explain-and-decide', 'explain-and-decide-help', 'explain-and-decide-ledger'];

// Older Node releases run .ts files only behind this flag; releases that strip
// types natively report that through process.features.typescript.
const nodeArgs = process.features.typescript ? [] : ['--experimental-strip-types'];

function abs(rel) {
  return path.isAbsolute(rel) ? rel : path.join(root, rel);
}

function mustExist(rel) {
  const p = abs(rel);
  if (!fs.existsSync(p)) throw new Error(`missing file: ${path.relative(root, p).replace(/\\/g, '/')}`);
  return p;
}

function readBytes(rel) {
  return fs.readFileSync(mustExist(rel));
}

function readText(rel) {
  return readBytes(rel).toString('utf8');
}

function readJson(rel) {
  const text = readText(rel);
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`${rel}: ${e.message}`);
  }
}

// Recursive file listing as absolute paths. Directories named in skipDirs are
// not entered at any depth.
function listFiles(dir, skipDirs = []) {
  const skip = new Set(skipDirs);
  const out = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (!skip.has(entry.name)) walk(p);
      } else if (entry.isFile()) {
        out.push(p);
      }
    }
  };
  walk(dir);
  return out;
}

// Minimal YAML-shaped frontmatter: a leading "---" block of "key: value" lines.
// Returns { keys: { key: value }, body } or null when the text has no block.
function frontmatter(text) {
  const m = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) return null;
  const keys = {};
  let last;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (kv) {
      last = kv[1];
      keys[last] = kv[2].trim();
    } else if (last !== undefined && line.trim()) {
      keys[last] = (keys[last] + ' ' + line.trim()).trim();
    }
  }
  return { keys, body: m[2] };
}

// Spawn node on the bundled ledger script. args are the script's own switches;
// inputFile is appended as the entry-file positional; input feeds stdin.
function runLedger(args, { cwd = root, input, inputFile } = {}) {
  mustExist(ledgerScript);
  const argv = [...nodeArgs, ledgerScript, ...args];
  if (inputFile !== undefined) argv.push(inputFile);
  const r = spawnSync(process.execPath, argv, {
    cwd,
    input,
    encoding: 'utf8',
    timeout: 30000,
    // Stop git from walking above the temp folder: a temp dir inside someone's
    // repo would otherwise make that repo the ledger root.
    env: { ...process.env, GIT_CEILING_DIRECTORIES: os.tmpdir() },
  });
  if (r.error) throw r.error;
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

// Run another node script from scripts/ in the repo root.
function runNode(rel, args = [], opts = {}) {
  const r = spawnSync(process.execPath, [mustExist(rel), ...args], { cwd: root, encoding: 'utf8', timeout: 60000, ...opts });
  if (r.error) throw r.error;
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

// A fresh folder under the OS temp dir, removed when the test (t) finishes.
// realpath keeps the folder name the script prints identical to this one.
function makeTempDir(t, prefix = 'explain-and-decide-') {
  const dir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
  if (t) t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function isAscii(buf) {
  for (const b of buf) if (b > 0x7f) return false;
  return true;
}

function hasBom(buf) {
  return buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
}

function hasCr(buf) {
  return buf.includes(0x0d);
}

function sha256(buf) {
  return require('node:crypto').createHash('sha256').update(buf).digest('hex');
}

function gitAvailable() {
  const r = spawnSync('git', ['--version'], { encoding: 'utf8' });
  return !r.error && r.status === 0;
}

module.exports = {
  root, ledgerScript, SKILL_NAMES, nodeArgs,
  abs, mustExist, readBytes, readText, readJson, listFiles, frontmatter,
  runLedger, runNode, makeTempDir, isAscii, hasBom, hasCr, sha256, gitAvailable,
};
