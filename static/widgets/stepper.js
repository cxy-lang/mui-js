// mui-js/static/widgets/stepper.js
import { h } from "../core.js";

// Accessible, headless Number Stepper component.
export class NumberStepper {
    constructor({
        value = 0,
        min = -Infinity,
        max = Infinity,
        step = 1,
        label = "Quantity",
        format = (v) => String(v),
        onChange = () => {},
        className = "",
    } = {}) {
        this.min = min;
        this.max = max;
        this.step = step;
        this.format = format;
        this.onChange = onChange;
        this._val = Math.max(min, Math.min(max, Number(value) || 0));

        this.input = h("input", {
            type: "text",
            class: "mono ui-stepper-input",
            value: this.format(this._val),
            role: "spinbutton",
            "aria-valuenow": String(this._val),
            "aria-valuemin": isFinite(min) ? String(min) : null,
            "aria-valuemax": isFinite(max) ? String(max) : null,
            "aria-label": label,
        });

        this.decBtn = h("button", {
            type: "button",
            class: "ui-stepper-btn dec",
            "aria-label": "Decrease",
            onclick: () => this.stepBy(-this.step),
        }, "−");

        this.incBtn = h("button", {
            type: "button",
            class: "ui-stepper-btn inc",
            "aria-label": "Increase",
            onclick: () => this.stepBy(this.step),
        }, "+");

        this.el = h("div", {
            class: `ui-stepper ${className}`.trim(),
        }, this.decBtn, this.input, this.incBtn);

        this.#bind();
        this.#syncState();
    }

    #bind() {
        this.input.addEventListener("change", () => {
            const parsed = parseFloat(this.input.value);
            if (!isNaN(parsed)) {
                this.set(parsed);
            } else {
                this.input.value = this.format(this._val);
            }
        });

        this.input.addEventListener("keydown", (e) => {
            if (e.key === "ArrowUp") {
                e.preventDefault();
                this.stepBy(this.step);
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                this.stepBy(-this.step);
            }
        });
    }

    stepBy(delta) {
        this.set(this._val + delta);
    }

    get value() {
        return this._val;
    }

    set(val) {
        this._val = Math.max(this.min, Math.min(this.max, Number(val) || 0));
        this.input.value = this.format(this._val);
        this.input.setAttribute("aria-valuenow", String(this._val));
        this.#syncState();
        this.onChange(this._val);
    }

    #syncState() {
        this.decBtn.disabled = this._val <= this.min;
        this.incBtn.disabled = this._val >= this.max;
    }
}
