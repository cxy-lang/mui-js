// mui-js/static/widgets/dialog.js
import { h } from "../core.js";

// Accessible, headless Modal Dialog on HTML <dialog>.
// Handles backdrop, Esc to close, focus trap, and close on backdrop click.
export class Dialog {
    constructor({ title = "", body, actions = [], closeIcon = "✕", className = "" } = {}) {
        this.closeBtn = closeIcon !== null ? h("button", {
            type: "button",
            class: "ui-dialog-close",
            "aria-label": "Close",
            rel: "prev",
            onclick: () => this.close(),
        }, closeIcon) : null;

        const headerChildren = [h("strong", { class: "ui-dialog-title" }, title)];
        if (this.closeBtn) headerChildren.push(this.closeBtn);

        const header = h("header", { class: "ui-dialog-header" }, ...headerChildren);

        const footer = h("footer", { class: "ui-dialog-footer" }, ...actions);

        this.article = h("article", { class: "ui-dialog-content" }, header, body, footer);

        this.dialog = h("dialog", {
            class: `ui-dialog crunch-dialog ${className}`.trim(),
            role: "dialog",
            "aria-modal": "true",
            onclick: (e) => {
                if (e.target === this.dialog) this.close();
            },
        }, this.article);

        this.dialog.addEventListener("close", () => this.dialog.remove());
        document.body.append(this.dialog);
    }

    open() {
        this.dialog.showModal();
        return this;
    }

    close() {
        this.dialog.close();
    }
}

// Simple Yes/No or Confirm/Cancel action in a dialog.
export function confirmAction({ title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false }) {
    return new Promise((resolve) => {
        let dialog;
        const okBtn = h("button", {
            type: "button",
            class: danger ? "danger ui-btn-danger" : "primary ui-btn-primary",
            onclick: () => {
                resolve(true);
                dialog.close();
            },
        }, confirmLabel);

        const cancelBtn = h("button", {
            type: "button",
            class: "secondary ui-btn-secondary",
            onclick: () => {
                resolve(false);
                dialog.close();
            },
        }, cancelLabel);

        const body = typeof message === "string" ? h("p", { class: "ui-dialog-message" }, message) : message;
        dialog = new Dialog({ title, body, actions: [cancelBtn, okBtn] });
        dialog.dialog.addEventListener("close", () => resolve(false));
        dialog.open();
    });
}

// Destructive confirmation dialog: button enables only when the user types the exact resource name.
export class ConfirmDelete {
    constructor({ title, message, confirmText, confirmLabel = "Delete", onConfirm }) {
        this.input = h("input", {
            type: "text",
            autocomplete: "off",
            spellcheck: "false",
            class: "mono",
            placeholder: confirmText,
        });
        this.error = h("p", { class: "field-error ui-field-error", role: "alert", hidden: true });
        this.button = h("button", {
            type: "button",
            class: "danger ui-btn-danger",
            disabled: true,
        }, confirmLabel);

        const cancel = h("button", {
            type: "button",
            class: "secondary ui-btn-secondary",
            onclick: () => this.dialog.close(),
        }, "Cancel");

        const body = h("div", { class: "ui-confirm-delete-body" },
            h("p", { class: "ui-dialog-message" }, message),
            h("label", { class: "ui-field" },
                h("span", {}, "Type ", h("strong", { class: "mono" }, confirmText), " to confirm:"),
                this.input
            ),
            this.error
        );

        this.dialog = new Dialog({ title, body, actions: [cancel, this.button] });

        this.input.addEventListener("input", () => {
            this.button.disabled = this.input.value !== confirmText;
        });

        this.button.addEventListener("click", async () => {
            this.button.disabled = true;
            this.button.setAttribute("aria-busy", "true");
            this.error.hidden = true;
            try {
                await onConfirm();
                this.dialog.close();
            } catch (e) {
                this.error.textContent = e.message;
                this.error.hidden = false;
                this.button.removeAttribute("aria-busy");
                this.button.disabled = this.input.value !== confirmText;
            }
        });
    }

    open() {
        this.dialog.open();
        this.input.focus();
        return this;
    }
}
