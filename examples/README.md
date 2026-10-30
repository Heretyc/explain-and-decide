# Examples

Hand-written samples that show what the skill produces. The project they describe, a small to-do list app, is fictional; nothing here was taken from a real repository.

| File | What it shows |
|---|---|
| [LEDGER.md](LEDGER.md) | A decision ledger for a project named `sample-project`, produced by running the ledger script three times with the entry files `human.txt`, `agent.txt` and `external-meeting.txt` below: one entry each from a user decision, an agent decision and an external decision (a meeting). The preamble lines are exactly what the script writes. |
| [question-before-after.md](question-before-after.md) | Three questions an agent might ask, each written once without the skill and once with it: zero-knowledge framing, numbered options, a Pro and a Con on every option. |
| [entry-files/human.txt](entry-files/human.txt) | A valid entry for `-decision-human` (source line `by`). |
| [entry-files/agent.txt](entry-files/agent.txt) | A valid entry for `-decision-agent` (source line `by`). |
| [entry-files/external-meeting.txt](entry-files/external-meeting.txt) | A valid entry for `-decision-external` with the `meeting` and `on` source lines. |
| [entry-files/external-email.txt](entry-files/external-email.txt) | A valid entry for `-decision-external` with the `subject`, `on` and `from` source lines. |

Try an entry file yourself from any folder (the script creates `LEDGER.md` there):

```
node --experimental-strip-types "<path to this repository>/skills/explain-and-decide/scripts/ledger.ts" -decision-human "<path to this repository>/examples/entry-files/human.txt"
```

To record when the event happened, add `--at "2026-10-28T09:00:00-07:00"` to the command. This ISO 8601 timestamp gives a calendar date, time and explicit offset from Coordinated Universal Time (UTC). The entry Date preserves the value you supply. Without `--at`, Date is the time the script was invoked. A meeting or email's `on` source field does not override Date.

The sample ledger is published here only as an illustration. A real `LEDGER.md` is private: the script keeps it out of version control through `.git/info/exclude`, and the skill forbids committing, publishing or mentioning it in public.
