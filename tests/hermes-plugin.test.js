#!/usr/bin/env node
// Hermes Agent loads the repo root as a plugin: plugin.yaml declares what it
// provides and __init__.py registers the skills and commands in Python. The
// manifest must list the three skills and commands and no hooks; the Python
// file must at least compile.

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { SKILL_NAMES, readText, mustExist } = require('./helpers');

// The YAML here is flat: `key: value` scalars and `key:` followed by `  - item` lines.
function yamlList(text, key) {
  const m = new RegExp(`^${key}:[ \\t]*\\n((?:[ \\t]+-[^\\n]*\\n?)+)`, 'm').exec(text);
  return m ? m[1].split('\n').map((l) => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean) : null;
}

const INTERPRETERS = [
  ['py', ['-3']],
  ['python3', []],
  ['python', []],
];

function pythonExe() {
  for (const [cmd, pre] of INTERPRETERS) {
    const r = spawnSync(cmd, [...pre, '-I', '-c', 'import sys'], { encoding: 'utf8' });
    if (!r.error && r.status === 0) return [cmd, pre];
  }
  return null;
}

test('plugin.yaml names the plugin, pins the version, lists skills and commands, has no hooks', () => {
  const yaml = readText('plugin.yaml').replace(/\r\n/g, '\n');
  assert.match(yaml, /^name:\s*explain-and-decide\s*$/m);
  assert.match(yaml, /^version:\s*"?1\.1\.0"?\s*$/m);
  for (const key of ['provides_commands', 'provides_skills']) {
    const items = yamlList(yaml, key);
    assert.ok(items, `${key} list missing`);
    for (const name of SKILL_NAMES) assert.ok(items.includes(name), `${key} lacks ${name}`);
  }
  assert.doesNotMatch(yaml, /^provides_hooks:/m, 'a pure skill provides no hooks');
});

test('__init__.py compiles', (t) => {
  const file = mustExist('__init__.py');
  const found = pythonExe();
  if (!found) return t.skip('no Python interpreter found (tried py -3, python3 and python)');
  const [cmd, pre] = found;
  const script = "import sys; compile(open(sys.argv[1], 'rb').read(), sys.argv[1], 'exec')";
  const r = spawnSync(cmd, [...pre, '-I', '-c', script, file], { encoding: 'utf8' });
  assert.equal(r.status, 0, `${cmd} could not compile __init__.py:\n${r.stderr}`);
});
