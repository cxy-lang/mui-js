// mui-js/tools/build.mjs
//
// Standalone, zero-npm asset bundler for mui-js and Cxy web applications.
// Uses an esbuild binary pinned in esbuild.lock.json and cached outside the repo.
//
//   node tools/build.mjs --self              # build mui-js itself into dist/
//   node tools/build.mjs --config ./ui.json  # build a project using its config
//   node tools/build.mjs --check             # fail if entry chunk is over budget

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    rmSync,
    writeFileSync,
    chmodSync,
    copyFileSync,
    statSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(TOOLS_DIR, "..");
const LOCK = path.join(TOOLS_DIR, "esbuild.lock.json");

function parseArgs() {
    const raw = process.argv.slice(2);
    const flags = new Map();
    for (let i = 0; i < raw.length; i++) {
        const arg = raw[i];
        if (arg.startsWith("--")) {
            const eq = arg.indexOf("=");
            if (eq !== -1) {
                flags.set(arg.slice(2, eq), arg.slice(eq + 1));
            } else if (i + 1 < raw.length && !raw[i + 1].startsWith("--")) {
                flags.set(arg.slice(2), raw[++i]);
            } else {
                flags.set(arg.slice(2), true);
            }
        }
    }
    return flags;
}

function platformKey() {
    const os = { darwin: "darwin", linux: "linux" }[process.platform];
    const cpu = { arm64: "arm64", x64: "x64" }[process.arch];
    if (!os || !cpu) throw new Error(`unsupported platform ${process.platform}-${process.arch}`);
    return `${os}-${cpu}`;
}

export async function ensureEsbuild() {
    if (process.env.ESBUILD_BIN) return process.env.ESBUILD_BIN;
    const lock = JSON.parse(readFileSync(LOCK, "utf8"));
    const key = platformKey();
    const entry = lock.platforms[key];
    if (!entry) throw new Error(`no esbuild ${lock.version} entry for ${key} in ${LOCK}`);

    const cache = path.join(
        process.env.XDG_CACHE_HOME || path.join(homedir(), ".cache"),
        "mui-js",
        `esbuild-${lock.version}-${key}`
    );
    const bin = path.join(cache, "package", "bin", "esbuild");
    if (existsSync(bin)) return bin;

    console.error(`fetching esbuild ${lock.version} (${key})`);
    const res = await fetch(entry.url);
    if (!res.ok) throw new Error(`download failed: HTTP ${res.status} ${entry.url}`);
    const tgz = Buffer.from(await res.arrayBuffer());
    const got = "sha512-" + createHash("sha512").update(tgz).digest("base64");
    if (got !== entry.integrity) {
        throw new Error(`esbuild integrity mismatch\n  expected ${entry.integrity}\n  got      ${got}`);
    }

    mkdirSync(cache, { recursive: true });
    const file = path.join(cache, "esbuild.tgz");
    writeFileSync(file, tgz);
    execFileSync("tar", ["-xzf", file, "-C", cache]);
    chmodSync(bin, 0o755);
    return bin;
}

function hashed(file) {
    return createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 8);
}

