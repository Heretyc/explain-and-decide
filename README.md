<p align="center">
  <img src="assets/logo.svg" width="220" alt="Explain and Decide logo">
</p>

<h1 align="center">Explain and Decide</h1>

<p align="center">
  <em>Every explanation from zero, every option with a Pro and a Con, every decision on the record.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-Apache--2.0-111111?style=flat-square" alt="Apache 2.0 license">
  <img src="https://img.shields.io/badge/node-%3E%3D%2022.6-111111?style=flat-square" alt="Node.js 22.6 or newer">
</p>

Explain and Decide is a skill for AI coding agents. A skill is a text file of instructions that an agent loads and follows. This one binds the agent to three rules on every turn and ships a small script that writes each decision into a private log file.

## What it does

Three mandates, always on:

1. **Zero-knowledge framing.** Every question and every explanation is written for a reader who knows nothing about the project, the subject or the work so far. Every term is defined on first use.
2. **A Pro and a Con on every option.** Whenever options are offered, to the user or weighed by the agent alone, each one carries at least one advantage and one disadvantage, labeled "Pro:" and "Con:", in that order. The recommended option gets a Con. The "do nothing" option gets a Pro.
3. **A ledger entry for every decision.** Every decision that becomes final, whether the user made it, the agent made it alone, or a meeting or email settled it, is appended at once through the bundled script to the decision ledger, a private file named `LEDGER.md` at the top of the project.

A question before and after the skill:

> **Before:** "Should I put the cache in Redis or keep it inside the process?"

> **After:** "The app repeats the same slow lookups. A cache is a copy of recent answers kept close at hand so the lookup is not repeated. Where should the cache live?
> 1. Inside the running program's memory.
>    Pro: nothing to install and no extra program to run.
>    Con: the cache is lost on restart and not shared between copies of the program.
> 2. In a separate cache server (Redis, a program whose only job is to hold such copies).
>    Pro: shared by every copy of the program and survives restarts.
>    Con: one more service to install, run and secure.
> Reply with a number."

More pairs in [examples/question-before-after.md](examples/question-before-after.md).

## The decision ledger

The decision ledger is a Markdown file named `LEDGER.md` at the top of the project (the git top level of the current folder, or the current folder when there is no git repository). The script creates it on first use with this preamble, where `<project>` is the folder name:

```
# DECISIONS LEDGER FOR <project>
All notable decisions to this project will be documented in this file.
Intended for local user review only: Never publish to any repository or mention in any public way. For the user's eyes only.
```

Each entry records the status, date, deciders and source, the context, the options, the chosen option with its rationale, the consequences, and the Pro and Con of every option. The opening of one entry:

```
# Where the to-do list app keeps its data

* **Status:** Approved

* **Date:** 2026-10-29T16:07:13-07:00

* **Deciders:** Sam

* **Source:** User interactive decision by Sam
```

A complete sample with three entries is in [examples/LEDGER.md](examples/LEDGER.md).

The ledger is private. The script adds `LEDGER.md` to the repository's local exclude list, the file `.git/info/exclude`, which git reads like `.gitignore` but never commits. The ledger therefore never reaches a repository or a pull request. It also lists `LEDGER.md.*.tmp`, the temporary files used to create the ledger, so a run stopped midway leaves nothing to commit. If the script cannot write that list it prints a line starting with `warning: could not add LEDGER.md` so the exclusion can be added by hand.

To turn the ledger off for one project, run the script with `-no-ledger`. That creates a marker file named `.no-ledger` in the project root; while it exists the script refuses to record anything and exits with code 3. `-yes-ledger` removes the marker.

## Install

**Claude Code**, as two separate prompts. A plugin is a packaged set of skills a host can install, and a marketplace is a catalog of plugins; this repository is both.

```
/plugin marketplace add Heretyc/explain-and-decide
```
```
/plugin install explain-and-decide@explain-and-decide
```

**Codex:**

```bash
codex plugin marketplace add Heretyc/explain-and-decide
codex plugin add explain-and-decide@explain-and-decide
```

**Every other host** (Copilot CLI, Gemini CLI, OpenCode, Cursor, Kimi, Hermes and more): step by step in **[INSTALL.md](INSTALL.md)**.

**Without a plugin**, copy all three sibling folders, `skills/explain-and-decide/`, `skills/explain-and-decide-help/` and `skills/explain-and-decide-ledger/`, into `~/.claude/skills/` (Claude Code) or `~/.codex/skills/` (Codex). Keep the core folder's `scripts/` directory. Pro: no marketplace needed, and both helpers are included. Con: updates are copied by hand. See the [complete bundle instructions](INSTALL.md#complete-skill-bundle) for manual and rules-file installations.

