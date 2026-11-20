// mui-js/static/widgets/toast.js
import { h } from "../core.js";

// Non-blocking toast notifications system.
export const Toast = {
    _stack: null,

    show(message, kind = "success", durationMs = 4000) {
        if (!Toast._stack) {
            Toast._stack = h("div", {
                class: "toast-stack ui-toast-stack",
                role: "status",
                "aria-live": "polite",
            });
            document.body.append(Toast._stack);
        }

        const toast = h("div", {
            class: `toast toast-${kind} ui-toast ui-toast-${kind}`,
            "data-kind": kind,
        }, message);

        Toast._stack.append(toast);

        setTimeout(() => {
            toast.classList.add("toast-leaving");
            setTimeout(() => toast.remove(), 250);
        }, durationMs);
    },
};
