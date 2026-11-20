// mui-js/static/widgets/status.js
import { h } from "../core.js";

// Accessible Status Indicator pill with live pulsing dot.
export class StatusIndicator {
    constructor({
        status = "online", // "online" | "offline" | "busy" | "warning" | "error"
        label = "",
        pulse = true,
        className = "",
    } = {}) {
        this.status = status;
        this.label = label || status;
        this.pulse = pulse;

        this.dot = h("span", {
            class: `ui-status-dot status-${status} ${pulse ? "pulse" : ""}`,
            "aria-hidden": "true",
        });

        this.labelEl = h("span", { class: "ui-status-label" }, this.label);

        this.el = h("div", {
            class: `ui-status-pill status-${status} ${className}`.trim(),
            role: "status",
        }, this.dot, this.labelEl);
    }

    set(status, label = null) {
        this.status = status;
        this.label = label || status;

        this.dot.className = `ui-status-dot status-${status} ${this.pulse ? "pulse" : ""}`;
        this.labelEl.textContent = this.label;
        this.el.className = `ui-status-pill status-${status}`;
    }
}
