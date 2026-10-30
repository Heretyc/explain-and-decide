#!/usr/bin/env node
// Every skill under skills/ is a folder holding SKILL.md: frontmatter with a
// name that equals the folder and a description that fits the hosts' limits,
// then the body. skills/plugin.json is the Grok adapter that points at them.

const test = require('node:test');
const assert = require('node:assert/strict');
const { SKILL_NAMES, readBytes, readJson, frontmatter, isAscii, hasBom, hasCr } = require('./helpers');

for (const name of SKILL_NAMES) {
  test(`skills/${name}/SKILL.md: name equals the folder, description fits, clean encoding`, () => {
    const rel = `skills/${name}/SKILL.md`;
    const buf = readBytes(rel);
    assert.ok(!hasBom(buf), `${rel} starts with a BOM`);
    assert.ok(!hasCr(buf), `${rel} contains CR`);
    assert.ok(isAscii(buf), `${rel} contains non-ASCII bytes`);
    const fm = frontmatter(buf.toString('utf8'));
    assert.ok(fm, `${rel} has no frontmatter`);
    assert.equal(fm.keys.name, name);
    assert.ok(fm.keys.description && fm.keys.description.length > 0, `${rel} description is empty`);
    assert.ok(fm.keys.description.length <= 1024, `${rel} description is ${fm.keys.description.length} characters`);
    assert.ok(fm.body.trim().length > 0, `${rel} has no body`);
  });
}

test('skills/plugin.json parses and names the plugin', () => {
  const manifest = readJson('skills/plugin.json');
  assert.equal(manifest.name, 'explain-and-decide');
});
