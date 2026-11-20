// mui-js/static/widgets/dropdown.js
import { h } from "../core.js";

// Accessible, headless Dropdown Menu popover.
export class Dropdown {
    constructor({
        trigger,
        items = [],
        align = "left", // "left" | "right"
        className = "",
    } = {}) {
        this.items = items;
        this.isOpen = false;
        this.activeIndex = -1;

        const menuId = `menu-${Math.random().toString(36).slice(2, 8)}`;

        this.triggerBtn = typeof trigger === "string"
            ? h("button", { type: "button", class: "ui-dropdown-trigger" }, trigger)
            : trigger;

        this.triggerBtn.setAttribute("aria-haspopup", "menu");
        this.triggerBtn.setAttribute("aria-expanded", "false");
        this.triggerBtn.setAttribute("aria-controls", menuId);

        this.menu = h("div", {
            id: menuId,
            class: `ui-dropdown-menu align-${align}`,
            role: "menu",
            hidden: true,
        });

        this.el = h("div", {
            class: `ui-dropdown-wrap ${className}`.trim(),
        }, this.triggerBtn, this.menu);

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

    #renderItems() {
        this.menuElements = [];
        this.menu.replaceChildren(
            ...this.items.map((item, idx) => {
                if (item.divider) {
                    return h("hr", { class: "ui-dropdown-divider", role: "separator" });
                }

                const btn = h("button", {
                    type: "button",
                    role: "menuitem",
                    class: `ui-dropdown-item ${item.danger ? "danger" : ""} ${item.className || ""}`.trim(),
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
