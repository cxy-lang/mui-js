// mui-js/static/widgets/avatar.js
import { h } from "../core.js";

// Accessible, headless User Avatar with fallback initials and status badge.
export class Avatar {
    constructor({
        src = null,
        name = "",
        size = "md", // "sm" | "md" | "lg"
        status = null, // "online" | "offline" | "busy" | null
        className = "",
    } = {}) {
        this.src = src;
        this.name = name;
        this.size = size;

        const initials = Avatar.getInitials(name);
        this.fallbackEl = h("span", { class: "ui-avatar-fallback mono" }, initials);

        const children = [];

        if (src) {
            this.imgEl = h("img", {
                src,
                alt: name || "User Avatar",
                class: "ui-avatar-img",
            });

            this.imgEl.addEventListener("error", () => {
                this.imgEl.remove();
                this.el.prepend(this.fallbackEl);
            });

            children.push(this.imgEl);
        } else {
            children.push(this.fallbackEl);
        }

        if (status) {
            this.statusDot = h("span", {
                class: `ui-avatar-status status-${status}`,
                "aria-hidden": "true",
            });
            children.push(this.statusDot);
        }

        this.el = h("div", {
            class: `ui-avatar size-${size} ${className}`.trim(),
            title: name,
            role: "img",
            "aria-label": name || "Avatar",
        }, ...children);
    }

    static getInitials(name) {
        if (!name) return "?";
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
}

// Accessible Avatar Stack / Group with "+N" overflow badge.
export class AvatarGroup {
    constructor({
        users = [], // [{ src, name, status }]
        max = 4,
        size = "md",
        className = "",
    } = {}) {
        const visible = users.slice(0, max);
        const overflow = users.length - max;

        const elements = visible.map((u) => new Avatar({ ...u, size }).el);

        if (overflow > 0) {
            const moreBadge = h("div", {
                class: `ui-avatar ui-avatar-more size-${size}`,
                title: `${overflow} more users`,
            }, `+${overflow}`);
            elements.push(moreBadge);
        }

        this.el = h("div", {
            class: `ui-avatar-group size-${size} ${className}`.trim(),
        }, ...elements);
    }
}
