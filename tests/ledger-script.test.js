#!/usr/bin/env node
// Behaviour of the bundled ledger script (skills/explain-and-decide/scripts/
// ledger.ts), run as a child process the way an agent runs it. Every case gets
// its own fresh temp folder, so no case can see another's LEDGER.md.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { runLedger, makeTempDir, gitAvailable } = require('./helpers');

const PREAMBLE = (folder) => [
  `# DECISIONS LEDGER FOR ${folder}`,
  'All notable decisions to this project will be documented in this file.',
  "Intended for local user review only: Never publish to any repository or mention in any public way. For the user's eyes only.",
].join('\n');
const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/;

// A complete entry body (title through minus); source lines are appended per mode.
function body(overrides = {}) {
  const v = {
    title: 'Where saved data lives',
    context: 'The app must keep user data between runs.',
    pick: '1',
    ...overrides,
  };
  return [
    `title: ${v.title}`,
    `context: ${v.context}`,
    'opt: Local file',
    'pro: Works offline with no setup',
    'con: Data lives on one machine only',
    'opt: Hosted database',
    'pro: Reachable from every device',
    'con: Needs an account and a network connection',
    `pick: ${v.pick}`,
    'why: the app has one user and must work offline',
    'plus: No accounts to manage',
    'minus: No sync between machines',
  ].join('\n') + '\n';
}

const human = (o) => body(o) + 'by: Sam\n';
const agent = (o) => body(o) + 'by: Claude Code\n';
const external = (source, o) => body(o) + 'deciders: Product team\n' + source;

function ledgerPath(dir) {
  return path.join(dir, 'LEDGER.md');
}

function readLedger(dir) {
  return fs.readFileSync(ledgerPath(dir), 'utf8');
}

function appendOk(dir, mode, text) {
  const r = runLedger([mode], { cwd: dir, input: text });
  assert.equal(r.status, 0, `expected exit 0, got ${r.status}\n${r.stderr}`);
  assert.match(r.stdout, /^appended: /m);
  return r;
}

test('no arguments: exit 2 and usage on stdout', (t) => {
  const r = runLedger([], { cwd: makeTempDir(t) });
  assert.equal(r.status, 2);
  assert.match(r.stdout, /^usage:/m);
});

test('-h and --help: exit 0, at most 24 lines', (t) => {
  for (const sw of ['-h', '--help']) {
    const r = runLedger([sw], { cwd: makeTempDir(t) });
    assert.equal(r.status, 0, sw);
    assert.match(r.stdout, /^usage:/m);
    const lines = r.stdout.replace(/\n$/, '').split('\n').length;
    assert.ok(lines <= 24, `${sw} printed ${lines} lines`);
  }
});

test('misuse exits 2: unknown switch, extra positional, unreadable entry file', (t) => {
  const dir = makeTempDir(t);
  assert.equal(runLedger(['-bogus'], { cwd: dir }).status, 2, 'unknown switch');
  const extra = runLedger(['-decision-human', 'a.txt', 'b.txt'], { cwd: dir });
  assert.equal(extra.status, 2, 'extra positional');
  assert.match(extra.stdout, /^usage:/m, 'extra positional prints usage');
  assert.doesNotMatch(extra.stderr, /cannot read/, 'extra positional is caught before any file read');
  const missing = runLedger(['-decision-human'], { cwd: dir, inputFile: path.join(dir, 'nope.txt') });
  assert.equal(missing.status, 2, 'nonexistent entry file');
  assert.match(missing.stderr, /cannot read/);
  assert.ok(!fs.existsSync(ledgerPath(dir)), 'misuse must not create LEDGER.md');
});

test('-decision-human via stdin writes the preamble, source, options and intact special characters', (t) => {
  const dir = makeTempDir(t);
  const context = 'Quote " dollar $HOME backtick `cmd` must survive.';
  appendOk(dir, '-decision-human', human({ context }));
  const text = readLedger(dir);
  assert.ok(text.startsWith(PREAMBLE(path.basename(dir)) + '\n\n# Where saved data lives\n'), 'preamble or first heading differs');
  assert.ok(text.includes('* **Source:** User interactive decision by Sam\n'), 'source line');
  assert.ok(text.includes('* **Deciders:** Sam\n'), 'deciders default to by');
  assert.ok(text.includes('* **Status:** Approved\n'), 'status defaults to Approved');
  assert.ok(text.includes(`\n${context}\n`), 'special characters must survive intact');
  const date = /\* \*\*Date:\*\* (.+)/.exec(text);
  assert.ok(date, 'date line');
  assert.match(date[1], ISO_WITH_OFFSET);
  const options = text.split('\n### Option ').slice(1);
  assert.equal(options.length, 2);
  for (const block of options) {
    assert.ok(block.includes('* **Pro:** '), `option lacks a Pro: ${block}`);
    assert.ok(block.includes('* **Con:** '), `option lacks a Con: ${block}`);
  }
  assert.ok(text.includes('We chose **Option 1: Local file** because the app has one user and must work offline.'));
});

