---
name: explain-and-decide-ledger
description: "Review, search or audit the decisions in LEDGER.md, the decision ledger, or record a decision by hand through the bundled script."
homepage: https://github.com/Heretyc/explain-and-decide
---

# Explain and Decide Ledger

LEDGER.md is the decision ledger: a file in the project root where the core skill's script appends every final decision with its options, each option's Pro and Con, the chosen option, the rationale and the consequences. This skill reads that file back to the user and, on request, records an entry by hand. The ledger is private to the user's machine: the script keeps it out of version control through `.git/info/exclude`.

## Locate

Run the script with `-info`. The script sits in the sibling core skill folder, `explain-and-decide/scripts/ledger.ts`, next to this skill's own folder. On Claude Code, where `${CLAUDE_SKILL_DIR}` is this skill's own folder: `node --experimental-strip-types "${CLAUDE_SKILL_DIR}/../explain-and-decide/scripts/ledger.ts" -info`. Every other host uses the core skill folder's path in place of `${CLAUDE_SKILL_DIR}/../explain-and-decide`. Always pass `--experimental-strip-types`; every Node.js release from 22.6 on accepts it. The output names the LEDGER.md path and size, and adds "logging disabled" when a `.no-ledger` marker exists. Say so plainly if the ledger is disabled or not created yet, then stop unless the user asks for more.

## Review

Read LEDGER.md. Each entry carries a Status (Draft, Proposed, Approved, Rejected or Deprecated), the deciders, a Context, the chosen option with its rationale and consequences, and every option's Pro and Con.

- Group entries by Status. Surface Deprecated and Rejected entries first, since a reader who misses them acts on a decision that no longer holds.
- For each decision show its title, the chosen option, and the Pro and Con that drove the choice.
- Quote the Context in plain language and define any term the entry uses.
- Never paraphrase a decision without its Con. A decision shown with only its benefit misleads.
- A search such as "why did we choose X" returns the matching entries in full, never a one-line digest.

## Record by hand

When the user asks to record a decision:

1. Pick the mode by source: `-decision-human` when the user decided, `-decision-agent` when the agent decided alone, `-decision-external` when a meeting, email, thread or comment settled it.
2. Build an entry in the grammar: one `key: value` per line with `title`, `context`, two or more `opt` each followed by `pro` and `con`, `pick`, `why`, `plus`, `minus`, and the source keys for the mode (`by` for human and agent; `deciders` plus `url`, or `meeting` + `on`, or `subject` + `on` + `from`, or `other` for external). An optional `status` line sets Deprecated or Rejected.
3. Deliver it by entry file (`-decision-human path/to/entry.txt`) or by standard input (a quoted bash heredoc, or a PowerShell single-quoted here-string piped to node). Use the file form whenever the text holds non-English letters on Windows.
4. Report the script's output verbatim: the `appended:` line on exit 0; the listed problems on exit 1, then fix every one and retry; exit 3 means the ledger is disabled and nothing was recorded.

A reversal or a change of mind is a new entry whose Context names the entry it reverses. Never edit the earlier entry.

## Boundaries

- Never edit LEDGER.md directly; every change goes through the script.
- Never publish, commit or quote LEDGER.md outside the user's session. It is for the user's eyes only.
- Never remove `.no-ledger` without being asked; run `-yes-ledger` only on the user's request.
