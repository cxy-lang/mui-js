// mui-js/static/widgets/dropzone.js
import { h } from "../core.js";

// Accessible, headless File Drag & Drop component with queue preview.
export class FileDropzone {
    constructor({
        accept = "",
        multiple = true,
        maxSize = null, // max bytes per file
        maxFiles = null,
        label = "Drag & drop files here, or click to browse",
        icon = null, // application-provided icon element or string
        removeIcon = "✕",
        onChange = () => {},
        className = "",
    } = {}) {
        this.accept = accept;
        this.multiple = multiple;
        this.maxSize = maxSize;
        this.maxFiles = maxFiles;
        this.removeIcon = removeIcon;
        this.onChange = onChange;
        this.files = [];

        const inputId = `file-${Math.random().toString(36).slice(2, 8)}`;

        this.input = h("input", {
            id: inputId,
            type: "file",
            accept: accept || null,
            multiple: multiple ? true : null,
            class: "ui-dropzone-input",
        });

        this.labelEl = h("span", { class: "ui-dropzone-label" }, label);
        this.iconEl = icon ? h("span", { class: "ui-dropzone-icon" }, icon) : null;

        const targetChildren = [];
        if (this.iconEl) targetChildren.push(this.iconEl);
        targetChildren.push(this.labelEl, this.input);

        this.dropTarget = h("label", {
            for: inputId,
            class: "ui-dropzone-target",
            tabindex: "0",
        }, ...targetChildren);

        this.queueEl = h("div", { class: "ui-dropzone-queue" });

        this.el = h("div", {
            class: `ui-dropzone-wrap ${className}`.trim(),
        }, this.dropTarget, this.queueEl);

        this.#bindEvents();
    }

    #bindEvents() {
        this.input.addEventListener("change", () => {
            if (this.input.files) {
                this.addFiles(Array.from(this.input.files));
                this.input.value = "";
            }
        });

        // Drag and drop events
        ["dragenter", "dragover"].forEach((evt) => {
            this.dropTarget.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.dropTarget.classList.add("drag-over");
            });
        });

        ["dragleave", "drop"].forEach((evt) => {
            this.dropTarget.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.dropTarget.classList.remove("drag-over");
            });
        });

        this.dropTarget.addEventListener("drop", (e) => {
            if (e.dataTransfer && e.dataTransfer.files) {
                this.addFiles(Array.from(e.dataTransfer.files));
            }
        });

        // Keyboard accessible trigger
        this.dropTarget.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                this.input.click();
            }
        });
    }

    addFiles(newFiles) {
        let valid = newFiles;

        if (this.maxSize) {
            valid = valid.filter((f) => f.size <= this.maxSize);
        }

        if (!this.multiple) {
            this.files = valid.slice(0, 1);
        } else {
            this.files = [...this.files, ...valid];
            if (this.maxFiles) {
                this.files = this.files.slice(0, this.maxFiles);
            }
        }

        this.#renderQueue();
        this.onChange(this.files);
    }

    removeFile(idx) {
        this.files.splice(idx, 1);
        this.#renderQueue();
        this.onChange(this.files);
    }

    clear() {
        this.files = [];
        this.#renderQueue();
        this.onChange(this.files);
    }

    #renderQueue() {
        if (this.files.length === 0) {
            this.queueEl.replaceChildren();
            return;
        }

        const items = this.files.map((file, idx) => {
            const sizeStr = this.#formatSize(file.size);
            const removeBtn = h("button", {
                type: "button",
                class: "ui-dropzone-remove-btn",
                "aria-label": `Remove ${file.name}`,
                onclick: (e) => {
                    e.stopPropagation();
                    this.removeFile(idx);
                },
            }, this.removeIcon);

            return h("div", { class: "ui-dropzone-item" },
                h("span", { class: "ui-dropzone-filename" }, file.name),
                h("span", { class: "ui-dropzone-filesize mono" }, sizeStr),
                removeBtn
            );
        });

        this.queueEl.replaceChildren(...items);
    }

    #formatSize(bytes) {
        if (!bytes || bytes === 0) return "0 B";
        const units = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
    }
}
