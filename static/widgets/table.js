// mui-js/static/widgets/table.js
import { h } from "../core.js";
import { confirmAction } from "./dialog.js";

// In-place editable table: rows are read-only until edit action clicked.
export class EditableTable {
    constructor(opts) {
        this.opts = opts;
        this.rows = (opts.rows || []).map((r) => ({ ...r, saved: true }));
        this.columns = opts.columns || [];
        this.editingRow = null;
        this.labels = {
            add: opts.labels?.add || "Add row",
            save: opts.labels?.save || "Save",
            edit: opts.labels?.edit || "Edit",
            remove: opts.labels?.remove || ((r) => "Remove"),
            cancel: opts.labels?.cancel || "Cancel",
            ...opts.labels,
        };

        this.tbody = h("tbody");
        this.table = h("table", { class: `editable-table ui-editable-table ${opts.className || ""}`.trim() },
            h("thead", {},
                h("tr", {},
                    ...this.columns.map((c) => h("th", { class: c.cls || null }, c.label)),
                    h("th", { class: "ui-actions-header" }, "")
                )
            ),
            this.tbody
        );

        this.addBtn = opts.add
            ? h("button", {
                type: "button",
                class: "secondary outline add-row ui-add-row-btn",
                onclick: () => this.addRow(),
            }, typeof opts.add === "object" ? opts.add.label : "+ Add row")
            : null;

        this.el = h("div", { class: "ui-table-wrap" }, this.table, this.addBtn);
        this.renderAll();
    }

    renderAll() {
        this.tbody.replaceChildren(...this.rows.map((row) => this.renderRow(row)));
    }

    renderRow(row) {
        const isEditing = this.editingRow === row;
        const cells = this.columns.map((col) => {
            if (isEditing && col.edit) {
                const input = h("input", {
                    type: col.edit.type || "text",
                    value: row[col.key] || "",
                    placeholder: col.edit.placeholder || "",
                    class: col.edit.mono ? "mono" : null,
                });
                row._inputs = row._inputs || {};
                row._inputs[col.key] = input;
                return h("td", { class: col.cls || null }, input);
            }
            const val = col.view ? col.view(row) : (row[col.key] || "--");
            return h("td", { class: `${col.cls || ""} ${col.mono ? "mono" : ""}`.trim() }, val);
        });

        const removeLabel = typeof this.labels.remove === "function" ? this.labels.remove(row) : this.labels.remove;
        const actions = h("td", { class: "ui-actions-cell" },
            isEditing
                ? [
                    h("button", { type: "button", class: "ui-btn-save", "aria-label": "Save", onclick: () => this.saveRow(row) }, this.labels.save),
                    h("button", { type: "button", class: "ui-btn-cancel", "aria-label": "Cancel", onclick: () => this.cancelRow(row) }, this.labels.cancel),
                ]
                : [
                    h("button", { type: "button", class: "ui-btn-edit", "aria-label": "Edit", onclick: () => this.startEdit(row) }, this.labels.edit),
                    h("button", { type: "button", class: "ui-btn-delete", "aria-label": "Delete", onclick: () => this.removeRow(row) }, removeLabel),
                ]
        );

        return h("tr", { class: isEditing ? "is-editing" : null }, ...cells, actions);
    }

    startEdit(row) {
        this.editingRow = row;
        this.renderAll();
    }

    cancelRow(row) {
        if (!row.saved) {
            this.rows = this.rows.filter((r) => r !== row);
        }
        this.editingRow = null;
        this.renderAll();
    }

    async saveRow(row) {
        if (row._inputs) {
            for (const col of this.columns) {
                if (col.edit && row._inputs[col.key]) {
                    row[col.key] = row._inputs[col.key].value.trim();
                }
            }
        }

        if (this.opts.validate) {
            const err = this.opts.validate(row, this.rows);
            if (err) return;
        }

        if (this.opts.onSave) {
            await this.opts.onSave(row);
        }

        row.saved = true;
        this.editingRow = null;
        this.renderAll();
        if (this.opts.onChange) this.opts.onChange(this.rows);
    }

    async removeRow(row) {
        if (this.opts.confirmRemove) {
            const ok = await confirmAction(this.opts.confirmRemove(row));
            if (!ok) return;
        }
        if (this.opts.onRemove && row.saved) {
            await this.opts.onRemove(row);
        }
        this.rows = this.rows.filter((r) => r !== row);
        this.renderAll();
        if (this.opts.onChange) this.opts.onChange(this.rows);
    }

    addRow(initialValues = {}) {
        const newRow = { ...initialValues, saved: false };
        this.rows.push(newRow);
        this.editingRow = newRow;
        this.renderAll();
    }
}

// Key-value configuration editor with duplicate detection.
export class KeyValueEditor extends EditableTable {
    constructor(initial = {}, { onSave = null, onRemove = null, onChange = () => {} } = {}) {
        super({
            rows: Object.entries(initial).map(([name, item]) => ({
                name,
                value: typeof item === "object" ? (item.value || "") : item,
            })),
            columns: [
                {
                    label: "Name",
                    key: "name",
                    mono: true,
                    edit: { type: "text", placeholder: "NAME", mono: true, when: (r) => !r.saved },
                },
                {
                    label: "Value",
                    key: "value",
                    mono: true,
                    edit: { type: "text", placeholder: "VALUE", mono: true },
                },
            ],
            validate: (row, all) => {
                if (!row.name) return "Name is required.";
                if (all.filter((r) => r !== row && r.name === row.name).length > 0) {
                    return `"${row.name}" already exists.`;
                }
                return "";
            },
            onSave,
            onRemove,
            onChange,
        });
    }

    toApi() {
        const out = {};
        for (const r of this.rows) {
            if (r.name) out[r.name] = { value: r.value || "" };
        }
        return out;
    }
}
