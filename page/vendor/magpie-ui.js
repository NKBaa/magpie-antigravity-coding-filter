// Official Magpie UI components: button, toggle and row, copied unchanged.
// Source: yetone/magpie internal/gui/assets/kernel.js
// Revision: f38ef9821b17cd08af1bca60081d03b00d6970dc (MIT; see LICENSE.magpie).
// The host's simple `el` dependency is supplied locally for the page sandbox.
(() => {
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  const ui = {
    el: (tag, cls, text) => el(tag, cls, text),
    button(label, onClick, cls = "text") {
      const b = el("button", cls, label);
      b.type = "button";
      b.onclick = onClick;
      return b;
    },
    toggle(on, label, onChange) {
      const b = el("button", "lib-switch use-credits" + (on ? " on" : ""));
      b.type = "button";
      b.setAttribute("role", "switch");
      b.setAttribute("aria-checked", String(on));
      b.setAttribute("aria-label", label);
      b.append(el("i"));
      b.onclick = () => {
        on = !on;
        b.classList.toggle("on", on);
        b.setAttribute("aria-checked", String(on));
        onChange(on);
      };
      return b;
    },
    row(title, description, control) {
      const r = el("div", "row pref");
      const who = el("div", "who");
      who.append(el("div", "name", title));
      if (description) who.append(el("div", "sub", description));
      r.append(who, control);
      return r;
    },
  };
  globalThis.MagpieUI = Object.freeze(ui);
})();

