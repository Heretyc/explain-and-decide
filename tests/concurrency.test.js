#!/usr/bin/env node
// Many ledger script runs at once must never lose or reorder history. Each case
// starts 20 writers together in a fresh temp folder and checks the exact file
// layout afterwards: one header, every entry once, one blank line between
// entries, a single trailing LF. Further cases cover a header still being
// written, an empty LEDGER.md, the git exclude file, targets that cannot be
// written (exit 4), faults injected by tests/fault.cjs, and the exclusive
// create path used where storage has no hard links (EAD_NO_HARDLINK).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { ledgerScript, nodeArgs, makeTempDir, gitAvailable } = require('./helpers');

const N = 20;
const TIMEOUT = { timeout: 180000 };

const entry = (title) => [
  `title: ${title}`, 'context: Concurrency check.', 'opt: Alpha', 'pro: fast', 'con: risky',
  'opt: Beta', 'pro: safe', 'con: slow', 'pick: 1', 'why: test', 'plus: good', 'minus: bad', 'by: Tester',
].join('\n') + '\n';

const HEADER = (dir) => [
  `# DECISIONS LEDGER FOR ${path.basename(dir)}`,
  'All notable decisions to this project will be documented in this file.',
  "Intended for local user review only: Never publish to any repository or mention in any public way. For the user's eyes only.",
].join('\n');

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// One rendered entry as a regex; title is a regex fragment, the date varies.
const BODY = (title) => [`# ${title}`, ...[
  '* **Status:** Approved', '* **Date:** DATE', '* **Deciders:** Tester',
  '* **Source:** Agentic autonomous decision by Tester', '## Context', 'Concurrency check.', '## Considered Options',
  '* **Option 1:** Alpha', '* **Option 2:** Beta', '## Decision & Outcome', 'We chose **Option 1: Alpha** because test.',
  '### Consequences', '* **Positive:** good', '* **Negative:** bad', '## Pros & Cons of All Options',
  '### Option 1: Alpha', '* **Pro:** fast', '* **Con:** risky', '### Option 2: Beta', '* **Pro:** safe', '* **Con:** slow',
].map((l) => escape(l).replace('DATE', '\\S+'))].join('\n\n');

// Exact layout: header, then entries whose titles match the pattern, each
// preceded by one blank line, then a single trailing LF.
function assertLayout(text, dir, title = 'W-\\d+') {
  const re = new RegExp(`^${escape(HEADER(dir))}(\\n\\n${BODY(title)})*\\n$`);
  assert.match(text, re, 'ledger layout differs');
}

