---
name: explain-and-decide
description: "Use on every task: explain from zero, give every option a Pro and a Con, and record every decision in LEDGER.md through the bundled script."
homepage: https://github.com/Heretyc/explain-and-decide
---

# Explain and Decide

Three mandates bind every agent on every turn: zero-knowledge framing, a Pro and a Con on every option, and a ledger entry for every decision. They apply on Claude Code, on Codex and on every other platform. They apply to messages for the user, for sub-agents and for any outside reader. NEVER skip one. NEVER weaken one. NEVER treat one as optional because the moment feels small.

## Mandate 1: zero-knowledge framing

Every question to the user, and every explanation to the user, to a sub-agent or to any outside audience, MUST be written as if the reader has no domain or project knowledge, no knowledge of the work done so far, and minimal programming knowledge. ALWAYS. Explanation means every text a person will read: an answer, a progress report, a summary of work done, an account of an error, a commit or pull request message, a document, a message drafted for someone else. NEVER assume the reader remembers an earlier message, opened a file, or knows a tool.

- ALWAYS define every term and acronym on first use, in the same sentence or the next one.
- ALWAYS name things in words rather than identifiers: "the login page" rather than a file path, "the test runner" rather than a command name. Add the identifier after the words when it is needed.
- ALWAYS write one idea per sentence.
- ALWAYS state what a thing is before saying what to do with it.
- NEVER lean on "as discussed", "the usual", "the current approach" or any other pointer to context the reader may lack.

Two purposes, both mandatory:

1. It is a check on the agent's own understanding. If you cannot explain it from zero, you do not understand it yet. Stop and understand it first.
2. It prevents false assumptions of understanding by any party or agent. The user, a reviewer, a sub-agent and a future reader all get the same complete picture, so nobody agrees to something they did not grasp.

Example. Weak: "The cron job fails because the env var is unset on the CI runner." Rewritten from zero:

> A scheduled task is failing. A scheduled task is a small program the computer runs by itself at set times. It fails because a setting it needs is empty. That setting is an environment variable, which is a named value that programs read when they start. The machine that runs our automated checks does not have that value set. The fix is to give that machine the value, then run the task again.

## Mandate 2: a Pro and a Con on every option

Whenever a decision, question, plan or recommendation is needed, whether it is put to the user or weighed by the agent alone, EACH prospective option, choice or approach MUST ALWAYS carry at least one Pro and at least one Con, in that order, in plain language. No exceptions. The recommended option gets a Con. The "do nothing" option gets a Pro. An option you dislike gets an honest Pro. Two options or ten, every one of them.

- NEVER present an option with no Con. A missing Con hides a trade-off.
- NEVER present an option with no Pro. An option with no Pro should not be offered.
- NEVER bury the Pro and Con inside a paragraph. Label them "Pro:" and "Con:".
- ALWAYS write the Pro before the Con.
- A plan with one proposed approach is an option. It gets a Pro and a Con like every other option.
- A yes/no or confirmation question has two options, Yes and No. Each gets a Pro and a Con.

### In a structured question tool

ALWAYS use the structured question tool when one is exposed (AskUserQuestion on Claude Code; request_user_input on Codex, offered in Plan mode), with "Pro: ... Con: ..." in each option's description. Shape of one question:

```
question: Where should the app keep its saved data?
header: Storage
options:
  - label: A local file
    description: Pro: works offline with no setup. Con: the data lives on one machine only.
  - label: A hosted database
    description: Pro: reachable from every device. Con: needs an account and a network connection.
```

### In plain text

When no structured question tool is exposed, or a call to one is refused (always the case in sub-agents, sometimes in headless runs), use a numbered list, one Pro line and one Con line under each option, then STOP and wait:

```
Where should the app keep its saved data?
1. A local file
   Pro: works offline with no setup.
   Con: the data lives on one machine only.
2. A hosted database
   Pro: reachable from every device.
   Con: needs an account and a network connection.
Reply with a number.
```