## Using the ledger script

The script is `scripts/ledger.ts` inside the core skill folder. On Claude Code that folder is `${CLAUDE_SKILL_DIR}`; on every other host use the path of the installed skill folder in its place (Codex prints it in its skills list). It needs Node.js 22.6 or newer. Older releases need the `--experimental-strip-types` flag to run a `.ts` file, later ones run it natively, and every release from 22.6 on accepts the flag, so the examples always pass it.

| Switch | Effect |
|---|---|
| `-decision-human [entry-file]` | Append one decision made by the user |
| `-decision-agent [entry-file]` | Append one decision made by the agent on its own |
| `-decision-external [entry-file]` | Append one decision taken from a meeting, email, link or other source |
| `--at datetime` (decision switches only) | Set the event Date; default is script invocation time |
| `-info` | Print the ledger path and size, plus a line when logging is disabled |
| `-no-ledger` | Disable the ledger for this project (creates `.no-ledger`) |
| `-yes-ledger` | Enable the ledger again (removes `.no-ledger`) |
| none, `-h`, `--help` | Print help |

Exit codes: 0, appended (one line starting with `appended:` names the title and the ledger path); 1, rejected (every problem is listed on standard error with a valid example, nothing is written); 2, misuse (help is printed) or an entry file that cannot be read; 3, ledger disabled by `.no-ledger`; 4, not written (one line starting with `decision NOT recorded` names the error code: `LEDGER.md` is locked by another program, read-only, full, or on storage that cannot append; a locked file is retried for about 2 seconds first, other causes stop at once; the line adds a note when a cut-off entry may remain at the end). Two other exit 4 lines: `decision written but not confirmed on disk` means the entry is in `LEDGER.md` but the disk did not confirm it, so a retry would record it twice; `NOT done` means `-no-ledger` or `-yes-ledger` could not change `.no-ledger`.

Many agents may run the script at the same moment, on macOS, Windows, Linux, cloud machines and containers. Each run only appends its own entry and never rewrites earlier ones, the first run creates `LEDGER.md` with its header in one step, and the entry is flushed to disk before `appended:` is printed. If `LEDGER.md` exists but is empty, the entry is appended without the header and a line starting with `warning: LEDGER.md was empty` reports it, since earlier entries may have been lost. Known limits: runs on different machines that share one `LEDGER.md` over a network drive (NFS or SMB, the common file sharing protocols) or a synced folder (OneDrive, Dropbox, Google Drive) can still mix or lose entries, or produce conflict copies, because those do not make appends safe across machines; cloud bucket mounts (s3fs, gcsfuse, mountpoint-s3, which show object storage as a folder) may refuse appends (exit 4) or only imitate them; two first runs at once may both add the exclude lines to `.git/info/exclude`, which git accepts; on macOS the drive's own write cache is not forced to disk; a crash mid-write can cut off only the newest entry, never older ones.

The entry text comes from the entry file when one is given, else from standard input. User decision, bash heredoc:

```bash
node --experimental-strip-types "${CLAUDE_SKILL_DIR}/scripts/ledger.ts" -decision-human <<'EOF'
title: Where saved data lives
context: The app must keep user data between runs.
opt: Local file
pro: Works offline with no setup
con: Data lives on one machine only
opt: Hosted database
pro: Reachable from every device
con: Needs an account and a network connection
pick: 1
why: the app has one user and must work offline
plus: No accounts to manage
minus: No sync between machines
by: Sam
EOF
```

Agent decision, Windows PowerShell here-string (the closing `'@` must start at column 0):

```powershell
@'
title: Test runner for the new module
context: The module needs automated tests and no runner is set up.
opt: Built-in test runner
pro: Ships with the language, nothing to install
con: Fewer reporting features
opt: Third-party framework
pro: Rich assertions and reports
con: One more dependency to maintain
pick: Built-in test runner
why: project rules prefer built-in tools
plus: Zero new dependencies
minus: Plainer test output
by: Claude Code
'@ | node --experimental-strip-types "${CLAUDE_SKILL_DIR}/scripts/ledger.ts" -decision-agent
```

External decision, file form: write a body like the two above (`title` through `minus`) to `/tmp/entry.txt`, with these source lines in place of `by`:

