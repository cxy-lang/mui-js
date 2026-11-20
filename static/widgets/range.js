// mui-js/static/widgets/range.js
import { h } from "../core.js";

// Accessible, headless Range Slider component.
export class RangeSlider {
    constructor({
        min = 0,
        max = 100,
        step = 1,
        value = 50,
        label = "",
        format = (v) => String(v),
        onChange = () => {},
        className = "",
    } = {}) {
        this.min = min;
        this.max = max;
        this.step = step;
        this.format = format;
        this.onChange = onChange;

        const sliderId = `range-${Math.random().toString(36).slice(2, 8)}`;

        this.input = h("input", {
            id: sliderId,
            type: "range",
            min: String(min),
            max: String(max),
            step: String(step),
            value: String(value),
            class: "ui-range-slider",
            "aria-label": label,
        });

        this.labelEl = label ? h("label", { for: sliderId, class: "ui-range-label" }, label) : null;
        this.valueEl = h("span", { class: "ui-range-value mono" }, this.format(value));

        const header = (this.labelEl || this.valueEl)
            ? h("div", { class: "ui-range-header" }, this.labelEl, this.valueEl)
            : null;

        this.el = h("div", { class: `ui-range-wrap ${className}`.trim() }, header, this.input);

        this.input.addEventListener("input", () => {
            const val = Number(this.input.value);
            this.valueEl.textContent = this.format(val);
            this.onChange(val);
        });
    }

    get value() {
        return Number(this.input.value);
    }

    set(val) {
        const clamped = Math.max(this.min, Math.min(this.max, Number(val) || 0));
        this.input.value = String(clamped);
        this.valueEl.textContent = this.format(clamped);
        this.onChange(clamped);
    }
}
