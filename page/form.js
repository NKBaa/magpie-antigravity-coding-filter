// Configuration conversion shared by the form and its tests.
(() => {
  const defaults = {
    mode: "cloak",
    useDefaultKeywords: true,
    useModelKeywords: false,
    useAmbiguousKeywords: false,
    customMappings: {},
    accounts: ["antigravity"],
    boundaries: true,
    protectCode: true,
    strictCase: false,
    dryRun: false,
    report: false,
    off: false,
  };
  const aliases = {
    use_default_keywords: "useDefaultKeywords",
    use_model_keywords: "useModelKeywords",
    use_ambiguous_keywords: "useAmbiguousKeywords",
    custom_mappings: "customMappings",
    protect_code: "protectCode",
    dry_run: "dryRun",
  };
  function pairs(value) {
    if (value == null) return [];
    if (typeof value === "string")
      return (
        /[\r\n]/.test(value) ? value.split(/[\r\n]+/) : value.split(",")
      ).map((line) => {
        const at = line.indexOf(":");
        return at < 0 ? [line, ""] : [line.slice(0, at), line.slice(at + 1)];
      });
    if (Array.isArray(value)) return value.flatMap(pairs);
    return typeof value === "object" ? Object.entries(value) : [];
  }
  function normalize(value = {}) {
    const source = { ...value };
    for (const [alias, key] of Object.entries(aliases))
      if (source[key] === undefined && source[alias] !== undefined)
        source[key] = source[alias];
    const options = { ...defaults, ...source };
    options.accounts =
      Array.isArray(options.accounts) && options.accounts.length
        ? options.accounts
        : ["antigravity"];
    options.mode =
      typeof options.mode === "string" &&
      options.mode.trim().toLowerCase() === "rewrite"
        ? "rewrite"
        : "cloak";
    for (const key of [
      "useDefaultKeywords",
      "boundaries",
      "protectCode",
      "strictCase",
    ])
      options[key] = options[key] !== false;
    for (const key of [
      "useModelKeywords",
      "useAmbiguousKeywords",
      "dryRun",
      "report",
    ])
      options[key] = options[key] === true;
    options.off =
      source.off === true ||
      (typeof source.off === "number" && source.off !== 0) ||
      (typeof source.off === "string" &&
        /^(true|1|yes|on)$/i.test(source.off.trim()));
    const seen = new Map();
    for (const [key, val] of pairs(options.customMappings)) {
      const name = String(key ?? "").trim(),
        replacement = val === null ? null : String(val ?? "").trim();
      if (name && (replacement === null || replacement))
        seen.set(name.toLowerCase(), {
          name,
          replacement: replacement ?? "Antigravity",
          exclude: replacement === null,
        });
    }
    return { options, rows: [...seen.values()] };
  }
  function build(base, values, rows) {
    const custom = Object.create(null),
      seen = new Set();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i],
        name = row.name.trim(),
        value = row.replacement.trim();
      if (!name) throw new Error("emptyName");
      if (seen.has(name.toLowerCase())) throw new Error("duplicateName");
      if (!row.exclude && !value) throw new Error("emptyReplacement");
      seen.add(name.toLowerCase());
      custom[name] = row.exclude ? null : value;
    }
    const result = { ...base, ...values, customMappings: custom };
    for (const alias of Object.keys(aliases)) delete result[alias];
    const accounts =
      typeof values.accounts === "string"
        ? values.accounts.split(/[,\s]+/).filter(Boolean)
        : values.accounts;
    result.accounts = accounts?.length ? accounts : ["antigravity"];
    return result;
  }
  function preview(text, options) {
    if (options.off)
      return { text, changed: false, matches: [], reason: "disabled" };
    const result = globalThis.AntigravityFilter.preview(text, options);
    return {
      ...result,
      text: options.dryRun ? text : result.text,
      reason: options.dryRun
        ? "dryRun"
        : result.changed
          ? "changed"
          : "unchanged",
    };
  }
  // Three-way merge: untouched fields use the latest saved value. Concurrent
  // edits to the same field/name must agree, otherwise the draft stays unsaved.
  function merge(base, latest, draft) {
    const canonical = (value) => {
      const { options, rows } = normalize(value);
      return build(options, options, rows);
    };
    const before = canonical(base),
      theirs = canonical(latest),
      ours = canonical(draft);
    const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const pick = (b, l, d) => {
      if (equal(b, d)) return l;
      if (!equal(b, l) && !equal(l, d)) throw new Error("conflict");
      return d;
    };
    const result = { ...latest };
    for (const key of Object.keys(defaults)) {
      if (key !== "customMappings")
        result[key] = pick(before[key], theirs[key], ours[key]);
    }
    const entries = (value) =>
      new Map(
        Object.entries(value).map((entry) => [entry[0].toLowerCase(), entry]),
      );
    const b = entries(before.customMappings),
      l = entries(theirs.customMappings),
      d = entries(ours.customMappings);
    const custom = Object.create(null);
    for (const key of new Set([...b.keys(), ...d.keys(), ...l.keys()])) {
      const chosen = pick(b.get(key), l.get(key), d.get(key));
      if (chosen) custom[chosen[0]] = chosen[1];
    }
    result.customMappings = custom;
    for (const alias of Object.keys(aliases)) delete result[alias];
    return result;
  }
  function catalog(value, group = "common") {
    const { options, rows } = normalize(value);
    const filter = globalThis.AntigravityFilter;
    const groups = {
      common: [filter.defaultMappings, options.useDefaultKeywords],
      models: [filter.modelMappings, options.useModelKeywords],
      ambiguous: [filter.ambiguousMappings, options.useAmbiguousKeywords],
    };
    const [list, enabled] = groups[group] || [[], false];
    const overrides = new Map(rows.map((row) => [row.name.toLowerCase(), row]));
    return list.map(([name, replacement]) => {
      const custom = overrides.get(name.toLowerCase());
      return {
        name,
        replacement: custom
          ? custom.exclude
            ? null
            : custom.replacement
          : replacement,
        state: custom
          ? custom.exclude
            ? "excluded"
            : "overridden"
          : enabled
            ? "enabled"
            : "disabled",
      };
    });
  }
  globalThis.FilterForm = {
    defaults,
    normalize,
    build,
    preview,
    merge,
    catalog,
  };
})();
