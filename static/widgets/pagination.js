// mui-js/static/widgets/pagination.js
import { h } from "../core.js";

// Accessible, headless Pagination controls for server-rendered data tables.
export class Pagination {
    constructor({
        page = 1,
        totalPages = 1,
        onPageChange = () => {},
        href = null, // optional: (page) => string to render standard <a> links
        maxVisible = 5,
        className = "",
    } = {}) {
        this.page = page;
        this.totalPages = totalPages;
        this.onPageChange = onPageChange;
        this.href = href;
        this.maxVisible = maxVisible;

        this.el = h("nav", {
            class: `ui-pagination ${className}`.trim(),
            role: "navigation",
            "aria-label": "Pagination",
        });

        this.render();
    }

    setPage(p, total = this.totalPages) {
        this.page = Math.max(1, Math.min(total, p));
        this.totalPages = total;
        this.render();
        this.onPageChange(this.page);
    }

    #makeItem(pageNum, label = String(pageNum), { isActive = false, isDisabled = false } = {}) {
        const classes = `ui-page-item ${isActive ? "active" : ""} ${isDisabled ? "disabled" : ""}`.trim();

        if (this.href && !isDisabled) {
            return h("a", {
                href: this.href(pageNum),
                class: classes,
                "aria-current": isActive ? "page" : null,
                onclick: (e) => {
                    if (this.onPageChange) {
                        e.preventDefault();
                        this.setPage(pageNum);
                    }
                },
            }, label);
        }

        return h("button", {
            type: "button",
            class: classes,
            disabled: isDisabled ? true : null,
            "aria-current": isActive ? "page" : null,
            onclick: () => this.setPage(pageNum),
        }, label);
    }

    render() {
        const items = [];

        // Previous button
        items.push(this.#makeItem(this.page - 1, "‹ Prev", {
            isDisabled: this.page <= 1,
        }));

        // Page number logic with ellipsis
        if (this.totalPages <= this.maxVisible + 2) {
            for (let i = 1; i <= this.totalPages; i++) {
                items.push(this.#makeItem(i, String(i), { isActive: i === this.page }));
            }
        } else {
            // First page
            items.push(this.#makeItem(1, "1", { isActive: this.page === 1 }));

            let start = Math.max(2, this.page - 1);
            let end = Math.min(this.totalPages - 1, this.page + 1);

            if (this.page <= 3) {
                end = 4;
            } else if (this.page >= this.totalPages - 2) {
                start = this.totalPages - 3;
            }

            if (start > 2) {
                items.push(h("span", { class: "ui-page-ellipsis" }, "…"));
            }

            for (let i = start; i <= end; i++) {
                items.push(this.#makeItem(i, String(i), { isActive: i === this.page }));
            }

            if (end < this.totalPages - 1) {
                items.push(h("span", { class: "ui-page-ellipsis" }, "…"));
            }

            // Last page
            items.push(this.#makeItem(this.totalPages, String(this.totalPages), {
                isActive: this.page === this.totalPages,
            }));
        }

        // Next button
        items.push(this.#makeItem(this.page + 1, "Next ›", {
            isDisabled: this.page >= this.totalPages,
        }));

        this.el.replaceChildren(...items);
    }
}
