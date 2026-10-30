# Agent Portability

Explain and Decide is a skill distribution that many AI coding agents (hosts) can load. The skills in `skills/` hold the behavior; every other host-specific file is an adapter that makes a host find that behavior.

Terms. A skill is a folder with a `SKILL.md` instruction file that the agent loads when a task needs it. A rules file is a text file the host reads into every session on its own. A command is a slash command, a short instruction typed with a leading `/`, defined in `commands/*.toml` or `.opencode/command/*.md`. The ledger script is `skills/explain-and-decide/scripts/ledger.ts`, the Node.js program that appends decisions to a project's `LEDGER.md`. This repository ships no hooks (programs a host runs automatically at lifecycle events).

## Supported Adapters

| Host | Adapter files | How the mandates reach the agent | How the ledger script is reached | Notes |
|------|---------------|----------------------------------|----------------------------------|-------|
| Claude Code | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `skills/` | Skill (auto-loaded from its description); the three skills double as slash commands | `node --experimental-strip-types "${CLAUDE_SKILL_DIR}/scripts/ledger.ts"` | Exercised on the build machine. Two `/plugin` prompts install it. |
| Codex | `.codex-plugin/plugin.json`, `skills/` | Skill, invoked as `$explain-and-decide:<skill>` | `<skill folder>/scripts/ledger.ts`; Codex prints the folder in its skills list | Exercised on the build machine. Capabilities declare `Instructions` only. |
| GitHub Copilot CLI | `.github/plugin/plugin.json`, `.github/plugin/marketplace.json`, `skills/`, `AGENTS.md`, `.github/copilot-instructions.md` | Skill and commands through the plugin; rules file as fallback | `<plugin install path>/skills/explain-and-decide/scripts/ledger.ts` | Commands are namespaced as `/explain-and-decide:<name>`. |
| GitHub Copilot (editor) | `.github/copilot-instructions.md` | Rules file | A checkout of this repository | Instruction tier only. |
| Pi agent harness | `skills/`, `AGENTS.md` | Skill and rules file | `<install path>/skills/explain-and-decide/scripts/ledger.ts` | No extension, so no per-turn injection. |
| Oh My Pi (omp) | `.claude-plugin/marketplace.json`, `skills/`, `AGENTS.md` | Skill and rules file | `<install path>/skills/explain-and-decide/scripts/ledger.ts` | Installs through the marketplace file. |
| Kimi Code | `.kimi-plugin/plugin.json`, `AGENTS.md`, `skills/` | `systemPromptPath` puts `AGENTS.md` in the system prompt every turn; skills double as slash commands | `<plugin install path>/skills/explain-and-decide/scripts/ledger.ts` | No hooks. |
| OpenCode | `opencode.json`, `.opencode/command/*.md`, `AGENTS.md`, `skills/` | Rules file read from the project root; three Markdown commands | `<path to this repository>/skills/explain-and-decide/scripts/ledger.ts` | No npm package and no server plugin. |
| Kilo Code | `AGENTS.md` | Rules file from the project root or `~/.config/kilo/AGENTS.md` | A checkout of this repository | Built on OpenCode. |
| Gemini CLI | `gemini-extension.json`, `AGENTS.md`, `commands/*.toml`, `skills/` | `contextFileName` loads `AGENTS.md` every session; commands and skills auto-discovered | `<extension install path>/skills/explain-and-decide/scripts/ledger.ts` | No `hooks/` folder exists for Gemini to auto-load. |
| Qwen Code | `gemini-extension.json`, `AGENTS.md`, `commands/`, `skills/` | Same as Gemini CLI through its compatibility layer | `<extension install path>/skills/explain-and-decide/scripts/ledger.ts` | Command form taken from the template. |
| Qoder | `.qoder/rules/explain-and-decide.md`, `.qoder-plugin/plugin.json`, `AGENTS.md`, `skills/` | Rules file (`AGENTS.md` auto-loaded, or the per-project copy); skills through the plugin manifest | `<path to this repository>/skills/explain-and-decide/scripts/ledger.ts` | No Qoder hooks. |
| Antigravity CLI | `plugin.json`, `skills/`, `commands/`, `AGENTS.md` | Skills; commands converted to skills; rules file | `<plugin install path>/skills/explain-and-decide/scripts/ledger.ts` | |
| Antigravity (IDE) | `AGENTS.md`, `.agents/rules/explain-and-decide.md` | Rules file | A checkout of this repository | Instruction tier only. |
| Hermes Agent | `plugin.yaml`, `__init__.py`, `after-install.md`, `skills/` | Skills exposed as `explain-and-decide:<skill>` | `~/.hermes/plugins/explain-and-decide/skills/explain-and-decide/scripts/ledger.ts` | `provides_hooks` is absent. |
| CodeWhale | `AGENTS.md` | Rules file | A checkout of this repository | Instruction tier only. |
| Devin CLI | `.devin-plugin/plugin.json`, `skills/` | Skills as `/explain-and-decide:<skill>` | `<plugin install path>/skills/explain-and-decide/scripts/ledger.ts` | |
| OpenClaw | `.openclaw/skills/<name>/SKILL.md`, `skills/` | Skill folders copied into `~/.openclaw/skills/` | `~/.openclaw/skills/explain-and-decide/scripts/ledger.ts` | Generated from `skills/` by `scripts/build-openclaw-skills.js`; not on ClawHub. |
| Grok Build | root `plugin.json`, `.grok-plugin/marketplace.json`, `skills/plugin.json`, `skills/` | Skills shown as `/explain-and-decide`, `/explain-and-decide-help`, `/explain-and-decide-ledger` | `<plugin install path>/skills/explain-and-decide/scripts/ledger.ts` | Enable after install; off by default. |
| Goose | `plugin.json`, `skills/`, `AGENTS.md` | Skills as `explain-and-decide:<skill>`; rules file from `~/.agents/AGENTS.md` or the project | `~/.agents/plugins/explain-and-decide/skills/explain-and-decide/scripts/ledger.ts` | |
| Cursor | `.cursor/rules/explain-and-decide.mdc` | Rules file with `alwaysApply: true` | A checkout of this repository | No hooks and no commands. |
| Windsurf | `.windsurf/rules/explain-and-decide.md` | Rules file | A checkout of this repository | |
| Cline (extension and CLI) | `.clinerules/explain-and-decide.md`, `AGENTS.md` | Rules file | A checkout of this repository | |
| Kiro | `.kiro/steering/explain-and-decide.md` | Rules file with `inclusion: always` | A checkout of this repository | Copy to `~/.kiro/steering/` or into a project. |
| VS Code with the Codex extension | `AGENTS.md` | Rules file (project root, or `~/.codex/AGENTS.md`) | A checkout of this repository | The Codex plugin row above adds the skills. |
| JetBrains Junie | `AGENTS.md` | Rules file, pointed to in Junie's guidelines setting | A checkout of this repository | Instruction tier only. |
| Amp | `AGENTS.md` | Rules file from the working directory upward | A checkout of this repository | Instruction tier only. |
| Jules | `AGENTS.md` | Rules file from the repository root | A checkout of this repository | Instruction tier only. |
| Zed | `AGENTS.md` | Rules file from the worktree root | A checkout of this repository | Instruction tier only. |
| Generic agents | `AGENTS.md` or `skills/*/SKILL.md` | Copy the rules file or load the skill directly | A checkout of this repository | |

