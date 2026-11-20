// mui-js/static/widgets/suggest.js
import { h } from "../core.js";

// Accessible, headless autocomplete dropdown with keyboard navigation.
export class SuggestBox {
    constructor({
        suggest,
        onSubmit,
        onInput = () => {},
        placeholder = "",
        label = "Search",
        mono = true,
        className = "",
    } = {}) {
        this.suggest = suggest;
        this.onSubmit = onSubmit;
        this.onInput = onInput;
        this.items = [];
        this.active = -1;

        const id = `suggest-${Math.random().toString(36).slice(2, 8)}`;
        this.input = h("input", {
            type: "text",
            placeholder,
            autocomplete: "off",
            spellcheck: "false",
            autocapitalize: "off",
            class: mono ? "mono ui-suggest-input" : "ui-suggest-input",
            role: "combobox",
            "aria-label": label,
            "aria-autocomplete": "list",
            "aria-expanded": "false",
            "aria-controls": id,
        });

        this.list = h("div", {
            class: "suggest-list ui-suggest-dropdown",
            id,
            role: "listbox",
            hidden: true,
        });

        this.el = h("div", { class: `suggest-box ui-suggest-wrap ${className}`.trim() },
            this.input,
            this.list
        );

        this.input.addEventListener("input", () => {
            this.onInput(this.input.value);
            this.refresh();
        });
        this.input.addEventListener("focus", () => this.refresh());
        this.input.addEventListener("keydown", (e) => this.#key(e));
        this.list.addEventListener("mousedown", (e) => e.preventDefault());
        this.input.addEventListener("blur", () => this.close());
    }

    get value() {
        return this.input.value;
    }

    set value(text) {
        this.input.value = text;
    }

    focus() {
        this.input.focus();
    }

    refresh() {
        this.items = this.suggest(this.input.value) || [];
        this.active = -1;
        this.#draw();
    }

    close() {
        this.items = [];
        this.active = -1;
        this.#draw();
    }

    #draw() {
        this.list.replaceChildren(
            ...this.items.map((s, i) =>
                h("div", {
                    class: `suggest-item ui-suggest-item${i === this.active ? " active" : ""}`,
                    role: "option",
                    id: `${this.list.id}-${i}`,
                    "aria-selected": i === this.active ? "true" : "false",
                    "data-text": s.text,
                    onclick: () => this.accept(s),
                }, s.label)
            )
        );
        const open = this.items.length > 0;
        this.list.hidden = !open;
        this.input.setAttribute("aria-expanded", open ? "true" : "false");
        if (this.active >= 0) {
            this.input.setAttribute("aria-activedescendant", `${this.list.id}-${this.active}`);
        } else {
            this.input.removeAttribute("aria-activedescendant");
        }
    }

    accept(s) {
        this.input.value = s.text;
        this.onInput(this.input.value);
        this.refresh();
        this.input.focus();
    }

    #move(by) {
        if (this.items.length === 0) return;
        const n = this.items.length;
        this.active = ((this.active + 1 + by + (n + 1)) % (n + 1)) - 1;
        this.#draw();
    }

    #key(e) {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (this.items.length === 0) this.refresh();
            else this.#move(1);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            this.#move(-1);
        } else if (e.key === "Tab") {
            const chosen = this.active >= 0 ? this.items[this.active] : this.items[0];
            if (chosen) {
                e.preventDefault();
                this.accept(chosen);
            }
        } else if (e.key === "Enter") {
            if (this.active >= 0 && this.items[this.active]) {
                e.preventDefault();
                this.accept(this.items[this.active]);
            } else if (this.onSubmit) {
                e.preventDefault();
                this.onSubmit(this.input.value);
                this.close();
            }
        } else if (e.key === "Escape") {
            this.close();
        }
    }
}
