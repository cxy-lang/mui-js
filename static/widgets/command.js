// mui-js/static/widgets/command.js
import { h } from "../core.js";

// Accessible, headless Command Palette (⌘K / Ctrl+K) modal overlay.
export class CommandPalette {
    constructor({
        items = [], // [{ id, label, category, icon, shortcut, action, keywords }]
        search = null, // optional async search provider: (query) => items
        placeholder = "Type a command or search...",
        hotkey = "k", // paired with Meta/Ctrl
        icon = null,
        className = "",
    } = {}) {
        this.items = items;
        this.searchProvider = search;
        this.isOpen = false;
        this.filtered = [];
        this.activeIndex = 0;

        const paletteId = `cmd-${Math.random().toString(36).slice(2, 8)}`;

        this.input = h("input", {
            type: "search",
            class: "ui-cmd-input",
            placeholder,
            autocomplete: "off",
            spellcheck: "false",
            role: "combobox",
            "aria-expanded": "true",
            "aria-autocomplete": "list",
            "aria-controls": `${paletteId}-list`,
        });

        this.list = h("div", {
            id: `${paletteId}-list`,
            class: "ui-cmd-list",
            role: "listbox",
        });

        const iconEl = icon ? h("span", { class: "ui-cmd-search-icon" }, icon) : null;
        const header = h("div", { class: `ui-cmd-header ${icon ? "has-icon" : ""}`.trim() },
            iconEl,
            this.input,
            h("kbd", { class: "ui-cmd-esc-badge mono" }, "ESC")
        );

        this.dialog = h("dialog", {
            class: `ui-dialog ui-cmd-dialog ${className}`.trim(),
            role: "dialog",
            "aria-modal": "true",
            onclick: (e) => {
                if (e.target === this.dialog) this.close();
            },
        },
            h("article", { class: "ui-dialog-content ui-cmd-content" }, header, this.list)
        );

        document.body.append(this.dialog);

        // Global hotkey listener
        window.addEventListener("keydown", (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === hotkey.toLowerCase()) {
                e.preventDefault();
                this.toggle();
            }
        });

        this.input.addEventListener("input", () => this.#onQuery());
        this.input.addEventListener("keydown", (e) => this.#onKeyDown(e));
        this.dialog.addEventListener("close", () => { this.isOpen = false; });
    }

    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    }

    open() {
        this.isOpen = true;
        this.dialog.showModal();
        this.input.value = "";
        this.#onQuery();
        this.input.focus();
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.dialog.close();
    }

    async #onQuery() {
        const query = this.input.value.toLowerCase().trim();

        if (this.searchProvider) {
            this.filtered = await this.searchProvider(query);
        } else {
            if (!query) {
                this.filtered = this.items;
            } else {
                this.filtered = this.items.filter((item) => {
                    const matchLabel = item.label.toLowerCase().includes(query);
                    const matchCategory = item.category && item.category.toLowerCase().includes(query);
                    const matchKeywords = item.keywords && item.keywords.some((k) => k.toLowerCase().includes(query));
                    return matchLabel || matchCategory || matchKeywords;
                });
            }
        }

        this.activeIndex = 0;
        this.#renderList();
    }

    #renderList() {
        if (this.filtered.length === 0) {
            this.list.replaceChildren(
                h("div", { class: "ui-cmd-empty" }, "No matching commands found.")
            );
            return;
        }

        // Group by category
        const groups = new Map();
        for (const item of this.filtered) {
            const cat = item.category || "Commands";
            if (!groups.has(cat)) groups.set(cat, []);
            groups.get(cat).push(item);
        }

        let flatIndex = 0;
        const rendered = [];

        for (const [category, items] of groups.entries()) {
            rendered.push(h("div", { class: "ui-cmd-group-title" }, category));

            for (const item of items) {
                const itemIdx = flatIndex;
                const isSelected = itemIdx === this.activeIndex;

                const row = h("div", {
                    class: `ui-cmd-item ${isSelected ? "selected" : ""}`,
                    role: "option",
                    "aria-selected": isSelected ? "true" : "false",
                    onclick: () => this.#run(item),
                },
                    h("span", { class: "ui-cmd-item-left" },
                        item.icon ? h("span", { class: "ui-cmd-item-icon" }, item.icon) : null,
                        h("span", { class: "ui-cmd-item-label" }, item.label)
                    ),
                    item.shortcut ? h("kbd", { class: "ui-cmd-item-shortcut mono" }, item.shortcut) : null
                );

                rendered.push(row);
                flatIndex++;
            }
        }

        this.list.replaceChildren(...rendered);
    }

    #onKeyDown(e) {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (this.filtered.length > 0) {
                this.activeIndex = (this.activeIndex + 1) % this.filtered.length;
                this.#renderList();
                this.#scrollActiveIntoView();
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (this.filtered.length > 0) {
                this.activeIndex = (this.activeIndex - 1 + this.filtered.length) % this.filtered.length;
                this.#renderList();
                this.#scrollActiveIntoView();
            }
        } else if (e.key === "Enter") {
            e.preventDefault();
            const item = this.filtered[this.activeIndex];
            if (item) this.#run(item);
        } else if (e.key === "Escape") {
            e.preventDefault();
            this.close();
        }
    }

    #scrollActiveIntoView() {
        const selectedEl = this.list.querySelector(".ui-cmd-item.selected");
        if (selectedEl) {
            selectedEl.scrollIntoView({ block: "nearest" });
        }
    }

    #run(item) {
        this.close();
        if (item.action) {
            item.action();
        }
    }
}
