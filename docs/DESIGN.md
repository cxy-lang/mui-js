# mui-js — Architectural Design & Specification

| Field | Value |
|---|---|
| Project | `mui-js` (Micro UI for JavaScript & Cxy) |
| Package Type | Native Cxy Package (`Cxyfile.yaml`) |
| Runtime Dependencies | **Zero** (no `npm`, no `package.json`, no `node_modules`) |
| Build Tooling | Self-bootstrapping standalone `esbuild` via Node.js standard library |
| Status | Proposed / In Progress |

---

## 1. Vision & Core Philosophy

`mui-js` is an unstyled, headless micro-UI library and zero-npm build toolchain designed specifically for Cxy-powered web applications and modern browser clients.

Most modern frontend libraries force developers into a heavy Node.js/npm ecosystem filled with hundreds of transient dependencies, lockfiles, and opinionated CSS frameworks that clash with custom application styles. 

`mui-js` adheres to four guiding principles:

1. **Zero External Ecosystem Dependencies**: No `npm`, no `package.json`, and no external package managers. The entire library is distributed and consumed through Cxy's native package manager (`Cxyfile.yaml`).
2. **Headless / Unstyled Architecture**: The framework provides structure, interaction behavior, keyboard navigation, and accessibility (`aria-*`). Visual styling (colors, typography, borders, shadows, themes) is completely owned by the consuming application.
3. **Self-Assembling on `cxy package install`**: When installed as a dependency, an `install:` hook in `Cxyfile.yaml` automatically compiles and bundles the library's production distribution into `dist/`.
4. **Embedded Tooling for Consumers**: The package ships with a configurable, zero-npm asset bundler that consuming Cxy applications can use to bundle their own custom pages, CSS, and assets for production.

---

## 2. Architecture Overview

```
Consuming Application (e.g. Crunch)
  │
  ├── Server Side (Cxy):
  │     import { PageHeader, JsonProps } from "mui-js/props.cxy"
  │     - Mounts <div data-mount="widget-name">
  │     - Injects server state into <JsonProps>
  │     - Serves bundled or source assets via Cxy FileServer
  │
  └── Client Side (Browser):
        import { Component, h, Dialog, Field, Toast } from "/static/mui/index.js"
        - Zero build step required in development (raw ES modules)
        - Progressive hydration via bootloader scanning [data-mount]
        - Headless widgets styled by consumer's CSS (Pico, Tailwind, or custom)
```

---

## 3. Headless / Unstyled Design Principles

To ensure visual styling is 100% up to the user:

### 3.1 Zero Hardcoded Colors or Presentation Rules
Component JavaScript generates standard semantic HTML elements and attaches neutral, predictable `ui-*` classes and `data-*` attributes:
- `<dialog class="ui-dialog" role="dialog" aria-modal="true">`
- `<div class="ui-field" data-invalid="true">`
- `<span class="ui-tag-chip">`
- `<div class="ui-toast">`

### 3.2 State via Standard Data & ARIA Attributes
State changes are reflected via attributes, allowing the consumer's stylesheet to target states naturally:
```css
/* User's application stylesheet (e.g. Tailwind, Pico, or custom CSS) */
.ui-field[data-invalid="true"] input {
    border-color: var(--danger-color, red);
}
.ui-switch[aria-checked="true"] {
    background-color: var(--primary-color, blue);
}
```

### 3.3 Functional Layout Only (`skeleton.css`)
The library provides an optional, minimal `skeleton.css` (~50 lines) containing **strictly functional layout rules**:
- Centering dialogs on screen
- Positioning toast notifications at the viewport corner
- Positioning autocomplete suggestion dropdowns (`position: absolute`)
- Flex-wrapping tag chips (`display: inline-flex`)

`skeleton.css` contains **no colors, no borders, no padding choices, and no fonts**.

---

## 4. Component & Module Breakdown

```
mui-js/
├── Cxyfile.yaml                  # Cxy package definition & install hook
│
├── static/                       # Client-side ES Modules (zero-npm)
│   ├── core.js                   # h() hyperscript, Component base class
│   ├── net.js                    # Api client, EventFeed (SSE wrapper)
│   ├── widgets/
│   │   ├── dialog.js             # Accessible Dialog modal (Esc to close, focus trap)
│   │   ├── field.js              # Accessible form Field (label, input, error, hint)
│   │   ├── tags.js               # TagInput (chip editor with keyboard controls)
│   │   ├── table.js              # EditableTable, KeyValueEditor
│   │   ├── suggest.js            # SuggestBox (keyboard autocomplete dropdown)
│   │   ├── toast.js              # Toast notification system
│   │   ├── confirm.js            # ConfirmDelete & confirmAction dialogs
│   │   ├── copy.js               # CopyField (read-only input with copy button)
│   │   └── switch.js             # Accessible Switch (toggle switch)
│   ├── boot.js                   # Progressive hydration scanner ([data-mount])
│   └── index.js                  # Unified ES module entry point
│
├── styles/
│   └── skeleton.css              # Minimal functional layout CSS
│
├── src/                          # Server-side Cxy integration helpers
│   ├── props.cxy                 # <JsonProps> component for server hydration
│   ├── header.cxy                # Reusable <PageHeader> component
│   └── assets.cxy                # Asset manifest reader & long-cache headers
│
├── tools/                        # Zero-npm build toolchain
│   ├── build.mjs                 # Configurable esbuild bundler script
│   └── esbuild.lock.json         # Pinned platform binaries and SHA-512 hashes
│
└── tests/                        # Tests run via native Node.js (no npm)
    ├── core.test.mjs             # h() and Component unit tests
    ├── widgets.test.mjs          # Dialog, Field, TagInput unit tests
    └── net.test.mjs              # Api and EventFeed unit tests
```

