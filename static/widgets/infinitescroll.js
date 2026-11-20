// mui-js/static/widgets/infinitescroll.js
import { h } from "../core.js";

// Accessible, headless Infinite Scroll sentinel using IntersectionObserver.
export class InfiniteScroll {
    constructor({
        targetContainer = null,
        onLoadMore = async () => {},
        threshold = 0.2,
        hasMore = true,
        loadingLabel = "Loading more entries...",
        className = "",
    } = {}) {
        this.targetContainer = targetContainer;
        this.onLoadMore = onLoadMore;
        this.hasMore = hasMore;
        this.isLoading = false;

        this.sentinel = h("div", {
            class: `ui-infinite-sentinel ${className}`.trim(),
            role: "status",
            "aria-live": "polite",
        },
            h("span", { class: "ui-infinite-loading", hidden: true }, loadingLabel)
        );

        this.loadingSpan = this.sentinel.querySelector(".ui-infinite-loading");

        if (targetContainer) {
            targetContainer.append(this.sentinel);
        }

        this.#initObserver(threshold);
    }

    #initObserver(threshold) {
        if (typeof IntersectionObserver === "undefined") return;

        this.observer = new IntersectionObserver((entries) => {
            const entry = entries[0];
            if (entry && entry.isIntersecting && this.hasMore && !this.isLoading) {
                this.#trigger();
            }
        }, { threshold });

        this.observer.observe(this.sentinel);
    }

    async #trigger() {
        this.isLoading = true;
        this.sentinel.setAttribute("aria-busy", "true");
        if (this.loadingSpan) this.loadingSpan.hidden = false;

        try {
            const shouldContinue = await this.onLoadMore();
            if (shouldContinue === false) {
                this.setHasMore(false);
            }
        } catch (e) {
            console.error("[mui-js] InfiniteScroll error:", e);
        } finally {
            this.isLoading = false;
            this.sentinel.removeAttribute("aria-busy");
            if (this.loadingSpan) this.loadingSpan.hidden = true;
        }
    }

    setHasMore(more) {
        this.hasMore = !!more;
        if (!this.hasMore && this.observer) {
            this.observer.unobserve(this.sentinel);
        } else if (this.hasMore && this.observer) {
            this.observer.observe(this.sentinel);
        }
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}
