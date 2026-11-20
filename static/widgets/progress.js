// mui-js/static/widgets/progress.js
import { h } from "../core.js";

// Accessible, headless Progress Bar component.
export class ProgressBar {
    constructor({
        value = 0,
        min = 0,
        max = 100,
        label = "",
        showValue = true,
        indeterminate = false,
        className = "",
    } = {}) {
        this.min = min;
        this.max = max;
        this._val = value;
        this._indeterminate = indeterminate;
        this.showValue = showValue;

        this.labelSpan = label ? h("span", { class: "ui-progress-label" }, label) : null;
        this.valueSpan = showValue ? h("span", { class: "ui-progress-val-text" }, "") : null;

        const header = (this.labelSpan || this.valueSpan)
            ? h("div", { class: "ui-progress-header" }, this.labelSpan, this.valueSpan)
            : null;

        this.fill = h("div", { class: "ui-progress-fill" });
        this.bar = h("div", {
            class: "ui-progress-bar",
            role: "progressbar",
            "aria-valuemin": String(min),
            "aria-valuemax": String(max),
            "aria-label": label || "Progress",
        }, this.fill);

        this.el = h("div", {
            class: `ui-progress-wrap ${className}`.trim(),
        }, header, this.bar);

        this.set(value, indeterminate);
    }

    get value() {
        return this._val;
    }

    set(val, indeterminate = false) {
        this._indeterminate = indeterminate;
        this._val = Math.max(this.min, Math.min(this.max, Number(val) || 0));

        if (this._indeterminate) {
            this.bar.classList.add("is-indeterminate");
            this.bar.removeAttribute("aria-valuenow");
            this.fill.style.width = "100%";
            if (this.valueSpan) this.valueSpan.textContent = "Loading...";
        } else {
            this.bar.classList.remove("is-indeterminate");
            this.bar.setAttribute("aria-valuenow", String(this._val));
            const pct = Math.round(((this._val - this.min) / (this.max - this.min)) * 100);
            this.fill.style.width = `${pct}%`;
            if (this.valueSpan) this.valueSpan.textContent = `${pct}%`;
        }
    }
}