```
deciders: Product team
meeting: Planning sync
on: 2026-10-28T09:00:00-07:00
```

```
node --experimental-strip-types "${CLAUDE_SKILL_DIR}/scripts/ledger.ts" -decision-external /tmp/entry.txt
```

Ready-made entry files: [examples/entry-files/](examples/entry-files/). Full entry grammar: [skills/explain-and-decide/SKILL.md](skills/explain-and-decide/SKILL.md).

The optional `--at datetime` argument sets the entry's **Date** to when the decision happened. It works with all three decision switches, before or after the entry-file path. Omit it to use the time the script was invoked, captured before reading input. Supply an ISO 8601 calendar datetime (a numeric date and time) with an explicit time zone: `YYYY-MM-DDTHH:mm[:ss[.fraction]]` followed by `Z` (Coordinated Universal Time, UTC) or an offset such as `-07:00` or `+0530`. Square brackets here mean optional parts. The script preserves the supplied value and offset. Invalid calendar dates, clock times and missing time zones are rejected with exit 1 before writing. A missing or repeated `--at` argument, or its use with a non-decision switch, exits 2. The external-source `on` field still describes the meeting or email time; it does not set the entry's Date.

```bash
node --experimental-strip-types "<core skill folder>/scripts/ledger.ts" -decision-agent entry.txt --at "2026-10-28T09:00:00-07:00"
```

## Skills and commands

| Skill | Purpose |
|---|---|
| `skills/explain-and-decide/` | The core skill: the three mandates and the ledger script |
| `skills/explain-and-decide-help/` | A one-shot reference card for the mandates, switches and entry grammar |
| `skills/explain-and-decide-ledger/` | Review and query `LEDGER.md`, and record a decision by hand on request |

| Command | What it does |
|---|---|
| `/explain-and-decide` | Load the core skill for the current task |
| `/explain-and-decide-help` | Show the reference card |
| `/explain-and-decide-ledger` | Open the ledger for review or a query |

A slash command is a short instruction typed with a leading `/`. The commands exist where the host supports them; rules-file hosts get the mandates without them.

## Repository layout

```
skills/              the three skills; skills/explain-and-decide/ holds SKILL.md and scripts/ledger.ts
commands/            slash commands as TOML; .opencode/command/ holds the same as Markdown
AGENTS.md            the compact statement of the three mandates; .cursor/, .windsurf/, .clinerules/,
                     .agents/, .qoder/, .kiro/ and .github/ hold identical rules-file copies
.claude-plugin/ ...  one plugin manifest folder per host (see docs/agent-portability.md)
.openclaw/skills/    OpenClaw copies of the skills, generated by scripts/build-openclaw-skills.js
scripts/ tests/      repository checks, builds and node --test suites
examples/            sample ledger, entry files and question pairs
```

## Development

```bash
npm test         # tests/*.test.js with the runner built into Node.js: manifests, commands, script behavior
npm run check    # rule copies match AGENTS.md; every manifest carries the same version
npm run build    # regenerates .openclaw/skills/ and writes dist/explain-and-decide.skill
```

The core skill files are release artifacts and are not edited in place; see [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md).

## FAQ

**Why no hooks?**
A hook is a program the host runs automatically at a lifecycle event, such as session start. The two options:

1. Hooks.
   - Pro: they inject text every turn without the agent choosing to load anything.
   - Con: every host has its own hook format, and they run code on your machine.
2. A pure skill.
   - Pro: one text file, the same on every host; nothing executes until the agent runs the ledger script.
   - Con: the agent must load the skill, which the always-on rules files and the skill description are there to ensure.

This repository ships the pure skill.

**How do I turn the ledger off for one project?**
Run the script with `-no-ledger` in that project. It creates `.no-ledger`; `-yes-ledger` deletes it. The agent never creates the marker on its own.

**What happens in a folder that is not a git repository?**
The current folder becomes the project root. `LEDGER.md` is created there and no exclude list is written, since there is no `.git` folder to protect. Keep the file out of anything you publish.

**How do I reverse a decision?**
A reversal is a new decision. Record it with the script and name the entry it overturns in the `context` line. Entries are never edited or deleted by hand.

**Where is the entry grammar documented?**
In [skills/explain-and-decide/SKILL.md](skills/explain-and-decide/SKILL.md) under "Entry grammar", and in the script's help text (`-h`).

## License

Apache-2.0. Copyright 2026 Lexi Blackburn (https://github.com/Heretyc/).

See [LICENSE](LICENSE) and [NOTICE](NOTICE).