const titles = (text) => [...text.matchAll(/^# (W-\d+|Seed)$/gm)].map((m) => m[1]);

function run(dir, title, env = {}, pre = []) {
  const file = path.join(dir, `${title}.entry`);
  fs.writeFileSync(file, entry(title));
  return new Promise((done) => {
    const p = spawn(process.execPath, [...nodeArgs, ...pre, ledgerScript, '-decision-agent', file], {
      cwd: dir, env: { ...process.env, GIT_CEILING_DIRECTORIES: os.tmpdir(), ...env }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '', stderr = '';
    p.stdout.on('data', (c) => (stdout += c));
    p.stderr.on('data', (c) => (stderr += c));
    p.on('close', (status) => { fs.rmSync(file, { force: true }); done({ status, stdout, stderr }); });
  });
}

async function writers(dir, env) {
  const res = await Promise.all(Array.from({ length: N }, (_, i) => run(dir, `W-${i + 1}`, env)));
  for (const r of res) assert.equal(r.status, 0, r.stderr);
  return res;
}

function leftovers(dir) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.tmp'));
}

for (const [label, env] of [['hard link create', {}], ['exclusive create fallback', { EAD_NO_HARDLINK: '1' }]]) {
  test(`${N} concurrent writers into a fresh folder lose nothing (${label})`, TIMEOUT, async (t) => {
    const dir = makeTempDir(t);
    await writers(dir, env);
    const text = fs.readFileSync(path.join(dir, 'LEDGER.md'), 'utf8');
    assertLayout(text, dir);
    assert.equal(text.split('# DECISIONS LEDGER FOR').length - 1, 1, 'exactly one header');
    assert.equal(new Set(titles(text)).size, N, 'every entry present');
    assert.equal(titles(text).length, N, 'no entry twice');
    assert.deepEqual(leftovers(dir), [], 'no temp files left behind');
  });
}

// The seed is copied to about 3 MB, so a writer that read and rewrote the
// whole file would lose entries on almost every run.
test(`${N} concurrent writers into a seeded ledger keep all history`, TIMEOUT, async (t) => {
  const dir = makeTempDir(t);
  const ledger = path.join(dir, 'LEDGER.md');
  assert.equal((await run(dir, 'Seed')).status, 0);
  const one = fs.readFileSync(ledger, 'utf8'), block = one.slice(HEADER(dir).length + 1);
  const copies = Math.ceil(3e6 / block.length);
  fs.writeFileSync(ledger, HEADER(dir) + '\n' + block.repeat(copies));
  const before = fs.readFileSync(ledger, 'utf8');
  await writers(dir);
  const text = fs.readFileSync(ledger, 'utf8');
  assert.ok(text.startsWith(before), 'earlier bytes must stay untouched');
  assertLayout(HEADER(dir) + '\n' + text.slice(before.length), dir);
  assert.equal(new Set(titles(text)).size, N + 1);
  assert.equal(titles(text).length, N + copies);
});

test('a writer that finds the header still being written waits for it', TIMEOUT, async (t) => {
  const dir = makeTempDir(t);
  const ledger = path.join(dir, 'LEDGER.md'), head = HEADER(dir) + '\n', cut = head.indexOf('\n') + 1;
  fs.writeFileSync(ledger, head.slice(0, cut));
  const pending = run(dir, 'W-1');
  await new Promise((r) => setTimeout(r, 600));
  fs.appendFileSync(ledger, head.slice(cut));
  const r = await pending;
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stderr, /warning:/);
  const text = fs.readFileSync(ledger, 'utf8');
  assertLayout(text, dir);
  assert.equal(text.split('# DECISIONS LEDGER FOR').length - 1, 1, 'exactly one header');
});

const fault = ['--require', path.join(__dirname, 'fault.cjs')];

test('a short write on a full disk is exit 4, not appended', TIMEOUT, async (t) => {
  const dir = makeTempDir(t);
  const r = await run(dir, 'W-1', { EAD_FAULT: 'short' }, fault);
  assert.equal(r.status, 4, r.stderr);
  assert.match(r.stderr, /^decision NOT recorded: .*\(ENOSPC\).*cut-off entry may remain/m);
  assert.doesNotMatch(r.stdout, /appended:/);
});

test('an fsync failure after a full write is exit 4 and says the entry was written', TIMEOUT, async (t) => {
  const dir = makeTempDir(t);
  const r = await run(dir, 'W-1', { EAD_FAULT: 'fsync' }, fault);
  assert.equal(r.status, 4, r.stderr);
  assert.match(r.stderr, /^decision written but not confirmed on disk: .*\(EIO\); do not retry/m);
  assertLayout(fs.readFileSync(path.join(dir, 'LEDGER.md'), 'utf8'), dir);
});

test('an existing empty LEDGER.md gets the entry without a header and a warning', TIMEOUT, async (t) => {
  const dir = makeTempDir(t);
  fs.writeFileSync(path.join(dir, 'LEDGER.md'), '');
  const r = await run(dir, 'W-1');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /^warning: LEDGER\.md was empty/m);
  const text = fs.readFileSync(path.join(dir, 'LEDGER.md'), 'utf8');
  assert.match(text, new RegExp(`^${BODY('W-1')}\\n$`), 'entry only, single trailing LF');
});

test('the git exclude file gets LEDGER.md appended once, earlier bytes preserved', TIMEOUT, async (t) => {
  if (!gitAvailable()) return t.skip('git is not installed');
  const dir = makeTempDir(t);
  assert.equal(spawnSync('git', ['init', '-q'], { cwd: dir }).status, 0);
  const exclude = path.join(dir, '.git', 'info', 'exclude');
  fs.mkdirSync(path.dirname(exclude), { recursive: true });
  const user = '# user patterns\r\nnode_modules/\r\n*.log';
  const lines = '\nLEDGER.md\nLEDGER.md.*.tmp\n';
  fs.writeFileSync(exclude, user);
  assert.equal((await run(dir, 'W-1')).status, 0);
  assert.equal(fs.readFileSync(exclude, 'utf8'), user + lines);
  assert.equal((await run(dir, 'W-2')).status, 0);
  assert.equal(fs.readFileSync(exclude, 'utf8'), user + lines, 'no second line once present');
  fs.writeFileSync(path.join(dir, 'LEDGER.md.1-2-x.tmp'), 'leftover');
  const status = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: dir, encoding: 'utf8' }).stdout;
  assert.doesNotMatch(status, /LEDGER/, 'ledger and leftover temp files stay out of git');
});

test('exit 4 when LEDGER.md cannot be written, nothing recorded', TIMEOUT, async (t) => {
  const dir = makeTempDir(t);
  fs.mkdirSync(path.join(dir, 'LEDGER.md'));
  const r = await run(dir, 'W-1');
  assert.equal(r.status, 4, r.stderr);
  assert.match(r.stderr, /^decision NOT recorded: .*\(E[A-Z]+\)/m);
  assert.doesNotMatch(r.stdout, /appended:/);
  assert.ok(fs.statSync(path.join(dir, 'LEDGER.md')).isDirectory());
});