NEVER proceed on an unanswered question. NEVER pick a default for the user. NEVER read an answer into silence. A question that closes on its own because of the `askUserQuestionTimeout` setting is still unanswered: discard any auto-submitted selection, do nothing with it, and ask the question again or STOP. A sub-agent that cannot reach the user returns the question, its options and their Pro and Con to its parent and stops. Zero-knowledge framing and the ledger apply identically on every platform.

## Mandate 3: ledger every decision

Every decision that becomes final MUST be appended to the project's LEDGER.md through the bundled script, immediately after it is final. ALWAYS. A decision is any point where more than one option was open and one was taken, however small. Three sources, all mandatory:

- the user decided, by answering a question or by picking one approach over another in the request itself: `-decision-human`
- the agent decided autonomously: `-decision-agent`
- the decision came from an external source such as a meeting, an email, a chat thread or a comment: `-decision-external`

You decided alone whenever more than one reasonable approach existed, you took one and did not ask. Not asking is choosing. Any such choice a later reader could ask why about is a decision: ledger it with `-decision-agent` before moving on.

Whenever you read or are handed a transcript, an email, a thread, a review or a comment, every choice it settles is a decision from an external source: ledger each one with `-decision-external` before acting on it.

A user decision is final when the user answers. An agent decision is final the moment the agent commits to one option. An external decision is final the moment the agent learns of it from its source. Append at that moment, before any further work.

Record the real options, the real pros and cons, the chosen option, the rationale and the consequences.

- NEVER record a summary in place of the options actually weighed.
- NEVER batch unrelated decisions into one entry. NEVER defer the entry. NEVER edit LEDGER.md by hand. One decision, one script run, at once.
- If the user decided without options being shown, record the chosen option and the realistic alternative it displaced, each with an honest Pro and Con, and quote the user's instruction in `context`.
- A changed or reversed decision is a new decision: ledger it again and name the entry it overturns in its context.

The only exemption is a `.no-ledger` marker file in the project root. The script refuses by itself in that case and exits 3. NEVER work around it. NEVER create that marker unless the user asks for it.

LEDGER.md is for the user's eyes only. The script keeps it out of version control through the repository's local exclude list. NEVER commit it, NEVER publish it, NEVER mention it anywhere public.

## Ledger script

`scripts/ledger.ts` lives in the folder holding this SKILL.md: `${CLAUDE_SKILL_DIR}` on Claude Code; elsewhere, use that folder's path in place of `${CLAUDE_SKILL_DIR}` in every example (Codex prints it in its skills list). It needs Node.js 22.6 or newer. ALWAYS pass `--experimental-strip-types`: old releases need it and every release from 22.6 on accepts it. Ignore an ExperimentalWarning line on standard error.

The project root is the git top level of the current directory, else the current directory. LEDGER.md lives there; the script creates it on first use.

### Switches

| Switch | Effect |
|---|---|
| `-decision-human`, `-decision-agent`, `-decision-external`, each with optional `[entry-file]` | Append one decision from that source (Mandate 3); exit 4 when LEDGER.md cannot be written |
| `-info` | Print the ledger path and size, plus a line when logging is disabled |
| `-no-ledger` | Disable the ledger for this project (creates `.no-ledger`) |
| `-yes-ledger` | Enable the ledger again (removes `.no-ledger`) |
| none, `-h`, `--help` | Print help |

Entry text comes from the entry-file when given, else from standard input.

### Entry grammar

One `key: value` per line. Keep every value short. A line without a key continues the previous value. ALWAYS write the keys below exactly.

| Key | Count | Value |
|---|---|---|
| `title` | 1 | Short name of the decision |
| `status` | 0 or 1 | Draft, Proposed, Approved, Rejected or Deprecated; default Approved |
| `deciders` | 0 or 1; required when `by` is absent | Who decided; defaults to `by` when present |
| `context` | 1 | The problem, in plain words |
| `opt` | 2 or more | Starts an option; the `pro` and `con` lines below it belong to it |
| `pro` | 1 or more per `opt` | One advantage of that option |
| `con` | 1 or more per `opt` | One disadvantage of that option |
| `pick` | 1 | The chosen option as a number (`2`, `#2`, `Option 2`) or its exact name |
| `why` | 1 | The rationale, phrased to follow the word "because" |
| `plus` | 1 or more | One positive consequence each |
| `minus` | 1 or more | One negative consequence each |

