// mui-js/static/net.js
//
// Network transport: configurable JSON ApiClient and generic EventFeed (SSE).

export class ApiError extends Error {
    constructor(status, code, message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

export class ApiClient {
    constructor({ baseUrl = "", loginUrl = "/login" } = {}) {
        this.baseUrl = baseUrl;
        this.loginUrl = loginUrl;
    }

    async request(method, path, body, { signal = null, headers = {} } = {}) {
        const fullUrl = path.startsWith("http://") || path.startsWith("https://")
            ? path
            : `${this.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;

        const opts = { method, credentials: "same-origin", headers: { ...headers } };
        if (signal) {
            opts.signal = signal;
        }
        if (body !== undefined) {
            opts.headers["Content-Type"] = "application/json";
            opts.body = typeof body === "string" ? body : JSON.stringify(body);
        }

        let r;
        try {
            r = await fetch(fullUrl, opts);
        } catch (e) {
            if (e.name === "AbortError") {
                throw new ApiError(0, "ABORTED", "Request was aborted");
            }
            throw new ApiError(0, "NETWORK", "Could not reach the server");
        }

        if (r.status === 401 && this.loginUrl) {
            if (typeof window !== "undefined" && window.location) {
                window.location = this.loginUrl;
            }
            throw new ApiError(401, "UNAUTHORIZED", "Your session has expired");
        }

        const text = await r.text();
        let data = null;
        if (text) {
            const trimmed = text.trim();
            const first = trimmed.charCodeAt(0);
            if (first === 123 || first === 91) { // '{' or '['
                try {
                    data = JSON.parse(text);
                } catch (_) {
                    data = null;
                }
            } else {
                data = text;
            }
        }

        if (!r.ok) {
            const err = data && typeof data === "object" ? data.error : null;
            throw new ApiError(r.status, (err && err.code) || "ERROR", (err && err.message) || `HTTP ${r.status}`);
        }
        return data;
    }

    get(path, opts) { return this.request("GET", path, undefined, opts); }
    post(path, body, opts) { return this.request("POST", path, body, opts); }
    put(path, body, opts) { return this.request("PUT", path, body, opts); }
    patch(path, body, opts) { return this.request("PATCH", path, body, opts); }
    delete(path, opts) { return this.request("DELETE", path, undefined, opts); }
}

export const Api = new ApiClient({ baseUrl: "" });

// Generic Server-Sent Events wrapper with automatic dynamic event listener registration
export class EventFeed {
    #es = null;

    constructor(url, handlers, { fallback } = {}) {
        this.handlers = handlers || {};
        if (typeof EventSource === "undefined") {
            if (fallback) fallback();
            return;
        }

        this.#es = new EventSource(url);

        // Dynamically register listeners for all handler keys provided
        for (const name of Object.keys(this.handlers)) {
            if (name === "done") continue;
            this.#es.addEventListener(name, (e) => this.#dispatch(name, e));
        }

        // Close cleanly on "done"
        this.#es.addEventListener("done", (e) => {
            this.#dispatch("done", e);
            this.close();
        });

        this.#es.onerror = () => {
            if (this.#es && this.#es.readyState === EventSource.CLOSED) {
                this.close();
                if (fallback) fallback();
            }
        };
    }

    #dispatch(name, e) {
        const h = this.handlers[name];
        if (!h) return;
        const raw = e.data;
        if (typeof raw === "string") {
            const trimmed = raw.trim();
            const first = trimmed.charCodeAt(0);
            if (first === 123 || first === 91) { // '{' or '['
                try {
                    h(JSON.parse(raw));
                    return;
                } catch (_) {}
            }
        }
        h(raw);
    }

    close() {
        if (this.#es) {
            this.#es.close();
            this.#es = null;
        }
    }
}
