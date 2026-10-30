#!/usr/bin/env node
// Generate the OpenClaw skill package (.openclaw/skills/) from the canonical
// skills/ folders. An OpenClaw skill is a SKILL.md with frontmatter and a body,
// the same format the canonical skills use, with one difference: description
// must be a single line under 160 characters. The body and any scripts/ folder
// are copied verbatim so the rules never drift; only the frontmatter is rewritten.
//
// Run:    node scripts/build-openclaw-skills.js
// Check:  node scripts/build-openclaw-skills.js --check   (exit 1 when stale)

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SKILLS = path.join(ROOT, 'skills');
const OUT = path.join(ROOT, '.openclaw', 'skills');
const HOMEPAGE = 'https://github.com/Heretyc/explain-and-decide';
const MAX = 160;

function skillNames() {
  return fs.readdirSync(SKILLS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(SKILLS, d.name, 'SKILL.md')))
    .map((d) => d.name)
    .sort();
}

function splitFrontmatter(name) {
  const src = fs.readFileSync(path.join(SKILLS, name, 'SKILL.md'), 'utf8');
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) throw new Error(`skills/${name}/SKILL.md has no frontmatter`);
  return { frontmatter: m[1], body: src.slice(m[0].length) };
}

// The description value: the rest of its line, plus any indented continuation lines.
function description(frontmatter) {
  const lines = frontmatter.split(/\r?\n/);
  const i = lines.findIndex((l) => /^description:/.test(l));
  if (i < 0) throw new Error('frontmatter has no description');
  let text = lines[i].replace(/^description:\s*/, '').replace(/^[>|][-+]?$/, '');
  for (let j = i + 1; j < lines.length && /^\s+\S/.test(lines[j]); j++) text += ' ' + lines[j].trim();
  return text.trim().replace(/^(["'])(.*)\1$/, '$2');
}

// Complete one-line descriptions for skills whose first sentence is too long to
// cut cleanly. The core SKILL.md is byte-stable, so its short form lives here.
const SHORT = {
  'explain-and-decide': 'Use on every task: explain from zero, give every option a Pro and a Con, and record every decision in LEDGER.md through the bundled script.',
  'explain-and-decide-ledger': 'Review, search or audit the decisions in LEDGER.md, the decision ledger, or record a decision by hand through the bundled script.',
};

// First sentence, cut at a word boundary when it is still too long.
function shortDescription(text) {
  let s = (text.match(/^.*?[.!?](?=\s|$)/) || [text])[0];
  if (s.length >= MAX) s = s.slice(0, MAX - 1).replace(/\s+\S*$/, '').replace(/[,;:]$/, '');
  return s;
}

function render(name) {
  const { frontmatter, body } = splitFrontmatter(name);
  const desc = SHORT[name] || shortDescription(description(frontmatter));
  return `---\nname: ${name}\ndescription: ${JSON.stringify(desc)}\nhomepage: ${HOMEPAGE}\n---\n` + body;
}

// Every file to generate: absolute output path to content (string or Buffer).
function outputs() {
  const files = new Map();
  for (const name of skillNames()) {
    files.set(path.join(OUT, name, 'SKILL.md'), render(name));
    for (const legal of ['LICENSE', 'NOTICE']) {
      files.set(path.join(OUT, name, legal), fs.readFileSync(path.join(ROOT, legal)));
    }
    const scripts = path.join(SKILLS, name, 'scripts');
    if (!fs.existsSync(scripts)) continue;
    for (const f of fs.readdirSync(scripts, { recursive: true, withFileTypes: true })) {
      if (!f.isFile()) continue;
      const abs = path.join(f.parentPath, f.name);
      files.set(path.join(OUT, name, 'scripts', path.relative(scripts, abs)), fs.readFileSync(abs));
    }
  }
  return files;
}

module.exports = { skillNames, render, shortDescription, outputs };

if (require.main === module) {
  const check = process.argv.includes('--check');
  let stale = 0;
  for (const [p, content] of outputs()) {
    const rel = path.relative(ROOT, p).replace(/\\/g, '/');
    if (check) {
      const same = fs.existsSync(p) && Buffer.from(content).equals(fs.readFileSync(p));
      if (!same) { console.error('stale', rel); stale++; }
      continue;
    }
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
    console.log('wrote', rel);
  }
  if (stale) process.exit(1);
  if (check) console.log('ok');
}
