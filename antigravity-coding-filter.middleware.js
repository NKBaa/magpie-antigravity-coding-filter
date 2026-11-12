// Antigravity coding filter — magpie gateway middleware.
//
// Port of jellyfish-p/cpa-plugin-antigravity-coding-filter (CLIProxyAPI v7
// plugin, MIT) to magpie's gateway middleware API. It does what that plugin
// does: on the request a try sends to an Antigravity account, it looks at the
// system/developer prompt only, and either rewrites the names of other coding
// agents to "Antigravity", breaks them with zero-width spaces, or turns the
// request away.
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

export const defaultMappings = [
  // Major AI code editors, assistants, and terminal coding agents.
  ["Claude Agent", "Antigravity"],
  ["Claude Code", "Antigravity"],
  ["OpenAI Codex", "Antigravity"],
  ["Codex CLI", "Antigravity"],
  ["Codex", "Antigravity"],
  ["OpenCode", "Antigravity"],
  ["GitHub Copilot CLI", "Antigravity"],
  ["GitHub Copilot", "Antigravity"],
  ["Gemini Code Assist", "Antigravity"],
  ["Gemini CLI", "Antigravity"],
  ["Cursor", "Antigravity"],
  ["Windsurf", "Antigravity"],
  ["Codeium", "Antigravity"],
  ["Cline", "Antigravity"],
  ["Roo Code", "Antigravity"],
  ["Kilo Code", "Antigravity"],
  ["Aider", "Antigravity"],
  ["Continue.dev", "Antigravity"],
  ["Amazon Q Developer", "Antigravity"],
  ["Amazon CodeWhisperer", "Antigravity"],
  ["JetBrains AI Assistant", "Antigravity"],
  ["JetBrains Junie", "Antigravity"],
  ["Kiro", "Antigravity"],
  ["Qoder CLI", "Antigravity"],
  ["Qoder", "Antigravity"],
  ["Qwen Code", "Antigravity"],
  ["Trae", "Antigravity"],
  ["Tabnine", "Antigravity"],
  ["Sourcegraph Cody", "Antigravity"],
  ["Augment Code", "Antigravity"],
  ["Replit Agent", "Antigravity"],
  ["Replit Ghostwriter", "Antigravity"],
  ["Devin", "Antigravity"],
  ["OpenHands", "Antigravity"],
  ["SWE-agent", "Antigravity"],
  ["Goose", "Antigravity"],
  ["Zed AI", "Antigravity"],
  ["Void Editor", "Antigravity"],
  ["PearAI", "Antigravity"],
  ["Refact.ai", "Antigravity"],
  ["Tabby", "Antigravity"],
  ["GitLab Duo", "Antigravity"],
  ["Visual Studio IntelliCode", "Antigravity"],
  ["CodeBuddy", "Antigravity"],
  ["Blackbox AI", "Antigravity"],
  ["Pieces for Developers", "Antigravity"],
  ["Qodo", "Antigravity"],
  ["CodiumAI", "Antigravity"],
  ["Rovo Dev CLI", "Antigravity"],
  ["Factory Droid", "Antigravity"],

  // General-purpose local agents that can generate and modify code.
  ["OpenClaw", "Antigravity"],
  ["Clawdbot", "Antigravity"],
  ["Moltbot", "Antigravity"],
  ["Hermes Agent", "Antigravity"],
  ["Hermes", "Antigravity"],
  ["WorkBuddy", "Antigravity"],
]

const ZWSP = "\u200b"
const DEFAULT_REPLACEMENT = "Antigravity"

export function onProvider(body, ctx) {
  const o = ctx.options
  if (!o || typeof o !== "object" || o.off) return
  const accounts =
    Array.isArray(o.accounts) && o.accounts.length ? o.accounts : ["antigravity"]
  if (!accounts.includes(ctx.provider && ctx.provider.account)) return

  const cfg = config(o)
  if (!cfg.matcher) return

  let changed = false
  const fn = (text) => {
    const next = transform(text, cfg)
    if (next !== text) changed = true
    return next
  }
  walk(body, ctx.protocol, fn)
  return changed ? body : undefined
}

