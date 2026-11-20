// mui-js/static/widgets/accordion.js
import { h } from "../core.js";

// Accessible, headless Accordion / Collapsible component.
export class Accordion {
    constructor({
        items = [],
        multi = false,
        iconCollapsed = "▸",
        iconExpanded = "▾",
        onChange = () => {},
        className = "",
    } = {}) {
        this.items = items;
        this.multi = multi;
        this.iconCollapsed = iconCollapsed;
        this.iconExpanded = iconExpanded;
        this.onChange = onChange;
        this.openIds = new Set(items.filter((it) => it.open).map((it) => it.id));

        this.el = h("div", {
            class: `ui-accordion-wrap ${className}`.trim(),
        });

        this.#render();
    }

    #render() {
        this.itemElements = [];
        this.el.replaceChildren(
            ...this.items.map((item) => {
                const isOpen = this.openIds.has(item.id);
                const headerId = `acc-hdr-${item.id}`;
                const panelId = `acc-pnl-${item.id}`;

                const iconContent = isOpen ? this.iconExpanded : this.iconCollapsed;
                const toggleIcon = iconContent !== null
                    ? h("span", { class: "ui-accordion-icon", "aria-hidden": "true" }, iconContent)
                    : null;

                const btnChildren = [h("span", { class: "ui-accordion-title" }, item.title)];
                if (toggleIcon) btnChildren.push(toggleIcon);

                const btn = h("button", {
                    id: headerId,
                    type: "button",
                    class: `ui-accordion-header ${isOpen ? "open" : ""}`,
                    "aria-expanded": isOpen ? "true" : "false",
                    "aria-controls": panelId,
                    onclick: () => this.toggle(item.id),
                }, ...btnChildren);

                const content = typeof item.content === "function" ? item.content() : item.content;
                const panel = h("div", {
                    id: panelId,
                    role: "region",
                    class: `ui-accordion-panel ${isOpen ? "open" : ""}`,
                    "aria-labelledby": headerId,
                    hidden: !isOpen,
                }, content);

                const itemWrap = h("div", {
                    class: `ui-accordion-item ${isOpen ? "open" : ""}`,
                }, btn, panel);

                this.itemElements.push({ id: item.id, btn, panel, itemWrap, toggleIcon });
                return itemWrap;
            })
        );
    }

    toggle(id) {
        const isCurrentlyOpen = this.openIds.has(id);

        if (!this.multi) {
            this.openIds.clear();
            if (!isCurrentlyOpen) {
                this.openIds.add(id);
            }
        } else {
            if (isCurrentlyOpen) this.openIds.delete(id);
            else this.openIds.add(id);
        }

        this.itemElements.forEach((entry) => {
            const open = this.openIds.has(entry.id);
            entry.btn.setAttribute("aria-expanded", open ? "true" : "false");
            entry.btn.classList.toggle("open", open);
            entry.panel.classList.toggle("open", open);
            entry.panel.hidden = !open;
            entry.itemWrap.classList.toggle("open", open);
            if (entry.toggleIcon) {
                const icon = open ? this.iconExpanded : this.iconCollapsed;
                if (typeof icon === "string") {
                    entry.toggleIcon.textContent = icon;
                } else if (icon instanceof Node) {
                    entry.toggleIcon.replaceChildren(icon.cloneNode(true));
                }
            }
        });

        this.onChange(Array.from(this.openIds));
    }
}
