// mui-js/static/widgets/splitpane.js
import { h } from "../core.js";

// Accessible, headless Resizable Split Pane component.
export class SplitPane {
    constructor({
        direction = "horizontal", // "horizontal" | "vertical"
        initialRatio = 0.5,
        minRatio = 0.15,
        maxRatio = 0.85,
        pane1 = null,
        pane2 = null,
        onChange = () => {},
        className = "",
    } = {}) {
        this.direction = direction;
        this.minRatio = minRatio;
        this.maxRatio = maxRatio;
        this.ratio = Math.max(minRatio, Math.min(maxRatio, initialRatio));
        this.onChange = onChange;
        this.isDragging = false;

        this.pane1El = h("div", { class: "ui-split-pane pane-1" },
            typeof pane1 === "function" ? pane1() : pane1
        );
        this.pane2El = h("div", { class: "ui-split-pane pane-2" },
            typeof pane2 === "function" ? pane2() : pane2
        );

        this.handle = h("div", {
            class: "ui-split-handle",
            role: "separator",
            tabindex: "0",
            "aria-orientation": direction,
            "aria-valuenow": String(Math.round(this.ratio * 100)),
            "aria-label": "Resize panels",
        });

        this.el = h("div", {
            class: `ui-split-container dir-${direction} ${className}`.trim(),
        }, this.pane1El, this.handle, this.pane2El);

        this.#applyRatio();
        this.#bind();
    }

    #applyRatio() {
        const pct1 = (this.ratio * 100).toFixed(2);
        const pct2 = ((1 - this.ratio) * 100).toFixed(2);

        if (this.direction === "horizontal") {
            this.pane1El.style.width = `calc(${pct1}% - 4px)`;
            this.pane2El.style.width = `calc(${pct2}% - 4px)`;
            this.pane1El.style.height = "100%";
            this.pane2El.style.height = "100%";
        } else {
            this.pane1El.style.height = `calc(${pct1}% - 4px)`;
            this.pane2El.style.height = `calc(${pct2}% - 4px)`;
            this.pane1El.style.width = "100%";
            this.pane2El.style.width = "100%";
        }

        this.handle.setAttribute("aria-valuenow", String(Math.round(this.ratio * 100)));
    }

    #bind() {
        const onMove = (e) => {
            if (!this.isDragging) return;
            const rect = this.el.getBoundingClientRect();

            let newRatio = this.ratio;
            if (this.direction === "horizontal") {
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                newRatio = (clientX - rect.left) / rect.width;
            } else {
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                newRatio = (clientY - rect.top) / rect.height;
            }

            this.ratio = Math.max(this.minRatio, Math.min(this.maxRatio, newRatio));
            this.#applyRatio();
            this.onChange(this.ratio);
        };

        const onUp = () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.el.classList.remove("is-resizing");
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
                window.removeEventListener("touchmove", onMove);
                window.removeEventListener("touchend", onUp);
            }
        };

        const onDown = (e) => {
            e.preventDefault();
            this.isDragging = true;
            this.el.classList.add("is-resizing");
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
            window.addEventListener("touchmove", onMove);
            window.addEventListener("touchend", onUp);
        };

        this.handle.addEventListener("mousedown", onDown);
        this.handle.addEventListener("touchstart", onDown);

        // Keyboard arrow navigation on handle
        this.handle.addEventListener("keydown", (e) => {
            const step = 0.05;
            if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                this.ratio = Math.max(this.minRatio, this.ratio - step);
                this.#applyRatio();
                this.onChange(this.ratio);
            } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                this.ratio = Math.min(this.maxRatio, this.ratio + step);
                this.#applyRatio();
                this.onChange(this.ratio);
            }
        });
    }
}
