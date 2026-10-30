#!/usr/bin/env node
// Each slash command ships twice: commands/<name>.toml (Claude Code, Gemini CLI,
// Copilot) and .opencode/command/<name>.md (OpenCode). Both carry the same
// prompt; only the argument placeholder differs ({{args}} versus $ARGUMENTS).

const test = require('node:test');
const assert = require('node:assert/strict');
const { SKILL_NAMES, readText, frontmatter } = require('./helpers');

// Tiny TOML reader for the one shape these files use: `key = "basic string"`
// on a single line. Basic-string escapes match JSON closely enough to reuse it.
function parseToml(rel) {
  const out = {};
  for (const raw of readText(rel).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = /^([A-Za-z_][\w-]*)\s*=\s*"(.*)"$/.exec(line);
    assert.ok(m, `${rel}: unsupported line (expected key = "one-line string"): ${line.slice(0, 60)}`);
    try {
      out[m[1]] = JSON.parse(`"${m[2]}"`);
    } catch (e) {
      throw new Error(`${rel}: cannot decode the string for ${m[1]}: ${e.message}`);
    }
  }
  return out;
}

const squash = (s) => s.replace(/\s+/g, ' ').trim();

for (const name of SKILL_NAMES) {
  test(`commands/${name}.toml has exactly description and prompt`, () => {
    const toml = parseToml(`commands/${name}.toml`);
    assert.deepEqual(Object.keys(toml).sort(), ['description', 'prompt']);
    assert.ok(toml.description.trim().length > 0, 'description is empty');
    assert.ok(toml.prompt.trim().length > 0, 'prompt is empty');
  });

  test(`.opencode/command/${name}.md mirrors the toml prompt with $ARGUMENTS`, () => {
    const toml = parseToml(`commands/${name}.toml`);
    const rel = `.opencode/command/${name}.md`;
    const fm = frontmatter(readText(rel));
    assert.ok(fm, `${rel} has no frontmatter`);
    assert.deepEqual(Object.keys(fm.keys), ['description'], `${rel} frontmatter must hold only description`);
    assert.ok(fm.keys.description.length > 0, `${rel} description is empty`);
    const expected = squash(toml.prompt.split('{{args}}').join('$ARGUMENTS'));
    assert.equal(squash(fm.body), expected, `${rel} body drifted from commands/${name}.toml`);
  });
}
