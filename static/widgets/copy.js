// mui-js/static/widgets/copy.js
import { h } from "../core.js";

// Read-only input with copy button that writes to the navigator clipboard.
export class CopyField {
    constructor({ value = "", label = "Copy to clipboard", className = "" } = {}) {
        this.value = value;
        this.text = h("input", {
            type: "text",
            readonly: true,
            value,
            class: "mono",
            "aria-label": label,
            onfocus: (e) => e.target.select(),
        });

        this.button = h("button", {
            type: "button",
            class: "copy-btn ui-copy-btn",
            "aria-label": label,
            title: label,
            onclick: () => this.copy(),
        }, "Copy");

        this.el = h("div", { class: `copy-field ui-copy-field ${className}`.trim() },
            this.text,
            this.button
        );
    }

    set(val) {
        this.value = val;
        this.text.value = val;
    }

    async copy() {
        try {
            await navigator.clipboard.writeText(this.value);
            const orig = this.button.textContent;
            this.button.textContent = "Copied!";
            setTimeout(() => { this.button.textContent = orig; }, 1500);
        } catch (_) {
            this.text.select();
        }
    }
}
