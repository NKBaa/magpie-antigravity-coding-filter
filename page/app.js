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
      presetHint: "包含 Chatbox、Kelivo、Windsurf 等 48 个名称",
      models: "同时处理模型名称",
      modelsHint: "例如 Claude Sonnet、GPT-5；按需开启",
      rules: "自定义词条",
      rulesHint: "按需添加 Cursor、Codex 等名称，无需编写配置。",
      add: "新增规则",
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
      catalogTitle: "规则管理",
      catalogAll: "全部规则",
      catalogCustom: "自定义 / 已修改",
      ruleActions: "操作",
      editRule: "修改",
      newRule: "新增规则",
      applyRule: "应用到列表",
      cancelRule: "取消",
      restoreRule: "恢复默认",
      enableRule: "启用",
      sourceCustom: "自定义",
      sourceAmbiguous: "歧义词",
      editing: "正在编辑规则",
      finishEditing: "请先应用或取消当前编辑。",
      missingRule: "该规则已不存在，请重新选择。",
      editorHint:
        "应用到列表后，点击保存更改即可生效；也可直接按 Ctrl/Cmd+S 保存。",
      builtinEditHint:
        "修改默认规则会保存为自定义覆盖。更改名称将排除原名称；可在原规则上恢复默认。",
      catalogSearch: "搜索规则名称",
      catalogName: "名称",
      catalogReplacement: "替换值（改写模式）",
      catalogStatus: "状态",
      catalogEmpty: "没有匹配的规则。",
      catalogCommon: "默认词表",
      catalogModels: "模型名称",
      catalogAmbiguous: "歧义词（默认关闭）",
      catalogEnabled: "已启用",
      catalogDisabled: "未启用",
      catalogOverridden: "已修改",
      catalogExcluded: "已排除",
      catalogHint:
        "下表显示当前草稿的规则配置。替换值仅用于“替换名字”模式；“保留原文”模式会插入不可见字符。",
      catalogOff: "过滤已关闭，以下规则暂不执行。",
      catalogDry: "当前仅检查，以下规则不会改动请求。",
      catalogCount: "条规则",
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
      presetHint: "48 names, including Chatbox, Kelivo and Windsurf",
      models: "Include model names",
      modelsHint: "For example Claude Sonnet and GPT-5; optional",
      rules: "Custom names",
      rulesHint: "Add names such as Cursor or Codex when needed.",
      add: "Add rule",
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
      catalogTitle: "Rules",
      catalogAll: "All rules",
      catalogCustom: "Custom / modified",
      ruleActions: "Actions",
      editRule: "Edit",
      newRule: "New rule",
      applyRule: "Apply to list",
      cancelRule: "Cancel",
      restoreRule: "Restore default",
      enableRule: "Enable",
      sourceCustom: "Custom",
      sourceAmbiguous: "Ambiguous",
      editing: "Editing a rule",
      finishEditing: "Apply or cancel the current edit first.",
      missingRule: "This rule no longer exists. Select it again.",
      editorHint:
        "Apply to the list, then save changes. Ctrl/Cmd+S applies and saves directly.",
      builtinEditHint:
        "Built-in edits are stored as overrides. Renaming excludes the original name; restore the original rule to undo it.",
      catalogSearch: "Search rule names",
      catalogName: "Name",
      catalogReplacement: "Replacement (rewrite mode)",
      catalogStatus: "Status",
      catalogEmpty: "No matching rules.",
      catalogCommon: "Default names",
      catalogModels: "Model names",
      catalogAmbiguous: "Ambiguous names (off by default)",
      catalogEnabled: "Enabled",
      catalogDisabled: "Not enabled",
      catalogOverridden: "Modified",
      catalogExcluded: "Excluded",
      catalogHint:
        "Rules reflect the current draft. Replacement values apply in rewrite mode; keep wording inserts invisible characters.",
      catalogOff: "Filtering is off; these rules will not run.",
      catalogDry:
        "Check-only mode is on; these rules will not modify requests.",
      catalogCount: "rules",
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
    loadedLocal = false,
    catalogGroup = "all",
    editor = null,
    editorBaseline = "";
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
    editor = null;
    $("rule-editor").hidden = true;
  }
  function editorDraft() {
    return {
      name: $("editor-name").value,
      replacement: $("editor-replacement").value,
      exclude: $("editor-exclude").checked,
    };
  }
  function editorChanged() {
    return editor && JSON.stringify(editorDraft()) !== editorBaseline;
  }
  function beginEdit(rule = null) {
    if (!ready || busy) return;
    if (editor) {
      message(t("finishEditing"));
      $("editor-name").focus();
      return;
    }
    editor = {
      originalName: rule?.name ?? null,
      builtin: rule?.builtin || false,
    };
    $("editor-name").value = rule?.name || "";
    $("editor-replacement").value =
      rule?.replacement ?? rule?.defaultReplacement ?? "Antigravity";
    $("editor-exclude").checked = rule?.state === "excluded";
    editorBaseline = JSON.stringify(editorDraft());
    $("editor-error").hidden = true;
    $("rule-editor").hidden = false;
    message();
    render();
    $("editor-name").focus();
    $("rule-editor").scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function closeEditor() {
    editor = null;
    $("rule-editor").hidden = true;
    $("editor-error").hidden = true;
  }
  function applyEditor() {
    if (!editor) return true;
    try {
      const draft = editorDraft();
      rows = M.editRule(rows, editor.originalName, draft);
      catalogGroup = "all";
      $("catalog-search").value = draft.name.trim();
      closeEditor();
      message();
      render();
      [...$("catalog-rows").children]
        .find((row) => row.dataset.name === draft.name.trim())
        ?.querySelector('[data-action="edit"]')
        ?.focus();
      return true;
    } catch (error) {
      $("editor-error").textContent = t(error.message);
      $("editor-error").hidden = false;
      $("editor-name").focus();
      return false;
    }
  }
  function toggleRule(rule) {
    if (!ready || busy || editor) return;
    const exclude = rule.state === "enabled" || rule.state === "overridden";
    rows = M.editRule(rows, rule.name, {
      name: rule.name,
      replacement: rule.replacement ?? rule.defaultReplacement ?? "Antigravity",
      exclude,
    });
    message();
    render();
  }
  function restoreRule(rule) {
    if (!ready || busy || editor) return;
    rows = M.restoreRule(rows, rule.name);
    message();
    render();
  }
  function drawCatalog(options) {
    const groups = $("catalog-groups");
    const definitions = [
      ["all", "catalogAll"],
      ["common", "catalogCommon"],
      ["models", "catalogModels"],
      ["ambiguous", "catalogAmbiguous"],
      ["custom", "catalogCustom"],
    ];
    if (!groups.children.length) {
      for (const [group] of definitions) {
        const button = controls.button(
          "",
          () => {
            catalogGroup = group;
            render();
          },
          "text",
        );
        button.dataset.group = group;
        groups.append(button);
      }
    }
    const priority = (rule) =>
      !rule.builtin
        ? 0
        : ["overridden", "excluded"].includes(rule.state)
          ? 1
          : rule.state === "enabled"
            ? 2
            : 3;
    const list = M.ruleList(options || {}).sort(
      (a, b) => priority(a) - priority(b),
    );
    const filterGroup = (rule, group) =>
      group === "all" ||
      (group === "custom"
        ? !rule.builtin ||
          rule.state === "overridden" ||
          rule.state === "excluded"
        : rule.group === group);
    for (const [group, label] of definitions) {
      const button = groups.querySelector('[data-group="' + group + '"]');
      button.textContent =
        t(label) +
        " · " +
        list.filter((rule) => filterGroup(rule, group)).length;
      button.setAttribute("aria-pressed", String(catalogGroup === group));
    }
    if (!options) {
      $("catalog-rows").replaceChildren();
      $("catalog-count").textContent = "";
      $("catalog-empty").hidden = true;
      $("catalog-note").textContent = t("invalid");
      return;
    }
    const query = $("catalog-search").value.trim().toLowerCase();
    const grouped = list.filter((rule) => filterGroup(rule, catalogGroup));
    const visible = grouped.filter((rule) =>
      rule.name.toLowerCase().includes(query),
    );
    const status = {
      enabled: "catalogEnabled",
      disabled: "catalogDisabled",
      overridden: "catalogOverridden",
      excluded: "catalogExcluded",
    };
    const sources = {
      common: "catalogCommon",
      models: "catalogModels",
      ambiguous: "sourceAmbiguous",
      custom: "sourceCustom",
    };
    $("catalog-rows").replaceChildren(
      ...visible.map((rule) => {
        const row = ui.el("tr");
        row.dataset.name = rule.name;
        row.dataset.state = rule.state;
        row.dataset.group = rule.group;
        const name = ui.el("td"),
          value = ui.el("td"),
          state = ui.el("td"),
          actions = ui.el("td");
        name.append(
          ui.el("code", "", rule.name),
          ui.el("small", "muted rule-source", t(sources[rule.group])),
        );
        value.append(
          ui.el("code", "", rule.replacement === null ? "—" : rule.replacement),
        );
        state.textContent = t(status[rule.state]);
        const buttons = ui.el("div", "rule-actions");
        const action = (label, kind, fn) => {
          const button = controls.button(t(label), fn, "text");
          button.dataset.action = kind;
          button.disabled = !ready || busy || !!editor;
          buttons.append(button);
        };
        action("editRule", "edit", () => beginEdit(rule));
        action(
          rule.state === "enabled" || rule.state === "overridden"
            ? "exclude"
            : "enableRule",
          "toggle",
          () => toggleRule(rule),
        );
        if (!rule.builtin) action("remove", "delete", () => restoreRule(rule));
        else if (rule.state === "overridden" || rule.state === "excluded")
          action("restoreRule", "restore", () => restoreRule(rule));
        actions.append(buttons);
        row.append(name, value, state, actions);
        return row;
      }),
    );
    $("catalog-count").textContent =
      visible.length + " / " + grouped.length + " " + t("catalogCount");
    $("catalog-empty").hidden = visible.length > 0;
    $("catalog-note").textContent =
      (options.off
        ? t("catalogOff") + " "
        : options.dryRun
          ? t("catalogDry") + " "
          : "") + t("catalogHint");
  }
  function render() {
    $("cloak").setAttribute("aria-pressed", String(mode === "cloak"));
    $("rewrite").setAttribute("aria-pressed", String(mode === "rewrite"));
    $("mode-hint").textContent = t(
      mode === "cloak" ? "cloakHint" : "rewriteHint",
    );
    let options, error;
    try {
      options = collect();
    } catch (e) {
      error = e.message;
    }
    drawCatalog(error ? null : options);
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
    const dirty = JSON.stringify(options) !== baseline || !!editorChanged();
    $("add-rule").disabled = !ready || busy || !!editor;
    $("rule-editor").hidden = !editor;
    if (editor) {
      $("editor-title").textContent = t(
        editor.originalName ? "editRule" : "newRule",
      );
      $("editor-note").textContent =
        (editor.builtin ? t("builtinEditHint") + " " : "") + t("editorHint");
      $("editor-replacement").disabled = busy || $("editor-exclude").checked;
    }
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
  }
  async function save() {
    if (!ready || busy) return;
    if (editor && !applyEditor()) return;
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
      render();
    }
  }
  $("save").addEventListener("click", save);
  $("add-rule").addEventListener("click", () => beginEdit());
  $("editor-apply").addEventListener("click", applyEditor);
  $("rule-editor").addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeEditor();
      render();
    } else if (
      event.key === "Enter" &&
      event.target.matches('input[type="text"]')
    ) {
      event.preventDefault();
      applyEditor();
    }
  });
  $("editor-cancel").addEventListener("click", () => {
    closeEditor();
    render();
  });
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
        $("editor-error").hidden = true;
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
