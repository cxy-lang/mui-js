// mui-js/static/widgets/contextmenu.js
import { h } from "../core.js";

// Accessible, headless Context Menu popover triggered on right-click.
export class ContextMenu {
    constructor({
        items = [], // [{ label, icon, shortcut, action, danger, divider }]
        className = "",
    } = {}) {
        this.items = items;
        this.isOpen = false;

        this.menu = h("div", {
            class: `ui-context-menu ${className}`.trim(),
            role: "menu",
            hidden: true,
        });

        document.body.append(this.menu);
        this.#render();

        document.addEventListener("click", () => {
            if (this.isOpen) this.close();
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.isOpen) {
                this.close();
            }
        });
    }

    #render() {
        this.menu.replaceChildren(
            ...this.items.map((item) => {
                if (item.divider) {
                    return h("hr", { class: "ui-context-divider", role: "separator" });
                }

                return h("button", {
                    type: "button",
                    role: "menuitem",
                    class: `ui-context-item ${item.danger ? "danger" : ""}`.trim(),
                    disabled: item.disabled ? true : null,
                    onclick: (e) => {
                        e.stopPropagation();
                        this.close();
                        if (item.action) item.action();
                    },
                },
                    item.icon ? h("span", { class: "ui-context-icon" }, item.icon) : null,
                    h("span", { class: "ui-context-label" }, item.label),
                    item.shortcut ? h("kbd", { class: "ui-context-shortcut mono" }, item.shortcut) : null
                );
            })
        );
    }

    openAt(x, y) {
        this.isOpen = true;
        this.menu.hidden = false;

        // Position adjustment to avoid viewport clipping
        const menuWidth = 190;
        const menuHeight = 220;
        const winWidth = window.innerWidth;
        const winHeight = window.innerHeight;

        let posX = x;
        let posY = y;

        if (posX + menuWidth > winWidth) {
            posX = Math.max(8, winWidth - menuWidth - 8);
        }
        if (posY + menuHeight > winHeight) {
            posY = Math.max(8, winHeight - menuHeight - 8);
        }

        this.menu.style.left = `${posX}px`;
        this.menu.style.top = `${posY}px`;
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.menu.hidden = true;
    }

    // Attach right-click listener to any target element
    static attach(target, items, opts = {}) {
        const menu = new ContextMenu({ items, ...opts });
        target.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            menu.openAt(e.clientX, e.clientY);
        });
        return menu;
    }
}
