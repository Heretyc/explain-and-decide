---
title: Explain and Decide
inclusion: always
---

# Explain and Decide

Three mandates bind every agent on every turn. A decision ledger is a file, LEDGER.md in the project root (the git top level of the current folder, else the current folder), recording every choice made in the work: the open options, their Pro and Con, the pick and why. Zero-knowledge framing means writing every question and explanation as if the reader knows nothing of the project, the subject or the work so far. It checks the agent's own understanding (what you cannot explain from zero, you do not understand yet) and stops false assumptions by any party, so nobody agrees to what they did not grasp.

## Mandate 1: assume the reader knows nothing

- ALWAYS write every text a person will read for a reader with no project knowledge and minimal programming knowledge.
- ALWAYS define every term and acronym on first use.
- ALWAYS name things in words rather than identifiers, one idea per sentence.
- NEVER lean on "as discussed", "the usual", "the current approach" or any other pointer to context the reader may lack.

## Mandate 2: a Pro and a Con on every option

- ALWAYS give EACH option at least one Pro and one Con, whether put to the user or weighed by the agent alone. The recommended option gets a Con too.
- NEVER present an option with no Con. NEVER present an option with no Pro.
- ALWAYS write the Pro before the Con. Label them "Pro:" and "Con:".
- NEVER proceed on an unanswered question. NEVER pick a default for the user.

## Mandate 3: every decision goes to the ledger

- ALWAYS append each decision through the ledger script the moment it is final, before any further work. A decision is any point where more than one option was open, however small.
- You decided alone whenever more than one reasonable approach existed and you took one without asking. Not asking is choosing.
- NEVER batch unrelated decisions into one entry. NEVER defer the entry. NEVER edit LEDGER.md by hand.
- LEDGER.md is for the user's eyes only. The script keeps it out of version control through .git/info/exclude, the local exclude list. NEVER commit it, NEVER publish it, NEVER mention it anywhere public.

## The ledger script

Run `node --experimental-strip-types "<repo or install path>/skills/explain-and-decide/scripts/ledger.ts" <switch>`, entry text on standard input or in an entry file. Node.js 22.6 or newer; ALWAYS pass `--experimental-strip-types` (older releases need it; every release from 22.6 on accepts it).

Entry text: one `key: value` per line with `title`, `context`, two or more `opt` each followed by `pro` and `con`, `pick`, `why`, `plus`, `minus`, then the source keys: `by` for a human or agent decision; `deciders` plus one of `url`, `meeting` + `on`, `subject` + `on` + `from`, or `other` for an external decision.

Switches: `-decision-human` (user decided), `-decision-agent` (agent decided alone), `-decision-external` (a meeting, email, thread or comment settled it), each with optional `[entry-file]`; `-info` prints the ledger path and size; `-no-ledger` creates the `.no-ledger` marker in the project root and disables the ledger; `-yes-ledger` removes it; none, `-h` or `--help` print help. The marker is the only exemption. NEVER work around it. NEVER create that marker unless the user asks for it.

Exit codes: 0 appended; 1 rejected, nothing written, problems on standard error; 2 misuse or unreadable entry file; 3 ledger disabled, say so to the user.
