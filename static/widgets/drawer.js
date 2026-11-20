// mui-js/static/widgets/drawer.js
import { h } from "../core.js";

// Accessible, headless Slide-Over Drawer panel (left / right).
export class Drawer {
    constructor({
        title = "",
        body = null,
        actions = [],
        placement = "right", // "right" | "left"
        closeIcon = "✕",
        className = "",
    } = {}) {
        this.placement = placement;
        this.isOpen = false;

        this.closeBtn = closeIcon !== null ? h("button", {
            type: "button",
            class: "ui-drawer-close",
            "aria-label": "Close drawer",
            onclick: () => this.close(),
        }, closeIcon) : null;

        const headerChildren = [h("strong", { class: "ui-drawer-title" }, title)];
        if (this.closeBtn) headerChildren.push(this.closeBtn);

        const header = h("header", { class: "ui-drawer-header" }, ...headerChildren);

        this.bodyEl = h("div", { class: "ui-drawer-body" },
            typeof body === "function" ? body() : body
        );

        const footer = actions.length > 0
            ? h("footer", { class: "ui-drawer-footer" }, ...actions)
            : null;

        this.article = h("article", {
            class: `ui-drawer-content placement-${placement}`,
        }, header, this.bodyEl, footer);

        this.dialog = h("dialog", {
            class: `ui-dialog ui-drawer ${className}`.trim(),
            role: "dialog",
            "aria-modal": "true",
            onclick: (e) => {
                if (e.target === this.dialog) this.close();
            },
        }, this.article);

        this.dialog.addEventListener("close", () => {
            this.isOpen = false;
        });

        document.body.append(this.dialog);
    }

    setBody(content) {
        this.bodyEl.replaceChildren(
            typeof content === "function" ? content() : content
        );
    }

    open() {
        this.isOpen = true;
        this.dialog.showModal();
        return this;
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.dialog.close();
    }
}
