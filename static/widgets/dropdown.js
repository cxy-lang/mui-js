// mui-js/static/widgets/dropdown.js
import { h } from "../core.js";

// Accessible, headless Dropdown component.
// Supports two modes:
// 1. Action Menu: { trigger, items: [...] } (popover menu with actions/links)
// 2. Select Picker: { name, value, options: [...], onChange } (form select replacement)
export class Dropdown {
    constructor({
        trigger = null,
        items = null,
        options = null,
        value = "",
        name = "",
        placeholder = "Select...",
        onChange = () => {},
        align = "left", // "left" | "right"
        className = "",
    } = {}) {
        this.align = align;
        this.onChange = onChange;
        this.isOpen = false;
        this.activeIndex = -1;
        this._listeners = new Map();

        const menuId = `menu-${Math.random().toString(36).slice(2, 8)}`;

        if (options !== null) {
            // Select Mode
            this.mode = "select";
            this.rawOptions = options.map((opt) =>
                typeof opt === "object" && opt !== null ? { value: String(opt.value), label: String(opt.label ?? opt.value) } : { value: String(opt), label: String(opt) }
            );
            this._value = String(value ?? "");
            this.name = name;
            this.placeholder = placeholder;

            this.selectEl = h("select", {
                name,
                class: "ui-dropdown-select",
                style: { position: "absolute", opacity: "0", pointerEvents: "none", width: "1px", height: "1px" },
                tabindex: "-1",
                "aria-hidden": "true",
            }, ...this.rawOptions.map((o) => h("option", { value: o.value }, o.label)));
            this.selectEl.value = this._value;

            this.labelSpan = h("span", { class: "ui-dropdown-label" }, this.#labelFor(this._value));
            this.arrowSpan = h("span", { class: "ui-dropdown-arrow", "aria-hidden": "true" }, " ▾");

            this.triggerBtn = typeof trigger === "string"
                ? h("button", { type: "button", class: "ui-dropdown-trigger select-trigger" }, trigger)
                : (trigger || h("button", { type: "button", class: "ui-dropdown-trigger select-trigger" }, this.labelSpan, this.arrowSpan));

            this.items = this.rawOptions.map((opt) => ({
                label: opt.label,
                value: opt.value,
                action: () => this.select(opt.value),
            }));

            this.selectEl.addEventListener("change", () => {
                this.select(this.selectEl.value, false);
            });
        } else {
            // Action Menu Mode
            this.mode = "menu";
            this.items = items || [];
            this.triggerBtn = typeof trigger === "string"
                ? h("button", { type: "button", class: "ui-dropdown-trigger" }, trigger)
                : (trigger || h("button", { type: "button", class: "ui-dropdown-trigger" }, "Options ▾"));
        }

        this.triggerBtn.setAttribute("aria-haspopup", "menu");
        this.triggerBtn.setAttribute("aria-expanded", "false");
        this.triggerBtn.setAttribute("aria-controls", menuId);

        this.menu = h("div", {
            id: menuId,
            class: `ui-dropdown-menu align-${align}`,
            role: "menu",
            hidden: true,
        });

        const children = [this.triggerBtn, this.menu];
        if (this.selectEl) children.unshift(this.selectEl);

        this.el = h("div", {
            class: `ui-dropdown-wrap ${this.mode === "select" ? "ui-select" : ""} ${className}`.trim(),
        }, ...children);

        this.#renderItems();

        this.triggerBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.toggle();
        });

        this.triggerBtn.addEventListener("keydown", (e) => this.#onTriggerKey(e));
        this.menu.addEventListener("keydown", (e) => this.#onMenuKey(e));

        document.addEventListener("click", (e) => {
            if (this.isOpen && !this.el.contains(e.target)) {
                this.close();
            }
        });
    }

    #labelFor(val) {
        if (!this.rawOptions) return val;
        const found = this.rawOptions.find((o) => o.value === String(val));
        return found ? found.label : (this.placeholder || val);
    }

    get value() {
        return this.mode === "select" ? (this.selectEl ? this.selectEl.value : this._value) : undefined;
    }

    set value(next) {
        if (this.mode === "select") {
            this.select(next, false);
        }
    }

    get options() {
        return this.selectEl ? this.selectEl.options : this.rawOptions;
    }

    select(val, notify = true) {
        this._value = String(val ?? "");
        if (this.selectEl) this.selectEl.value = this._value;
        if (this.labelSpan) this.labelSpan.textContent = this.#labelFor(this._value);
        if (notify) {
            this.onChange(this._value);
            if (this.selectEl) this.selectEl.dispatchEvent(new Event("change", { bubbles: true }));
            const listeners = this._listeners.get("change") || [];
            for (const fn of listeners) fn({ target: this });
        }
    }

    addEventListener(event, fn) {
        if (!this._listeners.has(event)) this._listeners.set(event, []);
        this._listeners.get(event).push(fn);
    }

    removeEventListener(event, fn) {
        const list = this._listeners.get(event) || [];
        const idx = list.indexOf(fn);
        if (idx !== -1) list.splice(idx, 1);
    }

    #renderItems() {
        this.menuElements = [];
        this.menu.replaceChildren(
            ...this.items.map((item) => {
                if (item.divider) {
                    return h("hr", { class: "ui-dropdown-divider", role: "separator" });
                }

                const isSelected = this.mode === "select" && String(item.value) === this._value;
                const btn = h("button", {
                    type: "button",
                    role: "menuitem",
                    class: `ui-dropdown-item ${item.danger ? "danger" : ""} ${isSelected ? "selected is-active" : ""} ${item.className || ""}`.trim(),
                    disabled: item.disabled ? true : null,
                    onclick: (e) => {
                        e.stopPropagation();
                        if (item.disabled) return;
                        this.close();
                        if (item.action) item.action();
                    },
                },
                    item.icon ? h("span", { class: "ui-dropdown-item-icon" }, item.icon) : null,
                    h("span", { class: "ui-dropdown-item-label" }, item.label),
                    item.shortcut ? h("kbd", { class: "ui-dropdown-shortcut mono" }, item.shortcut) : null
                );

                this.menuElements.push({ el: btn, item });
                return btn;
            })
        );
    }

    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    }

    open() {
        this.isOpen = true;
        this.menu.hidden = false;
        this.triggerBtn.setAttribute("aria-expanded", "true");
        this.activeIndex = -1;
    }

    close() {
        this.isOpen = false;
        this.menu.hidden = true;
        this.triggerBtn.setAttribute("aria-expanded", "false");
        this.activeIndex = -1;
    }

    #onTriggerKey(e) {
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            this.open();
            this.#focusItem(0);
        } else if (e.key === "Escape" && this.isOpen) {
            e.preventDefault();
            this.close();
        }
    }

    #onMenuKey(e) {
        const enabled = this.menuElements.filter((m) => !m.item.disabled);
        if (enabled.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            this.activeIndex = (this.activeIndex + 1) % enabled.length;
            enabled[this.activeIndex].el.focus();
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            this.activeIndex = (this.activeIndex - 1 + enabled.length) % enabled.length;
            enabled[this.activeIndex].el.focus();
        } else if (e.key === "Escape") {
            e.preventDefault();
            this.close();
            this.triggerBtn.focus();
        }
    }

    #focusItem(idx) {
        const enabled = this.menuElements.filter((m) => !m.item.disabled);
        if (enabled[idx]) {
            this.activeIndex = idx;
            enabled[idx].el.focus();
        }
    }
}