// Builds mui-js's own modular client distribution into mui-js/dist
async function buildSelf(bin) {
    const dist = process.env.BUILD_DIR
        ? path.join(process.env.BUILD_DIR, "dist")
        : path.join(PKG_ROOT, ".cxy", "build", "dist");
    rmSync(dist, { recursive: true, force: true });
    mkdirSync(dist, { recursive: true });

    console.error(`building mui-js modular distribution into ${path.relative(PKG_ROOT, dist)}/...`);

    const staticDir = path.join(PKG_ROOT, "static");
    const widgetsDir = path.join(staticDir, "widgets");

    const entryPoints = [
        path.join(staticDir, "core.js"),
        path.join(staticDir, "net.js"),
        path.join(staticDir, "widgets.js"),
        path.join(staticDir, "boot.js"),
        path.join(staticDir, "index.js"),
    ];

    if (existsSync(widgetsDir)) {
        for (const f of readdirSync(widgetsDir)) {
            if (f.endsWith(".js")) {
                entryPoints.push(path.join(widgetsDir, f));
            }
        }
    }

    const tmp = mkdtempSync(path.join(tmpdir(), "mui-self-"));
    const metaFile = path.join(tmp, "meta.json");

    try {
        execFileSync(bin, [
            ...entryPoints,
            "--bundle",
            "--splitting",
            "--format=esm",
            "--minify",
            "--target=es2020",
            `--outbase=${staticDir}`,
            `--outdir=${dist}`,
            `--entry-names=[dir]/[name]-[hash]`,
            "--chunk-names=chunk-[hash]",
            `--metafile=${metaFile}`,
            "--log-level=warning",
        ], { cwd: PKG_ROOT, encoding: "utf8" });

        const meta = JSON.parse(readFileSync(metaFile, "utf8"));
        const assets = {};

        for (const [out, info] of Object.entries(meta.outputs)) {
            if (!info.entryPoint) continue;
            const absEntry = path.resolve(PKG_ROOT, info.entryPoint);
            const relKey = path.relative(staticDir, absEntry);
            const absOut = path.resolve(PKG_ROOT, out);
            const relOut = path.relative(dist, absOut);
            assets[relKey] = "/static/.mui-dev/" + relOut;
        }

        // Minify and hash skeleton.css
        const cssPath = path.join(PKG_ROOT, "styles", "skeleton.css");
        if (existsSync(cssPath)) {
            const minCss = path.join(tmp, "skeleton.min.css");
            execFileSync(bin, [
                cssPath,
                "--minify",
                `--outfile=${minCss}`,
                "--log-level=warning",
            ], { encoding: "utf8" });

            const hash = hashed(minCss);
            const cssOut = `skeleton-${hash}.css`;
            copyFileSync(minCss, path.join(dist, cssOut));
            assets["skeleton.css"] = "/static/.mui-dev/" + cssOut;
        }

        writeFileSync(
            path.join(dist, "manifest.json"),
            JSON.stringify({ assets }, null, 2) + "\n"
        );
    } finally {
        rmSync(tmp, { recursive: true, force: true });
    }

    // Report
    function reportDir(dir, prefix = "") {
        for (const f of readdirSync(dir).sort()) {
            if (f === "manifest.json") continue;
            const fullPath = path.join(dir, f);
            const rel = prefix ? `${prefix}/${f}` : f;
            if (statSync(fullPath).isDirectory()) {
                reportDir(fullPath, rel);
            } else {
                const buf = readFileSync(fullPath);
                console.error(`  ${rel.padEnd(30)} ${String(buf.length).padStart(6)} B  ${String(gzipSync(buf).length).padStart(5)} B gz`);
            }
        }
    }
    reportDir(dist);

    console.error("✓ mui-js dist build complete.");
}