Only Claude Code and Codex were exercised on the machine this repository was built on. The other rows mirror the adapter formats of the template, the ponytail repository (https://github.com/DietrichGebert/ponytail), and have not been run here.

## Complete installation

Every host needs the core folder `explain-and-decide/` and both helper folders, `explain-and-decide-help/` and `explain-and-decide-ledger/`. Keep them as siblings and retain the core `scripts/` directory. The table's rules-file rows describe how mandates load; copying a rule alone does not supply either helper. Follow [the complete skill bundle instructions](../INSTALL.md#complete-skill-bundle) to retain all three folders. Hosts without native skill discovery can read each helper's `SKILL.md` on explicit request. Pro: the full instructions remain available across hosts. Con: file access does not provide native commands or automatic discovery.

## Adapter Rule

Keep adapters thin. When a host supports skills, point it at the existing `skills/` folder. When a host supports commands, point it at `commands/` or `.opencode/command/`. When a host reads only a rules file, keep its copy identical to `AGENTS.md`; `node scripts/check-rule-copies.js` fails when a copy drifts.

## Portable Behavior

- `skills/explain-and-decide/SKILL.md`: the three mandates and the ledger script. A byte-stable release artifact; see [CONTRIBUTING.md](../.github/CONTRIBUTING.md).
- `skills/explain-and-decide-help/SKILL.md`: one-shot reference card for the mandates, the script switches and the entry grammar.
- `skills/explain-and-decide-ledger/SKILL.md`: review and query `LEDGER.md`, and record a decision by hand on request.
- `AGENTS.md`: compact always-on statement of the three mandates for hosts without a skill system.

## The ledger on every host

Whatever the host, the ledger script behaves the same way. Decision switches accept `--at datetime` to set the event Date using an ISO 8601 date and time with an explicit time zone. If omitted, Date is the script invocation time. The meeting or email `on` field remains independent. See the [core skill](../skills/explain-and-decide/SKILL.md) for syntax and examples. The project root is the git top level of the current folder, else the current folder. `LEDGER.md` lives there and is added to `.git/info/exclude`, the repository's local exclude list that git never commits, so the ledger stays on the user's machine. A `.no-ledger` marker in the project root disables recording; the script then exits with code 3. Each run only appends its own entry, using plain Node.js file calls that behave the same on macOS, Windows, Linux, cloud machines and containers, so many agents may record at once. When `LEDGER.md` cannot be written (locked by another program, read-only, full, or on storage that cannot append) the script exits with code 4 and nothing is recorded; the one exception is a line saying the entry was written but not confirmed on disk. Runs on different machines that share one `LEDGER.md` over a network drive or a synced folder can still mix or lose entries.
