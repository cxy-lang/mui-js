// mui-js/static/widgets/search.js
import { h } from "../core.js";

// Accessible, debounced Search & Filter Bar for server-side list queries.
export class SearchFilterBar {
    constructor({
        placeholder = "Search...",
        value = "",
        debounceMs = 250,
        icon = null,
        clearable = true,
        clearIcon = "✕",
        onChange = () => {},
        onClear = () => {},
        className = "",
    } = {}) {
        this.debounceMs = debounceMs;
        this.onChange = onChange;
        this.onClear = onClear;
        this.clearable = clearable;
        this.clearIcon = clearIcon;
        this._timer = null;

        this.input = h("input", {
            type: "search",
            class: "ui-search-input",
            placeholder,
            value,
            autocomplete: "off",
            spellcheck: "false",
        });

        this.clearBtn = clearable
            ? h("button", {
                type: "button",
                class: "ui-search-clear-btn",
                "aria-label": "Clear search",
                hidden: !value,
                onclick: () => this.clear(),
            }, clearIcon)
            : null;

        const iconEl = icon ? h("span", { class: "ui-search-icon" }, icon) : null;
        const hasIcon = icon !== null && icon !== false;

        this.el = h("div", {
            class: `ui-search-wrap ${hasIcon ? "has-icon" : ""} ${className}`.trim(),
        },
            iconEl,
            this.input,
            this.clearBtn
        );

        this.input.addEventListener("input", () => {
            const val = this.input.value;
            if (this.clearBtn) {
                this.clearBtn.hidden = !val;
            }

            if (this._timer) clearTimeout(this._timer);
            this._timer = setTimeout(() => {
                this.onChange(val.trim());
            }, this.debounceMs);
        });

        this.input.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.input.value) {
                e.preventDefault();
                this.clear();
            }
        });
    }

    get value() {
        return this.input.value.trim();
    }

    set(val) {
        this.input.value = val;
        if (this.clearBtn) {
            this.clearBtn.hidden = !val;
        }
        this.onChange(val.trim());
    }

    clear() {
        this.input.value = "";
        if (this.clearBtn) {
            this.clearBtn.hidden = true;
        }
        this.input.focus();
        this.onClear();
        this.onChange("");
    }
}
