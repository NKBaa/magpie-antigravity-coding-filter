# magpie-antigravity-coding-filter

Another coding agent's name in the system prompt is rewritten or cloaked, as [magpie](https://usemagpie.ai) gateway middleware — on the request an Antigravity account is sent, and on no other.

A port of [jellyfish-p/cpa-plugin-antigravity-coding-filter](https://github.com/jellyfish-p/cpa-plugin-antigravity-coding-filter) (a CLIProxyAPI v7 dynamic plugin, MIT) to magpie's gateway middleware API. The keyword preset, the protected technical references and the rewrite semantics come from that plugin; the hook and the default action are magpie's.

## Why

Antigravity answers a request whose system prompt reads as another coding agent's with `429 Resource has been exhausted`, however much quota is left — magpie shows it as a 400 that says so. The upstream plugin's issue [#4](https://github.com/jellyfish-p/cpa-plugin-antigravity-coding-filter/issues/4) has the controlled test: the same account, model, User-Agent and proxy, and only the identity phrase changed, turns a 429 into a 200.

magpie calls `onProvider` once a request is routed and once per try, so this middleware can act on the try an Antigravity account gets and leave a Claude subscription's — or a key's — request exactly as the agent wrote it, even inside a routing group that tries Antigravity first.

## Install

magpie installs a plugin from npm, GitHub or a folder. Point it at this package's folder (**Plugins › Installed › Install from folder**), or publish it and `magpie plugin add <spec>`.

Set its options under **Plugins › Installed › Options**, or with `magpie plugin options antigravity-coding-filter '<json>'`.

## Options

```json
{ "mode": "cloak",
  "useDefaultKeywords": true,
  "customMappings": {},
  "accounts": ["antigravity"],
  "off": false }
```

- **`mode`.** `cloak` (the default), `rewrite`, or anything else, which is treated as `cloak`.
- **`useDefaultKeywords`.** `true` (the default) turns the built-in preset on. `false` leaves only `customMappings`.
- **`customMappings`.** More names: an object (`{"Cursor": "Antigravity"}`), a comma- or newline-delimited string (`"Cursor: Antigravity, Windsurf: Antigravity"`), or an array of such strings. A key overrides a preset name of the same spelling, ignoring case. A blank value is skipped.
- **`accounts`.** The subscription kinds it acts on. `antigravity` is the default; a try on a key has no account and is never touched.
- **`off`.** Leave every request as it came.

The upstream plugin spells two of these `use_default_keywords` and `custom_mappings`; both spellings are read, so its configuration can be copied across.

## Modes

| Mode | What it does | Why |
|---|---|---|
| `cloak` (default) | A zero-width space (U+200B) after the first and after the second letter of each matched name, e.g. `C\u200bu\u200brsor`. The model reads the word as before. | It keeps the sentence readable. `rewrite` turns "You are a Claude agent" into "You are a Antigravity". This is also what magpie's own `antigravity-cloak` middleware does. |
| `rewrite` | The matched name becomes its mapping's value, usually `Antigravity`. | The upstream plugin's `rewrite` mode, ported as it is. |

The upstream plugin's third mode, `block` — turn the request away with a 403 naming what matched — has no equivalent here, and setting `mode: "block"` gets `cloak`. magpie calls `onProvider` after the request has been routed, and an `onProvider` cannot turn a request away (`ctx.reject` there does nothing; the agent would still get its reply). To turn a request away before routing, install [@magpie-community/middleware-block-patterns](https://github.com/magpie-community/plugins/tree/main/packages/block-patterns) as well — it runs on `onRequest`, before any provider is chosen, so it cannot tell Antigravity from a Claude subscription.

## What it reads

Only the system prompt, in whichever shape the API it came in keeps it. Nothing else in the request is touched: not the user's or the assistant's turns, not tool definitions or tool results, not metadata, not images.

| API | Read |
|---|---|
| Anthropic | the top-level `system`, as a string or as text blocks, and any `system` / `developer` message |
| Chat Completions | any `system` / `developer` message |
| Responses | `instructions`, and any `system` / `developer` input item, including `input_text` blocks |
| Gemini | `systemInstruction` and `system_instruction`, as a string or as a `{ parts }` object |

A request wrapped in a `request` object is unwrapped and read the same way, as the upstream plugin does.

Inside a system prompt, a name that is part of a technical reference is left alone: URLs, `mcp__…` identifiers, Windows and POSIX paths, `./` and `../`, `.codex`, and `*.md` file names. So `C:\work\Cursor\src\main.ts`, `https://cursor.com/docs`, `cursor.md` and `.codex/Cursor/rules.md` keep their `Cursor`, which is a path, not an identity. The upstream plugin protects the same list with the same regular expressions.

## The preset

56 names, as the upstream plugin ships them: Claude Agent, Claude Code, OpenAI Codex / Codex CLI, OpenCode, GitHub Copilot / CLI, Gemini Code Assist / Gemini CLI, Cursor, Windsurf, Codeium, Cline, Roo Code, Kilo Code, Aider, Continue.dev, Amazon Q Developer / CodeWhisperer, JetBrains AI Assistant / Junie, Kiro, Qoder / CLI, Qwen Code, Trae, Tabnine, Sourcegraph Cody, Augment Code, Replit Agent / Ghostwriter, Devin, OpenHands, SWE-agent, Goose, Zed AI, Void Editor, PearAI, Refact.ai, Tabby, GitLab Duo, Visual Studio IntelliCode, CodeBuddy, Blackbox AI, Pieces for Developers, Qodo / CodiumAI, Rovo Dev CLI, Factory Droid, OpenClaw / Clawdbot / Moltbot, Hermes Agent / Hermes, WorkBuddy.

Longest name first, ignoring case, so `GitHub Copilot CLI` is replaced once rather than as `GitHub Copilot` plus a leftover ` CLI`.

Known gaps, kept from the upstream list rather than guessed at:

- Model names are not in it. A prompt that says `You are Claude` or `based on GPT-5` passes. Issue #4 found that the model name alone can bring the 429 back, so if you hit that, add the line you actually send: `"customMappings": {"Claude Sonnet": "Antigravity", "GPT-5": "Antigravity"}`.
- `Amp`, `Manus`, `v0`, `Lovable`, `Codex` on its own, and `claude` on its own are not in it either.
- Some entries are ordinary words — `Goose`, `Hermes`, `Tabby`, `Cline` — so a system prompt that uses them for something else is rewritten too. That is the upstream preset's trade-off, not a bug in the port; take the entry out with a `customMappings` key of your own only if you can, or run with `useDefaultKeywords: false` and list exactly what you send.

## When the 429 comes back anyway

A `429 Resource has been exhausted` while magpie shows quota left, and while other requests on the same model and account go through, means something else in that system prompt is being matched — often text that isn't the agent's own: a custom prompt, or another plugin's injection.

To find it, replay the failing request with a short user message and take parts of the system prompt out, half at a time, until the 429 stops. Then add a distinctive phrase from the part that brought it back to `customMappings`. This middleware only touches the names it is given; it does not hide an arbitrary prompt.

## Differences from the Go plugin

| | CLIProxyAPI plugin | This |
|---|---|---|
| Hook | `request.intercept_after`, when `ToFormat == "antigravity"` | `onProvider`, when `ctx.provider.account` is in `accounts` |
| Default mode | `block` (403) | `cloak` (zero-width spaces) |
| `block` | 403 `blocked_by_antigravity_coding_filter` | not available; `mode: "block"` gets `cloak` |
| Rewrite | name → `Antigravity` | same, in `rewrite` mode |
| Protected references | URLs, `mcp__`, paths, `.codex`, `*.md` | same list, same expressions |
| Options | `mode`, `use_default_keywords`, `custom_mappings` | camelCase, with the snake_case spellings still read |
| Budget | 250 ms per hook | 250 ms per hook; about 0.6 ms on an 80 KB prompt, measured |

## Before you turn it on

- This changes what Google is sent so that a request it means to refuse isn't refused. It may be against Antigravity's terms, and Google can ban the account for it. Use it on an account you can afford to lose.
- Google can change what it matches at any time. On 11-11 a single zero-width space after the first letter stopped working and a second one was needed; the next change can break `cloak` again, and then the 429 comes back. If it does, try `rewrite`, or the names in `customMappings` instead of a cloaked one.
- The model reads the words as before, so this does not change what an agent is told it is — only what the string looks like on the wire.

## Tests

```sh
bun test
```

`cases.json` runs the hooks the way magpie's gateway calls them, and the same cases run in magpie's own JavaScript engine (moejs). `test/middleware.mjs` is copied from [magpie-community/plugins](https://github.com/magpie-community/plugins) (MIT) so the cases run on their own.

中文：把 CLIProxyAPI 的 antigravity-coding-filter 移植到 magpie 的 gateway middleware。只在发给 Antigravity 账号的那次尝试上、只改 system / developer 提示词：默认 `cloak`（在名字第一、第二个字母后各插一个零宽空格，模型照读，字面串变了），可选 `rewrite`（改成 `Antigravity`）；上游的 `block` 在 magpie 里做不到——`onProvider` 阶段请求已经路由，`ctx.reject` 无效，要拦截请配合 `middleware-block-patterns`。URL、路径、`mcp__`、`.codex`、`*.md` 里的名字不动。内置词表与 Go 版一致（56 条），模型名不在其中，需要就自己加 `customMappings`。这样做可能违反 Antigravity 的条款，账号有被封的风险。
