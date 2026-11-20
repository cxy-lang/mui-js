// mui-js/static/widgets/chart.js
import { h } from "../core.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function svg(tag, attrs = {}, ...children) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v !== null && v !== undefined) el.setAttribute(k, String(v));
    }
    for (const c of children) {
        if (typeof c === "string") el.textContent = c;
        else if (c instanceof Node) el.append(c);
    }
    return el;
}

// Generates a smooth cubic bezier SVG path through points
function smoothBezier(points) {
    if (points.length <= 1) return points.map((p) => `M ${p.x} ${p.y}`).join(" ");
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i === 0 ? 0 : i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
}

// -------------------------------------------------------------
// 1. Sparkline (Inline compact metric trend)
// -------------------------------------------------------------
export class Sparkline {
    constructor({
        data = [], // array of numbers
        width = 100,
        height = 24,
        stroke = "currentColor",
        strokeWidth = 2,
        fill = false,
        endpoint = true,
        className = "",
    } = {}) {
        this.width = width;
        this.height = height;
        this.stroke = stroke;
        this.strokeWidth = strokeWidth;
        this.fill = fill;
        this.endpoint = endpoint;

        const wStr = typeof width === "number" ? `${width}px` : width;
        const hStr = typeof height === "number" ? `${height}px` : height;

        this.svg = svg("svg", {
            viewBox: `0 0 ${width} ${height}`,
            width: String(width),
            height: String(height),
            class: "ui-sparkline-svg",
            preserveAspectRatio: "none",
        });

        this.el = h("div", {
            class: `ui-sparkline ${className}`.trim(),
            style: `width: ${wStr}; height: ${hStr}; flex-shrink: 0;`,
        }, this.svg);

        this.set(data);
    }

    set(data) {
        if (!data || data.length === 0) {
            this.svg.replaceChildren();
            return;
        }

        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max === min ? 1 : max - min;
        const pad = Math.max(2, this.strokeWidth + 1);

        const points = data.map((v, i) => {
            const x = (i / (data.length - 1)) * (this.width - 2 * pad) + pad;
            const y = this.height - pad - ((v - min) / range) * (this.height - 2 * pad);
            return { x, y };
        });

        const pathD = smoothBezier(points);
        const linePath = svg("path", {
            d: pathD,
            fill: "none",
            stroke: this.stroke,
            "stroke-width": this.strokeWidth,
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            class: "ui-sparkline-line",
        });

        const elements = [];

        if (this.fill) {
            const areaD = `${pathD} L ${points[points.length - 1].x} ${this.height} L ${points[0].x} ${this.height} Z`;
            elements.push(svg("path", {
                d: areaD,
                fill: this.stroke,
                "fill-opacity": "0.15",
                class: "ui-sparkline-area",
            }));
        }

        elements.push(linePath);

        if (this.endpoint && points.length > 0) {
            const last = points[points.length - 1];
            elements.push(svg("circle", {
                cx: last.x.toFixed(1),
                cy: last.y.toFixed(1),
                r: Math.max(2, this.strokeWidth + 0.5),
                fill: this.stroke,
                class: "ui-sparkline-point",
            }));
        }

        this.svg.replaceChildren(...elements);
    }
}

// -------------------------------------------------------------
// 2. LineChart / AreaChart (Time-series with axes & tooltips)
// -------------------------------------------------------------
export class LineChart {
    constructor({
        data = [], // [{ label: "10:00", value: 45 }]
        width = 460,
        height = 180,
        smooth = true,
        area = true,
        stroke = "var(--accent-blue)",
        unit = "",
        gridLines = 4,
        className = "",
    } = {}) {
        this.width = width;
        this.height = height;
        this.smooth = smooth;
        this.area = area;
        this.stroke = stroke;
        this.unit = unit;
        this.gridLines = gridLines;
        this.data = data;
        this.points = [];

        this.tooltip = h("div", { class: "ui-chart-tooltip", hidden: true });

        const gradId = `grad-${Math.random().toString(36).slice(2, 8)}`;
        this.defs = svg("defs", {},
            svg("linearGradient", { id: gradId, x1: "0", y1: "0", x2: "0", y2: "1" },
                svg("stop", { offset: "0%", "stop-color": stroke, "stop-opacity": "0.28" }),
                svg("stop", { offset: "100%", "stop-color": stroke, "stop-opacity": "0.0" })
            )
        );
        this.areaGradientId = gradId;

        this.svg = svg("svg", {
            viewBox: `0 0 ${width} ${height}`,
            class: "ui-chart-svg",
        }, this.defs);

        this.el = h("div", {
            class: `ui-chart-wrap ${className}`.trim(),
        }, this.svg, this.tooltip);

        this.#bindEvents();
        this.set(data);
    }

