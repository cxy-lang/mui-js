// mui-js/static/widgets/tabs.js
import { h } from "../core.js";

// Accessible, headless Tabs component.
export class Tabs {
    constructor({
        tabs = [], // [{ id, label, badge, content }]
        activeId = null,
        onChange = () => {},
        className = "",
    } = {}) {
        this.tabs = tabs;
        this.onChange = onChange;
        this.activeId = activeId || (tabs[0] ? tabs[0].id : null);

        this.tabButtons = [];
        this.panels = [];

        this.tablist = h("div", {
            class: "ui-tablist",
            role: "tablist",
            "aria-label": "Navigation Tabs",
        });

        this.panelsWrap = h("div", { class: "ui-tabpanels" });

        this.el = h("div", {
            class: `ui-tabs-wrap ${className}`.trim(),
        }, this.tablist, this.panelsWrap);

        this.#build();
    }

    #build() {
        this.tabButtons = [];
        this.panels = [];

        this.tabs.forEach((tab, index) => {
            const isActive = tab.id === this.activeId;
            const btnId = `tab-btn-${tab.id}`;
            const panelId = `tab-panel-${tab.id}`;

            const badgeEl = tab.badge !== undefined
                ? h("span", { class: "ui-tab-badge" }, String(tab.badge))
                : null;

            const btn = h("button", {
                id: btnId,
                type: "button",
                role: "tab",
                class: `ui-tab-btn ${isActive ? "active" : ""}`,
                "aria-selected": isActive ? "true" : "false",
                "aria-controls": panelId,
                tabindex: isActive ? "0" : "-1",
                onclick: () => this.select(tab.id),
                onkeydown: (e) => this.#onKey(e, index),
            },
                h("span", { class: "ui-tab-label" }, tab.label),
                badgeEl
            );

            const contentEl = typeof tab.content === "function" ? tab.content() : tab.content;
            const panel = h("div", {
                id: panelId,
                role: "tabpanel",
                class: `ui-tabpanel ${isActive ? "active" : ""}`,
                "aria-labelledby": btnId,
                tabindex: "0",
                hidden: !isActive,
            }, contentEl);

            this.tabButtons.push(btn);
            this.panels.push(panel);
        });

        this.tablist.replaceChildren(...this.tabButtons);
        this.panelsWrap.replaceChildren(...this.panels);
    }

    select(id) {
        if (this.activeId === id) return;
        this.activeId = id;

        this.tabs.forEach((tab, idx) => {
            const isActive = tab.id === id;
            const btn = this.tabButtons[idx];
            const panel = this.panels[idx];

            if (btn) {
                btn.classList.toggle("active", isActive);
                btn.setAttribute("aria-selected", isActive ? "true" : "false");
                btn.tabIndex = isActive ? 0 : -1;
            }
            if (panel) {
                panel.classList.toggle("active", isActive);
                panel.hidden = !isActive;
            }
        });

        this.onChange(id);
    }

    #onKey(e, currentIdx) {
        let targetIdx = null;
        if (e.key === "ArrowRight") {
            targetIdx = (currentIdx + 1) % this.tabButtons.length;
        } else if (e.key === "ArrowLeft") {
            targetIdx = (currentIdx - 1 + this.tabButtons.length) % this.tabButtons.length;
        } else if (e.key === "Home") {
            targetIdx = 0;
        } else if (e.key === "End") {
            targetIdx = this.tabButtons.length - 1;
        }

        if (targetIdx !== null) {
            e.preventDefault();
            const targetTab = this.tabs[targetIdx];
            this.select(targetTab.id);
            this.tabButtons[targetIdx].focus();
        }
    }
}
