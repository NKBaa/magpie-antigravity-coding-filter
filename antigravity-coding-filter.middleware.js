// Antigravity coding filter — magpie gateway middleware.
//
// Port of jellyfish-p/cpa-plugin-antigravity-coding-filter (CLIProxyAPI v7
// plugin, MIT) to magpie's gateway middleware API. It does what that plugin
// does: on the request a try sends to an Antigravity account, it looks at the
// system/developer prompt only, and either rewrites the names of other coding
// agents to "Antigravity" or breaks them with zero-width spaces.
//
//   {"mode": "rewrite", "useDefaultKeywords": true,
//    "customMappings": {}, "accounts": ["antigravity"], "off": false}
//
// Why it is scoped to one provider: magpie tries a request on each candidate
// in turn (onProvider), and Antigravity refuses a prompt that reads as another
// agent's — a 429 "Resource has been exhausted" that isn't about quota. A
// Claude subscription, or a key, gets the prompt as the agent wrote it.
//
// Only the system prompt is read: a name in the user's own turns, in tool
// definitions, in tool results, in metadata or in an image is left alone. What
// the plugin preserves on purpose, even inside the system prompt, is the same
// list the Go plugin protects: URLs, `mcp__…` identifiers, Windows and POSIX
// paths, `./` and `../`, `.codex`, and `*.md` file names — a name that is part of
// a path or a URL is a technical reference, not an identity.
//
// Modes:
//   cloak (default)   — the matched name gets a zero-width space after its
//                       first and second letter, so the model still reads it
//                       but the literal string Antigravity matches is gone.
//                       This is what magpie's own antigravity-cloak middleware
//                       does, and the only mode that leaves the wording intact:
//                       rewriting "You are a Claude agent" gives
//                       "You are a Antigravity".
//   rewrite           — the matched name becomes its mapping's value, usually
//                       "Antigravity", as the Go plugin's rewrite mode does.
//
// The Go plugin's third mode, block, has no equivalent here: magpie calls
// onProvider once the request is already routed, and an onProvider cannot turn
// a request away (`ctx.reject` there does nothing). To turn a request away
// before it is routed, use @magpie-community/middleware-block-patterns, whose
// onRequest runs earlier but knows no provider.
//
// Longest name wins, ignoring case, so "GitHub Copilot CLI" is replaced once
// rather than as "GitHub Copilot" plus a leftover " CLI".
//
// The preset is the Go plugin's 56 names minus the eleven that are also
// ordinary English words (ambiguousNames below), plus the chat clients
// Chatbox / Chatbox AI and Kelivo. Those eleven
// came out of defaultMappings because "move the cursor to the end", "goose
// bumps" and "the tabby cat" were being rewritten; a prompt that names one
// adds it with customMappings, or takes all eleven back with
// useAmbiguousKeywords.
//
// Beyond the Go plugin (all of it opt-out, see the README):
//   boundaries      (default true)  a name only matches as a whole word, so
//                                   "Traefik" and "decline" are left alone.
//                                   Set false for the Go plugin's behaviour.
//   protectCode     (default true)  names inside ``` fences and `inline code`
//                                   are left alone; cloaking a name inside a
//                                   string literal corrupts the code.
//   useModelKeywords(default false) also match model names (Claude Sonnet,
//                                   GPT-5, …), which the preset leaves out and
//                                   which bring the 429 back on their own.
//   useAmbiguous    (default false) put the eleven ambiguous names back.
//   strictCase      (default false) those eleven, when present, match only in
//                                   their own spelling, so "move the cursor"
//                                   is left alone while "Cursor" is not.
//   dryRun          (default false) work out what would change, change
//                                   nothing, and still report.
//   report          (default false) leave the matches on ctx.state under
//                                   "antigravity-coding-filter" so a gateway
//                                   log can show what was hit.
//
// The package also ships a page (page/index.html): the same options as a form,
// and a box that shows what the filter does to a system prompt you paste. The
// page carries its own copy of the matcher in page/filter.js — a page cannot
// import this file — and page.test.mjs fails when the two disagree.

