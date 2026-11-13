// The behaviour cases.json cannot express: what lands on ctx.state, what
// dryRun leaves alone, that a second pass is a no-op, the preset's two halves,
// and that the hook stays inside magpie's 250 ms budget on a prompt with many
// protected spans.
import { expect, test } from "bun:test"
import * as m from "../antigravity-coding-filter.middleware.js"

const KEY = "antigravity-coding-filter"

function run(system, options = {}, extra = {}) {
  const ctx = {
    protocol: "anthropic",
    options,
    provider: { account: "antigravity" },
    state: {},
    ...extra,
  }
  const body = { model: "m", system, messages: [] }
  const out = m.onProvider(body, ctx)
  return { body, out, state: ctx.state }
}

test("report leaves the matches on ctx.state", () => {
  const { state } = run("You are Windsurf. Windsurf writes code.", {
    mode: "rewrite",
    report: true,
  })
  const found = state[KEY]
  expect(found.mode).toBe("rewrite")
  expect(found.changed).toBe(true)
  expect(found.account).toBe("antigravity")
  expect(found.matches).toEqual([{ name: "Windsurf", count: 2 }])
})

test("report stays out of the way unless it is asked for", () => {
  const { state } = run("You are Windsurf.", { mode: "rewrite" })
  expect(state[KEY]).toBeUndefined()
})

test("dryRun changes nothing and says so", () => {
  const { body, out, state } = run("You are Windsurf.", {
    mode: "rewrite",
    dryRun: true,
    report: true,
  })
  expect(body.system).toBe("You are Windsurf.")
  expect(out).toBeUndefined()
  expect(state[KEY].changed).toBe(false)
  expect(state[KEY].dryRun).toBe(true)
  expect(state[KEY].matches).toEqual([{ name: "Windsurf", count: 1 }])
})

test("nothing matched: the hook returns nothing at all", () => {
  const { out } = run("You write TypeScript.", { mode: "rewrite" })
  expect(out).toBeUndefined()
})

test("a second pass over cloaked text is a no-op", () => {
  const first = run("You are Windsurf.", {})
  expect(first.body.system).not.toBe("You are Windsurf.")
  const second = m.onProvider(
    { model: "m", system: first.body.system, messages: [] },
    { protocol: "anthropic", options: {}, provider: { account: "antigravity" } },
  )
  expect(second).toBeUndefined()
})

test("a second pass over rewritten text is a no-op", () => {
  const first = run("You are Windsurf.", { mode: "rewrite" })
  expect(first.body.system).toBe("You are Antigravity.")
  const second = m.onProvider(
    { model: "m", system: first.body.system, messages: [] },
    { protocol: "anthropic", options: { mode: "rewrite" }, provider: { account: "antigravity" } },
  )
  expect(second).toBeUndefined()
})

test("a mapping to the same name changes nothing, and says so", () => {
  const { out, state } = run("You are Windsurf.", {
    mode: "rewrite",
    customMappings: { Windsurf: "Windsurf" },
    report: true,
  })
  expect(out).toBeUndefined()
  expect(state[KEY].changed).toBe(false)
  expect(state[KEY].matches).toEqual([{ name: "Windsurf", count: 1 }])
})

test("two option sets alternating both keep working", () => {
  const rewrite = () => run("You are Windsurf.", { mode: "rewrite" }).body.system
  const cloak = () => run("You are Windsurf.", { mode: "cloak" }).body.system
  expect(rewrite()).toBe("You are Antigravity.")
  expect(cloak()).not.toBe("You are Windsurf.")
  expect(rewrite()).toBe("You are Antigravity.")
  expect(cloak()).not.toBe("You are Windsurf.")
})

test("the eleven ambiguous names are out of the preset and come back with one flag", () => {
  expect(m.ambiguousNames).toHaveLength(11)
  for (const name of m.ambiguousNames) {
    expect(m.defaultMappings.some(([match]) => match === name)).toBe(false)
  }
  expect(run("You are Cursor.", { mode: "rewrite" }).body.system).toBe("You are Cursor.")
  expect(
    run("You are Cursor.", { mode: "rewrite", useAmbiguousKeywords: true }).body.system,
  ).toBe("You are Antigravity.")
  expect(
    run("Move the cursor to the end.", { useAmbiguousKeywords: true }).body.system,
  ).not.toBe("Move the cursor to the end.")
})

test("Chatbox is in the preset, its longer spelling first", () => {
  expect(run("You are Chatbox, an AI assistant.", { mode: "rewrite" }).body.system).toBe(
    "You are Antigravity, an AI assistant.",
  )
  expect(run("Chatbox AI here.", { mode: "rewrite" }).body.system).toBe("Antigravity here.")
})

test("Kelivo is in the preset", () => {
  expect(run("You are Kelivo, an AI assistant.", { mode: "rewrite" }).body.system).toBe(
    "You are Antigravity, an AI assistant.",
  )
})

test("a prompt with thousands of protected spans stays inside the budget", () => {
  const parts = []
  for (let i = 0; i < 5000; i++) parts.push(`https://cursor.com/doc/${i}/Cursor/page `)
  for (let i = 0; i < 5000; i++) parts.push("You are Windsurf. ")
  const text = parts.join("")
  expect(text.length).toBeGreaterThan(200_000)
  const started = performance.now()
  run(text, { mode: "rewrite" })
  const took = performance.now() - started
  expect(took).toBeLessThan(100)
})
