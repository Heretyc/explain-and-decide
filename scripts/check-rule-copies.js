#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8').replace(/\r\n/g, '\n').trim();
}

function stripFrontmatter(text) {
  return text.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();
}

const agents = read('AGENTS.md');
const canonical = agents.replace(/\n\n\(Yes, this file also applies[\s\S]*?\)$/, '').trim();

// Compact copies: same body as AGENTS.md, host-specific frontmatter stripped.
const copies = [
  ['.cursor/rules/explain-and-decide.mdc', stripFrontmatter],
  ['.windsurf/rules/explain-and-decide.md', text => text.trim()],
  ['.clinerules/explain-and-decide.md', text => text.trim()],
  ['.agents/rules/explain-and-decide.md', text => text.trim()],
  ['.qoder/rules/explain-and-decide.md', text => text.trim()],
  ['.github/copilot-instructions.md', text => text.trim()],
  ['.kiro/steering/explain-and-decide.md', stripFrontmatter],
];

let failed = false;

for (const [relPath, normalize] of copies) {
  const actual = normalize(read(relPath));
  if (actual !== canonical) {
    console.error(`${relPath} drifted from AGENTS.md`);
    failed = true;
  }
}

// SKILL.md is the runtime source of truth and is longer than the compact body,
// so it cannot be byte-compared. Canary, not full equality: assert that the
// load-bearing clauses survive verbatim in both the source and AGENTS.md.
// Rewording a clause trips this, which is the reminder to propagate it everywhere.
const INVARIANTS = [
  'ALWAYS define every term and acronym on first use',          // Mandate 1
  'NEVER lean on "as discussed", "the usual", "the current approach"',
  'NEVER present an option with no Con.',                        // Mandate 2
  'NEVER present an option with no Pro.',
  'ALWAYS write the Pro before the Con.',
  'NEVER proceed on an unanswered question.',
  'Not asking is choosing.',                                     // Mandate 3
  'NEVER edit LEDGER.md by hand.',
  'NEVER commit it, NEVER publish it, NEVER mention it anywhere public.',
  'NEVER create that marker unless the user asks for it.',       // .no-ledger
];

const skillPath = process.env.EAD_SKILL_PATH || path.join(root, 'skills', 'explain-and-decide', 'SKILL.md');
let skill;
try {
  skill = fs.readFileSync(skillPath, 'utf8').replace(/\r\n/g, '\n').trim();
} catch (err) {
  console.error(`cannot read ${skillPath} (${err.code || err.message}); set EAD_SKILL_PATH=<path to SKILL.md> to point at another copy`);
  process.exit(1);
}

const sources = [[skillPath, skill], ['AGENTS.md', agents]];
for (const phrase of INVARIANTS) {
  for (const [label, text] of sources) {
    if (!text.includes(phrase)) {
      console.error(`${label} is missing rule invariant: "${phrase}"`);
      failed = true;
    }
  }
}

if (failed) {
  console.error('Update the copied rule text, AGENTS.md, or SKILL.md so the shared rules match.');
  process.exit(1);
}

console.log(`ok: rule copies match AGENTS.md; ${INVARIANTS.length} rule invariants present in SKILL.md and AGENTS.md.`);
