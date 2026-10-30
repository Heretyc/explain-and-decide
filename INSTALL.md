# Install

Terms used below. Explain and Decide binds an AI coding agent to three mandates, rules it follows on every task: zero-knowledge framing (every question and explanation is written for a reader who knows nothing of the project), a Pro and a Con on every option, and a ledger entry for every decision (a record appended to `LEDGER.md`, the project's private decision ledger). A host is the agent program that loads these rules. A skill is a folder holding a `SKILL.md` instruction file that an agent loads when a task needs it. A plugin is a packaged set of skills a host installs with one command. A marketplace is a catalog of plugins; this repository serves as its own marketplace. A rules file is a text file a host reads into every session without being asked. A slash command is a short instruction typed with a leading `/`. A hook is a program a host runs automatically at a lifecycle event; this repository ships none. The template is the ponytail repository (https://github.com/DietrichGebert/ponytail), a skill for the same hosts whose adapter files this repository follows.

Pick your agent below. Not listed? Most agents read [`AGENTS.md`](AGENTS.md), the compact statement of the three mandates: copy it into your project, or ask your agent to install [`skills/explain-and-decide/SKILL.md`](skills/explain-and-decide/SKILL.md) as a skill. Which files map to which agent: [Agent portability](docs/agent-portability.md).

The ledger script, `skills/explain-and-decide/scripts/ledger.ts`, runs on Node.js, so `node` must be on your PATH (for Nix or nvm users: on the non-interactive shell's PATH). Always pass the `--experimental-strip-types` flag: older releases need it to run a `.ts` file, and every release from 22.6 on accepts it. Without Node the mandates still apply, but no decision can be recorded.

Only Claude Code and Codex were exercised on the machine this repository was built on. Every other host below ships on the strength of the template formats it mirrors; its command lines are taken from that template with this repository's identifiers substituted. If a command differs on your version of the host, the rules file and the skill folder still install by hand.

## Claude Code

```
/plugin marketplace add Heretyc/explain-and-decide
```
```
/plugin install explain-and-decide@explain-and-decide
```
(Send the two commands as two separate prompts.)

Reads [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json) and [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json); installs the three skills from `skills/`. The skills themselves act as the slash commands, called as `/explain-and-decide:<skill>`; Claude Code does not read the TOML files in `commands/`, which serve Gemini CLI. The ledger script is reached as `node --experimental-strip-types "${CLAUDE_SKILL_DIR}/scripts/ledger.ts"`; Claude Code fills in `${CLAUDE_SKILL_DIR}` with the installed skill folder.

Same steps in the Claude Code Desktop app's Code tab: type the two `/plugin` commands into the prompt box, or use the **+** button, **Plugins**, **Add plugin**.

## Codex

```bash
codex plugin marketplace add Heretyc/explain-and-decide
codex plugin add explain-and-decide@explain-and-decide
```

Reads [`.codex-plugin/plugin.json`](.codex-plugin/plugin.json); installs the three skills, invoked as `$explain-and-decide:explain-and-decide` and so on. There are no hooks to trust. Codex prints each skill's folder in its skills list; use that folder in place of `${CLAUDE_SKILL_DIR}`: `node --experimental-strip-types "<skill folder>/scripts/ledger.ts"`. The same install covers the Codex desktop app; restart it after installing.

## GitHub Copilot CLI

```bash
copilot plugin marketplace add Heretyc/explain-and-decide
copilot plugin install explain-and-decide@explain-and-decide
```

In an interactive session, the slash equivalents:

```
/plugin marketplace add Heretyc/explain-and-decide
/plugin install explain-and-decide@explain-and-decide
```

Reads [`.github/plugin/plugin.json`](.github/plugin/plugin.json) and [`.github/plugin/marketplace.json`](.github/plugin/marketplace.json). Copilot CLI namespaces plugin commands by plugin name, for example `/explain-and-decide:explain-and-decide-help`. Without the plugin it reads [`AGENTS.md`](AGENTS.md) and [`.github/copilot-instructions.md`](.github/copilot-instructions.md) from a project. The ledger script is at `<plugin install path>/skills/explain-and-decide/scripts/ledger.ts`.

## Pi agent harness

```
pi install git:github.com/Heretyc/explain-and-decide
```

Command form taken from the template. The template ships a Pi extension that injects its rules every turn; this repository ships no extension, so Pi gets the `skills/` folder and [`AGENTS.md`](AGENTS.md). Pro: nothing runs in the background. Con: the mandates arrive when the skill is loaded rather than being injected on every turn. The ledger script is at `<install path>/skills/explain-and-decide/scripts/ledger.ts`.

## Kimi Code

In Kimi Code, run `/plugins install https://github.com/Heretyc/explain-and-decide`, then `/reload` or start a new session. Reads [`.kimi-plugin/plugin.json`](.kimi-plugin/plugin.json), which puts [`AGENTS.md`](AGENTS.md) into the system prompt every turn and adds the three skills, offered as `/explain-and-decide`, `/explain-and-decide-help` and `/explain-and-decide-ledger`. The ledger script is at `<plugin install path>/skills/explain-and-decide/scripts/ledger.ts`.

## Oh My Pi (omp)

```bash
omp plugin marketplace add Heretyc/explain-and-decide
omp plugin install explain-and-decide@explain-and-decide
```

Reads [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json). In the template, omp runs the Pi extension; here it gets the skills and [`AGENTS.md`](AGENTS.md) only. Start a new session after installing. Ledger script: `<install path>/skills/explain-and-decide/scripts/ledger.ts`.

## OpenCode

The template publishes an npm package and a server plugin for OpenCode. This repository has neither. Instead, OpenCode reads [`AGENTS.md`](AGENTS.md) from the project root on its own, and the three commands live in [`.opencode/command/`](.opencode/command/) as Markdown files. Open this repository in OpenCode, or copy `AGENTS.md` and `.opencode/command/` into your project. [`opencode.json`](opencode.json) is present so the folder is recognized as a configured project.

Pro: nothing to install from npm and no plugin code runs. Con: the mandates come from the rules file and the skill, not from a per-turn injection.

Kilo Code is built on OpenCode and reads the same `AGENTS.md` from the project root or from `~/.config/kilo/AGENTS.md`.

Ledger script: `<path to this repository>/skills/explain-and-decide/scripts/ledger.ts`.

## Gemini CLI

```bash
gemini extensions install https://github.com/Heretyc/explain-and-decide
```

Reads [`gemini-extension.json`](gemini-extension.json), whose `contextFileName` points at [`AGENTS.md`](AGENTS.md) for always-on rules, and auto-discovers [`commands/*.toml`](commands/) and `skills/`. Qwen Code installs the same extension through its Gemini CLI compatibility: `qwen extensions install Heretyc/explain-and-decide:explain-and-decide` (form taken from the template). Ledger script: `<extension install path>/skills/explain-and-decide/scripts/ledger.ts`.

## Qoder

Qoder loads `AGENTS.md` from the repository root as always-on context, so working from a checkout needs no setup. For per-project rules, copy [`.qoder/rules/explain-and-decide.md`](.qoder/rules/explain-and-decide.md) into your project's `.qoder/rules/`. The plugin manifest [`.qoder-plugin/plugin.json`](.qoder-plugin/plugin.json) points at `skills/`, installed with `qodercli plugins install <path to this repository>` (form taken from the template). The template adds Qoder hooks for per-turn injection; this repository has no hooks, so the rules file and the skills carry the mandates. Ledger script: `<path to this repository>/skills/explain-and-decide/scripts/ledger.ts`.

## Antigravity CLI

```bash
agy plugin install https://github.com/Heretyc/explain-and-decide
```

Installs the three skills and turns the `commands/` entries into skills too, called as slash commands such as `/explain-and-decide-help`. For the always-on rules, copy [`AGENTS.md`](AGENTS.md) into your project; Antigravity reads it as workspace rules. Ledger script: `<plugin install path>/skills/explain-and-decide/scripts/ledger.ts`.

## Hermes Agent

```bash
hermes plugins install Heretyc/explain-and-decide --enable
```

Should the install check reject the manifest, clone by hand (form taken from the template):

```bash
git clone https://github.com/Heretyc/explain-and-decide.git ~/.hermes/plugins/explain-and-decide
hermes plugins enable explain-and-decide
```

Reads [`plugin.yaml`](plugin.yaml) and [`__init__.py`](__init__.py); the bundled skills are exposed as `explain-and-decide:<skill>`. No hooks are declared. Restart Hermes after installing. [`after-install.md`](after-install.md) repeats these steps. Ledger script: `~/.hermes/plugins/explain-and-decide/skills/explain-and-decide/scripts/ledger.ts`.

## CodeWhale

Reads `AGENTS.md` from the project root, zero setup. Copy [`AGENTS.md`](AGENTS.md) to your project, or run `codewhale` from a checkout. Ledger script: `<path to this repository>/skills/explain-and-decide/scripts/ledger.ts`.

## Devin CLI

```bash
devin plugins install Heretyc/explain-and-decide
```

Reads [`.devin-plugin/plugin.json`](.devin-plugin/plugin.json); skills are available as `/explain-and-decide:explain-and-decide`, `/explain-and-decide:explain-and-decide-help` and `/explain-and-decide:explain-and-decide-ledger`. Ledger script: `<plugin install path>/skills/explain-and-decide/scripts/ledger.ts`.

## OpenClaw

The template installs from ClawHub, a public skill registry, with `clawhub install <skill>`. This repository is not on ClawHub, so copy the generated skill folders from [`.openclaw/skills/`](.openclaw/skills/) into `~/.openclaw/skills/`. They are produced from `skills/` by `node scripts/build-openclaw-skills.js`. Ledger script: `~/.openclaw/skills/explain-and-decide/scripts/ledger.ts` when the folder is copied whole, else the path of your checkout.

## Grok Build

```bash
grok plugin install Heretyc/explain-and-decide --trust
```

Enable the plugin (off by default) from `/plugins` in Grok, or in `~/.grok/config.toml`:

```toml
[plugins]
enabled = ["explain-and-decide"]
```

Reads the root [`plugin.json`](plugin.json), [`.grok-plugin/marketplace.json`](.grok-plugin/marketplace.json) and [`skills/plugin.json`](skills/plugin.json). Skills show as `/explain-and-decide`, `/explain-and-decide-help` and `/explain-and-decide-ledger`. [`AGENTS.md`](AGENTS.md) works from a checkout without the plugin. Ledger script: `<plugin install path>/skills/explain-and-decide/scripts/ledger.ts`.

## Goose

```bash
goose plugin install https://github.com/Heretyc/explain-and-decide.git
```

Imports the three skills as `explain-and-decide:<skill>`. For the always-on rules, copy [`AGENTS.md`](AGENTS.md) to `~/.agents/AGENTS.md` or into your project. In the template Goose clones the plugin into `~/.agents/plugins/<name>/`, so the ledger script is at `~/.agents/plugins/explain-and-decide/skills/explain-and-decide/scripts/ledger.ts`.

## Cursor

The template installs two native hooks into Cursor. This repository ships a rules file instead: copy [`.cursor/rules/explain-and-decide.mdc`](.cursor/rules/explain-and-decide.mdc) into your project's `.cursor/rules/`. Its frontmatter sets `alwaysApply: true`, so the mandates are in every chat.

Pro: nothing to install or trust, and the rule travels with the project. Con: Cursor has no slash commands from this repository, and the ledger script must be run from a checkout: clone the repository and use `node --experimental-strip-types "<checkout>/skills/explain-and-decide/scripts/ledger.ts"`.

## Other agents (rules file only)

Windsurf, Cline, GitHub Copilot Chat (the editor extension, not the CLI above), Aider, Kiro, Zed, Antigravity IDE, VS Code with the Codex extension, JetBrains Junie, Amp and Jules read a rules file. Copy the matching file from this repository: [`.windsurf/rules/`](.windsurf/rules/), [`.clinerules/`](.clinerules/), [`.github/copilot-instructions.md`](.github/copilot-instructions.md), [`.agents/rules/`](.agents/rules/), [`.kiro/steering/`](.kiro/steering/) or [`AGENTS.md`](AGENTS.md). Every copy carries the same text as `AGENTS.md`; `npm run check` proves it.

Kiro: copy `.kiro/steering/explain-and-decide.md` to `~/.kiro/steering/` (every project) or `.kiro/steering/` in one project. Its frontmatter sets `inclusion: always`.

Pro of a rules file: it works on hosts that have no plugin or skill system at all. Con: it carries only the mandates; the agent needs a checkout of this repository to run the ledger script.

## Uninstall

| Host | Command |
|------|---------|
| Claude Code | `/plugin remove explain-and-decide` |
| Codex | `codex plugin remove explain-and-decide` |
| GitHub Copilot CLI | Use the plugin management of your Copilot CLI version; the template lists no removal command |
| Pi agent | `pi uninstall explain-and-decide` |
| Kimi Code | `/plugins` in Kimi Code, then remove explain-and-decide |
| Oh My Pi (omp) | `omp plugin uninstall explain-and-decide@explain-and-decide`, then `omp plugin marketplace remove explain-and-decide` |
| OpenCode | Delete the copied `AGENTS.md` and `.opencode/command/` files |
| Gemini CLI | Use the extension management of your Gemini CLI version; the template lists no removal command |
| Qoder | Remove the plugin through Qoder's plugin management, or delete the copied rule |
| Antigravity CLI | Remove the plugin through Antigravity's plugin management; the template lists no removal command |
| Hermes Agent | Disable the plugin in Hermes, then delete `~/.hermes/plugins/explain-and-decide` |
| Devin CLI | `devin plugins remove explain-and-decide` |
| OpenClaw | Delete the copied folders under `~/.openclaw/skills/` |
| Grok Build | `grok plugin uninstall explain-and-decide` |
| Goose | Delete `~/.agents/plugins/explain-and-decide` |
| Cursor, Windsurf, Cline, Kiro, Qoder rule, Copilot Chat | Delete the copied rule file |

These remove the skill and rules. They leave each project's `LEDGER.md` and any `.no-ledger` marker in place, since those belong to the project and never to the plugin; delete them by hand if you no longer want them.
