// app.js has never been run in a browser here, so this test runs it against a
// small stand-in for the DOM and checks what it put on the page: the options as
// JSON, the preview painted with the zero-width spaces marked, and the state
// line saying it is read-only outside magpie. It catches the class of mistake a
// static check cannot: a null element, a broken render path.
import { expect, test } from "bun:test"

function element(id) {
  return {
    id,
    value: "",
    checked: false,
    textContent: "",
    innerHTML: "",
    hidden: false,
    disabled: false,
    className: "",
    type: "",
    dataset: {},
    lang: "",
    setAttribute() {},
    removeAttribute() {},
    addEventListener() {},
    append() {},
    replaceChildren() {},
    focus() {},
    remove() {},
    closest() {
      return null
    },
  }
}

const ids = [
  "state",
  "save",
  "custom",
  "custom-error",
  "accounts",
  "json",
  "mode-hint",
  "out",
  "matches",
  "none",
  "show-zw",
  "sample",
  "example",
  "clear",
  "reset",
  "copy-json",
  "copy-cmd",
  "useDefaultKeywords",
  "useModelKeywords",
  "useAmbiguousKeywords",
  "boundaries",
  "protectCode",
  "strictCase",
  "dryRun",
  "report",
  "off",
]
const nodes = Object.fromEntries(ids.map((id) => [id, element(id)]))
nodes["show-zw"].checked = true
const radios = [element("mode-cloak"), element("mode-rewrite")]
radios[0].value = "cloak"
radios[0].checked = true
radios[1].value = "rewrite"

globalThis.document = {
  documentElement: element("html"),
  title: "",
  body: { append() {} },
  getElementById: (id) => nodes[id] ?? null,
  querySelectorAll: (selector) => (selector.includes('name="mode"') ? radios : []),
  querySelector: (selector) => (selector.includes(":checked") ? radios.find((r) => r.checked) : null),
  createElement: (tag) => element(tag),
  addEventListener() {},
}
globalThis.navigator = { language: "en", clipboard: { writeText: async () => {} } }
globalThis.localStorage = {
  store: new Map(),
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null
  },
  setItem(key, value) {
    this.store.set(key, value)
  },
}

await import("../page/filter.js")
await import("../page/app.js")
await new Promise((resolve) => setTimeout(resolve, 50))

test("the page renders its options and its preview without a browser", () => {
  const options = JSON.parse(nodes.json.textContent)
  expect(options.mode).toBe("cloak")
  expect(options.useDefaultKeywords).toBe(true)
  expect(options.boundaries).toBe(true)
  expect(options.accounts).toEqual(["antigravity"])

  expect(nodes.out.innerHTML).toContain('class="zw"')
  expect(nodes.out.innerHTML).not.toContain("Windsurf")
  expect(nodes.out.innerHTML).not.toContain("Chatbox")
  expect(nodes["none"].hidden).toBe(true)

  expect(nodes.state.dataset.kind).toBe("readonly")
  expect(nodes.state.textContent).toContain("magpie")
  expect(nodes["custom"].value).toBe("")
  expect(nodes.accounts.value).toBe("antigravity")
})
