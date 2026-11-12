// What a browser would catch and a bun test can too: a page in magpie's window
// may not run inline scripts or reach the network, every file it names must be
// there, and every id app.js looks up must exist in the HTML.
import { expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "..")
const pageDir = join(root, "page")
const html = readFileSync(join(pageDir, "index.html"), "utf8")
const app = readFileSync(join(pageDir, "app.js"), "utf8")
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))

test("the page runs no inline script and no inline handler", () => {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  expect(scripts.length).toBeGreaterThan(0)
  for (const [, attrs, body] of scripts) {
    expect(attrs).toMatch(/\bsrc=/)
    expect(body.trim()).toBe("")
  }
  expect(html).not.toMatch(/\son[a-z]+\s*=/i)
})

test("every file the page names is there, and the bridge comes first", () => {
  const refs = [
    ...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/gi),
    ...html.matchAll(/<link\b[^>]*\bhref="([^"]+)"/gi),
  ].map((match) => match[1])
  // _magpie/bridge.js is magpie's own, put in front of the page's files at run
  // time; every other name is the page's own file and has to be there.
  for (const ref of refs.filter((ref) => !ref.startsWith("_magpie/"))) {
    expect({ ref, exists: existsSync(join(pageDir, ref)) }).toEqual({ ref, exists: true })
  }

  const bridge = refs.indexOf("_magpie/bridge.js")
  const filter = refs.indexOf("filter.js")
  const appRef = refs.indexOf("app.js")
  expect(bridge).toBe(0)
  expect(filter).toBeGreaterThan(bridge)
  expect(appRef).toBeGreaterThan(filter)
})

test("every id app.js looks up exists in the page", () => {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]))
  const looked = new Set([...app.matchAll(/\$\("([^"]+)"\)/g)].map((match) => match[1]))
  const toggles = app.match(/const TOGGLES = \[([\s\S]*?)\]/)
  for (const name of toggles ? [...toggles[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : []) {
    looked.add(name)
  }
  const missing = [...looked].filter((id) => !ids.has(id))
  expect(missing).toEqual([])
})

test("the manifest points at files that exist and declares only known options", () => {
  expect(existsSync(join(root, pkg.magpie.page.file))).toBe(true)
  expect(existsSync(join(root, pkg.magpie.page.icon))).toBe(true)
  expect(Array.isArray(pkg.magpie.permissions)).toBe(true)
  expect(pkg.magpie.permissions).toEqual([])
  const known = new Set([
    "mode",
    "useDefaultKeywords",
    "useModelKeywords",
    "useAmbiguousKeywords",
    "customMappings",
    "accounts",
    "boundaries",
    "protectCode",
    "strictCase",
    "dryRun",
    "report",
    "off",
  ])
  expect(Object.keys(pkg.magpie.options).filter((key) => !known.has(key))).toEqual([])
})
