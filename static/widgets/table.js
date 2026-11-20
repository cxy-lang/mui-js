// mui-js/static/widgets/table.js
import { h } from "../core.js";
import { confirmAction } from "./dialog.js";
import { Dropdown } from "./dropdown.js";

// Accessible, headless In-Place Editable Table.
// Rows are read-only until edit action clicked. Enter commits, Escape cancels.
export class EditableTable {
    constructor(opts) {
        this.opts = opts;
        this.columns = opts.columns || [];
        this.onChange = opts.onChange || (() => {});
        this.rows = [];
        this.tbody = h("tbody");

        const labels = (this.labels = {
            edit: "Edit",
            save: "Save",
            add: "Add",
            remove: (row) => (row.saved ? "Delete" : "Discard"),
            ...(opts.labels || {}),
        });
        if (typeof labels.remove === "string") {
            const text = labels.remove;
            labels.remove = () => text;
        }

        const add = opts.add === undefined ? { label: "+ Add" } : opts.add;
        this.addButton = add
            ? h("button", {
                type: "button",
                class: "secondary outline add-row ui-add-row-btn",
                onclick: add.onClick || (() => this.addNew()),
            }, typeof add === "object" ? add.label : "+ Add")
            : null;

        this.el = h(
            "div",
            { class: `ui-editable-table-wrap ${opts.className || ""}`.trim() },
            h(
                "table",
                { class: `ui-editable-table ${opts.tableClass || ""}`.trim() },
                h("thead", {},
                    h("tr", {},
                        ...this.columns.map((c) => h("th", { class: c.cls || null }, c.label)),
                        h("th", { class: "ui-actions-header" }, "")
                    )
                ),
                this.tbody
            ),
            opts.noteBeforeAdd ? h("p", { class: "muted ui-table-note" }, opts.noteBeforeAdd) : null,
            this.addButton,
            opts.noteAfterAdd ? h("p", { class: "muted ui-table-note" }, opts.noteAfterAdd) : null
        );

        for (const data of opts.rows || []) this.#append({ saved: true, ...data });
    }