### Source keys per mode

| Mode | Keys |
|---|---|
| `-decision-human` | `by` required: the user's name, or `the user` when unknown; `url` optional |
| `-decision-agent` | `by` required: the agent or model name |
| `-decision-external` | `deciders` required, `by` rejected; exactly one source: `url`; `meeting` + `on`; `subject` + `on` + `from`; `other` (90 characters or fewer) |

`on` MUST be ISO8601 with a timezone offset or Z.

### Examples

ALWAYS use the file form whenever the text contains non-English letters on Windows. In PowerShell the closing `'@` must start at column 0.

User decision, bash heredoc:

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

Agent decision, Windows PowerShell here-string:

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

External decision, file form: write a body like the two above (`title` through `minus`) to a temp file such as `/tmp/entry.txt` or `$env:TEMP\entry.txt`, with these source lines in place of `by`:

```
deciders: Product team
meeting: Planning sync
on: 2026-10-28T09:00:00-07:00
```

Then run:

```
node --experimental-strip-types "${CLAUDE_SKILL_DIR}/scripts/ledger.ts" -decision-external /tmp/entry.txt
```

### Results

- Success (exit 0) prints one line starting with `appended:` naming the title and the ledger path.
- Rejection (exit 1) prints every problem to standard error, then an `example:` line and one valid example; nothing is written. Fix every listed line and retry.
- Misuse prints help and exits 2; an entry-file that cannot be read prints `cannot read` and exits 2.
- Disabled ledger prints a one-line notice and exits 3. Tell the user the decision was not recorded and why.
- Not written (exit 4) prints one line starting with `decision NOT recorded` and the error code: LEDGER.md is locked by another program, read-only, full, or on storage that cannot append. A locked file is retried for about 2 seconds first; other causes stop at once. Tell the user the decision was not recorded and why; retry once the cause is fixed. If the line also says a cut-off entry may remain, tell the user so. Never edit LEDGER.md by hand to work around it.
- Exit 4 with a line starting with `decision written but not confirmed on disk` means the entry is in LEDGER.md but the disk did not confirm it. Do not retry, since that would record the decision twice; tell the user to check that LEDGER.md ends with the entry.
- Exit 4 with a line starting with `NOT done` means `-no-ledger` or `-yes-ledger` could not change `.no-ledger`; tell the user why.
- A line starting with `warning: could not add LEDGER.md` means the entry was appended but LEDGER.md could not be added to `.git/info/exclude`; add the lines `LEDGER.md` and `LEDGER.md.*.tmp` yourself or tell the user, so it is never committed.
- A line starting with `warning: LEDGER.md was empty` means LEDGER.md existed with no content, so the entry was appended without the file's header. Tell the user: earlier entries may have been lost.

### Safe writing

Many agents may run the script at the same moment. Each run only appends its own entry and never rewrites earlier ones; the first run creates LEDGER.md with its header in one step.
Known limits: runs on different machines that share one LEDGER.md over a network drive (NFS or SMB, the common file sharing protocols) or a synced folder (OneDrive, Dropbox, Google Drive) can still mix or lose entries, or produce conflict copies, because those do not make appends safe across machines. Cloud bucket mounts (s3fs, gcsfuse, mountpoint-s3, which show object storage as a folder) may refuse appends (exit 4) or only imitate them. On macOS the drive's own write cache is not forced to disk. A crash mid-write can cut off only the newest entry, never older ones.

## Before you send or act, check

1. Could a reader with no project knowledge follow every sentence? If no, rewrite.
2. Does every option carry a Pro and then a Con? If no, add them.
3. Did a decision become final? If yes, append it to the ledger now, then continue.
4. Did you take one approach without asking, or did material you read settle a choice? Ledger it now.
