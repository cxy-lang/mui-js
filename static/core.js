// mui-js/static/core.js
//
// Core UI primitives: h() (hyperscript DOM builder), Signal (reactive value),
// and Component (base DOM widget with progressive hydration lifecycle).

function appendChildren(parent, children) {
    for (let i = 0; i < children.length; i++) {
        const c = children[i];
        if (c === null || c === undefined || c === false) continue;
        if (Array.isArray(c)) {
            appendChildren(parent, c);
        } else {
            parent.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
        }
    }
}

export function h(tag, props, ...children) {
    const el = document.createElement(tag);

    if (props) {
        for (const k in props) {
            if (!Object.prototype.hasOwnProperty.call(props, k)) continue;
            const v = props[k];
            if (v === null || v === undefined || v === false) continue;

            if (k === "class" || k === "className") {
                el.className = v;
            } else if (k === "value") {
                el.value = v;
            } else if (k === "checked" && typeof v === "boolean") {
                el.checked = v;
            } else if (k === "disabled" && typeof v === "boolean") {
                el.disabled = v;
            } else if (k.startsWith("on") && typeof v === "function") {
                el.addEventListener(k.slice(2).toLowerCase(), v);
            } else if (k === "style" && typeof v === "object") {
                Object.assign(el.style, v);
            } else {
                el.setAttribute(k, v === true ? "" : v);
            }
        }
    }

    if (children.length > 0) {
        appendChildren(el, children);
    }

    return el;
}

export function Signal(initialValue) {
    let value = initialValue;
    const subs = new Set();

    function signal(next) {
        if (arguments.length === 0) return value;
        const nextVal = typeof next === "function" ? next(value) : next;
        if (nextVal === value) return value;
        value = nextVal;
        const snapshot = Array.from(subs);
        for (let i = 0; i < snapshot.length; i++) {
            snapshot[i](value);
        }
        return value;
    }

    signal.get = () => value;
    signal.set = (next) => signal(next);
    signal.subscribe = (fn) => {
        subs.add(fn);
        return () => subs.delete(fn);
    };

    return signal;
}

// Global WeakMap cache for parsed props
const propsCache = new WeakMap();

// Reads JSON data embedded in the DOM via <script type="application/json" id="...">
// named by el.dataset.propsId. Returns fallback (default null) if missing or invalid.
export function readProps(el, fallback = null) {
    if (!el || !el.dataset) return fallback;
    const id = el.dataset.propsId;
    if (!id) return fallback;
    const block = document.getElementById(id);
    if (!block) return fallback;

    if (propsCache.has(block)) {
        return propsCache.get(block);
    }

    try {
        const parsed = JSON.parse(block.textContent);
        propsCache.set(block, parsed);
        return parsed;
    } catch {
        return fallback;
    }
}

export class Component {
    el;
    target;
    props = null;
    #unsubs = [];

    // Subclasses implement this. Called from mount() or attach().
    bind() {
        throw new Error("bind() not implemented");
    }

    watch(signal, onChange) {
        const unsub = signal.subscribe(onChange);
        this.#unsubs.push(unsub);
        return unsub;
    }

    // Replaces target with this.el in the DOM
    mount(target, props = null) {
        this.target = target;
        this.props = props;
        this.bind();
        target.replaceWith(this.el);
        return this;
    }

    // Enhances target in place (progressive hydration over SSR DOM)
    attach(target, props = null) {
        this.target = target;
        this.props = props;
        this.bind();
        return this;
    }

    destroy() {
        for (let i = 0; i < this.#unsubs.length; i++) {
            this.#unsubs[i]();
        }
        this.#unsubs = [];
    }
}

// Prompts before leaving the page while isDirty() returns true. Returns an unregister function.
export function dirtyGuard(isDirty) {
    if (typeof window === "undefined" || !window.addEventListener) return () => {};
    const handler = (e) => {
        if (!isDirty()) return;
        e.preventDefault();
        e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
}
