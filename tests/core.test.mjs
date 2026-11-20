// mui-js/tests/core.test.mjs
// Native Node.js test runner: node --test tests/core.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { Signal } from "../static/core.js";
import { ApiClient, ApiError } from "../static/net.js";

test("Signal: holds initial value and updates reactively", () => {
    const s = new Signal(10);
    assert.equal(s.get(), 10);

    const seen = [];
    const unsub = s.subscribe((val) => seen.push(val));

    s.set(20);
    s.set((prev) => prev + 5);
    assert.equal(s.get(), 25);
    assert.deepEqual(seen, [20, 25]);

    unsub();
    s.set(100);
    assert.equal(s.get(), 100);
    assert.deepEqual(seen, [20, 25]); // unsubscribed, not called
});

test("Signal: equality check suppresses duplicate notifications", () => {
    const s = new Signal("initial");
    let calls = 0;
    s.subscribe(() => { calls++; });

    s.set("initial"); // identical value
    assert.equal(calls, 0);

    s.set("updated");
    assert.equal(calls, 1);

    s.set("updated"); // identical value again
    assert.equal(calls, 1);
});

test("ApiClient: supports AbortSignal cancellation", async () => {
    globalThis.fetch = async (url, opts) => {
        if (opts.signal && opts.signal.aborted) {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            throw err;
        }
        return { ok: true, status: 200, text: async () => "{}" };
    };

    const controller = new AbortController();
    controller.abort();

    const api = new ApiClient();
    await assert.rejects(
        async () => { await api.get("/test", { signal: controller.signal }); },
        (err) => {
            assert.ok(err instanceof ApiError);
            assert.equal(err.code, "ABORTED");
            return true;
        }
    );
});

test("ApiClient: URL normalization and method routing", async () => {
    let capturedUrl = "";
    let capturedOpts = null;

    // Mock fetch
    globalThis.fetch = async (url, opts) => {
        capturedUrl = url;
        capturedOpts = opts;
        return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ ok: true, data: "test" }),
        };
    };

    const api = new ApiClient({ baseUrl: "/api/v1" });
    const res = await api.get("/users/42");

    assert.equal(capturedUrl, "/api/v1/users/42");
    assert.equal(capturedOpts.method, "GET");
    assert.deepEqual(res, { ok: true, data: "test" });

    // Test POST with JSON body
    await api.post("projects", { name: "my-proj" });
    assert.equal(capturedUrl, "/api/v1/projects");
    assert.equal(capturedOpts.method, "POST");
    assert.equal(capturedOpts.headers["Content-Type"], "application/json");
    assert.equal(capturedOpts.body, JSON.stringify({ name: "my-proj" }));
});

test("ApiClient: handles error responses gracefully", async () => {
    globalThis.fetch = async () => ({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ error: { code: "NOT_FOUND", message: "Resource missing" } }),
    });

    const api = new ApiClient({ baseUrl: "/api/v1" });
    await assert.rejects(
        async () => { await api.get("/missing"); },
        (err) => {
            assert.ok(err instanceof ApiError);
            assert.equal(err.status, 404);
            assert.equal(err.code, "NOT_FOUND");
            assert.equal(err.message, "Resource missing");
            return true;
        }
    );
});
