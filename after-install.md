# Explain and Decide for Hermes installed

Enable it if you did not install with `--enable`:

```bash
hermes plugins enable explain-and-decide
```

Restart Hermes or the gateway after enabling.

This plugin (an add-on that Hermes loads at start) adds skills (instruction files the agent loads on demand) and slash commands (short instructions typed with a leading slash) that carry three rules: explain everything for a reader who knows nothing about the project, give every option a Pro and a Con, and record every decision in a decision ledger. The rules apply when the agent loads the explain-and-decide skill or you run a `/explain-and-decide` command; nothing injects them on every turn. For always-on rules, copy `AGENTS.md` from this plugin's folder into your project. The decision ledger is a file named LEDGER.md in the project root that lists each decision with its options, the choice and the reasons.

The ledger script lives inside this plugin's folder at `skills/explain-and-decide/scripts/ledger.ts`. It needs Node.js 22.6 or newer. This prints its help:

```bash
node --experimental-strip-types "<plugin folder>/skills/explain-and-decide/scripts/ledger.ts" -h
```

Slash commands (short instructions typed with a leading slash):

- `/explain-and-decide [task or question]`
- `/explain-and-decide-help`
- `/explain-and-decide-ledger [question or decision]`

Bundled skills (instruction files the agent loads on demand) are available as `explain-and-decide:explain-and-decide`, `explain-and-decide:explain-and-decide-help` and `explain-and-decide:explain-and-decide-ledger`.

LEDGER.md is private to you. The script adds it to the repository's local exclude list (`.git/info/exclude`), so it never reaches a commit, a push or a pull request. Never commit it, publish it or paste it anywhere public.
