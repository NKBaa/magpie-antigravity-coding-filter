// The matcher, for the page.
//
// This is a copy of antigravity-coding-filter.middleware.js: a page runs in a
// sandboxed frame and cannot import the middleware, so the two carry the same
// rules twice. page.test.mjs compares them — the preset lists and the output
// for every case in cases.json — so a change made in one and not the other
// fails the test rather than shipping a preview that lies.
//
// No inline scripts are allowed in a page, so this is a classic script that
// leaves one global behind: AntigravityFilter.
;(() => {
  "use strict"

  const ZWSP = "\u200b"
  const DEFAULT_REPLACEMENT = "Antigravity"

  const defaultMappings = [
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
    ["OpenClaw", "Antigravity"],
    ["Clawdbot", "Antigravity"],
    ["Moltbot", "Antigravity"],
    ["Hermes Agent", "Antigravity"],
    ["WorkBuddy", "Antigravity"],
    ["Chatbox AI", "Antigravity"],
    ["Chatbox", "Antigravity"],
    ["Kelivo", "Antigravity"],
  ]

  const modelMappings = [
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

  const ambiguousNames = [
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

  const ambiguousMappings = ambiguousNames.map((name) => [name, "Antigravity"])

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

  function normMode(value) {
    const mode = typeof value === "string" ? value.trim().toLowerCase() : ""
    return mode === "rewrite" ? "rewrite" : "cloak"
  }

  function flag(o, camel, snake, fallback) {
    if (o[camel] !== undefined) return o[camel]
    if (o[snake] !== undefined) return o[snake]
    return fallback
  }

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

  // buildConfig turns options into the matcher the preview uses. It is the
  // middleware's config() without the per-request cache and without dryRun,
  // which the page never needs.
  function buildConfig(o) {
    o = o && typeof o === "object" ? o : {}
    const mode = normMode(o.mode)
    const useDefault = flag(o, "useDefaultKeywords", "use_default_keywords", true)
    const useModels = flag(o, "useModelKeywords", "use_model_keywords", false)
    const useAmbiguous = flag(o, "useAmbiguousKeywords", "use_ambiguous_keywords", false)
    const boundaries = o.boundaries !== undefined ? o.boundaries : true
    const protectCode = flag(o, "protectCode", "protect_code", true)
    const strictCase = o.strictCase !== undefined ? o.strictCase : false
    const custom = o.customMappings !== undefined ? o.customMappings : o.custom_mappings

    const pairs = []
    if (useDefault !== false) for (const p of defaultMappings) pairs.push(p)
    if (useModels === true) for (const p of modelMappings) pairs.push(p)
    if (useAmbiguous === true) for (const p of ambiguousMappings) pairs.push(p)
    for (const p of parseCustom(custom)) pairs.push(p)

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

    let strict = null
    if (strictCase !== false) {
      for (const name of ambiguousNames) {
        const lower = name.toLowerCase()
        if (!seen[lower]) continue
        strict = strict || Object.create(null)
        strict[lower] = spelling[lower] || name
      }
    }

    return {
      mode,
      protectCode: protectCode !== false,
      names: list.map((item) => item.match),
      matcher: list.length ? buildMatcher(list, boundaries !== false, strict) : null,
    }
  }

  function transform(text, cfg, onMatch) {
    if (!cfg.matcher) return text
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
        cfg.mode === "cloak" ? cloakWord(name) : byLower[lower] || DEFAULT_REPLACEMENT
      if (onMatch) onMatch(name)
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

  function cloakWord(text) {
    return text.replace(
      /[A-Za-z0-9]{3,}/g,
      (word) => word[0] + ZWSP + word[1] + ZWSP + word.slice(2),
    )
  }

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

  // preview returns what the middleware would send, and what it matched.
  function preview(text, options) {
    const cfg = buildConfig(options)
    const counts = new Map()
    const out = transform(String(text == null ? "" : text), cfg, (name) => {
      counts.set(name, (counts.get(name) || 0) + 1)
    })
    const matches = []
    for (const [name, count] of counts) matches.push({ name, count })
    return { text: out, changed: out !== text, matches, names: cfg.names }
  }

  globalThis.AntigravityFilter = {
    ZWSP,
    defaultMappings,
    modelMappings,
    ambiguousNames,
    ambiguousMappings,
    buildConfig,
    preview,
    transform,
    cloakWord,
  }
})()
