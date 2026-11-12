// Sandbox adapter for the official Magpie component subset in vendor/.
// No parent DOM access, host API mutation, or network access is required.
(() => {
  const ui = globalThis.magpie?.ui || globalThis.MagpieUI;
  function button(label, action, cls = "text action") {
    const control = ui.button(label, action, cls);
    control.dataset.magpieComponent = "button";
    return control;
  }
  function toggle(on, label) {
    let syncing = false;
    const control = ui.toggle(Boolean(on), label, () => {
      if (!syncing)
        control.dispatchEvent(new Event("change", { bubbles: true }));
    });
    control.dataset.magpieComponent = "toggle";
    // Keep the existing form's checked contract while the official component
    // owns its state, aria-checked, knob and click behavior.
    Object.defineProperty(control, "checked", {
      get: () => control.getAttribute("aria-checked") === "true",
      set(next) {
        if (Boolean(next) === control.checked) return;
        syncing = true;
        try {
          control.onclick();
        } finally {
          syncing = false;
        }
      },
    });
    return control;
  }
  function mount() {
    // Existing markup supplies semantic labels and stable ids; official
    // components replace controls before the app wires its event listeners.
    for (const original of document.querySelectorAll("button")) {
      const control = button(
        original.textContent.trim(),
        () => {},
        original.id === "save"
          ? "text action primary"
          : ["cloak", "rewrite"].includes(original.id)
            ? "text"
            : "text action",
      );
      for (const attribute of original.attributes) {
        if (attribute.name !== "class")
          control.setAttribute(attribute.name, attribute.value);
      }
      original.replaceWith(control);
    }
    for (const original of document.querySelectorAll(
      'input[type="checkbox"]',
    )) {
      const caption = original.closest("label")?.querySelector("[data-t]");
      const control = toggle(
        original.checked,
        caption?.textContent.trim() || original.id,
      );
      control.id = original.id;
      if (caption?.dataset.t) control.dataset.labelKey = caption.dataset.t;
      original.replaceWith(control);
    }
    for (const original of document.querySelectorAll(".setting")) {
      const caption =
        original.querySelector("strong") || original.firstElementChild;
      const description = original.querySelector("small");
      const control = original.lastElementChild;
      const row = ui.row(
        caption.textContent.trim(),
        description?.textContent.trim(),
        control,
      );
      row.dataset.magpieComponent = "row";
      if (caption.dataset.t)
        row.querySelector(".name").dataset.t = caption.dataset.t;
      if (description) {
        let sub = row.querySelector(".sub");
        if (!sub) {
          sub = ui.el("div", "sub");
          row.querySelector(".who").append(sub);
        }
        if (description.id) sub.id = description.id;
        if (description.dataset.t) sub.dataset.t = description.dataset.t;
      }
      original.replaceWith(row);
    }
    const accounts = document.getElementById("accounts");
    const field = accounts.closest(".field");
    const caption = field.querySelector("span");
    accounts.classList.add("set-field");
    const accountRow = ui.row(caption.textContent.trim(), "", accounts);
    accountRow.dataset.magpieComponent = "row";
    accountRow.querySelector(".name").dataset.t = caption.dataset.t;
    field.replaceWith(accountRow);
  }
  function relabel(t) {
    document.querySelectorAll("[data-label-key]").forEach((control) => {
      control.setAttribute("aria-label", t(control.dataset.labelKey));
    });
  }
  globalThis.FilterControls = { ui, button, toggle, mount, relabel };
})();
