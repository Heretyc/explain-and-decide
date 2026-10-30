#!/usr/bin/env node
// The OpenClaw skill package (.openclaw/skills/) is generated from skills/ by
// scripts/build-openclaw-skills.js. The committed copies must match the
// generator (--check), keep the one-line description under 160 characters,
// and the core copy must ship the ledger script byte for byte.

const test = require('node:test');
const assert = require('node:assert/strict');
const { SKILL_NAMES, readBytes, readText, frontmatter, runNode } = require('./helpers');

test('build-openclaw-skills.js --check exits 0', () => {
  const r = runNode('scripts/build-openclaw-skills.js', ['--check']);
  assert.equal(r.status, 0, `generated copies are stale or the generator failed:\n${r.stdout}${r.stderr}`);
});

for (const name of SKILL_NAMES) {
  test(`.openclaw/skills/${name}/SKILL.md has name, short description and homepage`, () => {
    const rel = `.openclaw/skills/${name}/SKILL.md`;
    const fm = frontmatter(readText(rel));
    assert.ok(fm, `${rel} has no frontmatter`);
    assert.equal(fm.keys.name, name);
    const desc = fm.keys.description.replace(/^"(.*)"$/, '$1');
    assert.ok(desc.length > 0, 'description is empty');
    assert.ok(desc.length < 160, `description is ${desc.length} characters`);
    assert.ok(fm.keys.homepage && fm.keys.homepage.length > 0, 'homepage missing');
  });
}

test('the generated core copy ships ledger.ts byte-identical to the source', () => {
  const copy = readBytes('.openclaw/skills/explain-and-decide/scripts/ledger.ts');
  const source = readBytes('skills/explain-and-decide/scripts/ledger.ts');
  assert.ok(copy.equals(source), 'ledger.ts copy differs from skills/explain-and-decide/scripts/ledger.ts');
});
