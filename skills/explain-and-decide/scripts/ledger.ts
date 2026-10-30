import { appendFileSync, closeSync, constants, existsSync, fstatSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, readFileSync, readSync, statSync, unlinkSync, writeFileSync, writeSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

type Mode = "human" | "agent" | "external";
interface Item { key: string; value: string; n: number; }
interface Opt { name: string; n: number; pro: string[]; con: string[]; }

const CAP = 1000;
const STATUSES = ["Draft", "Proposed", "Approved", "Rejected", "Deprecated"];
const MODES: Record<string, Mode> = { "-decision-human": "human", "-decision-agent": "agent", "-decision-external": "external" };
const SOURCE_KEYS: Record<Mode, string[]> = { human: ["by", "url"], agent: ["by"], external: ["url", "meeting", "on", "subject", "from", "other"] };
const ALL_SOURCE = ["by", "url", "meeting", "on", "subject", "from", "other"];
const NAMES: Record<string, string> = {
  title: "name decision-title", status: "state", deciders: "decider decided-by who", context: "problem background",
  opt: "option choice approach alternative candidate", pro: "pros advantage advantages benefit benefits upside",
  con: "cons disadvantage disadvantages drawback drawbacks downside risk", pick: "chosen choice-number selected winner decision",
  why: "rationale reason because justification", plus: "positive positives good", minus: "negative negatives bad",
  by: "user author model agent decided-by-agent", url: "link href source-url", meeting: "", on: "when at date",
  subject: "email email-subject", from: "sender", other: "freetext",
};
const SYN: Record<string, string> = {};
for (const k in NAMES) for (const s of (k + " " + NAMES[k]).trim().split(" ")) SYN[s] = k;

const EXAMPLE = [
  "title: Pick a database", "context: The app needs persistent storage.", "opt: SQLite", "pro: zero setup",
  "con: single writer", "opt: Postgres", "pro: concurrent writers", "con: needs a server", "pick: 1",
  "why: one user, no server to run", "plus: no infrastructure", "minus: migration later if load grows",
];
const EXAMPLE_SOURCE: Record<Mode, string[]> = { human: ["by: Alex"], agent: ["by: Claude Code"], external: ["deciders: Alex", "url: https://example.com/thread/1"] };

const HELP = [
  "usage: node --experimental-strip-types ledger.ts <switch> [entry-file] [--at datetime]   (-h | --help: this text)   exit: 0 appended, 1 rejected, 2 misuse, 3 disabled, 4 not written",
  "  -decision-human [file]     append a decision made by the user",
  "  -decision-agent [file]     append a decision made by the agent on its own",
  "  -decision-external [file]  append a decision taken from a meeting, email, link or other source",
  "  --at datetime             event Date for decision switches only; ISO8601 YYYY-MM-DDTHH:mm[:ss[.fraction]]Z or +/-HH:mm (also +/-HHmm); default: invocation time; independent of source on",
  "  -info                      print the ledger path and size",
  "  -no-ledger | -yes-ledger   disable | enable the ledger for this project (.no-ledger marker)",
  "entry: \"key: value\" lines from the file or stdin; a line without a key continues the value above",
  "  keys: title, context, why, pick once; opt 2 or more; pro and con 1 or more per opt; plus and minus 1 or more; status optional",
  "  source: human and agent: by (human may add url)   external: deciders plus one of url | meeting + on | subject + on + from | other",
  "input  bash: node ledger.ts -decision-human <<'EOF' ... EOF   PowerShell: @' ... '@ | node ledger.ts -decision-agent   any shell: a file path",
  "example:", ...EXAMPLE, ...EXAMPLE_SOURCE.human,
].join("\n") + "\n";

function out(s: string): void { writeSync(1, s + "\n"); }
function err(s: string): void { writeSync(2, s + "\n"); }
function help(code: number): never { writeSync(1, HELP); process.exit(code); }

function isoNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  const tz = off === 0 ? "Z" : (off > 0 ? "+" : "-") + p(Math.floor(Math.abs(off) / 60)) + ":" + p(Math.abs(off) % 60);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${tz}`;
}

// Capture before reading input: a caller may supply an entry over a slow pipe.
const INVOKED_AT = isoNow();

function validEventTime(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|([+-])(\d{2}):?(\d{2}))$/.exec(value);
  if (!m) return false;
  const [, year, month, day, hour, minute, second, zone, , zoneHour, zoneMinute] = m;
  const y = Number(year), mo = Number(month), d = Number(day);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= days[mo - 1]
    && Number(hour) <= 23 && Number(minute) <= 59 && Number(second ?? 0) <= 59
    && (zone === "Z" || (Number(zoneHour) <= 23 && Number(zoneMinute) <= 59));
}

function git(args: string[], cwd: string): string {
  return execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "ignore"], encoding: "utf8" }).trim();
}

function findRoot(): string {
  try { return resolve(git(["rev-parse", "--show-toplevel"], process.cwd())); } catch { return process.cwd(); }
}

function readStdin(): Promise<Buffer> {
  return new Promise((done) => {
    const chunks: Buffer[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => { clearTimeout(timer); process.stdin.destroy(); done(Buffer.concat(chunks)); };
    const arm = () => { clearTimeout(timer); timer = setTimeout(finish, 2000); };
    arm();
    process.stdin.on("data", (c: Buffer) => { chunks.push(c); arm(); }).on("end", finish).on("error", finish);
  });
}

function decode(buf: Buffer): string {
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.subarray(2).toString("utf16le");
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.subarray(3).toString("utf8");
  return buf.toString("utf8");
}

function dist(a: string, b: string): number {
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = t;
    }
  }
  return d[b.length];
}

function canon(key: string): string | undefined {
  if (SYN[key]) return SYN[key];
  if (key.length < 4) return undefined;
  let best: string | undefined, bd = 3;
  for (const s in SYN) if (s.length >= 4) { const d = dist(key, s); if (d < bd) { bd = d; best = SYN[s]; } }
  return best;
}

const KEY_RE = /^(\*\*|__|`)?([A-Za-z][A-Za-z0-9_-]*)(?:\s+\d+)?(\*\*|__|`)?\s*(:|=)\s*(.*)$/;

function parseKeyLine(line: string): [string, string] | null {
  const m = KEY_RE.exec(line.replace(/^(?:[-*+](?!\*)|\d+[.)])\s*/, ""));
  if (!m) return null;
  let value = m[5];
  if (m[1] && !m[3] && value.startsWith(m[1])) value = value.slice(m[1].length);
  if (m[4] === ":" && value.startsWith("//")) return null;
  const key = canon(m[2].toLowerCase());
  return key ? [key, value.trim()] : null;
}

function parse(text: string): { items: Item[]; errors: string[] } {
  const lines: { n: number; t: string }[] = [];
  text.split(/\r\n|\n|\r/).forEach((l, i) => { const t = l.trim(); if (t) lines.push({ n: i + 1, t }); });
  const last = lines[lines.length - 1];
  if (last && (last.t === "EOF" || last.t === "'@")) lines.pop();
  const items: Item[] = [], errors: string[] = [];
  for (const { n, t } of lines) {
    const kv = parseKeyLine(t);
    if (kv) items.push({ key: kv[0], value: kv[1], n });
    else if (items.length) items[items.length - 1].value = (items[items.length - 1].value + " " + t).trim();
    else errors.push(`line ${n}: no key; write key: value`);
  }
  return { items, errors };
}

const ON_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/;

function build(mode: Mode, items: Item[], errors: string[], eventTime: string): { title: string; lines: string[] } | null {
  const one: Record<string, Item> = {};
  const opts: Opt[] = [], plus: string[] = [], minus: string[] = [];
  for (const it of items) {
    if (!it.value) { errors.push(`line ${it.n}: ${it.key}: empty value`); continue; }
    const cap = it.key === "other" ? 90 : CAP;
    if (it.value.length > cap) errors.push(`line ${it.n}: ${it.key}: too long; reduce to ${cap} characters or less and retry`);
    if (it.key === "opt") opts.push({ name: it.value, n: it.n, pro: [], con: [] });
    else if (it.key === "pro" || it.key === "con") {
      if (!opts.length) errors.push(`line ${it.n}: ${it.key}: comes before any opt`);
      else opts[opts.length - 1][it.key].push(it.value);
    } else if (it.key === "plus") plus.push(it.value);
    else if (it.key === "minus") minus.push(it.value);
    else if (one[it.key]) errors.push(`line ${it.n}: ${it.key}: repeated; keep one`);
    else one[it.key] = it;
  }
  const val = (k: string): string => (one[k] ? one[k].value : "");
  for (const k of ["title", "context", "why"]) if (!one[k]) errors.push(`missing: ${k}`);
  if (opts.length < 2) errors.push("missing: opt (2 or more)");
  opts.forEach((o, i) => { for (const k of ["pro", "con"]) if (!o[k].length) errors.push(`line ${o.n}: ${k}: add one for option ${i + 1}`); });
  if (!plus.length) errors.push("missing: plus");
  if (!minus.length) errors.push("missing: minus");
  let pick = 0;
  if (!one.pick) errors.push("missing: pick");
  else {
    const m = /^(?:#|option[\s-]*#?)?(\d+)$/i.exec(one.pick.value);
    pick = m ? Number(m[1]) : opts.findIndex((o) => o.name.toLowerCase() === one.pick.value.toLowerCase()) + 1;
    if (pick < 1 || pick > opts.length) errors.push(`line ${one.pick.n}: pick: use an option number 1-${opts.length} or an exact option name`);
  }
  let status = "Approved";
  if (one.status) {
    const s = STATUSES.find((x) => x.toLowerCase() === one.status.value.toLowerCase());
    if (s) status = s; else errors.push(`line ${one.status.n}: status: use ${STATUSES.join("|")}`);
  }
  const deciders = val("deciders") || val("by");
  if (!deciders && mode === "external") errors.push("missing: deciders");
  for (const k of ALL_SOURCE) if (one[k] && !SOURCE_KEYS[mode].includes(k)) errors.push(`line ${one[k].n}: ${k}: not used in ${mode} mode`);
  let source = "";
  if (mode !== "external") {
    if (!one.by) errors.push("missing: by");
    source = (mode === "human" ? "User interactive decision by " : "Agentic autonomous decision by ") + val("by");
    if (mode === "human" && one.url) source += ` (${val("url")})`;
  } else {
    const groups = [one.url, one.meeting, one.subject || one.from, one.other].filter(Boolean).length;
    const needOn = Boolean(one.meeting || one.subject || one.from);
    if (groups !== 1) errors.push("source: give exactly one of url, meeting + on, subject + on + from, other");
    if (one.on && !needOn) errors.push(`line ${one.on.n}: on: only used with meeting or subject`);
    if (needOn && !one.on) errors.push("missing: on");
    if (one.on && !ON_RE.test(one.on.value)) errors.push(`line ${one.on.n}: on: use ISO8601 with timezone, e.g. 2026-10-28T09:00:00-07:00`);
    if (one.url) source = val("url");
    else if (one.meeting) source = `Meeting: "${val("meeting")}" which took place on ${val("on")}`;
    else if (one.subject || one.from) {
      for (const k of ["subject", "from"]) if (!one[k]) errors.push(`missing: ${k}`);
      source = `Email: "${val("subject")}" received on ${val("on")} from ${val("from")}`;
    } else if (one.other) source = `Other: ${val("other")}`;
  }
  if (errors.length) return null;
  const why = val("why");
  const lines = [`# ${val("title")}`, `* **Status:** ${status}`, `* **Date:** ${eventTime}`, `* **Deciders:** ${deciders}`,
    `* **Source:** ${source}`, "## Context", val("context"), "## Considered Options"];
  opts.forEach((o, i) => lines.push(`* **Option ${i + 1}:** ${o.name}`));
  lines.push("## Decision & Outcome", `We chose **Option ${pick}: ${opts[pick - 1].name}** because ${why}${/[.!?]$/.test(why) ? "" : "."}`, "### Consequences");
  plus.forEach((p) => lines.push(`* **Positive:** ${p}`));
  minus.forEach((m) => lines.push(`* **Negative:** ${m}`));
  lines.push("## Pros & Cons of All Options");
  opts.forEach((o, i) => {
    lines.push(`### Option ${i + 1}: ${o.name}`);
    o.pro.forEach((p) => lines.push(`* **Pro:** ${p}`));
    o.con.forEach((c) => lines.push(`* **Con:** ${c}`));
  });
  return { title: val("title"), lines };
}

