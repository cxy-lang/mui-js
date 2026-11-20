// mui-js/static/boot.js
// Progressive hydration bootloader: scans [data-mount] elements and dynamically imports components.
import { readProps } from "./core.js";

export function createBootloader(widgets = {}) {
    if (typeof document === "undefined") return;

    for (const el of document.querySelectorAll("[data-mount]")) {
        const mountName = el.dataset && el.dataset.mount;
        if (!mountName) continue;

        const loader = widgets[mountName];
        if (!loader) continue;

        const props = readProps(el);
        Promise.resolve()
            .then(() => loader(el, props))
            .then((m) => {
                const mountFn = typeof m === "function" ? m : (m && m.default);
                if (typeof mountFn === "function" && mountFn !== loader) {
                    mountFn(el, props);
                }
            })
            .catch((err) => {
                console.error(`Failed to hydrate [data-mount="${mountName}"]:`, err);
            });
    }
}
