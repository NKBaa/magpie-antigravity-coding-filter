import { fileURLToPath, pathToFileURL } from "node:url";
// Real browser interaction checks. Set CHROME_BIN on non-Windows machines.
// The bridge below is a controlled stand-in for Magpie, using its official base CSS.
import { test } from "node:test";
import assert from "node:assert/strict";
const expect = (value) => ({
  toBe: (other) => assert.equal(value, other),
  toEqual: (other) => assert.deepEqual(value, other),
  toContain: (part) => assert.ok(value.includes(part)),
});
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
const chrome =
  process.env.CHROME_BIN ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(existsSync(chrome) ? test : test.skip)(
  "browser: edit, validate, preview, save, reload and responsive layout",
  async () => {
    const profile = mkdtempSync(join(tmpdir(), "filter-ui-"));
    const baseCSS = readFileSync(
      join(root, "test/fixtures/magpie-base.css"),
      "utf8",
    );
    const mock = `
    window.savedOptions=JSON.parse(localStorage.getItem('test-saved'))||{custom_mappings:'Cursor: Antigravity, My Agent: Example',use_default_keywords:true,extra:'preserved'};
    window.uiErrors=[];addEventListener('error',e=>{if(e.message)uiErrors.push(e.message)});
    const style=document.createElement('style');style.textContent=${JSON.stringify(baseCSS)};addEventListener('DOMContentLoaded',()=>document.head.prepend(style));
    window.magpie={theme:{lang:'zh',dark:false},ready:Promise.resolve({lang:'zh',dark:false}),onTheme(fn){this.themeChanged=fn},options:{async get(){if(window.failGet)throw Error('Read failed');return structuredClone(savedOptions)},async set(value){if(window.failSet)throw Error('Write failed');await new Promise(r=>setTimeout(r,50));savedOptions=structuredClone(value);window.writeCount=(window.writeCount||0)+1;return structuredClone(value)}}};
    addEventListener('DOMContentLoaded',()=>{document.documentElement.dataset.theme='light';document.documentElement.style.cssText='--magpie-bg:#fff;--magpie-fg:#1d1d1f;--magpie-muted:#6e6e73;--magpie-line:#e5e5ea;--magpie-card:#f6f6f7;--magpie-accent:#4f46e5;--magpie-accent-soft:rgba(79,70,229,.12)'});
  `;

    const processChrome = spawn(
      chrome,
      [
        "--headless=new",
        "--no-sandbox",
        "--no-first-run",
        "--disable-gpu",
        "--remote-debugging-pipe",
        `--user-data-dir=${profile}`,
        "about:blank",
      ],
      { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] },
    );
    let id = 0,
      sessionId,
      buffer = "";
    const pending = new Map();
    processChrome.stdio[4].on("data", (chunk) => {
      buffer += chunk.toString();
      let at;
      while ((at = buffer.indexOf("\0")) >= 0) {
        const text = buffer.slice(0, at);
        buffer = buffer.slice(at + 1);
        if (!text) continue;
        const data = JSON.parse(text);
        if (pending.has(data.id)) {
          const { resolve, reject, timer } = pending.get(data.id);
          pending.delete(data.id);
          clearTimeout(timer);
          data.error ? reject(Error(data.error.message)) : resolve(data.result);
        }
      }
    });
    const call = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const n = ++id,
          timer = setTimeout(() => {
            pending.delete(n);
            reject(Error("CDP timeout: " + method));
          }, 10000);
        pending.set(n, { resolve, reject, timer });
        processChrome.stdio[3].write(
          JSON.stringify({
            id: n,
            method,
            params,
            ...(sessionId ? { sessionId } : {}),
          }) + "\0",
        );
      });
    try {
      const target = await call("Target.createTarget", { url: "about:blank" });
      sessionId = (
        await call("Target.attachToTarget", {
          targetId: target.targetId,
          flatten: true,
        })
      ).sessionId;
      await call("Page.enable");
      await call("Page.addScriptToEvaluateOnNewDocument", { source: mock });
      const evaluate = async (expression) => {
        const result = await call("Runtime.evaluate", {
          expression,
          returnByValue: true,
          awaitPromise: true,
        });
        if (result.exceptionDetails)
          throw Error(
            result.exceptionDetails.text +
              ": " +
              result.exceptionDetails.exception?.description,
          );
        return result.result.value;
      };
      const wait = async (expression) => {
        for (let i = 0; i < 100; i++) {
          if (await evaluate(expression)) return;
          await delay(30);
        }
        throw Error(
          "Condition not satisfied: " +
            expression +
            "; " +
            (await evaluate(
              `JSON.stringify({url:location.href,state:document.getElementById('state')?.textContent,message:document.getElementById('message')?.textContent,errors:window.uiErrors})`,
            )),
        );
      };
      await call("Emulation.setDeviceMetricsOverride", {
        width: 1360,
        height: 1100,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await call("Page.navigate", {
        url: pathToFileURL(join(root, "page/index.html")).href,
      });
      await wait(`document.getElementById('state')?.textContent==='已保存'`);
      expect(await evaluate(`uiErrors`)).toEqual([]);
      expect(
        await evaluate(
          `document.getElementById('enabled').matches('button.lib-switch.use-credits[role="switch"]')`,
        ),
      ).toBe(true);
      expect(
        await evaluate(
          `document.getElementById('enabled').getAttribute('aria-checked')`,
        ),
      ).toBe("true");
      expect(
        await evaluate(
          `document.querySelectorAll('input[type="checkbox"]').length`,
        ),
      ).toBe(0);
      expect(
        await evaluate(
          `document.querySelectorAll('button:not([data-magpie-component])').length`,
        ),
      ).toBe(0);
      expect(
        await evaluate(
          `document.querySelectorAll('.row.pref[data-magpie-component="row"]').length`,
        ),
      ).toBe(11);
      await evaluate(`document.getElementById('enabled').focus()`);
      for (const type of ["keyDown", "keyUp"])
        await call("Input.dispatchKeyEvent", {
          type,
          key: " ",
          code: "Space",
          windowsVirtualKeyCode: 32,
        });
      expect(
        await evaluate(
          `document.getElementById('enabled').getAttribute('aria-checked')`,
        ),
      ).toBe("false");
      for (const type of ["keyDown", "keyUp"])
        await call("Input.dispatchKeyEvent", {
          type,
          key: " ",
          code: "Space",
          windowsVirtualKeyCode: 32,
        });
      expect(await evaluate(`document.getElementById('enabled').checked`)).toBe(
        true,
      );
      expect(
        await evaluate(
          `getComputedStyle(document.getElementById('cloak')).backgroundColor !== getComputedStyle(document.getElementById('rewrite')).backgroundColor`,
        ),
      ).toBe(true);
      expect(
        await evaluate(`document.querySelectorAll('#rules .rule').length`),
      ).toBe(2);
      expect(await evaluate(`document.getElementById('save').disabled`)).toBe(
        true,
      );
      expect(await evaluate(`document.getElementById('advanced').open`)).toBe(
        false,
      );
      await evaluate(`document.getElementById('example').click()`);
      expect(
        await evaluate(`document.getElementById('matches').textContent`),
      ).toContain("Chatbox");
      await evaluate(`document.getElementById('enabled').click()`);
      expect(await evaluate(`document.getElementById('out').textContent`)).toBe(
        await evaluate(`document.getElementById('sample').value`),
      );
      expect(
        await evaluate(`document.getElementById('preview-status').textContent`),
      ).toContain("已关闭");
      await evaluate(
        `document.getElementById('enabled').click();document.getElementById('rewrite').click()`,
      );
      expect(
        await evaluate(`document.getElementById('out').textContent`),
      ).toContain("You are Antigravity");
      await evaluate(
        `document.getElementById('advanced').open=true;document.getElementById('dryRun').click()`,
      );
      expect(await evaluate(`document.getElementById('out').textContent`)).toBe(
        await evaluate(`document.getElementById('sample').value`),
      );
      await evaluate(
        `document.getElementById('dryRun').click();document.getElementById('add-rule').click()`,
      );
      expect(await evaluate(`document.getElementById('save').disabled`)).toBe(
        true,
      );
      expect(
        await evaluate(`document.getElementById('state').textContent`),
      ).toContain("请填写");
      await evaluate(
        `const input=document.querySelectorAll('#rules input[data-field="name"]')[2];input.value='New Agent';input.dispatchEvent(new Event('input',{bubbles:true}))`,
      );
      expect(await evaluate(`document.getElementById('save').disabled`)).toBe(
        false,
      );
      await evaluate(
        `savedOptions.customMappings={Cursor:'Antigravity','My Agent':'Example','Remote Agent':'Example'};document.getElementById('save').click()`,
      );
      await wait(`document.getElementById('state').textContent==='已保存'`);
      expect(await evaluate(`savedOptions.customMappings['New Agent']`)).toBe(
        "Antigravity",
      );
      expect(
        await evaluate(`savedOptions.customMappings['Remote Agent']`),
      ).toBe("Example");
      expect(await evaluate(`savedOptions.extra`)).toBe("preserved");
      const writes = await evaluate("window.writeCount");
      await evaluate(
        `document.dispatchEvent(new KeyboardEvent('keydown',{key:'s',ctrlKey:true,bubbles:true,cancelable:true}))`,
      );
      await delay(100);
      expect(await evaluate("window.writeCount")).toBe(writes);
      await evaluate(
        `Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw Error('Clipboard denied')}},configurable:true});document.getElementById('copy-json').click()`,
      );
      await wait(
        `document.getElementById('message').textContent.includes('Ctrl/Cmd+C')`,
      );
      expect(await evaluate(`window.getSelection().toString()`)).toBe(
        await evaluate(`document.getElementById('json').textContent`),
      );
      expect(await evaluate(`document.getElementById('advanced').open`)).toBe(
        true,
      );
      expect(
        await evaluate(`Object.hasOwn(savedOptions,'custom_mappings')`),
      ).toBe(false);
      // Reload just the page script state through the actual saved configuration.
      await evaluate(
        `localStorage.setItem('test-saved',JSON.stringify(savedOptions))`,
      );
      const origin = await evaluate("performance.timeOrigin");
      await call("Page.reload");
      await wait(
        `performance.timeOrigin!==${origin} && document.getElementById('state')?.textContent==='已保存'`,
      );
      expect(
        await evaluate(`document.querySelectorAll('#rules .rule').length`),
      ).toBe(4);
      await evaluate(
        `document.querySelectorAll('#rules .rule button.danger')[2].click();window.failSet=true;document.getElementById('save').click()`,
      );
      await wait(
        `document.getElementById('message').textContent.includes('Write failed')`,
      );
      expect(await evaluate(`document.getElementById('save').disabled`)).toBe(
        false,
      );
      expect(
        await evaluate(`document.getElementById('state').textContent`),
      ).toContain("未保存");
      await evaluate(
        `window.failSet=false;document.getElementById('advanced').open=false;document.getElementById('cloak').click();document.getElementById('save').click()`,
      );
      await wait(`document.getElementById('state').textContent==='已保存'`);
      expect(await evaluate(`uiErrors`)).toEqual([]);
      await evaluate(
        `document.getElementById('example').click();document.documentElement.style.setProperty('--magpie-font', '"Segoe UI", "Microsoft YaHei", system-ui, sans-serif');document.fonts.ready`,
      );
      await evaluate(
        `new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`,
      );
      const screenshot = async (name) => {
        await evaluate(
          `new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`,
        );
        const shot = await call("Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: true,
        });
        writeFileSync(
          join(root, "docs", name),
          Buffer.from(shot.data, "base64"),
        );
      };
      if (process.env.CAPTURE_UI) await screenshot("screenshot.png");
      await evaluate(
        `document.documentElement.style.cssText='--magpie-bg:#1c1c1e;--magpie-fg:#f2f2f7;--magpie-muted:#a1a1a8;--magpie-line:#3a3a3c;--magpie-card:#2c2c2e;--magpie-accent:#8b86ff;--magpie-accent-soft:rgba(139,134,255,.18);color-scheme:dark';document.documentElement.dataset.theme='dark'`,
      );
      if (process.env.CAPTURE_UI) await screenshot("screenshot-dark.png");
      await call("Emulation.setDeviceMetricsOverride", {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: false,
      });
      expect(
        await evaluate(`document.documentElement.scrollWidth<=innerWidth`),
      ).toBe(true);
      if (process.env.CAPTURE_UI) await screenshot("screenshot-mobile.png");
      // Configuration read failure must never leave a writable default form.
      await call("Page.addScriptToEvaluateOnNewDocument", {
        source: "window.failGet=true",
      });
      await call("Page.reload");
      await wait(
        `document.getElementById('message')?.textContent.includes('读取设置失败')`,
      );
      expect(await evaluate(`document.getElementById('save').disabled`)).toBe(
        true,
      );
    } finally {
      sessionId = undefined;
      try {
        await call("Browser.close");
      } catch {}
      processChrome.kill();
      // Chrome may keep subprocess handles briefly; cleanup never targets outside this generated profile.
      if (profile.startsWith(join(tmpdir(), "filter-ui-"))) {
        try {
          rmSync(profile, { recursive: true, force: true });
        } catch {}
      }
    }
  },
);