    #renderActionButton(actionName, label, onClick, cls = "") {
        if (this.opts.renderAction) {
            return this.opts.renderAction(actionName, label, onClick, cls);
        }
        return h("button", {
            type: "button",
            class: `ui-table-action-btn ${cls}`.trim(),
            "aria-label": label,
            title: label,
            onclick: onClick,
        }, actionName === "check" ? "✓" : actionName === "pencil" ? "✎" : "✕");
    }

    #append(data) {
        const row = { saved: false, editing: false, ...data };
        row.tr = h("tr");
        row.errTr = h("tr", { class: "ui-table-error-row", hidden: true },
            h("td", { colspan: this.columns.length + 1 },
                (row.error = h("small", { class: "field-error ui-field-error", role: "alert" }))
            )
        );
        row.detailsTr = this.opts.detailsRow
            ? h("tr", { class: "ui-table-details-row", hidden: true },
                h("td", { colspan: this.columns.length + 1 })
            )
            : null;
        this.rows.push(row);
        this.tbody.append(row.tr, ...(row.detailsTr ? [row.detailsTr] : []), row.errTr);
        this.#render(row);
        return row;
    }

    addNew(data = {}) {
        const row = this.#append({ editing: true, ...(this.opts.blank ? this.opts.blank() : {}), ...data });
        const first = Object.values(row.inputs)[0];
        if (first) first.focus();
        this.onChange();
        return row;
    }

    rerender(row) {
        this.#render(row);
    }

    upsert(data, key = "key") {
        const k = this.opts.rowKey || ((r) => r[key]);
        const existing = this.rows.find((r) => k(r) === k(data));
        if (existing) {
            Object.assign(existing, data);
            this.#render(existing);
            return existing;
        }
        return this.#append({ saved: true, ...data });
    }

    #input(col, row) {
        const e = col.edit;
        const placeholder = typeof e.placeholder === "function" ? e.placeholder(row) : e.placeholder;
        const initial = e.initial ? e.initial(row) : e.type === "password" ? "" : (row[col.key] ?? "");
        if (e.make && (!e.useMake || e.useMake(row))) {
            const made = e.make(row);
            made.input.__show = made.el;
            return made.input;
        }
        if (e.type === "select") {
            const dropdown = new Dropdown({
                options: e.options,
                value: initial,
                placeholder: e.label || col.label,
                className: "table-dropdown"
            });
            const input = dropdown.selectEl || dropdown;
            input.__show = dropdown.el;
            return input;
        }
        if (e.type === "checkbox") {
            const box = h("input", { type: "checkbox", "aria-label": e.label || col.label });
            box.checked = !!row[col.key];
            return box;
        }
        return h("input", {
            type: e.type === "password" ? "password" : "text",
            class: e.mono ? "mono" : null,
            value: initial,
            placeholder,
            autocomplete: e.autocomplete || (e.type === "password" ? "new-password" : "off"),
            spellcheck: "false",
        });
    }

    #valueOf(col, input) {
        if (col.edit.type === "checkbox") return input.checked;
        if (input.type === "checkbox") return input.checked ? "true" : "false";
        return col.edit.trim ? input.value.trim() : input.value;
    }

    #render(row) {
        row.inputs = {};
        const cells = this.columns.map((col) => {
            const editable = row.editing && col.edit && (!col.edit.when || col.edit.when(row));
            let content;
            if (editable) {
                const input = (row.inputs[col.key] = this.#input(col, row));
                content = input.__show || input;
            } else if (col.view) {
                content = col.view(row);
            } else {
                content = h("span", { class: col.mono ? "mono" : null }, row[col.key] ?? "");
            }
            return h("td", { class: col.cls, "data-label": col.label }, content, col.decorate ? col.decorate(row) : null);
        });

        let actions = this.opts.rowActions ? this.opts.rowActions(row) : undefined;
        if (actions === undefined) {
            const editing = row.editing;
            actions = [
                ...(this.opts.extraActions && !editing ? [].concat(this.opts.extraActions(row)) : []),
                editing
                    ? this.#renderActionButton("check", row.saved ? this.labels.save : this.labels.add, () => this.#commit(row), "icon-save")
                    : this.#renderActionButton(this.opts.editIcon || "pencil", this.labels.edit, () => (this.opts.onEdit ? this.opts.onEdit(row) : this.#startEdit(row))),
                this.#renderActionButton("x", this.labels.remove(row), () => this.#remove(row), "icon-delete"),
            ];
        }
        row.tr.replaceChildren(...cells, h("td", { class: "ui-table-actions" }, actions));
        this.#renderDetails(row);

        for (const [key, input] of Object.entries(row.inputs)) {
            const touched = () => {
                this.#setError(row, "");
                this.onChange();
            };
            input.addEventListener("input", touched);
            if (input.type === "checkbox") input.addEventListener("change", touched);
            const col = this.columns.find((c) => c.key === key);
            if (col && col.edit && col.edit.rerender) input.addEventListener("change", () => this.#redrawKeeping(row, key));
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    this.#commit(row);
                } else if (e.key === "Escape") {
                    e.stopPropagation();
                    this.#cancel(row);
                }
            });
        }
    }

    #renderDetails(row) {
        if (!row.detailsTr) return;
        row.details = this.opts.detailsRow(row);
        const cell = row.detailsTr.firstChild;
        cell.replaceChildren(...(row.details ? [row.details.el] : []));
        row.detailsTr.hidden = !row.details;
    }

    #redrawKeeping(row, key) {
        Object.assign(row, this.current(row));
        this.#setError(row, "");
        this.#render(row);
        if (row.inputs[key]) row.inputs[key].focus();
        this.onChange();
    }

    #setError(row, message) {
        row.error.textContent = message;
        row.errTr.hidden = !message;
    }

    #startEdit(row) {
        row.editing = true;
        row.snapshot = this.opts.detailsRow ? { ...this.current(row) } : null;
        this.#render(row);
        const focus = row.inputs[this.opts.focus] || Object.values(row.inputs)[0];
        if (focus) focus.focus();
        this.onChange();
    }

    #cancel(row) {
        this.#setError(row, "");
        if (!row.saved && !this.#hasCommitted(row)) {
            this.#drop(row);
            return;
        }
        if (row.snapshot) Object.assign(row, row.snapshot);
        row.snapshot = null;
        row.editing = false;
        this.#render(row);
        this.onChange();
    }

    #hasCommitted(row) {
        return this.columns.some((c) => c.key && c.edit && !c.edit.writeOnly && row[c.key]);
    }

    #drop(row) {
        this.rows = this.rows.filter((r) => r !== row);
        row.tr.remove();
        if (row.detailsTr) row.detailsTr.remove();
        row.errTr.remove();
        this.onChange();
    }

    current(row) {
        const out = {};
        for (const col of this.columns) {
            if (!col.key) continue;
            const input = row.inputs && row.inputs[col.key];
            out[col.key] = input ? this.#valueOf(col, input) : row[col.key];
        }
        if (row.details && row.details.values) Object.assign(out, row.details.values());
        return out;
    }

    hasValue(row) {
        return this.columns.some((col) => {
            const input = row.inputs && row.inputs[col.key];
            if (!input || col.edit.type === "select" || col.edit.type === "checkbox" || input.type === "checkbox") return false;
            return col.edit.trim ? !!input.value.trim() : !!input.value;
        });
    }

    #changed(row) {
        return this.columns.some((col) => {
            const input = row.inputs && row.inputs[col.key];
            if (!input) return false;
            if (col.edit.type === "checkbox") return input.checked !== !!row[col.key];
            if (input.type === "checkbox") return (input.checked ? "true" : "false") !== String(row[col.key] ?? "false");
            const initial = col.edit.initial ? col.edit.initial(row) : col.edit.type === "password" ? "" : (row[col.key] ?? "");
            return input.value !== initial;
        });
    }

    async #commit(row) {
        const values = this.current(row);
        if (this.opts.skipIfUnchanged && row.saved && !this.#changed(row)) return this.#cancel(row);

        const problem = this.opts.validate ? this.opts.validate(row, values, this) : "";
        if (problem) return this.#setError(row, problem);

        if (this.opts.beforeSave && (await this.opts.beforeSave(row, values)) === false) return;

        let patch = null;
        if (this.opts.onSave) {
            row.tr.classList.add("busy");
            try {
                patch = await this.opts.onSave(row, values, !row.saved);
            } catch (e) {
                this.#setError(row, e.message);
                return;
            } finally {
                row.tr.classList.remove("busy");
            }
            if (patch === false) return;
            row.saved = true;
        }
        for (const col of this.columns) {
            if (col.key && col.edit && !col.edit.writeOnly) row[col.key] = values[col.key];
        }
        if (row.details && row.details.values) Object.assign(row, row.details.values());
        Object.assign(row, patch || {});
        row.snapshot = null;
        row.editing = false;
        this.#setError(row, "");
        this.#render(row);
        this.onChange();
    }

    async #remove(row) {
        if (!row.saved || !this.opts.onRemove) return this.#drop(row);

        const ask = this.opts.confirmRemove && this.opts.confirmRemove(row);
        if (ask && !(await confirmAction({ confirmLabel: "Delete", danger: true, ...ask }))) return;

        row.tr.classList.add("busy");
        try {
            await this.opts.onRemove(row);
        } catch (e) {
            this.#setError(row, e.message);
            return;
        } finally {
            row.tr.classList.remove("busy");
        }
        this.#drop(row);
    }

    isDirty() {
        return this.rows.some((row) => row.editing && (row.saved ? this.#changed(row) : this.hasValue(row)));
    }

    validateRows() {
        let ok = true;
        for (const row of this.rows) {
            if (row.editing && !row.saved && !this.hasValue(row)) continue;
            const problem = this.opts.validate ? this.opts.validate(row, this.current(row), this) : "";
            this.#setError(row, problem);
            if (problem) ok = false;
        }
        return ok;
    }
}

// Simple key-value editor backed by EditableTable
export class KeyValueEditor extends EditableTable {
    constructor(initial = {}, { onSave = null, onRemove = null, onChange = () => {}, keyLabel = "Key", valueLabel = "Value" } = {}) {
        super({
            rows: Object.entries(initial).map(([key, value]) => ({ key, value: String(value ?? "") })),
            columns: [
                { label: keyLabel, key: "key", mono: true, edit: { type: "text", placeholder: keyLabel, mono: true, trim: true, when: (r) => !r.saved } },
                { label: valueLabel, key: "value", mono: true, edit: { type: "text", placeholder: valueLabel, mono: true } },
            ],
            onSave,
            onRemove,
            onChange,
        });
    }

    toApi() {
        const out = {};
        for (const row of this.rows) {
            const v = this.current(row);
            if (v.key) out[v.key] = v.value;
        }
        return out;
    }
}