test('-decision-agent via entry file: agent source, one blank line between entries, single trailing LF', (t) => {
  const dir = makeTempDir(t);
  const file = path.join(dir, 'entry.txt');
  for (const title of ['First', 'Second']) {
    fs.writeFileSync(file, agent({ title }));
    const r = runLedger(['-decision-agent'], { cwd: dir, inputFile: file });
    assert.equal(r.status, 0, r.stderr);
  }
  const text = readLedger(dir);
  assert.ok(text.includes('* **Source:** Agentic autonomous decision by Claude Code\n'));
  assert.equal(text.split('\n# First\n').length, 2, 'first entry once');
  assert.equal(text.split('\n# Second\n').length, 2, 'second entry once');
  assert.ok(!text.includes('\n\n\n'), 'never more than one blank line in a row');
  assert.match(text, /\* \*\*Con:\*\* [^\n]+\n\n# Second\n/, 'exactly one blank line before the second entry');
  assert.ok(text.endsWith('\n') && !text.endsWith('\n\n'), 'single trailing LF');
});

test('-decision-external renders the meeting, email, url and other source forms', (t) => {
  const cases = [
    ['meeting: Planning sync\non: 2026-10-28T09:00:00-07:00\n',
      'Meeting: "Planning sync" which took place on 2026-10-28T09:00:00-07:00'],
    ['subject: Go with the file\non: 2026-10-28T09:00:00Z\nfrom: Lee\n',
      'Email: "Go with the file" received on 2026-10-28T09:00:00Z from Lee'],
    ['url: https://example.com/thread/1\n', 'https://example.com/thread/1'],
    ['other: Hallway conversation after standup\n', 'Other: Hallway conversation after standup'],
  ];
  for (const [source, expected] of cases) {
    const dir = makeTempDir(t);
    appendOk(dir, '-decision-external', external(source));
    const text = readLedger(dir);
    assert.ok(text.includes(`* **Source:** ${expected}\n`), `expected source line for ${source.split('\n')[0]}`);
    assert.ok(text.includes('* **Deciders:** Product team\n'));
  }
});

test('other text of 91 characters is rejected with the 90 character limit, ledger unchanged', (t) => {
  const dir = makeTempDir(t);
  appendOk(dir, '-decision-external', external('url: https://example.com/a\n'));
  const before = readLedger(dir);
  const r = runLedger(['-decision-external'], { cwd: dir, input: external(`other: ${'x'.repeat(91)}\n`) });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /90 characters/);
  assert.equal(readLedger(dir), before);
});

test('an over-long context is rejected with too long and retry, ledger unchanged', (t) => {
  const dir = makeTempDir(t);
  appendOk(dir, '-decision-human', human());
  const before = readLedger(dir);
  const r = runLedger(['-decision-human'], { cwd: dir, input: human({ context: 'a'.repeat(4096) }) });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /too long/);
  assert.match(r.stderr, /retry/);
  assert.equal(readLedger(dir), before);
});

test('lenient parsing: case, = separator, bullets, bold labels, EOF line, CRLF, BOM, pick forms', (t) => {
  const lenient = (pick) => '\uFEFF' + [
    'Title: Where saved data lives',
    'CONTEXT = The app must keep user data between runs.',
    '- opt: Local file',
    '- **pro**: Works offline with no setup',
    '- **con:** Data lives on one machine only',
    '* Opt = Hosted database',
    '* PRO: Reachable from every device',
    '* Con: Needs an account and a network connection',
    `Pick: ${pick}`,
    'why: the team wants sync',
    'plus: Sync between machines',
    'minus: An account to manage',
    'by: Sam',
    'EOF',
  ].join('\r\n') + '\r\n';
  for (const pick of ['#2', 'Option 2', 'Hosted database']) {
    const dir = makeTempDir(t);
    appendOk(dir, '-decision-human', lenient(pick));
    const text = readLedger(dir);
    assert.ok(text.includes('We chose **Option 2: Hosted database** because the team wants sync.'), `pick ${pick}`);
    assert.ok(text.includes('* **Option 1:** Local file\n'), 'bullet and bold label lines parse as keys');
    assert.ok(!text.includes('EOF'), 'the trailing EOF line is dropped');
    assert.ok(!text.includes('\r'), 'CRLF input yields LF output');
  }
});

