# mui-js

Headless micro-UI framework, typed SSR router, and zero-npm asset pipeline for Cxy web applications.

- **Zero-npm**: No `package.json`, no `npm install`, and no `node_modules`. Uses pinned, integrity-checked standalone `esbuild` binaries cached outside the repository.
- **Headless & Accessible**: Structure and ARIA primitives are completely unstyled. `skeleton.css` defines only geometric layout; your application owns styling, design tokens, and themes.
- **Fine-Grained Reactivity**: Signal-based reactive state (`Signal()`) and progressive DOM hydration (`Component.mount()` / `Component.attach()`) without Virtual DOM overhead.
- **Typed SSR Routing (`Ssr[Server, Layout]`)**: Declarative page routing with compile-time checked layouts, request processing, middleware/context injection, and models.
- **Native ESM Dev & Production Bundling**: Browser import maps for instant development; hashed code-split chunks with barrel expansion and gzip budget enforcement for production.

---

## Installation

Add to your `Cxyfile.yaml`:

```yaml
dependencies:
  - name: mui-js
    repository: https://github.com/cxy-lang/mui-js.git
    version: '*'
  - name: cxyml
    repository: https://github.com/cxy-lang/cxyml.git
    version: '*'
```

When `cxy package install` runs, `mui-js` automatically compiles its distribution into `.cxy/build/dist/`.

---

## Server-Side Rendering (SSR) in Cxy

`mui-js` provides `Ssr[Endpoint, Layout]` in `mui_ssr` (exported by `@mui-js`), giving Cxy HTTP applications a type-safe routing and layout system.

### 1. Defining a Layout

A Layout is a `View` that accepts layout props and the inner page view, rendering the surrounding HTML document shell:

```cxy
import { View } from "@cxyml"
import { MuiAssets, Insert } from "@mui-js"
import plugin "cxyml" as cxyml

struct LayoutProps {
    title: String
}

pub class AppLayout: View {
    type Props = LayoutProps

    _page: View
    _title: String

    func `init`(props: LayoutProps, page: View) {
        _title = &&props.title
        _page = &&page
    }

    @override
    func render(os: &OutputStream): void {
        cxyml::render("""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <title>{{ _title }}</title>
                <!-- Injects skeleton.css and native browser Import Maps -->
                <MuiAssets />
                <link rel="stylesheet" href="/static/app.css" />
            </head>
            <body>
                <header class="navbar">
                    <a href="/">Home</a>
                    <a href="/analytics">Analytics</a>
                </header>

                <!-- Page content injected here -->
                <Insert view={{ _page }} />

                <footer>Built with Cxy and mui-js</footer>
            </body>
            </html>
        """)
    }
}
```

### 2. Defining Typed Pages with `@page`

Pages declare their URL route postfix via `@page("...")`, optional `Model`, and optional `Props`. The static `process` function handles the HTTP request:

```cxy
struct UserPageProps {
    userId: u64
    name: String
}

struct UserPageModel {
    layout: LayoutProps
    props: UserPageProps
}

@page("users")
pub class UserPage: View {
    type Model = UserPageModel
    type Props = UserPageProps

    _props: Props

    func `init`(props: Props) {
        _props = &&props
    }

    @static
    func process(req: &const Request): Model {
        // Parse params, query database, etc.
        return Model{
            layout: LayoutProps{ title: "User Profile".S },
            props: UserPageProps{ userId: 101.u64, name: "Alice".S }
        }
    }

    @override
    func render(os: &OutputStream): void {
        cxyml::render("""
            <main class="container">
                <h1>Hello, {{ _props.name }}!</h1>
                <div data-mount="user-card" data-props-id="user-props"></div>
            </main>

            <!-- Embed server state for client-side progressive hydration -->
            <JsonProps id="user-props" props={{ _props }} />
            <script type="module" src="/static/user.js"></script>
        """)
    }
}
```

### 3. Mounting Pages to the Server

Mount your pages onto your HTTP server using `Ssr`:

