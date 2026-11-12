(() => {
  "use strict";
  const $ = (id) => document.getElementById(id),
    M = globalThis.FilterForm,
    F = globalThis.AntigravityFilter;
  const STORE = "antigravity-coding-filter:options";
  const toggles = [
    "useDefaultKeywords",
    "useModelKeywords",
    "useAmbiguousKeywords",
    "boundaries",
    "protectCode",
    "strictCase",
    "dryRun",
    "report",
  ];
  const words = {
    zh: {
      title: "过滤设置",
      subtitle: "只处理发给 Antigravity 的系统提示词，保护路径和代码。",
      save: "保存更改",
      localSave: "保存到浏览器",
      basic: "基本设置",
      enabled: "启用过滤",
      enabledHint: "对 Antigravity 账号生效",
      mode: "处理方式",
      cloak: "保留原文",
      rewrite: "替换名字",
      cloakHint: "插入不可见字符，保留原句含义。",
      rewriteHint: "把匹配到的名称替换为指定文字。",
      preset: "常用名称",
      presetHint: "包含 Chatbox、Windsurf 等 47 个名称",
      models: "同时处理模型名称",
      modelsHint: "例如 Claude Sonnet、GPT-5；按需开启",
      rules: "自定义词条",
      rulesHint: "按需添加 Cursor、Codex 等名称，无需编写配置。",
      add: "添加词条",
      emptyRules: "还没有自定义词条。上方名称可一键添加。",
      advanced: "高级设置",
      boundaries: "只匹配完整名称",
      protectCode: "保护代码块和行内代码",
      strictCase: "歧义词区分大小写",
      ambiguous: "启用全部 11 个歧义词（可能误匹配普通单词）",
      dryRun: "仅检查，请求保持原样",
      report: "记录命中信息到请求状态",
      accounts: "账号类型（逗号分隔）",
      config: "查看配置 JSON",
      copy: "复制 JSON",
      preview: "试一下效果",
      previewHint: "粘贴系统提示词即可预览。内容只在本页处理，不会发送请求。",
      example: "填入示例",
      input: "原文",
      output: "发出的内容",
      showZw: "标出零宽字符",
      draftNote: "预览使用当前设置；保存后才会影响网关请求。",
      saved: "已保存",
      local: "仅保存于本浏览器，未连接 magpie",
      dirty: "有未保存的更改",
      saving: "正在保存…",
      loading: "正在读取设置…",
      loadFailed: "读取设置失败，已禁止保存以免覆盖原配置。请重新打开页面。",
      name: "要匹配的名称",
      replacement: "替换为",
      exclude: "排除此词",
      remove: "删除",
      emptyName: "请填写词条名称。",
      duplicateName: "名称重复，请删除或修改重复词条。",
      emptyReplacement: "请填写替换文字。",
      invalid: "请先修正自定义词条。",
      disabled: "过滤已关闭，原文会直接发出。",
      dryRunStatus: "当前仅检查，原文保持不变。",
      emptyPreview: "输入一段系统提示词，查看处理效果。",
      noMatch: "没有匹配到词条，原文保持不变。",
      hits: "处名称匹配",
      copied: "已复制 JSON",
      copyFailed: "复制失败，请展开 JSON 后手动复制。",
      localFailed: "浏览器无法保存，请复制 JSON 备份。",
      saveFailed: "保存失败：",
      reload: "重新加载",
      excluded: "将保留此名称，不参与处理",
      pending: "设置尚未读取完成。",
      standalone: "预览模式；更改可保存到本浏览器",
      selectCopy: "已选中 JSON，请按 Ctrl/Cmd+C 复制。",
      conflict:
        "其他窗口修改了同一项配置。草稿已保留，请复制 JSON 备份并重新打开页面后合并。",
    },
    en: {
      title: "Filter settings",
      subtitle:
        "Process system prompts sent to Antigravity, preserving paths and code.",
      save: "Save changes",
      localSave: "Save in browser",
      basic: "General",
      enabled: "Enable filtering",
      enabledHint: "Applies to Antigravity accounts",
      mode: "Processing",
      cloak: "Keep wording",
      rewrite: "Replace names",
      cloakHint: "Insert invisible characters while keeping the wording.",
      rewriteHint: "Replace matching names with the text you choose.",
      preset: "Common names",
      presetHint: "47 names, including Chatbox and Windsurf",
      models: "Include model names",
      modelsHint: "For example Claude Sonnet and GPT-5; optional",
      rules: "Custom names",
      rulesHint: "Add names such as Cursor or Codex when needed.",
      add: "Add name",
      emptyRules: "No custom names yet. Click a name above to add it.",
      advanced: "Advanced",
      boundaries: "Match whole names",
      protectCode: "Preserve code blocks and inline code",
      strictCase: "Case-sensitive ambiguous names",
      ambiguous: "Include all 11 ambiguous names (may match ordinary words)",
      dryRun: "Check only; keep requests unchanged",
      report: "Record matches in request state",
      accounts: "Account types (comma separated)",
      config: "View configuration JSON",
      copy: "Copy JSON",
      preview: "Try it out",
      previewHint:
        "Paste a system prompt. Processing stays on this page; no request is sent.",
      example: "Use example",
      input: "Original",
      output: "Outgoing text",
      showZw: "Mark invisible characters",
      draftNote:
        "Preview uses current settings. Save to apply them to gateway requests.",
      saved: "Saved",
      local: "Saved only in this browser; not connected to magpie",
      dirty: "Unsaved changes",
      saving: "Saving…",
      loading: "Loading settings…",
      loadFailed:
        "Could not load settings. Saving is disabled to protect your configuration. Reopen this page.",
      name: "Name to match",
      replacement: "Replace with",
      exclude: "Exclude name",
      remove: "Remove",
      emptyName: "Enter a name.",
      duplicateName: "Names must be unique (ignoring case).",
      emptyReplacement: "Enter replacement text.",
      invalid: "Fix the custom names first.",
      disabled: "Filtering is off. The original text will be sent.",
      dryRunStatus: "Check only is on. Outgoing text is unchanged.",
      emptyPreview: "Enter a system prompt to see the result.",
      noMatch: "No names matched. The original text is unchanged.",
      hits: "name matches",
      copied: "JSON copied",
      copyFailed: "Could not copy. Expand the JSON and copy it manually.",
      localFailed: "Browser storage is unavailable. Copy the JSON as a backup.",
      saveFailed: "Could not save: ",
      reload: "Reload",
      excluded: "This name will be preserved",
      pending: "Settings are still loading.",
      standalone: "Preview mode; changes can be saved in this browser",
      selectCopy: "JSON selected. Press Ctrl/Cmd+C to copy.",
      conflict:
        "Another window changed the same setting. Your draft is preserved. Copy the JSON as a backup, reopen this page and merge the changes.",
    },
  };
  let lang = (navigator.language || "zh").startsWith("zh") ? "zh" : "en",
    base = {},
    rows = [],
    mode = "cloak",
    baseline = "",
    ready = false,
    busy = false,
    lastWrite = 0,
    loadedLocal = false;
  const bridge = globalThis.magpie,
    t = (key) => words[lang][key] || key;
  const controls = globalThis.FilterControls,
    ui = controls.ui;
  controls.mount();
  function message(text = "") {
    $("message").textContent = text;
    $("message").hidden = !text;
  }
  function translate() {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.title = t("title");
    document
      .querySelectorAll("[data-t]")
      .forEach((el) => (el.textContent = t(el.dataset.t)));
    $("save").textContent = t(bridge ? "save" : "localSave");
    controls.relabel(t);
  }
  function values() {
    const v = {
      mode,
      off: !$("enabled").checked,
      accounts: $("accounts").value,
    };
    for (const id of toggles) v[id] = $(id).checked;
    return v;
  }
  const collect = () => M.build(base, values(), rows);
  function fill(options) {
    const normalized = M.normalize(options);
    base = { ...options };
    rows = normalized.rows;
    mode = normalized.options.mode === "rewrite" ? "rewrite" : "cloak";
    $("enabled").checked = !normalized.options.off;
    for (const id of toggles) $(id).checked = normalized.options[id] === true;
    $("accounts").value = (normalized.options.accounts || ["antigravity"]).join(
      ", ",
    );
    drawRules();
  }
  function labelled(caption, control) {
    const label = document.createElement("label"),
      span = document.createElement("span");
    span.textContent = caption;
    label.append(span, control);
    return label;
  }
  function drawRules() {
    $("rules").replaceChildren();
    $("empty-rules").hidden = rows.length > 0;
    rows.forEach((row, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "rule";
      const name = ui.el("input", "set-field");
      name.type = "text";
      name.value = row.name;
      name.placeholder = "My Agent";
      name.autocomplete = "off";
      name.spellcheck = false;
      name.setAttribute("aria-label", t("name"));
      name.dataset.index = index;
      name.dataset.field = "name";
      name.addEventListener("input", () => {
        row.name = name.value;
        render();
      });
      const replacement = ui.el("input", "set-field");
      replacement.type = "text";
      replacement.value = row.replacement;
      replacement.disabled = row.exclude;
      replacement.setAttribute("aria-label", t("replacement"));
      replacement.addEventListener("input", () => {
        row.replacement = replacement.value;
        render();
      });
      const exclude = controls.toggle(row.exclude, t("exclude"));
      exclude.addEventListener("change", () => {
        row.exclude = exclude.checked;
        replacement.disabled = row.exclude;
        render();
      });
      const remove = controls.button(
        t("remove"),
        () => {},
        "text action danger",
      );
      remove.setAttribute("aria-label", `${t("remove")} ${row.name}`);
      remove.addEventListener("click", () => {
        rows.splice(index, 1);
        drawRules();
        render();
      });
      wrapper.append(
        labelled(t("name"), name),
        labelled(t("replacement"), replacement),
        labelled(t("exclude"), exclude),
        remove,
      );
      $("rules").append(wrapper);
    });
    $("quick-add").replaceChildren(
      ...F.ambiguousNames.map((name) => {
        const b = controls.button(`+ ${name}`, () => {});
        b.dataset.name = name;
        b.disabled = rows.some(
          (row) => row.name.toLowerCase() === name.toLowerCase(),
        );
        b.addEventListener("click", () => add(name));
        return b;
      }),
    );
  }
  function add(name = "") {
    if (
      name &&
      rows.some((row) => row.name.toLowerCase() === name.toLowerCase())
    )
      return;
    rows.push({ name, replacement: "Antigravity", exclude: false });
    drawRules();
    render();
    const fields = $("rules").querySelectorAll('input[data-field="name"]');
    fields[fields.length - 1]?.focus();
  }
  function render() {
    $("cloak").setAttribute("aria-pressed", String(mode === "cloak"));
    $("rewrite").setAttribute("aria-pressed", String(mode === "rewrite"));
    $("mode-hint").textContent = t(
      mode === "cloak" ? "cloakHint" : "rewriteHint",
    );
    $("rules")
      .querySelectorAll("label:nth-child(2)")
      .forEach((label) => (label.hidden = mode !== "rewrite"));
    $("quick-add")
      .querySelectorAll("button")
      .forEach((button) => {
        button.disabled = rows.some(
          (row) =>
            row.name.trim().toLowerCase() === button.dataset.name.toLowerCase(),
        );
      });
    let options, error;
    try {
      options = collect();
    } catch (e) {
      error = e.message;
    }
    if (error) {
      $("json").textContent = t(error);
      $("copy-json").disabled = true;
      $("state").textContent = t(error);
      $("save").disabled = true;
      $("preview-status").textContent = t("invalid");
      $("out").textContent = "";
      $("matches").replaceChildren();
      return;
    }
    $("copy-json").disabled = false;
    $("json").textContent = JSON.stringify(options, null, 2);
    const dirty = JSON.stringify(options) !== baseline;
    $("save").disabled = !ready || busy || !dirty;
    $("state").textContent = !ready
      ? t("loading")
      : busy
        ? t("saving")
        : dirty
          ? t("dirty")
          : bridge
            ? t("saved")
            : t(loadedLocal ? "local" : "standalone");
    $("state").dataset.dirty = String(dirty);
    const text = $("sample").value,
      result = M.preview(text, options);
    $("out").replaceChildren();
    result.text.split("\u200b").forEach((part, i) => {
      if (i) {
        if ($("show-zw").checked) {
          const mark = document.createElement("mark");
          mark.textContent = "·";
          mark.title = "U+200B";
          $("out").append(mark);
        } else $("out").append(document.createTextNode("\u200b"));
      }
      $("out").append(document.createTextNode(part));
    });
    const count = result.matches.reduce((sum, m) => sum + m.count, 0);
    $("preview-status").textContent = !text
      ? t("emptyPreview")
      : result.reason === "disabled"
        ? t("disabled")
        : result.reason === "dryRun"
          ? t("dryRunStatus")
          : count
            ? `${count} ${t("hits")}`
            : t("noMatch");
    $("matches").replaceChildren(
      ...result.matches.map((m) => {
        const span = document.createElement("span");
        span.textContent = `${m.name} × ${m.count}`;
        return span;
      }),
    );
    $("rules")
      .querySelectorAll("label:nth-child(2)")
      .forEach((label) => (label.hidden = mode !== "rewrite"));
  }
  async function save() {
    if (!ready || busy) return;
    let candidate;
    try {
      candidate = collect();
      if (JSON.stringify(candidate) === baseline) return;
    } catch (e) {
      message(t(e.message));
      return;
    }
    busy = true;
    message();
    $("save").disabled = true;
    // Freeze editing while the write is pending, so an acknowledgement cannot erase a new edit.
    const controls = [
        ...document.querySelectorAll("main input, main button, main textarea"),
      ],
      disabled = controls.map((el) => el.disabled);
    controls.forEach((el) => (el.disabled = true));
    render();
    try {
      if (bridge) {
        const wait = Math.max(0, 1100 - (Date.now() - lastWrite));
        if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
        const latest = await bridge.options.get();
        candidate = M.merge(base, latest || {}, candidate);
        await bridge.options.set(candidate);
        lastWrite = Date.now();
        const after = await bridge.options.get();
        fill(after || candidate);
      } else {
        localStorage.setItem(STORE, JSON.stringify(candidate));
        loadedLocal = true;
        fill(candidate);
      }
      baseline = JSON.stringify(collect());
    } catch (e) {
      message(
        e.message === "conflict"
          ? t("conflict")
          : bridge
            ? t("saveFailed") + e.message
            : t("localFailed"),
      );
    } finally {
      busy = false;
      controls.forEach((el, i) => {
        if (el.isConnected) el.disabled = disabled[i];
      });
      drawRules();
      render();
    }
  }
  $("save").addEventListener("click", save);
  $("add-rule").addEventListener("click", () => add());
  for (const id of ["cloak", "rewrite"])
    $(id).addEventListener("click", () => {
      mode = id;
      message();
      render();
    });
  document
    .querySelectorAll('main input,main textarea,main button[role="switch"]')
    .forEach((el) => {
      el.addEventListener("input", () => {
        message();
        render();
      });
      el.addEventListener("change", render);
    });
  $("example").addEventListener("click", () => {
    $("sample").value =
      'You are Chatbox, an AI assistant.\nYou work with Windsurf.\n\nRead https://cursor.com/docs and cursor.md.\n\n```js\nconst name = "Cursor"\n```';
    render();
  });
  $("copy-json").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("json").textContent);
      message(t("copied"));
    } catch {
      const json = $("json");
      for (
        let parent = json.parentElement;
        parent;
        parent = parent.parentElement
      ) {
        if (parent.tagName === "DETAILS") parent.open = true;
      }
      const range = document.createRange();
      range.selectNodeContents(json);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      message(t("selectCopy"));
    }
  });
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "s") {
      event.preventDefault();
      save();
    }
  });
  async function start() {
    translate();
    fill(M.defaults);
    render();
    try {
      let options = {};
      if (bridge) {
        const theme = await bridge.ready;
        lang = String(
          theme?.lang || bridge.theme?.lang || navigator.language,
        ).startsWith("zh")
          ? "zh"
          : "en";
        translate();
        options = await bridge.options.get();
        bridge.onTheme((theme) => {
          lang = String(theme.lang || "en").startsWith("zh") ? "zh" : "en";
          translate();
          drawRules();
          render();
        });
      } else {
        const saved = localStorage.getItem(STORE);
        options = saved ? JSON.parse(saved) : {};
        loadedLocal = !!saved;
      }
      fill(options || {});
      baseline = JSON.stringify(collect());
      ready = true;
      render();
    } catch (e) {
      message(t("loadFailed"));
      $("save").disabled = true;
    }
  }
  start();
})();