export const defaultMappings = [
  // Major AI code editors, assistants, and terminal coding agents.
  ["Claude Agent", "Antigravity"],
  ["Claude Code", "Antigravity"],
  ["OpenAI Codex", "Antigravity"],
  ["Codex CLI", "Antigravity"],
  ["OpenCode", "Antigravity"],
  ["GitHub Copilot CLI", "Antigravity"],
  ["GitHub Copilot", "Antigravity"],
  ["Gemini Code Assist", "Antigravity"],
  ["Gemini CLI", "Antigravity"],
  ["Windsurf", "Antigravity"],
  ["Codeium", "Antigravity"],
  ["Roo Code", "Antigravity"],
  ["Kilo Code", "Antigravity"],
  ["Continue.dev", "Antigravity"],
  ["Amazon Q Developer", "Antigravity"],
  ["Amazon CodeWhisperer", "Antigravity"],
  ["JetBrains AI Assistant", "Antigravity"],
  ["JetBrains Junie", "Antigravity"],
  ["Qoder CLI", "Antigravity"],
  ["Qoder", "Antigravity"],
  ["Qwen Code", "Antigravity"],
  ["Tabnine", "Antigravity"],
  ["Sourcegraph Cody", "Antigravity"],
  ["Augment Code", "Antigravity"],
  ["Replit Agent", "Antigravity"],
  ["Replit Ghostwriter", "Antigravity"],
  ["OpenHands", "Antigravity"],
  ["SWE-agent", "Antigravity"],
  ["Zed AI", "Antigravity"],
  ["Void Editor", "Antigravity"],
  ["PearAI", "Antigravity"],
  ["Refact.ai", "Antigravity"],
  ["GitLab Duo", "Antigravity"],
  ["Visual Studio IntelliCode", "Antigravity"],
  ["CodeBuddy", "Antigravity"],
  ["Blackbox AI", "Antigravity"],
  ["Pieces for Developers", "Antigravity"],
  ["CodiumAI", "Antigravity"],
  ["Rovo Dev CLI", "Antigravity"],
  ["Factory Droid", "Antigravity"],

  // General-purpose local agents that can generate and modify code.
  ["OpenClaw", "Antigravity"],
  ["Clawdbot", "Antigravity"],
  ["Moltbot", "Antigravity"],
  ["Hermes Agent", "Antigravity"],
  ["WorkBuddy", "Antigravity"],

  // Chat clients that write their own name into the system prompt they send.
  // Chatbox's and Kelivo's provider settings take any OpenAI-compatible host,
  // so their requests can reach Antigravity through magpie like an agent's.
  ["Chatbox AI", "Antigravity"],
  ["Chatbox", "Antigravity"],
  ["Kelivo", "Antigravity"],
]

// modelMappings is off unless useModelKeywords is set. The preset above leaves
// model names out on purpose (they are not agents), but issue #4 of the
// upstream plugin found that the model name alone brings the 429 back, so this
// list is here for the prompts that say one. Bare "o1"/"o3" are not in it: they
// are too short to match anything but a variable name.
export const modelMappings = [
  ["Claude Sonnet", "Antigravity"],
  ["Claude Opus", "Antigravity"],
  ["Claude Haiku", "Antigravity"],
  ["Claude 4", "Antigravity"],
  ["Claude 3.7", "Antigravity"],
  ["Claude 3.5", "Antigravity"],
  ["Claude", "Antigravity"],
  ["GPT-5", "Antigravity"],
  ["GPT-4.5", "Antigravity"],
  ["GPT-4o", "Antigravity"],
  ["GPT-4.1", "Antigravity"],
  ["GPT-4", "Antigravity"],
  ["GPT-3.5", "Antigravity"],
  ["Gemini 3", "Antigravity"],
  ["Gemini 2.5", "Antigravity"],
  ["Gemini 2.0", "Antigravity"],
]

