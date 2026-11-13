// The page carries its own copy of the matcher (page/filter.js), because a page
// in magpie's window runs in a sandboxed frame and cannot import the
// middleware. This test is what keeps the two honest: the preset lists must be
// identical, and the preview must produce exactly the body the middleware
// would send, for every system prompt in cases.json and a spread of options.
import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import * as m from "../antigravity-coding-filter.middleware.js"
import "../page/filter.js"

const F = globalThis.AntigravityFilter
const KEY = "antigravity-coding-filter"
const cases = JSON.parse(readFileSync(join(import.meta.dir, "..", "cases.json"), "utf8"))

function send(system, options) {
  const body = { model: "m", system, messages: [] }
  const state = {}
  m.onProvider(body, {
    protocol: "anthropic",
    options: { ...options, report: true },
    provider: { account: "antigravity" },
    state,
  })
  return { system: body.system, matches: state[KEY] ? state[KEY].matches : [] }
}

const texts = []
for (const c of cases) {
  if (typeof c.request?.system === "string") texts.push(c.request.system)
  if (typeof c.request?.instructions === "string") texts.push(c.request.instructions)
}
texts.push(
  "You are Chatbox, an AI assistant. Windsurf wrote this; open C:\\work\\Cursor\\src\\main.ts, read cursor.md, see https://cursor.com/docs.",
  "You are Kelivo, a chat client.",
  "```\nconst who = \"Cursor\"\n```\nYou are Cursor.",
  "Move the cursor; goose bumps; the tabby cat; Traefik; we decline.",
  "You are Claude Sonnet 4.5, based on GPT-5.",
)

const matrix = [
  {},
  { mode: "rewrite" },
  { boundaries: false },
  { protectCode: false },
  { useAmbiguousKeywords: true },
  { useAmbiguousKeywords: true, strictCase: true },
  { useModelKeywords: true },
  { useDefaultKeywords: false, customMappings: { Foo: "Bar", Cursor: "Zed" } },
  { mode: "rewrite", customMappings: "Cursor: Zed, Windsurf: Zed" },
  { customMappings: { Windsurf: null, Chatbox: "Antigravity" } },
]

test("the page and the middleware carry the same preset", () => {
  expect(F.defaultMappings).toEqual(m.defaultMappings)
  expect(F.modelMappings).toEqual(m.modelMappings)
  expect(F.ambiguousNames).toEqual(m.ambiguousNames)
  expect(F.ambiguousMappings).toEqual(m.ambiguousMappings)
  expect(F.ZWSP).toBe("\u200b")
})

test("the preview sends what the middleware sends, and matches the same names", () => {
  let compared = 0
  for (const options of matrix) {
    for (const text of texts) {
      const got = send(text, options)
      const want = F.preview(text, options)
      expect({ options, text, out: want.text }).toEqual({ options, text, out: got.system })
      expect({ options, text, matches: want.matches }).toEqual({
        options,
        text,
        matches: got.matches,
      })
      compared++
    }
  }
  expect(compared).toBe(matrix.length * texts.length)
})
