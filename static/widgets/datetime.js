// mui-js/static/widgets/datetime.js
import { h } from "../core.js";

// Accessible Date & Time Picker with customizable quick presets.
export class DateTimePicker {
    constructor({
        type = "datetime-local", // "date" | "time" | "datetime-local"
        value = "",
        label = "Date & Time",
        min = "",
        max = "",
        presets = [], // e.g. [{ label: "Now", value: () => new Date() }]
        onChange = () => {},
        className = "",
    } = {}) {
        this.type = type;
        this.onChange = onChange;

        const inputId = `dt-${Math.random().toString(36).slice(2, 8)}`;

        this.input = h("input", {
            id: inputId,
            type,
            value,
            min: min || null,
            max: max || null,
            class: "mono ui-datetime-input",
            "aria-label": label,
        });

        this.labelEl = label ? h("label", { for: inputId, class: "ui-datetime-label" }, label) : null;

        const presetButtons = presets.map((p) =>
            h("button", {
                type: "button",
                class: "ui-datetime-preset-btn",
                onclick: () => {
                    const resolved = typeof p.value === "function" ? p.value() : p.value;
                    const valStr = resolved instanceof Date ? this.#formatDate(resolved) : String(resolved);
                    this.set(valStr);
                },
            }, p.label)
        );

        const presetsBar = presetButtons.length > 0
            ? h("div", { class: "ui-datetime-presets" }, ...presetButtons)
            : null;

        this.el = h("div", { class: `ui-datetime-wrap ${className}`.trim() },
            this.labelEl,
            h("div", { class: "ui-datetime-controls" }, this.input, presetsBar)
        );

        this.input.addEventListener("change", () => {
            this.onChange(this.input.value);
        });
    }

    #formatDate(d) {
        if (this.type === "date") {
            return d.toISOString().slice(0, 10);
        }
        if (this.type === "time") {
            return d.toTimeString().slice(0, 5);
        }
        // datetime-local: YYYY-MM-DDTHH:mm
        const tzOffset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    }

    get value() {
        return this.input.value;
    }

    set(val) {
        this.input.value = val;
        this.onChange(val);
    }
}
