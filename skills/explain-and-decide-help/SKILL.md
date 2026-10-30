---
name: explain-and-decide-help
description: >
  Quick reference card for the Explain and Decide mandates, ledger script switches, exit codes,
  entry keys, skills and commands. One-shot display. Use for /explain-and-decide-help,
  "explain-and-decide help", "how do I use explain and decide", "what does the ledger script do",
  "ledger switches".
---

# Explain and Decide Help

Display this card. One-shot: change no state, append nothing to the ledger.

## The three mandates

| Mandate | What it requires | Why |
|---|---|---|
| Zero-knowledge framing | Write for a reader who knows nothing of the project; define each term on first use | Checks your own understanding; nobody agrees to what they did not grasp |
| A Pro and a Con on every option | Label "Pro:" then "Con:" under each option, the recommended one included | A missing Con hides a trade-off; no Pro means do not offer it |
| Ledger every decision | Append each final decision to LEDGER.md through the script, at once, one per run | Records what was chosen and why, for the user's eyes only |

## Ledger script

The script sits in the sibling core skill folder, not in this one. Claude Code, where `${CLAUDE_SKILL_DIR}` is this skill's own folder: `node --experimental-strip-types "${CLAUDE_SKILL_DIR}/../explain-and-decide/scripts/ledger.ts" <switch>`. Other hosts: `node --experimental-strip-types "<repo or install path>/skills/explain-and-decide/scripts/ledger.ts" <switch>`. Always pass `--experimental-strip-types`; every Node.js release from 22.6 on accepts it.

| Switch | Effect |
|---|---|
| `-decision-human [entry-file]` | Append a decision the user made |
| `-decision-agent [entry-file]` | Append a decision the agent made alone |
| `-decision-external [entry-file]` | Append a decision from a meeting, email, thread or comment |
| `--at datetime` (decision switches only) | Set the event Date; default is script invocation time |
| `-info` | Print the LEDGER.md path and size, and a notice when disabled |
| `-no-ledger` | Disable the ledger for this project (creates `.no-ledger`) |
| `-yes-ledger` | Enable it again (removes `.no-ledger`) |
| none, `-h`, `--help` | Print help |

Entry text comes from the entry file, else from standard input (quoted bash heredoc, or PowerShell single-quoted here-string piped in). Exit codes: 0 appended; 1 rejected, nothing written; 2 misuse or unreadable entry file; 3 ledger disabled; 4 LEDGER.md could not be written (locked by another program, read-only or full), nothing recorded unless the line says written but not confirmed. LEDGER.md sits in the project root and is private: the script lists it in `.git/info/exclude` so it never reaches a repository. Each run only appends its own entry, so many agents may write at once.

The optional `--at datetime` argument sets the entry's **Date** to when the decision happened. It works with all three decision switches, before or after the entry-file path. Omit it to use the time the script was invoked, captured before reading input. Supply an ISO 8601 calendar datetime (a numeric date and time) with an explicit time zone: `YYYY-MM-DDTHH:mm[:ss[.fraction]]` followed by `Z` (Coordinated Universal Time, UTC) or an offset such as `-07:00` or `+0530`. Square brackets here mean optional parts. The script preserves the supplied value and offset. Invalid calendar dates, clock times and missing time zones are rejected with exit 1 before writing. A missing or repeated `--at` argument, or its use with a non-decision switch, exits 2. The external-source `on` field still describes the meeting or email time; it does not set the entry's Date.

```bash
node --experimental-strip-types "<core skill folder>/scripts/ledger.ts" -decision-agent entry.txt --at "2026-10-28T09:00:00-07:00"
```

## Entry keys

One `key: value` per line.

| Keys | Mode |
|---|---|
| `title`, `context`, `opt` (two or more, each with `pro` and `con`), `pick`, `why`, `plus`, `minus`; optional `status`, `deciders` | Every mode |
| `by` (the user's name, or `the user`); optional `url` | `-decision-human` |
| `by` (the agent or model name) | `-decision-agent` |
| `deciders`, plus one source: `url`; `meeting` + `on`; `subject` + `on` + `from`; `other` (90 characters or fewer). `on` is ISO 8601 with offset or Z | `-decision-external` |

## Skills and commands

| Skill | Trigger | Purpose |
|---|---|---|
| explain-and-decide | `/explain-and-decide`, and every task | The three mandates, every turn |
| explain-and-decide-help | `/explain-and-decide-help` | This card |
| explain-and-decide-ledger | `/explain-and-decide-ledger` | Review LEDGER.md; record a decision by hand on request |

Codex CLI invokes skills as `$explain-and-decide:<skill>`.

## Turn the ledger off and on

A `.no-ledger` file in the project root disables the ledger; the script then exits 3 and records nothing. `-no-ledger` creates it, `-yes-ledger` removes it. Only the user may ask for either.

## More

https://github.com/Heretyc/explain-and-decide
