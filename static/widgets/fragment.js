// mui-js/static/widgets/fragment.js
//
// Progressive enhancement helper for Server-Side Rendered (SSR) HTML applications.
// Intercepts navigation and form submissions with [data-fragment] attributes
// to fetch and swap targeted HTML partials in-place without full page reloads.

export async function swapFragment(url, targetSelector, {
    method = "GET",
    body = null,
    pushUrl = true,
    headers = {},
} = {}) {
    const targetEl = document.querySelector(targetSelector);
    if (!targetEl) {
        console.warn(`[mui-js] Fragment target selector "${targetSelector}" not found in document.`);
        return false;
    }

    targetEl.setAttribute("aria-busy", "true");
    targetEl.classList.add("is-fragment-loading");

    try {
        const fetchOpts = {
            method,
            headers: {
                "X-Requested-With": "mui-fragment",
                ...headers,
            },
        };

        if (body) {
            if (body instanceof FormData) {
                fetchOpts.body = body;
            } else if (typeof body === "object") {
                fetchOpts.headers["Content-Type"] = "application/json";
                fetchOpts.body = JSON.stringify(body);
            } else {
                fetchOpts.body = String(body);
            }
        }

        const res = await fetch(url, fetchOpts);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status} loading fragment from ${url}`);
        }

        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const nextNode = doc.querySelector(targetSelector);

        if (!nextNode) {
            // Target was not present in the returned HTML response
            console.warn(`[mui-js] Response from ${url} does not contain fragment "${targetSelector}".`);
            return false;
        }

        // Swap node
        targetEl.replaceWith(nextNode);

        if (pushUrl && method === "GET" && typeof window !== "undefined" && window.history) {
            window.history.pushState(null, "", url);
        }

        nextNode.dispatchEvent(new CustomEvent("fragment:loaded", {
            bubbles: true,
            detail: { url, targetSelector },
        }));

        // Re-wire any new fragments inside the swapped content
        wireFragments(nextNode);
        return true;
    } catch (err) {
        console.error("[mui-js] Fragment swap failed:", err);
        return false;
    } finally {
        targetEl.removeAttribute("aria-busy");
        targetEl.classList.remove("is-fragment-loading");
    }
}

// Automatically scans and attaches AJAX partial swaps to links and forms
// with the `data-fragment="<selector>"` attribute.
export function wireFragments(root = document) {
    if (typeof window === "undefined") return;

    // 1. Intercept links: <a href="..." data-fragment="#target">
    const links = root.querySelectorAll("a[data-fragment]");
    for (const link of links) {
        if (link.dataset.fragmentWired) continue;
        link.dataset.fragmentWired = "true";

        link.addEventListener("click", (e) => {
            // Allow default for middle-click, command-click, etc.
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            const target = link.dataset.fragment;
            const push = link.dataset.pushUrl !== "false";
            swapFragment(link.href, target, { pushUrl: push });
        });
    }

    // 2. Intercept forms: <form action="..." data-fragment="#target">
    const forms = root.querySelectorAll("form[data-fragment]");
    for (const form of forms) {
        if (form.dataset.fragmentWired) continue;
        form.dataset.fragmentWired = "true";

        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const target = form.dataset.fragment;
            const method = (form.method || "GET").toUpperCase();
            const action = form.action || window.location.href;
            const push = form.dataset.pushUrl !== "false";

            if (method === "GET") {
                const params = new URLSearchParams(new FormData(form)).toString();
                const url = `${action.split("?")[0]}?${params}`;
                swapFragment(url, target, { method: "GET", pushUrl: push });
            } else {
                const body = new FormData(form);
                swapFragment(action, target, { method, body, pushUrl: false });
            }
        });
    }
}