    set(data) {
        this.data = data || [];
        if (this.data.length === 0) {
            this.svg.replaceChildren(this.defs);
            return;
        }

        const padLeft = 40;
        const padRight = 16;
        const padTop = 16;
        const padBottom = 26;

        const w = this.width - padLeft - padRight;
        const hPlot = this.height - padTop - padBottom;

        const values = this.data.map((d) => d.value);
        let minVal = Math.min(...values);
        let maxVal = Math.max(...values);
        if (minVal === maxVal) { minVal = 0; maxVal = maxVal || 10; }

        this.points = this.data.map((d, i) => {
            const x = padLeft + (i / (this.data.length - 1)) * w;
            const y = padTop + hPlot - ((d.value - minVal) / (maxVal - minVal)) * hPlot;
            return { x, y, data: d };
        });

        const elements = [this.defs];

        // 1. Grid Lines and Y-Axis labels
        for (let g = 0; g <= this.gridLines; g++) {
            const yPos = padTop + (g / this.gridLines) * hPlot;
            const val = maxVal - (g / this.gridLines) * (maxVal - minVal);
            const valStr = Math.round(val);

            elements.push(svg("line", {
                x1: padLeft,
                y1: yPos,
                x2: this.width - padRight,
                y2: yPos,
                class: "ui-chart-grid-line",
            }));

            elements.push(svg("text", {
                x: padLeft - 6,
                y: yPos + 3,
                class: "ui-chart-axis-text axis-y",
                "text-anchor": "end",
            }, `${valStr}`));
        }

        // 2. X-Axis Labels (show subset to avoid overlap)
        const step = Math.max(1, Math.floor(this.data.length / 5));
        this.data.forEach((d, i) => {
            if (i % step === 0 || i === this.data.length - 1) {
                const pt = this.points[i];
                elements.push(svg("text", {
                    x: pt.x,
                    y: this.height - 6,
                    class: "ui-chart-axis-text axis-x",
                    "text-anchor": "middle",
                }, d.label));
            }
        });

        // 3. Line & Area Paths
        const pathD = this.smooth ? smoothBezier(this.points) : this.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

        if (this.area) {
            const areaD = `${pathD} L ${this.points[this.points.length - 1].x} ${padTop + hPlot} L ${this.points[0].x} ${padTop + hPlot} Z`;
            elements.push(svg("path", {
                d: areaD,
                fill: `url(#${this.areaGradientId})`,
                class: "ui-chart-area-fill",
            }));
        }

        elements.push(svg("path", {
            d: pathD,
            fill: "none",
            stroke: this.stroke,
            "stroke-width": 2,
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            class: "ui-chart-line",
        }));

        // 4. Interactive Hover Markers
        this.hoverLine = svg("line", {
            class: "ui-chart-crosshair",
            y1: padTop,
            y2: padTop + hPlot,
            hidden: "true",
        });
        this.hoverPoint = svg("circle", {
            r: 4,
            fill: this.stroke,
            stroke: "var(--bg-surface)",
            "stroke-width": 2,
            class: "ui-chart-hover-point",
            hidden: "true",
        });

        elements.push(this.hoverLine, this.hoverPoint);
        this.svg.replaceChildren(...elements);
    }

