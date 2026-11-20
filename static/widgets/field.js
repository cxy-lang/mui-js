// mui-js/static/widgets/field.js
import { h } from "../core.js";

// Accessible, headless Form Field: binds label, input, inline error and hint.
export class Field {
    constructor({
        label = "",
        name = "",
        value = "",
        placeholder = "",
        hint = "",
        type = "text",
        mono = false,
        autofocus = false,
        inline = false,
        required = false,
        className = "",
    } = {}) {
        this.hint = hint;
        this.input = h("input", {
            type,
            name,
            value,
            placeholder,
            autocomplete: "off",
            spellcheck: "false",
            class: mono ? "mono" : null,
            required: required ? true : null,
        });

        this.note = h("small", { class: "field-note ui-field-note" }, hint);
        this.labelSpan = h("span", { class: "field-label ui-field-label" }, label, required ? " *" : "");

        this.el = inline
            ? h("label", { class: `field field-inline ui-field ui-field-inline ${className}`.trim() },
                this.labelSpan, this.input, this.note)
            : h("label", { class: `field ui-field ${className}`.trim() },
                this.labelSpan, this.input, this.note);

        this.input.addEventListener("input", () => this.setError(null));
        if (autofocus) setTimeout(() => this.input.focus(), 0);
    }

    get value() {
        return this.input.value.trim();
    }

    set value(v) {
        this.input.value = v;
    }

    setError(message) {
        this.el.classList.toggle("has-error", !!message);
        this.el.setAttribute("data-invalid", message ? "true" : "false");
        this.input.setAttribute("aria-invalid", message ? "true" : "false");
        this.note.textContent = message || this.hint;
        this.note.classList.toggle("field-error", !!message);
    }
}