```cxy
import { Server, Config as HttpConfig } from "stdlib/http.cxy"
import { Ssr, serveMuiDev, loadMuiManifest } from "@mui-js"

func main(): !i32 {
    var server = Server(HttpConfig{address: Address("0.0.0.0", 8080.u16)})
    var rootDir = "ui-static".s

    // Development fallback: copies mui-js distribution into ui-static/.mui-dev
    if !loadMuiManifest(f"{rootDir}/dist/manifest.json".str()) {
        serveMuiDev(rootDir) catch discard
    }

    // Initialize typed SSR router with shared AppLayout
    var ssr = Ssr[Server, AppLayout](&server, "/")
    ssr.page[UserPage]()        // Mounts at /users

    server.start()
    return 0
}
```

---

## Client-Side Micro-UI Primitives

Consuming browser scripts import `mui` modules using standard bare specifiers mapped automatically by `<MuiAssets />`:

### 1. Fine-Grained Signals (`mui/core`)

```javascript
import { Signal, readProps } from "mui/core";

// 1. Read initial state embedded by Cxy's <JsonProps />
const props = readProps(mountEl, { count: 0 });

// 2. Wrap state in a reactive Signal
const count = Signal(props.count);

// 3. Subscribe directly to value shifts without virtual DOM diffing
count.subscribe((val) => {
    counterDisplay.textContent = String(val);
});

incrementBtn.onclick = () => count.set(count() + 1);
```

### 2. Hyperscript Builder (`mui/core`)

```javascript
import { h } from "mui/core";

const card = h("div", { class: "user-card" },
    h("h3", {}, "User Details"),
    h("button", { onclick: () => alert("Clicked!") }, "Action")
);
```

### 3. Headless Components (`mui/widgets`)

All 31 components are strictly unstyled and emit customizable DOM nodes with standard `ui-*` class hooks:

```javascript
import {
    Dialog, Field, TagInput, Toast, CopyField, Switch, SuggestBox,
    EditableTable, ProgressBar, RangeSlider, DateTimePicker, Dropdown,
    Tabs, Accordion, Tooltip, Checkbox, RadioGroup, CommandPalette,
    Drawer, FileDropzone, NumberStepper, TimeAgo, ContextMenu,
    InfiniteScroll, SplitPane, StatusIndicator, Avatar,
    Sparkline, LineChart, BarChart, DonutChart
} from "mui/widgets";

// Autocomplete search box with keyboard navigation
const suggest = new SuggestBox({
    placeholder: "Search items...",
    suggest: (query) => fetchResults(query),
    onSubmit: (selected) => console.log("Selected:", selected)
});

// Real-time canvas/SVG line chart
const chart = new LineChart({
    data: [{ x: 0, y: 10 }, { x: 1, y: 25 }, { x: 2, y: 15 }],
    stroke: "#38bdf8",
    fill: true
});
```

---

## Zero-npm Asset Bundler (`tools/build.mjs`)

`mui-js` includes an automated build pipeline that compiles multi-page client code into content-hashed, tree-shaken chunks.

### Configuration (`ui.json`)

```json
{
  "rootDir": "./ui-static",
  "outDir": "./ui-static/dist",
  "urlPrefix": "/static/dist/",
  "entries": [
    "src/app.js",
    "src/analytics.js"
  ],
  "css": [
    "theme.css"
  ],
  "budgets": {
    "sharedChunkGz": 12288
  }
}
```

### Features:
- **Barrel Import Expansion**: Automatically rewires `import { X } from "mui/widgets"` to direct module paths (`"mui/widgets/x.js"`) during bundling to prevent barrel leakage and keep shared chunks tiny (< 5 KB gzipped).
- **Multi-Page Code Splitting**: Shared dependencies across multiple entries are extracted into shared chunks without duplicating code.
- **Size Budgets & Inspection**: Enforces gzip size budgets and provides an `--analyze` flag for inspecting exact chunk composition:
  ```sh
  node ../mui-js/tools/build.mjs --config ui.json --analyze
  ```

---

## Testing

Run tests with Node's native test runner (zero dependencies):

```sh
node --test tests/*.test.mjs
```
