// mui-js/static/widgets/switch.js
import { h } from "../core.js";

// Accessible toggle switch component.
export class Switch {
    constructor({ name = "", checked = false, label = "", onChange = () => {}, className = "" } = {}) {
        this.input = h("input", {
            type: "checkbox",
            name,
            role: "switch",
            checked: checked ? true : null,
            "aria-label": label,
        });

        this.labelSpan = label ? h("span", { class: "ui-switch-label" }, label) : null;

        this.el = h("label", { class: `switch ui-switch ${className}`.trim() },
            this.input,
            this.labelSpan
        );

        this.input.addEventListener("change", () => onChange(this.input.checked));
    }

    get checked() {
        return this.input.checked;
    }

    set checked(val) {
        this.input.checked = !!val;
    }
}