// ambiguousNames are the entries that are also ordinary English words or given
// names: Aider, Cline, Codex, Cursor, Devin, Goose, Hermes, Kiro, Qodo, Tabby
// and Trae. They are not in defaultMappings — "move the cursor to the end",
// "goose bumps" and "the tabby cat" came out rewritten — so a prompt that names
// one of them adds it, either by hand:
//
//   {"customMappings": {"Cursor": "Antigravity"}}
//
// or all of them at once with useAmbiguousKeywords: true.
//
// strictCase is off by default: a lowercase identity line ("you are cursor") is
// then still cloaked, which is the whole point of the middleware, and the cost
// is that prose mentioning a cursor is rewritten too. Turn it on when the
// prompts you send talk about cursors, geese or tabby cats as words: a name
// from this list then matches only in the spelling it was written with.
export const ambiguousNames = [
  "Aider",
  "Cline",
  "Codex",
  "Cursor",
  "Devin",
  "Goose",
  "Hermes",
  "Kiro",
  "Qodo",
  "Tabby",
  "Trae",
]

// ambiguousMappings is the whole group, for useAmbiguousKeywords: true.
export const ambiguousMappings = ambiguousNames.map((name) => [name, "Antigravity"])

const ZWSP = "\u200b"
const DEFAULT_REPLACEMENT = "Antigravity"
const STATE_KEY = "antigravity-coding-filter"

export function onProvider(body, ctx) {
  const o = ctx && ctx.options
  if (!o || typeof o !== "object" || isOn(o.off)) return
  const account = ctx.provider && ctx.provider.account
  if (!accountAllowed(o.accounts, account)) return

  const cfg = config(o)
  if (!cfg.matcher) return

  const hits = new Map()
  let mutated = false
  walk(body, ctx.protocol, (text) => {
    const next = transform(text, cfg, (name) => {
      hits.set(name, (hits.get(name) || 0) + 1)
    })
    if (next !== text) mutated = true
    return cfg.dryRun ? text : next
  })

  if (cfg.report) report(ctx, cfg, account, hits, mutated)
  return mutated && !cfg.dryRun ? body : undefined
}

// report leaves what matched on ctx.state, under a key a gateway log or a
// second middleware can read. The request itself is not touched.
function report(ctx, cfg, account, hits, mutated) {
  const state = ctx && ctx.state
  if (!state || typeof state !== "object") return
  const matches = []
  for (const [name, count] of hits) matches.push({ name, count })
  state[STATE_KEY] = {
    account,
    mode: cfg.mode,
    dryRun: cfg.dryRun,
    changed: mutated && !cfg.dryRun,
    matches,
  }
}

// config turns the options into the matcher a request's hooks use. A runtime
// is kept for a request, so this is built once a request and cached by the
// options it was built from — the few most recent, so a gateway serving more
// than one option set does not rebuild the matcher on every request.
const cache = new Map()
const CACHE_SIZE = 8

