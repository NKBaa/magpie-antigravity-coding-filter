import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
const root = join(import.meta.dir, "..");
const provenance = JSON.parse(
  readFileSync(join(root, "page/vendor/source.json"), "utf8"),
);
const source = readFileSync(
  join(root, "page/vendor/magpie-ui.js"),
  "utf8",
).replace(/\r\n/g, "\n");

test("official Magpie component methods remain unchanged from the pinned copy", () => {
  expect(provenance.repository).toBe("https://github.com/yetone/magpie");
  expect(provenance.revision).toBe("f38ef9821b17cd08af1bca60081d03b00d6970dc");
  for (const name of ["button", "toggle", "row"]) {
    const match = source.match(
      new RegExp("^    " + name + "\\([^\\n]*\\) \\{[\\s\\S]*?^    \\},", "m"),
    );
    expect(match).not.toBeNull();
    expect(createHash("sha256").update(match[0]).digest("hex")).toBe(
      provenance.components[name],
    );
  }
  expect(
    readFileSync(join(root, "page/vendor/LICENSE.magpie"), "utf8"),
  ).toContain("MIT License");
});

test("official components load before the adapter and page code", () => {
  const html = readFileSync(join(root, "page/index.html"), "utf8");
  const refs = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => m[1]);
  expect(refs.indexOf("vendor/magpie-ui.js")).toBeLessThan(
    refs.indexOf("ui.js"),
  );
  expect(refs.indexOf("ui.js")).toBeLessThan(refs.indexOf("app.js"));
  expect(html).toContain('href="vendor/magpie-ui.css"');
});