// config turns the options into the matcher a request's hooks use. A runtime
// is kept for a request, so this is built once a request and cached by the
// options it was built from.
let cached = null
function config(o) {
  const mode = normMode(o.mode)
  const useDefault =
    o.useDefaultKeywords !== undefined
      ? o.useDefaultKeywords
      : o.use_default_keywords !== undefined
        ? o.use_default_keywords
        : true
  const custom =
    o.customMappings !== undefined ? o.customMappings : o.custom_mappings
  const key = JSON.stringify([mode, useDefault, custom])
  if (cached && cached.key === key) return cached.cfg

  const pairs = []
  if (useDefault !== false) for (const p of defaultMappings) pairs.push(p)
  for (const p of parseCustom(custom)) pairs.push(p)

  // Later entries win, matched ignoring case; a blank replacement is skipped.
  const seen = Object.create(null)
  for (const [match, replacement] of pairs) {
    const name = String(match == null ? "" : match).trim()
    if (!name) continue
    const value = String(replacement == null ? "" : replacement).trim()
    if (!value) continue
    seen[name.toLowerCase()] = value
  }
  const list = Object.keys(seen)
    .map((match) => ({ match, replacement: seen[match] }))
    .sort((a, b) => b.match.length - a.match.length || (a.match < b.match ? -1 : 1))

  const cfg = { mode, matcher: list.length ? buildMatcher(list) : null }
  cached = { key, cfg }
  return cfg
}

function normMode(value) {
  const mode = typeof value === "string" ? value.trim().toLowerCase() : ""
  return mode === "rewrite" ? "rewrite" : "cloak"
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

function parseMappingString(value) {
  const out = []
  for (const entry of value.split(/[,\r\n]/)) {
    const text = entry.trim()
    if (!text) continue
    const at = text.indexOf(":")
    if (at < 0) out.push([text, ""])
    else out.push([text.slice(0, at), text.slice(at + 1)])
  }
  return out
}

function buildMatcher(list) {
  const byLower = Object.create(null)
  for (const item of list) byLower[item.match] = item.replacement
  const source = list
    .map((item) => item.match.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")
  return { re: new RegExp(source, "gi"), byLower }
}

// transform rewrites, cloaks or (for block mode's scan) reports every match
// that isn't inside a protected technical reference.
function transform(text, cfg) {
  const { re, byLower } = cfg.matcher
  const spans = protectedSpans(text)
  let out = ""
  let last = 0
  let changed = false
  re.lastIndex = 0
  let m
  while ((m = re.exec(text)) !== null) {
    const start = m.index
    const end = start + m[0].length
    if (end === start) {
      re.lastIndex++
      continue
    }
    if (overlaps(start, end, spans)) continue
    out += text.slice(last, start)
    out +=
      cfg.mode === "cloak"
        ? cloakWord(m[0])
        : byLower[m[0].toLowerCase()] || DEFAULT_REPLACEMENT
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
// protects the same list with regular expressions.
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

function protectedSpans(text) {
  const spans = []
  for (const re of PROTECTED) {
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
  spans.sort((a, b) => a.start - b.start)
  return spans
}

function overlaps(start, end, spans) {
  for (const span of spans) {
    if (span.start >= end) return false
    if (span.end > start) return true
  }
  return false
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
      roleMessages(body.input, fn)
      roleMessages(body.messages, fn)
      break
    case "gemini":
      for (const key of ["systemInstruction", "system_instruction"]) {
        if (body[key] !== undefined) body[key] = geminiSystem(body[key], fn)
      }
      break
    default:
      // An unknown protocol still gets the shapes it could have come in.
      if (body.system !== undefined) body.system = content(body.system, fn)
      if (typeof body.instructions === "string") body.instructions = fn(body.instructions)
      roleMessages(body.messages, fn)
      roleMessages(body.input, fn)
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
    message.content = content(message.content, fn)
  }
}

// content transforms a message's content: a plain string, or the text blocks
// of the block APIs. Tool use, tool results and images are passed over.
function content(value, fn) {
  if (typeof value === "string") return fn(value)
  if (!Array.isArray(value)) return value
  for (const part of value) {
    if (!part || typeof part !== "object") continue
    const type = typeof part.type === "string" ? part.type : ""
    if (type !== "text" && type !== "input_text" && type !== "output_text") continue
    if (typeof part.text === "string") part.text = fn(part.text)
  }
  return value
}

// geminiSystem transforms a Gemini systemInstruction: a Content object with
// parts, or a plain string.
function geminiSystem(value, fn) {
  if (typeof value === "string") return fn(value)
  if (!value || typeof value !== "object" || !Array.isArray(value.parts)) return value
  for (const part of value.parts) {
    if (!part || typeof part !== "object") continue
    if (typeof part.text === "string") part.text = fn(part.text)
  }
  return value
}
