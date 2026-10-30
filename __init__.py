"""Hermes plugin for Explain and Decide: registers the bundled skills and slash commands."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parent
SKILLS_DIR = ROOT / "skills"
COMMANDS_DIR = ROOT / "commands"
COMMANDS = ("explain-and-decide", "explain-and-decide-help", "explain-and-decide-ledger")

# One `key = "value"` per line, which is the whole shape of commands/*.toml.
_LINE = re.compile(r'^\s*([A-Za-z_][\w-]*)\s*=\s*"(.*)"\s*$')
_ESCAPES = {'"': '"', "\\": "\\", "n": "\n", "t": "\t"}


def read_command(name: str) -> dict[str, str]:
    """Return the `description` and `prompt` strings of commands/<name>.toml."""
    fields: dict[str, str] = {}
    for line in (COMMANDS_DIR / f"{name}.toml").read_text(encoding="utf-8-sig").splitlines():
        match = _LINE.match(line)
        if match:
            fields[match.group(1)] = re.sub(r'\\(["\\nt])', lambda m: _ESCAPES[m.group(1)], match.group(2))
    return fields


def _make_handler(ctx: Any, name: str) -> Callable[[str], str]:
    def handler(raw_args: str = "") -> str:
        prompt = read_command(name).get("prompt", "").replace("{{args}}", (raw_args or "").strip())
        try:
            if ctx.inject_message(prompt):
                return f"Queued `{name}` for the agent."
        except Exception:
            pass
        return prompt

    return handler


def register(ctx: Any) -> None:
    """Register the three skills and the three slash commands with Hermes."""
    for child in sorted(SKILLS_DIR.iterdir()) if SKILLS_DIR.is_dir() else []:
        skill_md = child / "SKILL.md"
        if skill_md.is_file():
            ctx.register_skill(child.name, skill_md)

    for name in COMMANDS:
        ctx.register_command(
            name,
            _make_handler(ctx, name),
            description=read_command(name).get("description", name),
            args_hint="[text]",
        )
