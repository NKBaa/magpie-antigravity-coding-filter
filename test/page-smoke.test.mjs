import { test, expect } from "bun:test";
import "../page/filter.js";
import "../page/form.js";
const M = globalThis.FilterForm;

test("documented mapping shapes load into editable rows without losing names", () => {
  for (const customMappings of [
    { Cursor: "Antigravity", Windsurf: "Example" },
    "Cursor: Antigravity, Windsurf: Example",
    ["Cursor: Antigravity", { Windsurf: "Example" }],
    "Cursor: Antigravity\nWindsurf: Example",
  ]) {
    const { options, rows } = M.normalize({ customMappings });
    expect(M.build(options, options, rows).customMappings).toEqual({
      Cursor: "Antigravity",
      Windsurf: "Example",
    });
  }
});
test("null exclusions, literal null strings, commas and colons round trip", () => {
  const original = {
    Windsurf: null,
    "My: Agent": "null",
    Example: "IDE, Inc.",
  };
  const { options, rows } = M.normalize({ customMappings: original });
  expect(M.build(options, options, rows).customMappings).toEqual(original);
});
test("legacy options migrate without overriding them or dropping unrelated options", () => {
  const { options, rows } = M.normalize({
    use_default_keywords: false,
    dry_run: true,
    custom_mappings: { Cursor: "Example" },
    extra: "keep",
  });
  const result = M.build(options, options, rows);
  expect(result.useDefaultKeywords).toBe(false);
  expect(result.dryRun).toBe(true);
  expect(result.customMappings.Cursor).toBe("Example");
  expect(result.extra).toBe("keep");
  expect(result).not.toHaveProperty("custom_mappings");
});
test("invalid rows cannot be saved silently", () => {
  expect(() => M.build({}, {}, [{ name: "", replacement: "Example" }])).toThrow(
    "emptyName",
  );
  expect(() =>
    M.build({}, {}, [
      { name: "Cursor", replacement: "Example" },
      { name: "cursor", replacement: "Example" },
    ]),
  ).toThrow("duplicateName");
  expect(() => M.build({}, {}, [{ name: "Cursor", replacement: "" }])).toThrow(
    "emptyReplacement",
  );
});
test("concurrent additions and independent settings are preserved", () => {
  const base = { customMappings: { Cursor: "Antigravity" }, mode: "cloak" };
  const latest = {
    customMappings: { Cursor: "Antigravity", Remote: "Example" },
    mode: "rewrite",
    extra: "new",
  };
  const draft = {
    customMappings: { Cursor: "Antigravity", Local: "Example" },
    mode: "cloak",
    useModelKeywords: true,
  };
  const result = M.merge(base, latest, draft);
  expect(result.customMappings).toEqual({
    Cursor: "Antigravity",
    Remote: "Example",
    Local: "Example",
  });
  expect(result.mode).toBe("rewrite");
  expect(result.useModelKeywords).toBe(true);
  expect(result.extra).toBe("new");
});
test("conflicting edits reject the save, including edit/delete conflicts", () => {
  expect(() =>
    M.merge(
      { mode: "cloak" },
      { mode: "rewrite" },
      { mode: "cloak", off: true },
    ),
  ).not.toThrow();
  expect(() =>
    M.merge(
      { customMappings: { Cursor: "A" } },
      { customMappings: { Cursor: "B" } },
      { customMappings: { Cursor: "C" } },
    ),
  ).toThrow("conflict");
  expect(() =>
    M.merge(
      { customMappings: { Cursor: "A" } },
      { customMappings: { Cursor: "B" } },
      { customMappings: {} },
    ),
  ).toThrow("conflict");
});

test("built-in catalog groups reflect their switches and custom overrides", () => {
  expect(M.catalog({}).length).toBe(47);
  expect(M.catalog({}, "models").length).toBe(16);
  expect(M.catalog({}, "ambiguous").length).toBe(11);
  expect(M.catalog({}).every((rule) => rule.state === "enabled")).toBe(true);
  expect(
    M.catalog({}, "models").every((rule) => rule.state === "disabled"),
  ).toBe(true);
  expect(
    M.catalog({ useModelKeywords: true }, "models").every(
      (rule) => rule.state === "enabled",
    ),
  ).toBe(true);
  const rules = M.catalog({
    useDefaultKeywords: false,
    customMappings: { chatbox: "Example", Windsurf: null },
  });
  expect(rules.find((rule) => rule.name === "Chatbox")).toEqual({
    name: "Chatbox",
    replacement: "Example",
    state: "overridden",
  });
  expect(rules.find((rule) => rule.name === "Windsurf").state).toBe("excluded");
  expect(rules.find((rule) => rule.name === "OpenCode").state).toBe("disabled");
  expect(
    M.catalog({ custom_mappings: "Chatbox: Example" }).find(
      (rule) => rule.name === "Chatbox",
    ).state,
  ).toBe("overridden");
});

test("outgoing preview matches disabled and dry-run behavior", () => {
  const text = "You are Chatbox.";
  expect(M.preview(text, { off: true }).text).toBe(text);
  expect(M.preview(text, { off: true }).matches).toEqual([]);
  expect(M.preview(text, { dryRun: true }).text).toBe(text);
  expect(M.preview(text, { dryRun: true }).matches).toEqual([
    { name: "Chatbox", count: 1 },
  ]);
  expect(M.preview(text, { mode: "rewrite" }).text).toBe(
    "You are Antigravity.",
  );
});
