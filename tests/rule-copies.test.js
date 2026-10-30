#!/usr/bin/env node
// AGENTS.md is the canonical compact statement of the three mandates and is
// copied into every host's rules folder. scripts/check-rule-copies.js compares
// the copies; the two copies that need host frontmatter must keep the keys
// that make the rule always-on.

const test = require('node:test');
const assert = require('node:assert/strict');
const { readText, frontmatter, runNode } = require('./helpers');

test('scripts/check-rule-copies.js exits 0 and reports ok', () => {
  const r = runNode('scripts/check-rule-copies.js');
  assert.equal(r.status, 0, `check-rule-copies failed:\n${r.stdout}${r.stderr}`);
  assert.match(r.stdout, /\bok\b/i);
});

test('.cursor/rules/explain-and-decide.mdc is alwaysApply: true', () => {
  const fm = frontmatter(readText('.cursor/rules/explain-and-decide.mdc'));
  assert.ok(fm, 'no frontmatter');
  assert.equal(fm.keys.alwaysApply, 'true');
});

test('.kiro/steering/explain-and-decide.md is inclusion: always', () => {
  const fm = frontmatter(readText('.kiro/steering/explain-and-decide.md'));
  assert.ok(fm, 'no frontmatter');
  assert.equal(fm.keys.inclusion, 'always');
});
