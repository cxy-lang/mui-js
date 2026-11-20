// mui-js/static/widgets/tooltip.js
import { h } from "../core.js";

// Accessible, lightweight floating Tooltip utility.
export const Tooltip = {
    _el: null,

    attach(target, text, { placement = "top" } = {}) {
        if (!Tooltip._el) {
            Tooltip._el = h("div", {
                class: "ui-tooltip",
                role: "tooltip",
                hidden: true,
            });
            document.body.append(Tooltip._el);
        }

        const show = () => {
            Tooltip._el.textContent = text;
            Tooltip._el.hidden = false;

            const rect = target.getBoundingClientRect();
            let left = rect.left + rect.width / 2;
            let top = rect.top - 8;

            if (placement === "bottom") {
                top = rect.bottom + 8;
                Tooltip._el.style.transform = "translate(-50%, 0)";
            } else {
                Tooltip._el.style.transform = "translate(-50%, -100%)";
            }

            Tooltip._el.style.left = `${left}px`;
            Tooltip._el.style.top = `${top}px`;
        };

        const hide = () => {
            if (Tooltip._el) {
                Tooltip._el.hidden = true;
            }
        };

        target.addEventListener("mouseenter", show);
        target.addEventListener("mouseleave", hide);
        target.addEventListener("focus", show);
        target.addEventListener("blur", hide);

        return () => {
            target.removeEventListener("mouseenter", show);
            target.removeEventListener("mouseleave", hide);
            target.removeEventListener("focus", show);
            target.removeEventListener("blur", hide);
        };
    },
};
