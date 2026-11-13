import { expect, test } from "bun:test";
import "../page/filter.js";
import "../page/form.js";

const M = globalThis.FilterForm;
const engine = globalThis.AntigravityFilter;
const persist = (rows) => M.build({}, M.defaults, rows).customMappings;
const listFromRows = (rows, options = {}) =>
  M.ruleList({ ...options, customMappings: persist(rows) });
const rowNamed = (rows, name) =>
  rows.find((row) => row.name.toLowerCase() === name.toLowerCase());

test("unified rules contain each real preset name once with its group and default", () => {
  const rules = M.ruleList({});
  expect(rules).toHaveLength(75);
  expect(new Set(rules.map((rule) => rule.name.toLowerCase())).size).toBe(75);
  for (const [group, mappings] of [
    ["common", engine.defaultMappings],
    ["models", engine.modelMappings],
    ["ambiguous", engine.ambiguousMappings],
  ]) {
    expect(rules.filter((rule) => rule.group === group)).toHaveLength(
      mappings.length,
    );
    for (const [name, replacement] of mappings) {
      expect(rowNamed(rules, name)).toEqual({
        name,
        replacement,
        state: group === "common" ? "enabled" : "disabled",
        group,
        builtin: true,
        defaultReplacement: replacement,
      });
    }
  }
});

test("custom overrides are deduplicated against built-ins and keep their spelling", () => {
  const rules = M.ruleList({
    customMappings: [
      { Chatbox: "First", cUrSoR: "Example" },
      "CHATBOX: Final, New Agent: Example",
    ],
  });
  expect(rules).toHaveLength(76);
  expect(
    rules.filter((rule) => rule.name.toLowerCase() === "chatbox"),
  ).toHaveLength(1);
  expect(rowNamed(rules, "Chatbox")).toEqual({
    name: "CHATBOX",
    replacement: "Final",
    state: "overridden",
    group: "common",
    builtin: true,
    defaultReplacement: "Antigravity",
  });
  expect(rowNamed(rules, "Cursor").name).toBe("cUrSoR");
  expect(rowNamed(rules, "New Agent")).toEqual({
    name: "New Agent",
    replacement: "Example",
    state: "enabled",
    group: "custom",
    builtin: false,
    defaultReplacement: null,
  });
});

test("group switches and exclusions determine configured state", () => {
  const rules = M.ruleList({
    use_default_keywords: false,
    use_model_keywords: true,
    use_ambiguous_keywords: true,
    custom_mappings: {
      WINDSURF: null,
      "Custom Exclusion": null,
      Chatbox: "Example",
    },
  });
  expect(rowNamed(rules, "OpenCode").state).toBe("disabled");
  expect(rowNamed(rules, "GPT-5").state).toBe("enabled");
  expect(rowNamed(rules, "Cursor").state).toBe("enabled");
  expect(rowNamed(rules, "Windsurf")).toEqual({
    name: "WINDSURF",
    replacement: null,
    state: "excluded",
    group: "common",
    builtin: true,
    defaultReplacement: "Antigravity",
  });
  expect(rowNamed(rules, "Chatbox").state).toBe("overridden");
  expect(rowNamed(rules, "Custom Exclusion")).toEqual({
    name: "Custom Exclusion",
    replacement: null,
    state: "excluded",
    group: "custom",
    builtin: false,
    defaultReplacement: null,
  });
});

test("add trims names and values and does not mutate normalize rows", () => {
  const original = M.normalize({ customMappings: { Existing: "Keep" } }).rows;
  Object.freeze(original[0]);
  Object.freeze(original);
  const result = M.editRule(original, null, {
    name: "  New Agent  ",
    replacement: "  My IDE, Inc.  ",
    exclude: false,
  });
  expect(persist(result)).toEqual({
    Existing: "Keep",
    "New Agent": "My IDE, Inc.",
  });
  expect(original).toEqual([
    { name: "Existing", replacement: "Keep", exclude: false },
  ]);
  expect(result[0]).not.toBe(original[0]);
});

test("editing a built-in creates one override without copying the preset into custom rows", () => {
  const rows = M.editRule([], "Chatbox", {
    name: "CHATBOX",
    replacement: "Example",
    exclude: false,
  });
  expect(rows).toEqual([
    { name: "CHATBOX", replacement: "Example", exclude: false },
  ]);
  expect(listFromRows(rows)).toHaveLength(75);
  expect(rowNamed(listFromRows(rows), "Chatbox").state).toBe("overridden");
});

test("case-only edits preserve override spelling used by strictCase", () => {
  const rows = M.editRule([], "Cursor", {
    name: "cursor",
    replacement: "Example",
    exclude: false,
  });
  expect(rowNamed(listFromRows(rows), "Cursor").name).toBe("cursor");
  expect(
    engine.preview("Cursor cursor", {
      mode: "rewrite",
      strictCase: true,
      customMappings: persist(rows),
    }).text,
  ).toBe("Cursor Example");
});

