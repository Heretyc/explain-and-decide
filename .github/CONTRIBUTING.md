# Contributing

Thanks for helping. Here is what gets merged, and what needs to come with it.

## The core skill is a release artifact

The core skill is the folder `skills/explain-and-decide/`, holding `SKILL.md` (the instructions every agent loads) and `scripts/ledger.ts` (the program that appends decisions to a project's `LEDGER.md`). Both files are byte-stable: their exact bytes are part of each release, and the test suite checks them. They change only through a reviewed release, never in an ordinary pull request. If you see a problem in either file, open an issue that quotes the line and proposes the wording or code you want; the change lands with the next release.

## Rule copies derive from AGENTS.md

`AGENTS.md` is the canonical compact statement of the three mandates. The same body is copied, for hosts that read only a rules file, into `.agents/rules/`, `.clinerules/`, `.windsurf/rules/`, `.qoder/rules/`, `.github/copilot-instructions.md`, and with a frontmatter header into `.cursor/rules/explain-and-decide.mdc` and `.kiro/steering/explain-and-decide.md`. Edit `AGENTS.md`, then update every copy to match; `npm run check` fails while any copy differs or any manifest carries a different version from `package.json`.

The OpenClaw skill folders under `.openclaw/skills/` are generated from `skills/` by `node scripts/build-openclaw-skills.js`; the test suite fails when they are stale.

## Before you open a pull request

```bash
npm test
npm run check
```

`npm test` runs every file in `tests/` with the test runner built into Node.js and needs no dependencies. `npm run check` verifies the rule copies and the version fields. Keep the pull request to one change and link the issue it fixes.

## Prose rules

Every file in this repository, from the README to a command description, follows these rules. Pull requests that break them are sent back.

- ASCII only. No em dash, no en dash, no emoji, no typographic quotes.
- A hyphen appears only inside a compound word (`zero-knowledge`), an identifier, a command flag or a path. It is never used as punctuation between clauses; use a period, a comma, a colon or parentheses.
- Readers are assumed to know nothing about this project. Define every term on first use: skill, plugin, marketplace, decision ledger, hook, slash command.
- Whenever options are presented, each option carries a Pro and then a Con, labeled as such. No exceptions, including the recommended option.
- No historical framing. Describe how things are, not how they came to be; version history lives in git.
- No tool or model attribution anywhere: not in files, commits or pull request text.
- No performance claims, no invented figures, no sponsors, no badges for services this project does not use.

## Development

Useful commands:

```bash
npm test          # tests/*.test.js with node --test
npm run check     # rule copies and version agreement
npm run build     # regenerate .openclaw/skills/ and write dist/explain-and-decide.skill
```

Tests must pass on Node.js 22.6 and on 24. When a test spawns the `.ts` ledger script it adds `--experimental-strip-types` unless `process.features.typescript` reports native support.

`EAD_NO_HARDLINK=1` is a test-only environment variable: the ledger script then skips the hard link (a second name for one file, which lets the script create `LEDGER.md` with its header in one step) and creates a missing `LEDGER.md` by exclusive create, the path taken on storage without hard links, so `tests/concurrency.test.js` exercises that create path on every platform. The wait for a header that another run is still writing has its own test, which writes the header in two parts. `tests/fault.cjs` is a preload (loaded with `node --require`) that injects a short write on a full disk or a failed fsync into the ledger script, so both exit 4 messages are tested on every platform.