// Configurable project bundler
export async function buildProject(config = {}, flags = new Map()) {
    const bin = await ensureEsbuild();

    const rootDir = path.resolve(process.cwd(), config.rootDir || "./ui-static");
    const outDir = path.resolve(process.cwd(), config.outDir || path.join(rootDir, "dist"));
    const urlPrefix = config.urlPrefix || "/static/dist/";
    const bootBudgetGz = Number(config.bootBudgetGz || 12 * 1024);
    const entry = config.entry || "src/boot.js";

    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    const tmp = mkdtempSync(path.join(tmpdir(), "cxy-ui-"));
    const assets = {};
    const preload = {};
    let eager = [];

    // Resolve mui-js static directory for "mui/*" imports
    let muiStatic = path.join(PKG_ROOT, "static");
    if (!existsSync(muiStatic)) {
        const candidate = path.resolve(process.cwd(), ".cxy/packages/mui-js/static");
        if (existsSync(candidate)) muiStatic = candidate;
        else {
            const monoCandidate = path.resolve(process.cwd(), "../mui-js/static");
            if (existsSync(monoCandidate)) muiStatic = monoCandidate;
        }
    }

    const rawEntries = Array.isArray(config.entry) ? config.entry : [config.entry || "src/boot.js"];

    try {
        const entries = rawEntries
            .map((e) => path.join(rootDir, e))
            .filter((p) => existsSync(p));

        if (entries.length > 0) {
            const allPages = [];
            for (const ep of entries) {
                const src = readFileSync(ep, "utf8");
                const lazy = [...new Set([...src.matchAll(/import\("(?:\.\/pages\/)?([\w-]+\.js)"\)/g)].map((m) => m[1]))];
                const pages = lazy
                    .map((f) => path.join(rootDir, config.pagesDir || "src/pages", f))
                    .filter((p) => existsSync(p));
                allPages.push(...pages);
            }

            // 1. Build dynamic symbol map from mui/widgets.js
            const widgetExports = new Map();
            const barrelPath = path.join(muiStatic, "widgets.js");
            if (existsSync(barrelPath)) {
                const barrelContent = readFileSync(barrelPath, "utf8");
                for (const m of barrelContent.matchAll(/export\s*\{([^}]+)\}\s*from\s*["']\.\/widgets\/([^"']+)["']/g)) {
                    for (const item of m[1].split(",")) {
                        const sym = item.trim().split(/\s+as\s+/)[0].trim();
                        if (sym) widgetExports.set(sym, `mui/widgets/${m[2]}`);
                    }
                }
            }

            // Decomposes "import { X } from 'mui/widgets'" into direct imports to prevent chunk poisoning
            function decomposeBarrel(src, fileDir) {
                let res = src.replace(/import\s*\{([^}]+)\}\s*from\s*["']mui\/widgets(?:\.js)?["'];?/g, (match, importsStr) => {
                    const specifiers = importsStr.split(",").map((s) => s.trim()).filter(Boolean);
                    const fileToSpecifiers = new Map();
                    const unmapped = [];
                    for (const spec of specifiers) {
                        const sym = spec.split(/\s+as\s+/)[0].trim();
                        const targetFile = widgetExports.get(sym);
                        if (targetFile) {
                            if (!fileToSpecifiers.has(targetFile)) fileToSpecifiers.set(targetFile, []);
                            fileToSpecifiers.get(targetFile).push(spec);
                        } else {
                            unmapped.push(spec);
                        }
                    }
                    const lines = [];
                    for (const [targetFile, specs] of fileToSpecifiers.entries()) {
                        lines.push(`import { ${specs.join(", ")} } from "${targetFile}";`);
                    }
                    if (unmapped.length > 0) {
                        lines.push(`import { ${unmapped.join(", ")} } from "mui/widgets";`);
                    }
                    return lines.join("\n");
                });

                res = res.replace(/(from|import)\s*\(?["'](\.\.?\/[^"']+)["']\)?/g, (match, verb, rel) => {
                    const abs = path.resolve(fileDir, rel);
                    return verb === "import" ? `import("${abs}")` : `from "${abs}"`;
                });
                return res;
            }

            const tmpSrc = path.join(tmp, "src");
            mkdirSync(tmpSrc, { recursive: true });

            const decomposedEntries = [];
            for (const ep of entries) {
                const src = readFileSync(ep, "utf8");
                const relPath = path.relative(rootDir, ep);
                const outPath = path.join(tmpSrc, relPath);
                mkdirSync(path.dirname(outPath), { recursive: true });
                writeFileSync(outPath, decomposeBarrel(src, path.dirname(ep)));
                decomposedEntries.push(outPath);
            }

            const decomposedPages = [];
            for (const pp of allPages) {
                const src = readFileSync(pp, "utf8");
                const relPath = path.relative(rootDir, pp);
                const outPath = path.join(tmpSrc, relPath);
                mkdirSync(path.dirname(outPath), { recursive: true });
                writeFileSync(outPath, decomposeBarrel(src, path.dirname(pp)));
                decomposedPages.push(outPath);
            }

            const metaFile = path.join(tmp, "meta.json");
            const esbuildArgs = [
                ...decomposedEntries, ...decomposedPages,
                "--bundle", "--format=esm", "--minify",
                `--target=${config.target || "es2020"}`,
                `--outbase=${tmpSrc}`,
                `--outdir=${outDir}`,
                "--entry-names=[name]-[hash]",
                "--chunk-names=chunk-[hash]",
                `--metafile=${metaFile}`,
                "--log-level=warning",
            ];
            if (entries.length > 1 || allPages.length > 0) {
                esbuildArgs.push("--splitting");
            }
            if (existsSync(muiStatic)) {
                esbuildArgs.push(`--alias:mui=${muiStatic}`);
            }
            execFileSync(bin, esbuildArgs, { cwd: tmpSrc, encoding: "utf8" });

            const meta = JSON.parse(readFileSync(metaFile, "utf8"));
            for (const [out, info] of Object.entries(meta.outputs)) {
                if (!info.entryPoint) continue;
                const name = path.basename(info.entryPoint);
                assets[name] = urlPrefix + path.basename(out);
            }

            for (const ep of entries) {
                const base = path.basename(ep);
                const bootSrc = readFileSync(ep, "utf8");
                const bootOut = Object.entries(meta.outputs).find(([, info]) =>
                    info.entryPoint && path.basename(info.entryPoint) === base
                );
                if (bootOut && bootOut[1].imports) {
                    const imports = bootOut[1].imports
                        .filter((i) => i.kind === "import-statement")
                        .map((i) => urlPrefix + path.basename(i.path));
                    eager.push(...imports);
                }

                for (const m of bootSrc.matchAll(/^\s*"?([\w-]+)"?:\s*\(\)\s*=>\s*import\("(?:\.\/pages\/)?([\w-]+\.js)"\)/gm)) {
                    if (assets[m[2]]) preload[m[1]] = assets[m[2]];
                }
            }
            eager = [...new Set(eager)];

            if (flags.has("analyze")) {
                console.error("\n=== Chunk Composition Breakdown (--analyze) ===");
                for (const [out, info] of Object.entries(meta.outputs)) {
                    if (!info.inputs || Object.keys(info.inputs).length === 0) continue;
                    console.error(`\nAsset: ${path.basename(out)} (${info.bytes} B raw)`);
                    const sorted = Object.entries(info.inputs).sort((a, b) => b[1].bytesInOutput - a[1].bytesInOutput);
                    for (const [inp, inInfo] of sorted) {
                        const pct = ((inInfo.bytesInOutput / info.bytes) * 100).toFixed(1);
                        console.error(`  ${String(inInfo.bytesInOutput).padStart(6)} B (${pct.padStart(4)}%) : ${inp}`);
                    }
                }
            }
        }

        // CSS concatenation and minification
        if (Array.isArray(config.css) && config.css.length > 0) {
            let combined = "";
            for (const f of config.css) {
                const p = path.resolve(rootDir, f);
                if (existsSync(p)) combined += readFileSync(p, "utf8") + "\n";
            }
            if (combined.trim()) {
                const cssIn = path.join(tmp, "app.css");
                writeFileSync(cssIn, combined);
                execFileSync(bin, [cssIn, "--minify", `--outfile=${path.join(tmp, "app.min.css")}`, "--log-level=warning"]);
                const cssOut = `app-${hashed(path.join(tmp, "app.min.css"))}.css`;
                copyFileSync(path.join(tmp, "app.min.css"), path.join(outDir, cssOut));
                assets["app.css"] = urlPrefix + cssOut;
            }
        }

        // Standalone scripts
        if (Array.isArray(config.standalone)) {
            for (const s of config.standalone) {
                const sp = path.resolve(rootDir, s);
                if (existsSync(sp)) {
                    const minOut = path.join(tmp, `${path.basename(s, ".js")}.min.js`);
                    execFileSync(bin, [sp, "--minify", `--outfile=${minOut}`, "--log-level=warning"]);
                    const outName = `${path.basename(s, ".js")}-${hashed(minOut)}.js`;
                    copyFileSync(minOut, path.join(outDir, outName));
                    assets[s] = urlPrefix + outName;
                }
            }
        }

        // Include skeleton.css if not already bundled
        if (!assets["skeleton.css"]) {
            let skelPath = path.join(PKG_ROOT, "styles", "skeleton.css");
            if (!existsSync(skelPath)) {
                const candidate = path.resolve(process.cwd(), ".cxy/packages/mui-js/styles/skeleton.css");
                if (existsSync(candidate)) skelPath = candidate;
                else {
                    const monoCandidate = path.resolve(process.cwd(), "../mui-js/styles/skeleton.css");
                    if (existsSync(monoCandidate)) skelPath = monoCandidate;
                }
            }
            if (existsSync(skelPath)) {
                const minCss = path.join(tmp, "skeleton.min.css");
                execFileSync(bin, [skelPath, "--minify", `--outfile=${minCss}`, "--log-level=warning"]);
                const hash = hashed(minCss);
                const cssOut = `skeleton-${hash}.css`;
                copyFileSync(minCss, path.join(outDir, cssOut));
                assets["skeleton.css"] = urlPrefix + cssOut;
            }
        }
    } finally {
        rmSync(tmp, { recursive: true, force: true });
    }

    writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify({ assets, preload, eager }, null, 2) + "\n");

    // Report
    const rows = [];
    for (const f of readdirSync(outDir).sort()) {
        if (f === "manifest.json") continue;
        const buf = readFileSync(path.join(outDir, f));
        rows.push({ f, raw: buf.length, gz: gzipSync(buf).length });
    }
    for (const r of rows) {
        console.error(`  ${r.f.padEnd(34)} ${String(r.raw).padStart(7)} B  ${String(r.gz).padStart(6)} B gz`);
    }

    const primaryEntry = Array.isArray(config.entry) ? config.entry[0] : (config.entry || "src/boot.js");
    const bootKey = path.basename(primaryEntry);

    // Check budgets & shared chunk thresholds
    const budgets = config.budgets || {};
    const sharedChunkBudgetGz = Number(budgets.sharedChunkGz || config.sharedChunkBudgetGz || 20 * 1024);
    let budgetFailed = false;

    console.error(`built ${Object.keys(assets).length} assets into ${path.relative(process.cwd(), outDir)}/`);

    for (const r of rows) {
        if (r.f.startsWith("chunk-")) {
            console.error(`  ${r.f} (shared chunk): ${r.gz} B gz (budget ${sharedChunkBudgetGz} B)`);
            if (r.gz > sharedChunkBudgetGz) {
                console.error(`⚠️  error: shared chunk '${r.f}' exceeded gzip budget (${r.gz} B > ${sharedChunkBudgetGz} B)`);
                console.error(`   Run with --analyze to inspect contributing modules.`);
                budgetFailed = true;
            }
        }
    }

    for (const ep of rawEntries) {
        const baseKey = path.basename(ep);
        const assetUrl = assets[baseKey];
        if (assetUrl) {
            const fileName = path.basename(assetUrl);
            const r = rows.find((row) => row.f === fileName);
            if (r) {
                const limit = Number(budgets[baseKey] || (baseKey === bootKey ? bootBudgetGz : 32 * 1024));
                console.error(`  ${baseKey}: ${r.gz} B gz (budget ${limit} B)`);
                if (r.gz > limit) {
                    console.error(`⚠️  error: entry '${baseKey}' exceeded gzip budget (${r.gz} B > ${limit} B)`);
                    budgetFailed = true;
                }
            }
        }
    }

    if (budgetFailed && flags.has("check")) {
        process.exit(1);
    }
    return assets;
}

// Main execution when run from CLI
const flags = parseArgs();
const bin = await ensureEsbuild();

if (flags.has("self")) {
    await buildSelf(bin);
} else {
    let config = {};
    const cfgPath = flags.get("config") || "ui.config.json";
    if (existsSync(cfgPath)) {
        config = JSON.parse(readFileSync(cfgPath, "utf8"));
    }
    await buildProject(config, flags);
}