test("renaming a pristine built-in excludes the old name and adds the new name", () => {
  const rows = M.editRule([], "Windsurf", {
    name: "My IDE",
    replacement: "Example",
    exclude: false,
  });
  expect(persist(rows)).toEqual({ Windsurf: null, "My IDE": "Example" });
  expect(rowNamed(listFromRows(rows), "Windsurf").state).toBe("excluded");
  expect(rowNamed(listFromRows(rows), "My IDE").state).toBe("enabled");
  expect(
    engine.preview("Windsurf and My IDE", {
      mode: "rewrite",
      customMappings: persist(rows),
    }).text,
  ).toBe("Windsurf and Example");
});

test("renaming an overridden built-in replaces its mapping with an exclusion", () => {
  const original = M.normalize({
    customMappings: { wInDsUrF: "Old", Other: "Keep" },
  }).rows;
  const before = structuredClone(original);
  const rows = M.editRule(original, "WINDSURF", {
    name: "My IDE",
    replacement: "New",
    exclude: false,
  });
  expect(persist(rows)).toEqual({
    wInDsUrF: null,
    "My IDE": "New",
    Other: "Keep",
  });
  expect(original).toEqual(before);
  expect(
    rows.filter((row) => row.name.toLowerCase() === "windsurf"),
  ).toHaveLength(1);
});

test("renaming a custom-only rule removes the old custom mapping", () => {
  const original = M.normalize({
    customMappings: { "Old Agent": "Old", Other: "Keep" },
  }).rows;
  const rows = M.editRule(original, "old agent", {
    name: "New Agent",
    replacement: "New",
    exclude: false,
  });
  expect(persist(rows)).toEqual({ "New Agent": "New", Other: "Keep" });
  expect(rowNamed(listFromRows(rows), "Old Agent")).toBeUndefined();
  expect(original[0].name).toBe("Old Agent");
});

test("edit replaces an excluded rule and can exclude with no replacement value", () => {
  const excluded = M.editRule([], "Chatbox", {
    name: "Chatbox",
    exclude: true,
  });
  expect(excluded[0].replacement).toBe("Antigravity");
  expect(persist(excluded)).toEqual({ Chatbox: null });
  const restored = M.editRule(excluded, "chatbox", {
    name: "Chatbox",
    replacement: "Example",
    exclude: false,
  });
  expect(persist(restored)).toEqual({ Chatbox: "Example" });
  expect(excluded[0].exclude).toBe(true);
});

test("duplicate checks cover built-ins and custom names ignoring case", () => {
  const rows = M.normalize({ customMappings: { "My Agent": "Example" } }).rows;
  expect(() =>
    M.editRule(rows, null, { name: "my agent", replacement: "Other" }),
  ).toThrow("duplicateName");
  expect(() =>
    M.editRule(rows, null, { name: "chatbox", replacement: "Other" }),
  ).toThrow("duplicateName");
  expect(() =>
    M.editRule(rows, "My Agent", { name: "WINDSURF", replacement: "Other" }),
  ).toThrow("duplicateName");
  expect(() =>
    M.editRule(rows, "Windsurf", { name: "my AGENT", replacement: "Other" }),
  ).toThrow("duplicateName");
  expect(() =>
    M.editRule(rows, "Chatbox", { name: "Windsurf", replacement: "Other" }),
  ).toThrow("duplicateName");
  expect(
    persist(
      M.editRule(rows, "my agent", { name: "MY AGENT", replacement: "Other" }),
    ),
  ).toEqual({ "MY AGENT": "Other" });
});

test("validation rejects blank names, blank values and missing originals", () => {
  expect(() =>
    M.editRule([], null, { name: "  ", replacement: "Example" }),
  ).toThrow("emptyName");
  expect(() =>
    M.editRule([], null, { name: "New Agent", replacement: "  " }),
  ).toThrow("emptyReplacement");
  expect(() =>
    M.editRule([], "Missing Agent", {
      name: "New Agent",
      replacement: "Example",
    }),
  ).toThrow("missingRule");
});

test("restore removes the override and restores the built-in's group behavior", () => {
  const original = M.normalize({
    customMappings: { CHATBOX: null, cUrSoR: "Example", Other: "Keep" },
  }).rows;
  const restored = M.restoreRule(original, "chatbox");
  expect(persist(restored)).toEqual({ cUrSoR: "Example", Other: "Keep" });
  expect(rowNamed(listFromRows(restored), "Chatbox").state).toBe("enabled");
  expect(rowNamed(listFromRows(restored), "Chatbox").name).toBe("Chatbox");
  const withoutCursor = M.restoreRule(restored, "CURSOR");
  expect(rowNamed(listFromRows(withoutCursor), "Cursor").state).toBe(
    "disabled",
  );
  expect(original[0].exclude).toBe(true);
  expect(restored.find((row) => row.name === "Other")).not.toBe(original[2]);
});

test("restore deletes custom-only rules or exclusions and leaves unrelated rows intact", () => {
  const original = M.normalize({
    customMappings: {
      "My Agent": "Example",
      "Excluded Agent": null,
      Other: "Keep",
    },
  }).rows;
  const deleted = M.restoreRule(original, "  MY AGENT  ");
  expect(rowNamed(listFromRows(deleted), "My Agent")).toBeUndefined();
  expect(persist(M.restoreRule(deleted, "excluded agent"))).toEqual({
    Other: "Keep",
  });
  expect(M.restoreRule(original, "Missing")).toEqual(original);
  expect(M.restoreRule(original, "Missing")).not.toBe(original);
  expect(original).toHaveLength(3);
});
