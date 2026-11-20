// mui-js/static/widgets/checkbox.js
import { h } from "../core.js";

// Accessible, headless Checkbox component with tri-state / indeterminate support.
export class Checkbox {
    constructor({
        name = "",
        value = "",
        checked = false,
        indeterminate = false,
        disabled = false,
        label = "",
        description = "",
        onChange = () => {},
        className = "",
    } = {}) {
        this.onChange = onChange;
        const id = `chk-${Math.random().toString(36).slice(2, 8)}`;

        this.input = h("input", {
            id,
            type: "checkbox",
            name: name || null,
            value: value || null,
            checked: checked ? true : null,
            disabled: disabled ? true : null,
            class: "ui-checkbox-input",
        });

        if (indeterminate) {
            this.input.indeterminate = true;
        }

        const labelText = label ? h("span", { class: "ui-checkbox-label" }, label) : null;
        const descEl = description ? h("span", { class: "ui-checkbox-desc" }, description) : null;
        const textGroup = (labelText || descEl)
            ? h("span", { class: "ui-checkbox-text-wrap" }, labelText, descEl)
            : null;

        this.el = h("label", {
            for: id,
            class: `ui-checkbox ${disabled ? "disabled" : ""} ${className}`.trim(),
        }, this.input, textGroup);

        this.input.addEventListener("change", () => {
            this.onChange(this.input.checked, this.input.indeterminate);
        });
    }

    get checked() {
        return this.input.checked;
    }

    set checked(val) {
        this.input.checked = !!val;
        this.input.indeterminate = false;
    }

    get indeterminate() {
        return this.input.indeterminate;
    }

    set indeterminate(val) {
        this.input.indeterminate = !!val;
    }

    get disabled() {
        return this.input.disabled;
    }

    set disabled(val) {
        this.input.disabled = !!val;
        this.el.classList.toggle("disabled", !!val);
    }
}

// Accessible Checkbox Group with optional tri-state "Select All" parent.
export class CheckboxGroup {
    constructor({
        name = "",
        label = "",
        options = [], // [{ value, label, description, disabled }]
        value = [], // initially selected values array
        selectAll = false, // boolean or string label e.g. "Select All"
        onChange = () => {},
        className = "",
    } = {}) {
        this.name = name;
        this.options = options;
        this.onChange = onChange;
        this.selected = new Set(value);

        this.boxes = [];
        this.selectAllBox = null;

        const groupLabel = label ? h("span", { class: "ui-checkbox-group-label" }, label) : null;
        this.itemsWrap = h("div", { class: "ui-checkbox-group-items" });

        this.el = h("fieldset", {
            class: `ui-checkbox-group ${className}`.trim(),
            role: "group",
        },
            groupLabel ? h("legend", { class: "ui-checkbox-group-legend" }, groupLabel) : null,
            this.itemsWrap
        );

        if (selectAll) {
            const selectAllLabel = typeof selectAll === "string" ? selectAll : "Select All";
            this.selectAllBox = new Checkbox({
                label: selectAllLabel,
                className: "ui-checkbox-select-all",
                onChange: (checked) => this.#onSelectAllChange(checked),
            });
            this.itemsWrap.append(this.selectAllBox.el);
            this.itemsWrap.append(h("hr", { class: "ui-checkbox-divider" }));
        }

        for (const opt of options) {
            const chk = new Checkbox({
                name,
                value: opt.value,
                label: opt.label || opt.value,
                description: opt.description,
                checked: this.selected.has(opt.value),
                disabled: opt.disabled,
                onChange: (checked) => this.#onItemChange(opt.value, checked),
            });
            this.boxes.push({ opt, box: chk });
            this.itemsWrap.append(chk.el);
        }

        this.#syncSelectAll();
    }

    #onSelectAllChange(checked) {
        for (const { opt, box } of this.boxes) {
            if (!opt.disabled) {
                box.checked = checked;
                if (checked) this.selected.add(opt.value);
                else this.selected.delete(opt.value);
            }
        }
        this.onChange(Array.from(this.selected));
    }

    #onItemChange(val, checked) {
        if (checked) this.selected.add(val);
        else this.selected.delete(val);
        this.#syncSelectAll();
        this.onChange(Array.from(this.selected));
    }

    #syncSelectAll() {
        if (!this.selectAllBox) return;
        const enabled = this.boxes.filter((b) => !b.opt.disabled);
        const checkedCount = enabled.filter((b) => b.box.checked).length;

        if (checkedCount === 0) {
            this.selectAllBox.checked = false;
            this.selectAllBox.indeterminate = false;
        } else if (checkedCount === enabled.length) {
            this.selectAllBox.checked = true;
            this.selectAllBox.indeterminate = false;
        } else {
            this.selectAllBox.checked = false;
            this.selectAllBox.indeterminate = true;
        }
    }

    get value() {
        return Array.from(this.selected);
    }

    set value(newVals) {
        this.selected = new Set(newVals);
        for (const { opt, box } of this.boxes) {
            box.checked = this.selected.has(opt.value);
        }
        this.#syncSelectAll();
        this.onChange(Array.from(this.selected));
    }
}

// Accessible Radio Group component.
export class RadioGroup {
    constructor({
        name = "",
        label = "",
        options = [], // [{ value, label, description, disabled }]
        value = null,
        onChange = () => {},
        className = "",
    } = {}) {
        this.name = name || `radio-${Math.random().toString(36).slice(2, 8)}`;
        this.options = options;
        this.onChange = onChange;
        this._value = value;
        this.inputs = [];

        const groupLabel = label ? h("span", { class: "ui-radio-group-label" }, label) : null;
        this.itemsWrap = h("div", { class: "ui-radio-group-items" });

        this.el = h("fieldset", {
            class: `ui-radio-group ${className}`.trim(),
            role: "radiogroup",
        },
            groupLabel ? h("legend", { class: "ui-radio-group-legend" }, groupLabel) : null,
            this.itemsWrap
        );

        for (const opt of options) {
            const id = `rad-${Math.random().toString(36).slice(2, 8)}`;
            const input = h("input", {
                id,
                type: "radio",
                name: this.name,
                value: opt.value,
                checked: opt.value === value ? true : null,
                disabled: opt.disabled ? true : null,
                class: "ui-radio-input",
            });

            this.inputs.push(input);

            const labelText = opt.label ? h("span", { class: "ui-radio-label" }, opt.label) : null;
            const descEl = opt.description ? h("span", { class: "ui-radio-desc" }, opt.description) : null;
            const textGroup = (labelText || descEl)
                ? h("span", { class: "ui-radio-text-wrap" }, labelText, descEl)
                : null;

            const labelEl = h("label", {
                for: id,
                class: `ui-radio ${opt.disabled ? "disabled" : ""}`.trim(),
            }, input, textGroup);

            input.addEventListener("change", () => {
                if (input.checked) {
                    this._value = opt.value;
                    this.onChange(this._value);
                }
            });

            this.itemsWrap.append(labelEl);
        }
    }

    get value() {
        return this._value;
    }

    set value(val) {
        this._value = val;
        for (const input of this.inputs) {
            input.checked = input.value === val;
        }
        this.onChange(val);
    }
}