---

## 5. Client Library Specifications

### 5.1 Core (`static/core.js`)
- **`h(tag, props, ...children)`**: Lightweight hyperscript DOM element builder.
  - Automatically handles attributes, event listeners (`onclick`, `onkeydown`), boolean attributes (`disabled`, `hidden`), and child flattening.
- **`Component`**: Base class providing:
  - `attach(target, props)`: Mounts to DOM node.
  - `bind()`: Lifecycle hook called upon mounting.
  - `replaceChildren(...nodes)`: Helper for updating component subtrees.

### 5.2 Network & Live Feeds (`static/net.js`)
- **`Api`**: Standard `fetch` wrapper supporting `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
  - Normalizes JSON request bodies and error payloads.
  - Automatically handles CSRF / session headers.
- **`EventFeed`**: Production-ready Server-Sent Events (`EventSource`) wrapper.
  - Automatically registers event listeners for dynamic event names (`handlers: { [name]: fn }`).
  - Implements auto-reconnect with exponential backoff on connection drops.
  - Dispatches keepalive pings without disrupting application listeners.

### 5.3 Interactive Headless Widgets (`static/widgets/`)
- **`Dialog`**: Modal dialog implemented with native HTML `<dialog>`.
  - Traps focus, handles `Escape` key dismiss, and closes on backdrop click.
- **`Field`**: Form input container binding a label, input control, and inline error/hint paragraph.
- **`TagInput`**: Text input that converts `Enter` or comma keystrokes into removable tag chips with duplicate detection and length validation.
- **`EditableTable` & `KeyValueEditor`**: In-place table row editor with edit toggle, cancel, and save actions.
- **`ConfirmDelete`**: Destructive confirmation modal enabling the confirmation button only when the user types the exact name of the resource.
- **`Toast`**: Transient feedback notification system automatically auto-dismissing after a timeout.
- **`SuggestBox`**: Autocomplete dropdown supporting keyboard navigation (Up/Down arrow keys, Enter to select, Escape to dismiss).

### 5.4 Progressive Hydration Bootloader (`static/boot.js`)
- `createBootloader(widgetMap)`: Scans the document for `[data-mount]` elements, dynamically imports the corresponding component chunk, reads `[data-props-id]` JSON payloads, and attaches the widget instance.

---

## 6. Build Toolchain & Automatic Installation

### 6.1 Building on `cxy package install`
When an application lists `mui-js` in `Cxyfile.yaml`:
```yaml
dependencies:
  - name: mui-js
    repository: https://github.com/cxy-lang/mui-js.git
    version: '*'
```
Cxy's package manager runs the package's `install:` hook:
```yaml
# mui-js/Cxyfile.yaml
install:
  - name: build-dist
    script: node tools/build.mjs --self
```
This downloads the verified `esbuild` binary to `~/.cache/mui-js/` (if not already cached), compiles the library's ES modules and functional styles into `dist/`, and makes the pre-built distribution ready immediately.

### 6.2 Configurable Bundler for Consuming Projects
Consuming projects can use `tools/build.mjs` to bundle their own application pages, CSS, and assets without installing `npm` or `webpack`.

#### Configuration Schema (`ui.config.json`):
```json
{
  "rootDir": "./ui-static",
  "outDir": "./ui-static/dist",
  "urlPrefix": "/static/dist/",
  "entry": "src/boot.js",
  "pagesDir": "src/pages",
  "css": [
    "vendor/pico.min.css",
    "theme.css"
  ],
  "standalone": [
    "theme-init.js"
  ],
  "bootBudgetGz": 12288,
  "target": "es2020"
}
```

#### Bundler Output:
- Scans `boot.js` for dynamic imports and generates code-split, content-hashed chunks (`chunk-[hash].js`).
- Minifies and content-hashes application CSS into `app-[hash].css`.
- Emits `manifest.json` mapping logical asset paths to hashed URLs with preload hints for server templates.
- Enforces strict gzip budgets (`--check` fails if `boot.js` exceeds budget).

---

## 7. Testing Architecture

Testing uses native Node.js built-ins (`node:test` and `node:assert/strict`) with zero external test runners:

```javascript
// tests/widgets.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { h, Component } from "../static/core.js";

test("h: creates element with attributes and children", () => {
    const el = h("button", { type: "button", class: "ui-btn" }, "Click Me");
    assert.equal(el.tagName, "BUTTON");
    assert.equal(el.getAttribute("type"), "button");
    assert.equal(el.textContent, "Click Me");
});
```

Tests run cleanly in CI or locally via:
```sh
cxy package run test
# Runs: node --test tests/
```

---

## 8. Migration Plan for Crunch

Once `mui-js` is implemented and verified:
1. Add `mui-js` to `crunch/Cxyfile.yaml` dependencies.
2. In `crunch/ui-static/src/lib/`:
   - Replace generic implementations (`core.js`, `widgets.js`, `net.js`, `table.js`, `suggest-box.js`) with imports from `mui-js`.
   - Keep Crunch-specific domain modules (`cron.js`, `flavour.js`, `trigger.js`, `param-types.js`) in `crunch/ui-static/`.
3. In `crunch/Cxyfile.yaml`:
   - Replace `tools/ui-build.mjs` with `node .cxy/packages/mui-js/tools/build.mjs --config ./ui.config.json --check`.
4. Run UI test suite (`cxy package run ui-test`) to guarantee 100% behavioral parity.