    #bindEvents() {
        this.svg.addEventListener("mousemove", (e) => {
            if (this.points.length === 0) return;
            const rect = this.svg.getBoundingClientRect();
            const scaleX = this.width / rect.width;
            const mouseX = (e.clientX - rect.left) * scaleX;

            // Binary search for closest point: O(log N)
            let closest;
            if (this.points.length <= 2) {
                closest = this.points.length === 1 || Math.abs(mouseX - this.points[0].x) <= Math.abs(mouseX - this.points[1].x)
                    ? this.points[0]
                    : this.points[1];
            } else {
                let low = 0;
                let high = this.points.length - 1;
                while (low < high - 1) {
                    const mid = (low + high) >> 1;
                    if (this.points[mid].x < mouseX) {
                        low = mid;
                    } else {
                        high = mid;
                    }
                }
                closest = Math.abs(mouseX - this.points[low].x) <= Math.abs(mouseX - this.points[high].x)
                    ? this.points[low]
                    : this.points[high];
            }

            // Position crosshair & active point
            this.hoverLine.setAttribute("x1", closest.x);
            this.hoverLine.setAttribute("x2", closest.x);
            this.hoverLine.removeAttribute("hidden");

            this.hoverPoint.setAttribute("cx", closest.x);
            this.hoverPoint.setAttribute("cy", closest.y);
            this.hoverPoint.removeAttribute("hidden");

            // Display tooltip
            this.tooltip.innerHTML = `<strong>${closest.data.label}</strong>: ${closest.data.value}${this.unit}`;
            this.tooltip.hidden = false;

            const tRect = this.tooltip.getBoundingClientRect();
            const posX = (closest.x / this.width) * rect.width;
            const posY = (closest.y / this.height) * rect.height;

            this.tooltip.style.left = `${posX - tRect.width / 2}px`;
            this.tooltip.style.top = `${posY - tRect.height - 8}px`;
        });

        this.svg.addEventListener("mouseleave", () => {
            if (this.hoverLine) this.hoverLine.setAttribute("hidden", "true");
            if (this.hoverPoint) this.hoverPoint.setAttribute("hidden", "true");
            this.tooltip.hidden = true;
        });
    }
}

// -------------------------------------------------------------
// 3. BarChart (Categorical bar chart)
// -------------------------------------------------------------
export class BarChart {
    constructor({
        data = [], // [{ label: "Mon", value: 32 }]
        width = 460,
        height = 180,
        color = "var(--accent-blue)",
        unit = "",
        className = "",
    } = {}) {
        this.width = width;
        this.height = height;
        this.color = color;
        this.unit = unit;

        this.tooltip = h("div", { class: "ui-chart-tooltip", hidden: true });
        this.svg = svg("svg", {
            viewBox: `0 0 ${width} ${height}`,
            class: "ui-chart-svg",
        });

        this.el = h("div", {
            class: `ui-chart-wrap ${className}`.trim(),
        }, this.svg, this.tooltip);

        this.set(data);
    }

    set(data) {
        this.data = data || [];
        if (this.data.length === 0) {
            this.svg.replaceChildren();
            return;
        }

        const padLeft = 32;
        const padRight = 16;
        const padTop = 16;
        const padBottom = 26;

        const w = this.width - padLeft - padRight;
        const hPlot = this.height - padTop - padBottom;

        const values = this.data.map((d) => d.value);
        const maxVal = Math.max(...values, 1);

        const slotW = w / this.data.length;
        const barW = Math.max(8, slotW * 0.65);

        const elements = [];

        // Grid lines
        for (let g = 0; g <= 3; g++) {
            const yPos = padTop + (g / 3) * hPlot;
            const val = Math.round(maxVal - (g / 3) * maxVal);

            elements.push(svg("line", {
                x1: padLeft,
                y1: yPos,
                x2: this.width - padRight,
                y2: yPos,
                class: "ui-chart-grid-line",
            }));

            elements.push(svg("text", {
                x: padLeft - 6,
                y: yPos + 3,
                class: "ui-chart-axis-text axis-y",
                "text-anchor": "end",
            }, `${val}`));
        }

        // Bars
        this.data.forEach((d, i) => {
            const barH = (d.value / maxVal) * hPlot;
            const x = padLeft + i * slotW + (slotW - barW) / 2;
            const y = padTop + hPlot - barH;

            const rect = svg("rect", {
                x,
                y,
                width: barW,
                height: Math.max(2, barH),
                rx: 3,
                fill: this.color,
                class: "ui-chart-bar",
            });

            // Hover tooltip
            rect.addEventListener("mouseenter", () => {
                rect.classList.add("hover");
                this.tooltip.innerHTML = `<strong>${d.label}</strong>: ${d.value}${this.unit}`;
                this.tooltip.hidden = false;

                const bRect = this.svg.getBoundingClientRect();
                const posX = ((x + barW / 2) / this.width) * bRect.width;
                const posY = (y / this.height) * bRect.height;
                const tRect = this.tooltip.getBoundingClientRect();

                this.tooltip.style.left = `${posX - tRect.width / 2}px`;
                this.tooltip.style.top = `${posY - tRect.height - 6}px`;
            });

            rect.addEventListener("mouseleave", () => {
                rect.classList.remove("hover");
                this.tooltip.hidden = true;
            });

            elements.push(rect);

            // Label
            elements.push(svg("text", {
                x: x + barW / 2,
                y: this.height - 6,
                class: "ui-chart-axis-text axis-x",
                "text-anchor": "middle",
            }, d.label));
        });

        this.svg.replaceChildren(...elements);
    }
}