function config(o) {
  const mode = normMode(o.mode)
  const useDefault = flag(o, "useDefaultKeywords", "use_default_keywords", true)
  const useModels = flag(o, "useModelKeywords", "use_model_keywords", false)
  const useAmbiguous = flag(o, "useAmbiguousKeywords", "use_ambiguous_keywords", false)
  const boundaries = o.boundaries !== undefined ? o.boundaries : true
  const protectCode = flag(o, "protectCode", "protect_code", true)
  const strictCase = o.strictCase !== undefined ? o.strictCase : false
  const dryRun = flag(o, "dryRun", "dry_run", false)
  const report = o.report !== undefined ? o.report : false
  const custom =
    o.customMappings !== undefined ? o.customMappings : o.custom_mappings
  const key = JSON.stringify([
    mode,
    useDefault,
    useModels,
    useAmbiguous,
    boundaries,
    protectCode,
    strictCase,
    dryRun,
    report,
    custom,
  ])
  const hit = cache.get(key)
  if (hit) {
    cache.delete(key)
    cache.set(key, hit)
    return hit
  }

  const pairs = []
  if (useDefault !== false) for (const p of defaultMappings) pairs.push(p)
  if (useModels === true) for (const p of modelMappings) pairs.push(p)
  if (useAmbiguous === true) for (const p of ambiguousMappings) pairs.push(p)
  for (const p of parseCustom(custom)) pairs.push(p)

  // Later entries win, matched ignoring case. A null replacement takes a name
  // out of the list, which is how a preset entry an agent does not send can be
  // removed; a blank replacement is skipped, as the Go plugin does.
  const seen = Object.create(null)
  const spelling = Object.create(null)
  for (const [match, replacement] of pairs) {
    const name = String(match == null ? "" : match).trim()
    if (!name) continue
    const lower = name.toLowerCase()
    if (replacement === null) {
      delete seen[lower]
      delete spelling[lower]
      continue
    }
    const value = String(replacement == null ? "" : replacement).trim()
    if (!value) continue
    seen[lower] = value
    spelling[lower] = name
  }
  const list = Object.keys(seen)
    .map((match) => ({ match, replacement: seen[match] }))
    .sort((a, b) => b.match.length - a.match.length || (a.match < b.match ? -1 : 1))

  // strict holds the ambiguous names still in the list, with the spelling they
  // were written with; transform leaves a match alone when its case differs.
  let strict = null
  if (strictCase !== false) {
    for (const name of ambiguousNames) {
      const lower = name.toLowerCase()
      if (!seen[lower]) continue
      strict = strict || Object.create(null)
      strict[lower] = spelling[lower] || name
    }
  }

  const cfg = {
    mode,
    dryRun: dryRun === true,
    report: report === true,
    protectCode: protectCode !== false,
    matcher: list.length ? buildMatcher(list, boundaries !== false, strict) : null,
  }
  cache.set(key, cfg)
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value)
  return cfg
}

// flag reads a camelCase option, then its snake_case spelling, then the
// default — the Go plugin's configuration is spelled with underscores.
function flag(o, camel, snake, fallback) {
  if (o[camel] !== undefined) return o[camel]
  if (o[snake] !== undefined) return o[snake]
  return fallback
}

function normMode(value) {
  const mode = typeof value === "string" ? value.trim().toLowerCase() : ""
  return mode === "rewrite" ? "rewrite" : "cloak"
}

// isOn reads a boolean the way options arrive from JSON, a query string or an
// environment variable: off:"false" must not switch the middleware off.
function isOn(value) {
  if (value === true) return true
  if (typeof value === "number") return value !== 0
  if (typeof value !== "string") return false
  const v = value.trim().toLowerCase()
  return v === "true" || v === "1" || v === "yes" || v === "on"
}

// accountAllowed compares account kinds ignoring case, so "Antigravity" in the
// options matches an account whose kind is spelled "antigravity".
function accountAllowed(list, account) {
  if (typeof account !== "string" || !account) return false
  const want = Array.isArray(list) && list.length ? list : ["antigravity"]
  const have = account.toLowerCase()
  for (const item of want) {
    if (typeof item === "string" && item.trim().toLowerCase() === have) return true
  }
  return false
}

// parseCustom reads customMappings: an object {"Cursor": "Antigravity"}, a
// comma- or newline-delimited "Cursor: Antigravity" string, or an array of
// such strings. A blank entry is skipped rather than thrown, so one typo in
// the options cannot stop the rest from working.
function parseCustom(value) {
  if (value == null) return []
  if (typeof value === "string") return parseMappingString(value)
  if (Array.isArray(value)) {
    const out = []
    for (const item of value) {
      if (typeof item === "string") out.push(...parseMappingString(item))
      else if (item && typeof item === "object")
        for (const [k, v] of Object.entries(item)) out.push([k, v])
    }
    return out
  }
  if (typeof value === "object") return Object.entries(value)
  return []
}

// parseMappingString reads "Cursor: Antigravity, Windsurf: Antigravity". A
// string with a line break in it is one entry per line instead, so a
// replacement may contain the comma: "Cursor: My IDE, Inc.\nWindsurf: My IDE,
// Inc.". The first colon in an entry separates the two halves.
function parseMappingString(value) {
  const entries = /[\r\n]/.test(value) ? value.split(/[\r\n]+/) : value.split(",")
  const out = []
  for (const entry of entries) {
    const text = entry.trim()
    if (!text) continue
    const at = text.indexOf(":")
    if (at < 0) out.push([text, ""])
    else out.push([text.slice(0, at), text.slice(at + 1)])
  }
  return out
}