const BUSY = ["EBUSY", "EPERM", "EACCES", "EAGAIN"];
// Codes for hard links or fsync the storage does not support. EISDIR is how Windows reports it on FAT and exFAT.
const UNSUPPORTED = ["EPERM", "ENOTSUP", "EOPNOTSUPP", "EXDEV", "ENOSYS", "EINVAL", "EISDIR"];

function sleep(ms: number): void { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }

function create(ledger: string, head: string): void {
  const tmp = `${ledger}.${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`;
  try {
    writeFileSync(tmp, head, { flag: "wx" });
    if (process.env.EAD_NO_HARDLINK) throw Object.assign(new Error("hard links disabled"), { code: "ENOTSUP" });
    linkSync(tmp, ledger);
  } catch (e: any) {
    if (e.code !== "EEXIST" && !UNSUPPORTED.includes(e.code)) throw e;
    if (e.code !== "EEXIST") try { writeFileSync(ledger, head, { flag: "wx" }); } catch (e2: any) { if (e2.code !== "EEXIST") throw e2; }
  } finally { try { unlinkSync(tmp); } catch {} }
}

function openLedger(ledger: string, head: string): number {
  const end = performance.now() + 2000;
  for (let ms = 10; ; ms = Math.min(ms * 2, 250)) {
    try {
      if (!existsSync(ledger)) create(ledger, head);
      return openSync(ledger, constants.O_RDWR | constants.O_APPEND);
    } catch (e: any) {
      if (e.code === "ENOENT" && lstatSync(ledger, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error("LEDGER.md is a symbolic link to a missing file");
      if ((!BUSY.includes(e.code) && e.code !== "ENOENT") || performance.now() > end) throw e;
      sleep(ms);
    }
  }
}

function tail(fd: number, size: number, min: number): string {
  const n = size < min ? size : 2, buf = Buffer.alloc(n);
  readSync(fd, buf, 0, n, size - n);
  return buf.toString("latin1");
}

// Throws with done and total set, so the caller can tell nothing written, part written and written but not synced apart.
function appendEntry(ledger: string, head: string, entry: string): void {
  const min = Buffer.byteLength(head), fd = openLedger(ledger, head);
  let data = Buffer.alloc(0), done = 0, fail: any, t = "", size = 0;
  try {
    // Wait while the file is shorter than the header (another run is still writing it). A tail other than one LF
    // can also be another run's entry caught mid-write, so it is trusted only once the size stays the same.
    const end = performance.now() + 2000;
    for (;;) {
      size = fstatSync(fd).size;
      t = tail(fd, size, min);
      if ((size >= min && /[^\n]\n$/.test(t)) || performance.now() > end) break;
      sleep(size < min ? 20 : 50);
      if (size >= min && fstatSync(fd).size === size) break;
    }
    data = Buffer.from((!size || t.endsWith("\n\n") ? "" : t.endsWith("\n") ? "\n" : "\n\n") + entry + "\n");
    while (done < data.length) {
      const n = writeSync(fd, data, done);
      if (n < 1) throw Object.assign(new Error("no space left"), { code: "ENOSPC" });
      done += n;
    }
    try { fsyncSync(fd); } catch (e: any) { if (!UNSUPPORTED.includes(e.code)) throw e; }
  } catch (e) { fail = e; }
  try { closeSync(fd); } catch (e) { fail ??= e; }
  if (fail) throw Object.assign(fail, { done, total: data.length });
  if (size < min && !t.trim()) err("warning: LEDGER.md was empty; the entry was appended without the header and earlier entries may be lost");
}

// Lists LEDGER.md and the temporary files used to create it in .git/info/exclude, before the first write,
// so neither can be committed. Append only; two first runs at once may both add the lines, which git accepts.
function excludeLedger(root: string): void {
  if (!existsSync(join(root, ".git"))) return;
  try {
    const p = resolve(root, git(["rev-parse", "--git-path", "info/exclude"], root));
    const text = existsSync(p) ? readFileSync(p, "utf8") : "";
    const have = text.split(/\r?\n/).map((l) => l.trim());
    const want = ["LEDGER.md", "LEDGER.md.*.tmp"].filter((w) => !have.includes(w));
    if (!want.length) return;
    mkdirSync(dirname(p), { recursive: true });
    appendFileSync(p, (text && !text.endsWith("\n") ? "\n" : "") + want.join("\n") + "\n");
  } catch { err("warning: could not add LEDGER.md to git info/exclude"); }
}

async function main(): Promise<void> {
  const [sw, ...args] = process.argv.slice(2);
  if (sw === "-h" || sw === "--help") help(0);
  const mode = MODES[sw];
  if (!sw || (!mode && (args.length || !["-info", "-no-ledger", "-yes-ledger"].includes(sw)))) help(2);
  let file: string | undefined, at: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--at") {
      if (at !== undefined || args[i + 1] === undefined || args[i + 1].startsWith("--")) {
        err("--at: supply one datetime value, once"); help(2);
      }
      at = args[++i];
    } else if (args[i].startsWith("--") || file !== undefined) help(2);
    else file = args[i];
  }
  const root = findRoot(), ledger = join(root, "LEDGER.md"), marker = join(root, ".no-ledger");
  const disabled = existsSync(marker);
  if (sw === "-info") {
    out(`${ledger} ${existsSync(ledger) ? (statSync(ledger).size / 1024).toFixed(1) + " KB" : "0.0 KB (not created yet)"}`);
    if (disabled) out("logging disabled (.no-ledger present)");
    return;
  }
  if (sw === "-no-ledger") {
    if (!disabled) writeFileSync(marker, "This file disables the decision ledger (LEDGER.md) for this project; run the ledger script with -yes-ledger to enable it again.\n");
    out(`ledger disabled: ${marker}`);
    return;
  }
  if (sw === "-yes-ledger") {
    if (disabled) unlinkSync(marker);
    out(`ledger enabled: ${root}`);
    return;
  }
  if (disabled) { err("ledger disabled for this project (.no-ledger present); run -yes-ledger to enable it again"); process.exit(3); }
  if (at !== undefined && !validEventTime(at)) {
    err("--at: use a valid ISO8601 calendar datetime with timezone, e.g. 2026-10-28T09:00:00-07:00; nothing written");
    process.exit(1);
  }
  let buf = Buffer.alloc(0);
  if (file !== undefined) {
    try { buf = readFileSync(resolve(file)); } catch { err(`cannot read ${file}`); process.exit(2); }
  } else if (process.stdin.isTTY) help(2);
  else buf = await readStdin();
  const text = decode(buf);
  if (!text.trim()) help(2);
  const { items, errors } = parse(text);
  const built = build(mode, items, errors, at ?? INVOKED_AT);
  if (!built) { errors.concat(["example:"], EXAMPLE, EXAMPLE_SOURCE[mode]).forEach(err); process.exit(1); }
  const head = `# DECISIONS LEDGER FOR ${basename(root)}\nAll notable decisions to this project will be documented in this file.\n`
    + "Intended for local user review only: Never publish to any repository or mention in any public way. For the user's eyes only.\n";
  excludeLedger(root);
  try { appendEntry(ledger, head, built.lines.join("\n\n")); } catch (e: any) {
    const code = e.code || e.message;
    if (e.total && e.done === e.total) err(`decision written but not confirmed on disk: ${ledger} (${code}); do not retry, check that LEDGER.md ends with this entry`);
    else err(`decision NOT recorded: cannot write ${ledger} (${code}); it is locked by another program, read-only, full or on storage that cannot append`
      + (e.done ? "; a cut-off entry may remain at the end of LEDGER.md" : ""));
    process.exit(4);
  }
  out(`appended: ${built.title} -> ${ledger}`);
}

main().catch((e: any) => {
  if (!e?.code) throw e;
  err(`NOT done: cannot change ${e.path || "a project file"} (${e.code})`);
  process.exit(4);
});
