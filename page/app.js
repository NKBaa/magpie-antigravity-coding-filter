// The page: the middleware's options as a form, and a box that runs the same
// matcher over a system prompt you paste, so the effect is visible before an
// agent sends anything. Options are read and written through magpie's bridge
// (magpie.options.get/set), which is the same options object the middleware
// reads as ctx.options; opened outside magpie, the page keeps them in
// localStorage and says so.
;(() => {
  "use strict"

  const F = globalThis.AntigravityFilter
  const $ = (id) => document.getElementById(id)
  const STORE = "antigravity-coding-filter:options"
  const TOGGLES = [
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
  const DEFAULTS = {
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
  }
  const EXAMPLE = [
    "You are Chatbox, an AI assistant.",
    "",
    "This project is reviewed with Windsurf. The workspace root is C:\\work\\Cursor\\src; read cursor.md and .codex/rules.md before you start, and see https://cursor.com/docs for the API.",
    "",
    "```",
    'const name = "Cursor"',
    "```",
    "",
    "Move the cursor to the end of the line, then reply.",
  ].join("\n")

  const TEXT = {
    en: {
      title: "Antigravity coding filter",
      sub: "Another agent's name, rewritten or cloaked, only on the request an Antigravity account is sent.",
      save: "Save",
      options: "Options",
      mode: "Mode",
      modeCloak: "Cloak",
      modeRewrite: "Rewrite",
      modeCloakHint: "A zero-width space after the first and second letter: the model reads the word as before.",
      modeRewriteHint: "The name becomes its replacement, usually Antigravity: \"You are a Antigravity\".",
      useDefaultKeywords: "Default preset",
      useModelKeywords: "Model names",
      useAmbiguousKeywords: "Ambiguous names",
      boundaries: "Whole words only",
      protectCode: "Protect code",
      strictCase: "Match case for ambiguous names",
      dryRun: "Dry run",
      report: "Report to ctx.state",
      off: "Off",
      accounts: "Accounts",
      accountsHint: "Comma-separated subscription kinds, compared ignoring case.",
      custom: "customMappings",
      customHint: "One per line, name then replacement. A line with only a name is skipped; write null as the replacement to remove a preset entry.",
      customError: "Needs a name and a colon on line",
      reset: "Reset",
      copyJson: "Copy JSON",
      copyCommand: "Copy command",
      preview: "Preview",
      previewHint: "Paste the system prompt an agent sends. Nothing here is sent anywhere: this box runs the same matcher the middleware does.",
      example: "Load an example",
      clear: "Clear",
      showZw: "Show zero-width spaces",
      sent: "What Antigravity would be sent",
      matches: "Matched",
      none: "No name matched, so the request goes out as it is.",
      footer: "Changing what Google is sent may be against Antigravity's terms, and an account can be banned for it.",
      saved: "Saved",
      savedLocal: "Saved in this browser only",
      dirty: "Unsaved",
      readonly: "Preview only — open this page in magpie to save",
      saving: "Saving…",
      invalid: "Fix the highlighted field first",
      copyFailed: "Could not copy; select the text instead",
    },
    zh: {
      title: "Antigravity 编码过滤",
      sub: "只在发给 Antigravity 账号的那次请求上，改写或遮蔽其他 Agent 的名字。",
      save: "保存",
      options: "选项",
      mode: "模式",
      modeCloak: "遮蔽",
      modeRewrite: "改写",
      modeCloakHint: "在名字第一、第二个字母后各插一个零宽空格：模型照读，字面串变了。",
      modeRewriteHint: "名字替换成映射值，通常是 Antigravity：“You are a Antigravity”。",
      useDefaultKeywords: "内置词表",
      useModelKeywords: "模型名",
      useAmbiguousKeywords: "歧义词",
      boundaries: "只匹配整词",
      protectCode: "保护代码块",
      strictCase: "歧义词区分大小写",
      dryRun: "只算不改",
      report: "写到 ctx.state",
      off: "关闭",
      accounts: "账号类型",
      accountsHint: "逗号分隔的订阅类型，比较时忽略大小写。",
      custom: "自定义映射",
      customHint: "每行一条，名字在前、替换值在后。只有名字的行会被跳过；替换值写 null 表示把内置词条删掉。",
      customError: "这一行缺少冒号：第",
      reset: "恢复默认",
      copyJson: "复制 JSON",
      copyCommand: "复制命令",
      preview: "预览",
      previewHint: "把 Agent 会发的 system 提示词贴进来。这里不联网：用的是与中间件同一套匹配规则。",
      example: "载入示例",
      clear: "清空",
      showZw: "显示零宽字符",
      sent: "实际发给 Antigravity 的内容",
      matches: "命中",
      none: "没有命中任何名字，请求原样发出。",
      footer: "改动发给 Google 的内容可能违反 Antigravity 的条款，账号有被封的风险。",
      saved: "已保存",
      savedLocal: "只保存在本浏览器",
      dirty: "未保存",
      readonly: "只读预览 —— 在 magpie 里打开本页才能保存",
      saving: "保存中…",
      invalid: "先修正高亮的字段",
      copyFailed: "复制失败，请手动选中文本",
    },
  }

  let lang = "en"
  let baseline = ""
  let lastSave = 0
  let busy = false
  let localSaved = false

  const T = () => TEXT[lang] || TEXT.en
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const bridge = () => globalThis.magpie

  function applyWords() {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en"
    document.title = T().title
    document.querySelectorAll("[data-t]").forEach((el) => {
      const key = el.dataset.t
      if (T()[key]) el.textContent = T()[key]
    })
  }

  function customText(value) {
    if (value == null) return ""
    if (typeof value === "string") return value
    if (Array.isArray(value)) return value.join("\n")
    return Object.entries(value)
      .map(([name, replacement]) => `${name}: ${replacement === null ? "null" : replacement}`)
      .join("\n")
  }

  function collect() {
    const bad = []
    const custom = {}
    $("custom").value.split(/\r?\n/).forEach((line, index) => {
      const text = line.trim()
      if (!text) return
      const at = text.indexOf(":")
      if (at < 0) {
        bad.push(index + 1)
        return
      }
      const name = text.slice(0, at).trim()
      if (!name) {
        bad.push(index + 1)
        return
      }
      const value = text.slice(at + 1).trim()
      custom[name] = value === "null" ? null : value
    })
    const accounts = $("accounts")
      .value.split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean)
    const picked = document.querySelector('input[name="mode"]:checked')
    const options = {
      mode: picked ? picked.value : "cloak",
      useDefaultKeywords: $("useDefaultKeywords").checked,
      useModelKeywords: $("useModelKeywords").checked,
      useAmbiguousKeywords: $("useAmbiguousKeywords").checked,
      customMappings: custom,
      accounts: accounts.length ? accounts : ["antigravity"],
      boundaries: $("boundaries").checked,
      protectCode: $("protectCode").checked,
      strictCase: $("strictCase").checked,
      dryRun: $("dryRun").checked,
      report: $("report").checked,
      off: $("off").checked,
    }
    return { options, bad }
  }

  function fill(options) {
    const mode = options.mode === "rewrite" ? "rewrite" : "cloak"
    document.querySelectorAll('input[name="mode"]').forEach((radio) => {
      radio.checked = radio.value === mode
    })
    for (const key of TOGGLES) {
      $(key).checked = options[key] === undefined ? Boolean(DEFAULTS[key]) : Boolean(options[key])
    }
    $("accounts").value =
      Array.isArray(options.accounts) && options.accounts.length
        ? options.accounts.join(", ")
        : "antigravity"
    $("custom").value = customText(options.customMappings)
  }

  function escapeHtml(text) {
    return text.replace(
      /[&<>"]/g,
      (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch],
    )
  }

  function paint(text) {
    const escaped = escapeHtml(text)
    if (!$("show-zw").checked) return escaped
    return escaped
      .split(F.ZWSP)
      .join('<span class="zw" title="U+200B zero-width space">·</span>')
  }

  function state(kind, message) {
    const chip = $("state")
    chip.hidden = false
    chip.dataset.kind = kind
    chip.textContent = message || T()[kind] || kind
  }

  function render() {
    const { options, bad } = collect()
    $("custom").setAttribute("aria-invalid", String(bad.length > 0))
    $("custom-error").hidden = bad.length === 0
    if (bad.length) $("custom-error").textContent = `${T().customError} ${bad.join(", ")}`

    const json = JSON.stringify(options, null, 2)
    $("json").textContent = json
    $("mode-hint").textContent =
      T()[options.mode === "rewrite" ? "modeRewriteHint" : "modeCloakHint"]

    const sample = $("sample").value
    const result = F.preview(sample, options)
    $("out").innerHTML = sample ? paint(result.text) : ""
    const items = result.matches.map((match) => {
      const li = document.createElement("li")
      const name = document.createElement("code")
      name.textContent = match.name
      const count = document.createElement("span")
      count.className = "n"
      count.textContent = `×${match.count}`
      li.append(name, count)
      return li
    })
    $("matches").replaceChildren(...items)
    $("none").hidden = !sample || result.matches.length > 0
    $("save").disabled = busy

    if (!baseline) return
    if (JSON.stringify(options) !== baseline) state("dirty")
    else if (bridge()) state("saved")
    else if (localSaved) state("saved", T().savedLocal)
    else state("readonly")
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {}
    const area = document.createElement("textarea")
    area.value = text
    area.setAttribute("readonly", "")
    area.className = "offscreen"
    document.body.append(area)
    area.select()
    let ok = false
    try {
      ok = document.execCommand("copy")
    } catch {}
    area.remove()
    return ok
  }

  async function save() {
    const { options, bad } = collect()
    if (bad.length) {
      state("error", T().invalid)
      $("custom").focus()
      return
    }
    const m = bridge()
    if (!m) {
      try {
        localStorage.setItem(STORE, JSON.stringify(options))
      } catch {}
      baseline = JSON.stringify(options)
      localSaved = true
      render()
      return
    }
    const wait = 1100 - (Date.now() - lastSave)
    if (wait > 0) await sleep(wait)
    busy = true
    $("save").disabled = true
    state("dirty", T().saving)
    try {
      const latest = (await m.options.get()) || {}
      const next = { ...latest, ...options }
      await m.options.set(next)
      const after = (await m.options.get()) || next
      fill(after)
      lastSave = Date.now()
      baseline = JSON.stringify(collect().options)
      render()
    } catch (error) {
      state("error", (error && error.message) || String(error))
    } finally {
      busy = false
      $("save").disabled = false
    }
  }

  function onTheme(theme) {
    const next = String((theme && theme.lang) || navigator.language || "en")
    lang = next.toLowerCase().startsWith("zh") ? "zh" : "en"
    applyWords()
    if (baseline) render()
  }

  $("save").addEventListener("click", save)
  $("reset").addEventListener("click", () => {
    fill(DEFAULTS)
    render()
  })
  $("copy-json").addEventListener("click", async () => {
    if (!(await copy($("json").textContent))) state("error", T().copyFailed)
  })
  $("copy-cmd").addEventListener("click", async () => {
    const command = `magpie plugin options antigravity-coding-filter '${$("json").textContent}'`
    if (!(await copy(command))) state("error", T().copyFailed)
  })
  $("example").addEventListener("click", () => {
    $("sample").value = EXAMPLE
    render()
  })
  $("clear").addEventListener("click", () => {
    $("sample").value = ""
    render()
  })

  for (const panel of document.querySelectorAll("main .panel")) {
    panel.addEventListener("input", render)
    panel.addEventListener("change", render)
  }
  $("show-zw").addEventListener("change", render)

  async function start() {
    applyWords()
    const m = bridge()
    let initial = null
    if (m) {
      try {
        await m.ready
      } catch {}
      try {
        initial = await m.options.get()
      } catch {}
      if (typeof m.onTheme === "function") m.onTheme(onTheme)
      onTheme(m.theme)
    } else {
      try {
        initial = JSON.parse(localStorage.getItem(STORE) || "null")
      } catch {}
    }
    fill({ ...DEFAULTS, ...(initial || {}) })
    baseline = JSON.stringify(collect().options)
    render()
    if (!m) state("readonly")
    if (!m && !$("sample").value) $("sample").value = EXAMPLE
    render()
  }

  start()
})()