// -------------------------------------------------------------
// 4. DonutChart (Proportional segments & center label)
// -------------------------------------------------------------
export class DonutChart {
    constructor({
        segments = [], // [{ label: "Used", value: 65, color: "var(--accent-blue)" }]
        size = 140,
        strokeWidth = 14,
        centerLabel = "",
        subLabel = "",
        className = "",
    } = {}) {
        this.size = size;
        this.strokeWidth = strokeWidth;
        this.centerLabel = centerLabel;
        this.subLabel = subLabel;

        this.svg = svg("svg", {
            viewBox: "0 0 100 100",
            class: "ui-donut-svg",
        });

        this.legend = h("div", { class: "ui-donut-legend" });

        this.el = h("div", {
            class: `ui-donut-wrap ${className}`.trim(),
        }, this.svg, this.legend);

        this.set(segments);
    }

    set(segments) {
        this.segments = segments || [];
        const total = this.segments.reduce((acc, s) => acc + s.value, 0) || 1;

        const radius = 40;
        const circumference = 2 * Math.PI * radius; // ~251.32

        let accumulated = 0;
        const circles = [];

        // Track background ring
        circles.push(svg("circle", {
            cx: "50",
            cy: "50",
            r: radius,
            fill: "none",
            stroke: "var(--bg-surface-elevated)",
            "stroke-width": this.strokeWidth,
            class: "ui-donut-track",
        }));

        this.segments.forEach((seg) => {
            const fraction = seg.value / total;
            const arcLength = fraction * circumference;
            const offset = -(accumulated * circumference);

            const c = svg("circle", {
                cx: "50",
                cy: "50",
                r: radius,
                fill: "none",
                stroke: seg.color || "var(--accent-blue)",
                "stroke-width": this.strokeWidth,
                "stroke-dasharray": `${arcLength} ${circumference - arcLength}`,
                "stroke-dashoffset": offset,
                class: "ui-donut-segment",
                transform: "rotate(-90 50 50)",
            });

            circles.push(c);
            accumulated += fraction;
        });

        // Center typography
        if (this.centerLabel) {
            circles.push(svg("text", {
                x: "50",
                y: this.subLabel ? "48" : "54",
                class: "ui-donut-center-label",
                "text-anchor": "middle",
            }, this.centerLabel));
        }

        if (this.subLabel) {
            circles.push(svg("text", {
                x: "50",
                y: "62",
                class: "ui-donut-sub-label",
                "text-anchor": "middle",
            }, this.subLabel));
        }

        this.svg.replaceChildren(...circles);

        // Build legend
        const legendItems = this.segments.map((s) => {
            const pct = Math.round((s.value / total) * 100);
            return h("div", { class: "ui-donut-legend-item" },
                h("span", {
                    class: "ui-donut-legend-dot",
                    style: `background: ${s.color || "var(--accent-blue)"};`,
                }),
                h("span", { class: "ui-donut-legend-label" }, s.label),
                h("span", { class: "ui-donut-legend-pct mono" }, `${pct}%`)
            );
        });

        this.legend.replaceChildren(...legendItems);
    }
}