// buildMatcher joins the names into one alternation, longest first. With
// boundaries on, a name only matches where it is not glued to another word
// character: "(^|[^A-Za-z0-9_])" keeps the character before the name in group
// 1 instead of using a lookbehind, which not every JavaScript engine magpie
// runs has. The prefix is put back by transform.
function buildMatcher(list, boundaries, strict) {
  const byLower = Object.create(null)
  for (const item of list) byLower[item.match] = item.replacement
  const source = list
    .map((item) => item.match.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")
  return boundaries
    ? {
        re: new RegExp(`(^|[^A-Za-z0-9_])(${source})(?![A-Za-z0-9_])`, "gi"),
        byLower,
        grouped: true,
        strict,
      }
    : { re: new RegExp(source, "gi"), byLower, grouped: false, strict }
}

// transform rewrites or cloaks every match that isn't inside a protected
// technical reference, and hands each matched name to onMatch.
function transform(text, cfg, onMatch) {
  const { re, byLower, grouped, strict } = cfg.matcher
  const spans = protectedSpans(text, cfg)
  let out = ""
  let last = 0
  let at = 0
  let changed = false
  re.lastIndex = 0
  let m
  while ((m = re.exec(text)) !== null) {
    const prefix = grouped ? m[1] || "" : ""
    const name = grouped ? m[2] : m[0]
    const start = m.index + prefix.length
    const end = start + name.length
    if (end === start) {
      re.lastIndex++
      continue
    }
    const lower = name.toLowerCase()
    if (strict && strict[lower] !== undefined && strict[lower] !== name) continue
    while (at < spans.length && spans[at].end <= start) at++
    if (at < spans.length && spans[at].start < end) continue
    const replacement =
      cfg.mode === "cloak"
        ? cloakWord(name)
        : byLower[lower] || DEFAULT_REPLACEMENT
    if (onMatch) onMatch(name)
    // A name short enough to cloak to itself, or a mapping that maps a name to
    // itself, changes nothing: copy it through and leave changed alone.
    if (replacement === name) {
      out += text.slice(last, end)
      last = end
      continue
    }
    out += text.slice(last, start)
    out += replacement
    last = end
    changed = true
  }
  if (!changed) return text
  return out + text.slice(last)
}

// cloakWord puts a zero-width space after the first and after the second
// letter of every run of three or more letters or digits, as magpie's
// antigravity-cloak does: one after the first letter only stopped being
// enough on 11-11.
function cloakWord(text) {
  return text.replace(
    /[A-Za-z0-9]{3,}/g,
    (word) => word[0] + ZWSP + word[1] + ZWSP + word.slice(2),
  )
}

// protectedSpans lists the ranges a name must not be rewritten in: URLs,
// mcp__ identifiers, paths, .codex, and .md file names. The Go plugin
// protects the same list with regular expressions. With protectCode, code
// fences and inline code are protected too: a cloaked name inside a string
// literal is a changed literal.
const PROTECTED = [
  /https?:\/\/[^\s"'<>]+/gi,
  /\bmcp__[A-Za-z0-9][A-Za-z0-9_-]*/gi,
  /\b[A-Za-z]:[\\/][^\s"'<>]+/g,
  /(?:\\\\|\/\/)[^\s"'<>]+/g,
  /(?:^|[^A-Za-z0-9])\/(?:[^\s"'<>/]+\/)+[^\s"'<>]*/g,
  /(?:^|[^A-Za-z0-9])(?:[A-Za-z0-9._~-]+[\\/])+[A-Za-z0-9._~-]+/g,
  /(?:^|[^A-Za-z0-9])(?:~|\.{1,2})[\\/][^\s"'<>]+/g,
  /\.codex(?:[^A-Za-z0-9]|$)/gi,
  /(?:^|[^A-Za-z0-9])[A-Za-z0-9_-]+\.(?:md|markdown)/gi,
]

const CODE = [/```[\s\S]*?```/g, /`[^`\n]*`/g]

function protectedSpans(text, cfg) {
  const spans = []
  const patterns = cfg.protectCode ? PROTECTED.concat(CODE) : PROTECTED
  for (const re of patterns) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex++
        continue
      }
      spans.push({ start: m.index, end: m.index + m[0].length })
    }
  }
  return merge(spans)
}

// merge sorts the spans and unions the ones that overlap, so transform can
// walk them with one moving index instead of scanning the list per match.
function merge(spans) {
  if (spans.length < 2) return spans
  spans.sort((a, b) => a.start - b.start)
  const out = [spans[0]]
  for (let i = 1; i < spans.length; i++) {
    const span = spans[i]
    const top = out[out.length - 1]
    if (span.start <= top.end) {
      if (span.end > top.end) top.end = span.end
    } else out.push(span)
  }
  return out
}

// walk visits the system/developer prompt text of a request in whichever of
// the four APIs' shapes it came in, and writes what fn returns back into it.
function walk(body, protocol, fn) {
  if (!body || typeof body !== "object") return

  // magpie may wrap the agent's request; the Go plugin unwraps the same way.
  if (body.request && typeof body.request === "object") walk(body.request, protocol, fn)

  switch (protocol) {
    case "anthropic":
      if (body.system !== undefined) body.system = content(body.system, fn)
      roleMessages(body.messages, fn)
      break
    case "chat":
      roleMessages(body.messages, fn)
      break
    case "responses":
      if (typeof body.instructions === "string") body.instructions = fn(body.instructions)
      if (typeof body.input === "string") body.input = fn(body.input)
      roleMessages(body.input, fn)
      roleMessages(body.messages, fn)
      break
    case "gemini":
      for (const key of ["systemInstruction", "system_instruction"]) {
        if (body[key] !== undefined) body[key] = geminiSystem(body[key], fn)
      }
      roleMessages(body.contents, fn)
      break
    default:
      // An unknown protocol still gets the shapes it could have come in.
      if (body.system !== undefined) body.system = content(body.system, fn)
      if (typeof body.instructions === "string") body.instructions = fn(body.instructions)
      if (typeof body.input === "string") body.input = fn(body.input)
      roleMessages(body.messages, fn)
      roleMessages(body.input, fn)
      roleMessages(body.contents, fn)
      for (const key of ["systemInstruction", "system_instruction"]) {
        if (body[key] !== undefined) body[key] = geminiSystem(body[key], fn)
      }
  }
}

// roleMessages transforms the content of system and developer messages only.
function roleMessages(list, fn) {
  if (!Array.isArray(list)) return
  for (const message of list) {
    if (!message || typeof message !== "object") continue
    const role = typeof message.role === "string" ? message.role.toLowerCase() : ""
    if (role !== "system" && role !== "developer") continue
    if ("content" in message) message.content = content(message.content, fn)
    if ("parts" in message) geminiParts(message.parts, fn)
  }
}

// content transforms a message's content: a plain string, a single text
// object, or the text blocks of the block APIs. Tool use, tool results and
// images are passed over.
function content(value, fn) {
  if (typeof value === "string") return fn(value)
  if (Array.isArray(value)) {
    for (const part of value) {
      if (!part || typeof part !== "object") continue
      const type = typeof part.type === "string" ? part.type : ""
      if (type && type !== "text" && type !== "input_text" && type !== "output_text")
        continue
      if (typeof part.text === "string") part.text = fn(part.text)
    }
    return value
  }
  if (value && typeof value === "object" && typeof value.text === "string")
    value.text = fn(value.text)
  return value
}

// geminiSystem transforms a Gemini systemInstruction: a Content object with
// parts, or a plain string.
function geminiSystem(value, fn) {
  if (typeof value === "string") return fn(value)
  if (!value || typeof value !== "object") return value
  geminiParts(value.parts, fn)
  return value
}

// geminiParts transforms the text of a { parts: [{ text }] } list.
function geminiParts(parts, fn) {
  if (!Array.isArray(parts)) return parts
  for (const part of parts) {
    if (!part || typeof part !== "object") continue
    if (typeof part.text === "string") part.text = fn(part.text)
  }
  return parts
}