test('rejection: missing pick and pro before opt exit 1 with one example, LEDGER.md untouched', (t) => {
  const dir = makeTempDir(t);
  const broken = [
    'title: Broken entry',
    'context: Something.',
    'pro: Orphan advantage',
    'opt: Only one',
    'con: Orphan drawback',
    'why: because',
    'plus: none',
    'minus: none',
    'by: Sam',
  ].join('\n') + '\n';
  const r = runLedger(['-decision-human'], { cwd: dir, input: broken });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /missing: pick/);
  assert.match(r.stderr, /pro: comes before any opt/);
  assert.equal(r.stderr.split('example:').length - 1, 1, 'example: printed exactly once');
  assert.ok(!fs.existsSync(ledgerPath(dir)), 'a rejected entry must not create LEDGER.md');
});

test('-no-ledger and -yes-ledger toggle the marker idempotently; decisions exit 3 while disabled', (t) => {
  const dir = makeTempDir(t);
  const marker = path.join(dir, '.no-ledger');
  for (let i = 0; i < 2; i++) {
    const r = runLedger(['-no-ledger'], { cwd: dir });
    assert.equal(r.status, 0, `-no-ledger run ${i + 1}`);
    assert.ok(fs.existsSync(marker), '.no-ledger must exist');
  }
  const blocked = runLedger(['-decision-agent'], { cwd: dir, input: agent() });
  assert.equal(blocked.status, 3);
  assert.ok(!fs.existsSync(ledgerPath(dir)), 'nothing appended while disabled');
  const info = runLedger(['-info'], { cwd: dir });
  assert.equal(info.status, 0);
  assert.match(info.stdout, /disabled/);
  for (let i = 0; i < 2; i++) {
    const r = runLedger(['-yes-ledger'], { cwd: dir });
    assert.equal(r.status, 0, `-yes-ledger run ${i + 1}`);
    assert.ok(!fs.existsSync(marker), '.no-ledger must be gone');
  }
  appendOk(dir, '-decision-agent', agent());
});

test('-info prints the ledger path and a KB size', (t) => {
  const dir = makeTempDir(t);
  const fresh = runLedger(['-info'], { cwd: dir });
  assert.equal(fresh.status, 0);
  assert.ok(fresh.stdout.toLowerCase().includes(ledgerPath(dir).toLowerCase()), `path missing in: ${fresh.stdout}`);
  assert.match(fresh.stdout, /\b\d+\.\d KB\b/);
  appendOk(dir, '-decision-human', human());
  const after = runLedger(['-info'], { cwd: dir });
  const kb = /(\d+\.\d) KB/.exec(after.stdout);
  assert.ok(kb && Number(kb[1]) > 0, `size must be above zero after an append: ${after.stdout}`);
  assert.doesNotMatch(after.stdout, /disabled/);
});

test('in a git repo the ledger is excluded through .git/info/exclude and never shows in git status', (t) => {
  if (!gitAvailable()) return t.skip('git is not installed');
  const dir = makeTempDir(t);
  const git = (...args) => {
    const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...args], { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 0, `git ${args.join(' ')} failed: ${r.stderr}`);
    return r.stdout;
  };
  git('-c', 'init.defaultBranch=main', 'init', '-q');
  fs.writeFileSync(path.join(dir, 'README.md'), 'hello\n');
  git('add', 'README.md');
  git('commit', '-q', '-m', 'init');
  appendOk(dir, '-decision-human', human({ title: 'One' }));
  appendOk(dir, '-decision-agent', agent({ title: 'Two' }));
  assert.ok(fs.existsSync(ledgerPath(dir)));
  const exclude = fs.readFileSync(path.join(dir, '.git', 'info', 'exclude'), 'utf8');
  assert.equal(exclude.split(/\r?\n/).filter((l) => l.trim() === 'LEDGER.md').length, 1, 'LEDGER.md listed exactly once');
  assert.equal(git('status', '--porcelain'), '', 'LEDGER.md must not be visible to git');
});
