// mui-js/static/widgets/timeago.js
import { h } from "../core.js";

// Formats timestamps into live human-readable relative time ("just now", "2m ago", "1h ago").
export class TimeAgo {
    constructor({
        date = new Date(),
        refreshIntervalMs = 30000,
        className = "",
    } = {}) {
        this.date = date instanceof Date ? date : new Date(date);
        this.refreshIntervalMs = refreshIntervalMs;
        this._timer = null;

        this.el = h("time", {
            class: `ui-timeago ${className}`.trim(),
            datetime: this.date.toISOString(),
            title: this.date.toLocaleString(),
        }, TimeAgo.format(this.date));

        if (refreshIntervalMs > 0 && typeof window !== "undefined") {
            this._timer = setInterval(() => this.update(), refreshIntervalMs);
        }
    }

    update() {
        this.el.textContent = TimeAgo.format(this.date);
    }

    destroy() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
        }
    }

    static format(d) {
        const date = d instanceof Date ? d : new Date(d);
        const diffMs = Date.now() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);

        if (diffSec < 5) return "just now";
        if (diffSec < 60) return `${diffSec}s ago`;

        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return `${diffMin}m ago`;

        const diffHour = Math.floor(diffMin / 60);
        if (diffHour < 24) return `${diffHour}h ago`;

        const diffDay = Math.floor(diffHour / 24);
        if (diffDay < 30) return `${diffDay}d ago`;

        const diffMonth = Math.floor(diffDay / 30);
        if (diffMonth < 12) return `${diffMonth}mo ago`;

        return `${Math.floor(diffDay / 365)}y ago`;
    }

    // Automatically scans and enhances all server-rendered <time datetime="..."> elements in root
    static enhance(root = document, { refreshIntervalMs = 30000 } = {}) {
        if (typeof window === "undefined") return [];
        const times = root.querySelectorAll("time[datetime]");
        const instances = [];

        for (const t of times) {
            if (t.dataset.timeagoWired) continue;
            t.dataset.timeagoWired = "true";
            const dt = new Date(t.getAttribute("datetime"));
            if (isNaN(dt.getTime())) continue;

            t.textContent = TimeAgo.format(dt);
            t.title = dt.toLocaleString();

            const timer = setInterval(() => {
                if (!document.body.contains(t)) {
                    clearInterval(timer);
                    return;
                }
                t.textContent = TimeAgo.format(dt);
            }, refreshIntervalMs);

            instances.push({ el: t, timer });
        }
        return instances;
    }
}
