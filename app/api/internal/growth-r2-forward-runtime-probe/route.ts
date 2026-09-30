import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline";
import { createInterface as createConsoleInterface } from "node:readline/promises";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const NODE = "C:\\Program Files\\nodejs\\node.exe";
const GIT = "C:\\Program Files\\Git\\cmd\\git.exe";
const BASH = "C:\\Program Files\\Git\\bin\\bash.exe";
const CODEX = path.join(process.env.LOCALAPPDATA || "", "Programs", "OpenAI", "Codex", "bin", "codex.exe");
const DONOR_NODE_MODULES = path.join(process.env.USERPROFILE || "", "Documents", "Codex", "2026-09-07", "new-chat-2", "work", "site", "node_modules");
const PROJECT_ID = "appgprj_6a9aab599d64819185bbc870a6e728d7";
const TASK = "ZG_GRW_G20_R6FB";
const EVIDENCE_NAME = "ZG_G20_R6FBE";
const E = path.join(ROOT, EVIDENCE_NAME);
const ZIP = path.join(ROOT, `${EVIDENCE_NAME}.zip`);
const TEMPLATE_DIR = path.join(ROOT, "CANDIDATE_TEMPLATES");
const WORKER_REL = "worker/growth-r2-forward-runtime-probe.mjs";
const ROUTE_REL = "app/api/internal/growth-r2-forward-runtime-probe/route.ts";
const TEST_REL = "tests/market-score-growth-r2-forward-runtime-probe.test.mjs";
const TARGETS = [WORKER_REL, ROUTE_REL, TEST_REL];
const CENSUS_ROUTE_REL = "app/api/internal/census-runtime-probe/route.ts";
const PROVIDER_REL = "lib/market-score/growth-r2-forward-provider-r1.mjs";
const SEED_REL = "lib/market-score/growth-r2-seed-r1.mjs";
const CONTRACT_REL = "lib/market-score/growth-r2-contract.mjs";
const WORKER_DOMAIN_REL = "lib/market-score/growth-r2-worker-domain-r1.mjs";
const EXPECTED_PROVIDER_HASH = "d99d66e1b15746d582aedea262272d0fbde424e1d145a088cf0b4ab33067f0d9";
const EXPECTED_WORKER_DOMAIN_HASH_R6EE = "12acbd27fd72164c0a1e1005bc2d28b7358fa084352884eef7c1237392f17d61";
const GROWTH_FIX_COMMIT = "2142808ba7bf84caeac9fd2955b177245bee94e5";
const R6EE_PRODUCTION_COMMIT = "15b03df24134cf4155f4014b11a3033da0eae1c9";
const EXPECTED_CENSUS_ROUTE_HASH = "56dce87ee6cf33aa3f0d77f29b6acf43059d5037630fb713e12569a847956cc1";
const REFERENCE_R6FAE_DIR = path.join(ROOT, "REFERENCE_G20_R6FAE");
const RPC_TIMEOUT_MS = 120000;
const FETCH_TIMEOUT_MS = 180000;
const TEST_TIMEOUT_MS = 240000;
const BUILD_TIMEOUT_MS = 360000;
const CHUNK_SIZE = 35;
const log = [];
let rpc = null;
let tempRepo = null;
let nodeModulesLink = false;
let credentialIssued = false;
let networkGitRead = false;

const now = () => new Date().toISOString();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const sha = b => crypto.createHash("sha256").update(b).digest("hex");
const push = s => { const x = `[${now()}] ${s}`; log.push(x); console.log(x); };
const readText = p => { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } };
const readJson = p => { try { return JSON.parse(readText(p)); } catch { return null; } };
const writeJson = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v, null, 2) + "\n", "utf8"); };
function run(exe, args, { cwd, env, timeout = 60000, maxBuffer = 128 * 1024 * 1024 } = {}) { const r = spawnSync(exe, args, { cwd, env: env ?? process.env, encoding: "utf8", windowsHide: true, maxBuffer, timeout }); return { code: r.status ?? 999, signal: r.signal ?? null, error: r.error ? String(r.error.message || r.error) : null, stdout: r.stdout || "", stderr: r.stderr || "" }; }
function redact(text) { let s = String(text ?? ""); s = s.replace(/(Authorization\s*:\s*Bearer\s+)[^\s"']+/ig, "$1<REDACTED>"); s = s.replace(/([?&](?:key|api_key|apikey|token|access_token)=)[^&\s"']+/ig, "$1<REDACTED>"); s = s.replace(/("?(?:token|access[_-]?token|bearer[_-]?token|password|secret|api[_-]?key)"?\s*[:=]\s*["']?)[^"'\s,}]+/ig, "$1<REDACTED>"); return s; }
function canonicalText(text) { return String(text).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n"); }
function canonicalHashFile(p) { return sha(Buffer.from(canonicalText(fs.readFileSync(p, "utf8")), "utf8")); }
function fileInfo(p) { const b = fs.readFileSync(p), t = b.toString("utf8"); return { bytes: b.length, sha256: sha(b), canonicalLfSha256: canonicalHashFile(p), bom: t.charCodeAt(0) === 0xfeff, crlf: (t.match(/\r\n/g) || []).length, bareLf: (t.match(/(?<!\r)\n/g) || []).length }; }
function decodeJsonStrings(value, depth = 0) { if (depth > 8) return value; if (Array.isArray(value)) return value.map(v => decodeJsonStrings(v, depth + 1)); if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decodeJsonStrings(v, depth + 1)])); if (typeof value === "string") { const s = value.trim(); if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) { try { return decodeJsonStrings(JSON.parse(s), depth + 1); } catch {} } } return value; }
function sanitizeShape(value, depth = 0) { if (depth > 7) return "<DEPTH_LIMIT>"; if (value == null || typeof value === "number" || typeof value === "boolean") return value; if (typeof value === "string") return `<string:${value.length}>`; if (Array.isArray(value)) return value.slice(0, 50).map(v => sanitizeShape(v, depth + 1)); if (typeof value === "object") { const out = {}; for (const [k, v] of Object.entries(value)) { if (/token|secret|password|credential|authorization|api[_-]?key/i.test(k)) { out[k] = typeof v === "string" ? `<secret-string:${v.length}>` : "<secret-value>"; continue; } out[k] = sanitizeShape(v, depth + 1); } return out; } return `<${typeof value}>`; }
function toolEntries(tools) { if (tools instanceof Map) return [...tools.entries()].map(([key, value]) => ({ key: String(key), value })); if (Array.isArray(tools)) return tools.map((value, index) => ({ key: typeof value?.name === "string" ? value.name : String(index), value })); if (tools && typeof tools === "object") return Object.entries(tools).map(([key, value]) => ({ key, value })); return []; }
function matchesTool(name, wanted) { if (typeof name !== "string") return false; const n = name.trim().toLowerCase(), w = wanted.toLowerCase(); return n === w || n.endsWith(`.${w}`) || n.endsWith(`/${w}`) || n.endsWith(`__${w}`); }
function findTool(servers, preferredNames) { for (const wanted of preferredNames) { const hits = []; for (const server of servers) { const serverName = typeof server?.name === "string" ? server.name : null; if (!serverName) continue; for (const entry of toolEntries(server?.tools)) { const advertised = typeof entry.value?.name === "string" ? entry.value.name : null; if ([entry.key, advertised].filter(Boolean).some(x => matchesTool(x, wanted))) hits.push({ server: serverName, tool: entry.key, advertisedName: advertised, definition: entry.value }); } } const dedup = [...new Map(hits.map(x => [`${x.server}\0${x.tool}`, x])).values()]; if (dedup.length === 1) return dedup[0]; if (dedup.length > 1) throw new Error(`MCP_TOOL_AMBIGUOUS:${wanted}`); } return null; }
async function listInventory(rpc, threadId) { let cursor = null; const servers = [], pages = []; for (let i = 0; i < 10; i++) { const params = { threadId, limit: 100, detail: "toolsAndAuthOnly" }; if (cursor) params.cursor = cursor; const r = await rpc.request("mcpServerStatus/list", params, RPC_TIMEOUT_MS); const data = Array.isArray(r?.data) ? r.data : []; servers.push(...data); pages.push({ page: i, serverCount: data.length, nextCursor: r?.nextCursor ?? r?.next_cursor ?? null }); const next = r?.nextCursor ?? r?.next_cursor ?? null; if (typeof next !== "string" || !next) break; cursor = next; } return { servers, pages }; }
function structured(x) { const r = decodeJsonStrings(x); return r?.structuredContent ?? r?.structured_content ?? r; }
function recursiveArrays(value, out = []) { if (Array.isArray(value)) { out.push(value); for (const v of value) recursiveArrays(v, out); } else if (value && typeof value === "object") for (const v of Object.values(value)) recursiveArrays(v, out); return out; }
function versionItems(result) { const root = structured(result), arrays = recursiveArrays(root), candidates = arrays.filter(a => a.some(x => x && typeof x === "object" && (x.version_number != null || x.versionNumber != null) && x.id)); return candidates.sort((a, b) => b.length - a.length)[0] ?? []; }
function findStatus(result) { const root = structured(result); let found = null; function walk(v) { if (found) return; if (Array.isArray(v)) { for (const x of v) walk(x); return; } if (v && typeof v === "object") { for (const [k, x] of Object.entries(v)) { if ((k === "status" || k === "deployment_status") && typeof x === "string" && /^(succeeded|failed|building|pending|queued|success|error)$/i.test(x)) { found = x; return; } walk(x); } } } walk(root); return found; }
function hostOfRemote(remote) { try { return new URL(remote).hostname.toLowerCase(); } catch { return null; } }
function findCredential(value) { const root = decodeJsonStrings(value), sc = root?.structuredContent ?? root?.structured_content ?? null; if (sc && typeof sc === "object" && !Array.isArray(sc)) { const remote = sc.remote_url ?? sc.remoteUrl ?? null, mode = sc.auth_mode ?? sc.authMode ?? null, raw = sc.token; if (typeof remote === "string" && hostOfRemote(remote) === "git.chatgpt-team.site" && typeof raw === "string" && (mode === "http_extra_header" || mode === "http_bearer_token")) { const cleaned = raw.trim(); if (cleaned.length >= 16 && !/[\r\n]/.test(cleaned)) { const token = /^Bearer\s+/i.test(cleaned) ? cleaned.replace(/^Bearer\s+/i, "").trim() : cleaned; if (token.length >= 16) return { remoteUrl: remote.trim(), mode, header: `Authorization: Bearer ${token}`, secretLength: token.length }; } } } return null; }
function gitAuthEnv(header) { return { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "Never", GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "http.extraHeader", GIT_CONFIG_VALUE_0: header }; }
function allFiles(dir, out = []) { if (!fs.existsSync(dir)) return out; for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) allFiles(p, out); else if (e.isFile()) out.push(p); } return out.sort(); }
function crc32(buf) { let c = 0xffffffff; for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0); } return (c ^ 0xffffffff) >>> 0; }
const u16 = n => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; }; const u32 = n => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; };
function zipStore(dir, zipPath, rootName) { const files = allFiles(dir), local = [], central = []; let offset = 0; for (const f of files) { const rel = path.relative(dir, f).split(path.sep).join("/"), name = Buffer.from(`${rootName}/${rel}`), data = fs.readFileSync(f), crc = crc32(data); const lh = Buffer.concat([u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name]); local.push(lh, data); const ch = Buffer.concat([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]); central.push(ch); offset += lh.length + data.length; } const cd = Buffer.concat(central), lh = Buffer.concat(local), end = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cd.length), u32(lh.length), u16(0)]); fs.writeFileSync(zipPath, Buffer.concat([lh, cd, end])); }
function stripAnsi(s) { return String(s || "").replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, ""); }
function parseFailures(stdout, stderr) { const text = stripAnsi(`${stdout || ""}\n${stderr || ""}`), out = []; for (const line of text.split(/\r?\n/)) { let m = line.match(/^\s*[✖×]\s+(.+?)\s+\([\d.]+m?s\)\s*$/u); if (m) { out.push(m[1].trim()); continue; } m = line.match(/^\s*not ok\s+\d+\s+-\s+(.+?)\s*$/i); if (m) out.push(m[1].trim()); } return [...new Set(out)]; }
function allTestFiles(repo) { const root = path.join(repo, "tests"), out = []; function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.isFile() && e.name.endsWith(".test.mjs")) out.push(path.relative(repo, p).split(path.sep).join("/")); } } walk(root); return out.sort(); }
function runFullSuite(repo, label) { const files = allTestFiles(repo), chunks = []; let unparsedFailure = false; const failures = []; for (let i = 0; i < files.length; i += CHUNK_SIZE) { const group = files.slice(i, i + CHUNK_SIZE); push(`${label} full-test chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(files.length / CHUNK_SIZE)} (${group.length} files)`); const r = run(NODE, ["--test", ...group], { cwd: repo, timeout: TEST_TIMEOUT_MS }); const f = parseFailures(r.stdout, r.stderr); if (r.code !== 0 && f.length === 0) unparsedFailure = true; failures.push(...f); chunks.push({ files: group, status: r.code, signal: r.signal, error: r.error, failures: f, stdout: r.stdout.slice(-120000), stderr: r.stderr.slice(-120000) }); } const infrastructureError = chunks.some(c => ![0, 1].includes(c.status) || c.signal != null || c.error != null); return { label, fileCount: files.length, status: chunks.every(c => c.status === 0) ? 0 : 1, failures: [...new Set(failures)], unparsedFailure, infrastructureError, chunks }; }
function removeNodeModulesLink(repo) { const p = path.join(repo, "node_modules"); try { if (fs.existsSync(p) || fs.lstatSync(p).isSymbolicLink()) fs.unlinkSync(p); } catch {} }
function safeRemoveRepo(repo) { if (!repo) return; removeNodeModulesLink(repo); try { fs.rmSync(repo, { recursive: true, force: true }); } catch {} }
function readPackageVersion(pkgPath) { try { return JSON.parse(fs.readFileSync(pkgPath, "utf8"))?.version ?? null; } catch { return null; } }
function exactDeclaredVersion(spec) { return typeof spec === "string" && /^\d+\.\d+\.\d+(?:[-+].*)?$/.test(spec) ? spec : null; }
function validateDonorForRepo(repo) { const donor = DONOR_NODE_MODULES; if (!fs.existsSync(donor) || !fs.statSync(donor).isDirectory()) throw new Error(`VERIFIED_DONOR_NODE_MODULES_MISSING:${donor}`); for (const p of [path.join(donor, ".bin", "vinext"), path.join(donor, ".bin", "vinext.cmd"), path.join(donor, "vinext", "package.json"), path.join(donor, "vite", "package.json")]) if (!fs.existsSync(p)) throw new Error(`VERIFIED_DONOR_COMPONENT_MISSING:${p}`); const sourcePkg = readJson(path.join(repo, "package.json")); if (!sourcePkg) throw new Error("CURRENT_PRODUCTION_PACKAGE_JSON_MISSING"); const checks = {}; for (const [name, section] of [["vinext", "devDependencies"], ["vite", "devDependencies"], ["next", "dependencies"], ["react", "dependencies"], ["react-dom", "dependencies"]]) { const declared = sourcePkg?.[section]?.[name] ?? null, installed = readPackageVersion(path.join(donor, ...name.split("/"), "package.json")); const exact = exactDeclaredVersion(declared), pass = Boolean(installed) && (!exact || installed === exact); checks[name] = { declared, installed, exactRequired: exact, pass }; if (!pass) throw new Error(`VERIFIED_DONOR_PACKAGE_MISMATCH:${name}:${declared}:${installed}`); } return { path: donor, realPath: fs.realpathSync(donor), provenance: "VERIFIED_EXISTING_ZGMINI_BUILD_DONOR", checks }; }
function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function findSingleCall(text, symbol) {
  const re = new RegExp(`\\b${escapeRegExp(symbol)}\\s*\\(`, "g");
  const hits = [];
  let m;
  while ((m = re.exec(text))) hits.push(m.index);
  if (hits.length !== 1) throw new Error(`CENSUS_ROUTE_WORKER_CALL_COUNT_UNEXPECTED:${hits.length}`);
  const start = hits[0];
  const open = text.indexOf("(", start + symbol.length);
  if (open < 0) throw new Error("CENSUS_ROUTE_WORKER_CALL_OPEN_MISSING");
  let depth = 0, quote = null, escape = false, lineComment = false, blockComment = false;
  for (let i = open; i < text.length; i += 1) {
    const ch = text[i], next = text[i + 1];
    if (lineComment) { if (ch === "\n") lineComment = false; continue; }
    if (blockComment) { if (ch === "*" && next === "/") { blockComment = false; i += 1; } continue; }
    if (quote) {
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "/" && next === "/") { lineComment = true; i += 1; continue; }
    if (ch === "/" && next === "*") { blockComment = true; i += 1; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "(") depth += 1;
    else if (ch === ")") { depth -= 1; if (depth === 0) return { start, open, close: i, args: text.slice(open + 1, i) }; }
  }
  throw new Error("CENSUS_ROUTE_WORKER_CALL_CLOSE_MISSING");
}
function generateRouteCore(source) {
  const text = canonicalText(source);
  const importRe = /^\s*import\s*\{([^}]*)\}\s*from\s*(["'])([^"']*worker\/census-runtime-probe\.mjs)\2\s*;?\s*$/m;
  const m = text.match(importRe);
  if (!m) throw new Error("CENSUS_ROUTE_WORKER_IMPORT_NOT_FOUND");
  const names = m[1].split(",").map(x => x.trim()).filter(Boolean);
  if (names.length !== 1) throw new Error(`CENSUS_ROUTE_WORKER_IMPORT_UNEXPECTED:${names.join(",")}`);
  const local = names[0].split(/\s+as\s+/i).at(-1)?.trim();
  if (local !== "createCensusRuntimeProbeHandler") throw new Error(`CENSUS_ROUTE_WORKER_SYMBOL_UNEXPECTED:${local ?? "MISSING"}`);
  const newPath = m[3].replace(/census-runtime-probe\.mjs$/, "growth-r2-forward-runtime-probe.mjs");
  const newSymbol = "createGrowthR2ForwardRuntimeProbeHandler";
  let out = text.replace(m[0], `import { ${newSymbol} } from ${m[2]}${newPath}${m[2]};`);
  out = out.replace(new RegExp(`\\b${escapeRegExp(local)}\\b`, "g"), newSymbol);
  out = out.replaceAll("TEMPORARY_CENSUS_RUNTIME_PROBE_ONLY", "TEMPORARY_GROWTH_R2_FORWARD_RUNTIME_PROBE_ONLY");
  out = out.replaceAll("AUTH_AND_TRANSPORT_ONLY", "GROWTH_R2_FORWARD_DIAGNOSTIC_ONLY");
  const call = findSingleCall(out, newSymbol);
  const required = ["getChatGPTUser", "growth-r2-forward-runtime-probe.mjs", newSymbol, "cloudflare:workers"];
  const missing = required.filter(x => !out.includes(x));
  if (missing.length) throw new Error(`GENERATED_ROUTE_REQUIRED_CONTRACT_MISSING:${missing.join(",")}`);
  if (!/authenticate\s*:\s*getChatGPTUser/.test(call.args)) throw new Error("GENERATED_ROUTE_AUTHENTICATE_BINDING_MISSING");
  if (!/(?:^|[,\s{])env(?:\s*[,}])/.test(call.args)) throw new Error("GENERATED_ROUTE_ENV_BINDING_MISSING");
  if (!/const\s+handler\s*=\s*createGrowthR2ForwardRuntimeProbeHandler\s*\(/s.test(out)) throw new Error("GENERATED_ROUTE_HANDLER_FACTORY_BINDING_MISSING");
  if (!/return\s+handler\s*\(\s*\)/s.test(out)) throw new Error("GENERATED_ROUTE_GET_HANDLER_CALL_MISSING");
  if (/runGrowthR2ForwardRuntimeProbe\s*\(/.test(out)) throw new Error("GENERATED_ROUTE_DIRECT_RUNNER_CALL_PROHIBITED");
  if (out.includes("worker/census-runtime-probe.mjs")) throw new Error("GENERATED_ROUTE_OLD_WORKER_IMPORT_REMAINS");
  return {
    routeText: out.endsWith("\n") ? out : out + "\n",
    originalWorkerSymbol: local,
    originalWorkerImport: m[3],
    generatedWorkerImport: newPath,
    generatedWorkerSymbol: newSymbol,
    authContractBasis: "EXACT_VERIFIED_CENSUS_ROUTE_FACTORY_PATTERN_V10F_RUNTIME_PASS",
  };
}
function generateRouteFromCensusRoute(source, sourceHash) {
  if (sourceHash !== EXPECTED_CENSUS_ROUTE_HASH) throw new Error(`CENSUS_ROUTE_VERIFIED_HASH_DRIFT:${sourceHash}`);
  return generateRouteCore(source);
}

function trackedAndUntrackedPaths(repo) { const tracked = run(GIT, ["-C", repo, "diff", "--name-only", "HEAD"]); if (tracked.code !== 0) throw new Error("TRACKED_DIFF_READ_FAILED"); const untracked = run(GIT, ["-C", repo, "ls-files", "--others", "--exclude-standard"]); if (untracked.code !== 0) throw new Error("UNTRACKED_READ_FAILED"); return [...new Set((tracked.stdout + "\n" + untracked.stdout).split(/\r?\n/).map(x => x.trim().replaceAll("\\", "/")).filter(Boolean))].sort(); }
function copyFile(src, dst) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); }
function blobCanonicalHash(repo, ref, rel) { const r = run(GIT, ["-C", repo, "show", `${ref}:${rel}`], { timeout: 30000 }); if (r.code !== 0) return null; return sha(Buffer.from(canonicalText(r.stdout), "utf8")); }
function finalize(result) { writeJson(path.join(E, "RESULT.json"), result); fs.writeFileSync(path.join(E, "RUN_LOG.txt"), log.join("\r\n") + "\r\n", "utf8"); const hashes = []; for (const f of allFiles(E)) { const rel = path.relative(E, f).split(path.sep).join("/"); if (rel !== "SHA256.txt") hashes.push(`${sha(fs.readFileSync(f))} *${rel}`); } fs.writeFileSync(path.join(E, "SHA256.txt"), hashes.join("\r\n") + "\r\n", "ascii"); if (fs.existsSync(ZIP)) fs.rmSync(ZIP, { force: true }); zipStore(E, ZIP, EVIDENCE_NAME); console.log(`[EVIDENCE] ${ZIP}`); }

class AppServerRpc {
  constructor(exe, cwd) { this.exe = exe; this.cwd = cwd; this.child = null; this.pending = new Map(); this.nextId = 1; this.stderrBytes = 0; this.stderrSample = ""; this.notifications = []; this.consoleRl = null; this.closed = false; }
  async start() { this.child = spawn(this.exe, ["app-server"], { cwd: this.cwd, stdio: ["pipe", "pipe", "pipe"], windowsHide: true, env: { ...process.env } }); this.consoleRl = createConsoleInterface({ input: process.stdin, output: process.stdout }); this.child.stderr.on("data", c => { this.stderrBytes += c.length; if (this.stderrSample.length < 8000) this.stderrSample += redact(c.toString("utf8")).slice(0, 8000 - this.stderrSample.length); }); const rl = readline.createInterface({ input: this.child.stdout, crlfDelay: Infinity }); rl.on("line", l => this.onLine(l)); this.child.on("exit", (code, signal) => { this.closed = true; for (const [, p] of this.pending) p.reject(new Error(`APP_SERVER_EXIT:${code}:${signal ?? ""}`)); this.pending.clear(); }); this.child.on("error", e => { this.closed = true; for (const [, p] of this.pending) p.reject(e); this.pending.clear(); }); }
  send(o) { if (!this.child || this.closed) throw new Error("APP_SERVER_NOT_RUNNING"); this.child.stdin.write(JSON.stringify(o) + "\n"); }
  request(method, params, timeoutMs = RPC_TIMEOUT_MS) { const id = this.nextId++; return new Promise((resolve, reject) => { const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`RPC_TIMEOUT:${method}`)); }, timeoutMs); this.pending.set(id, { resolve: v => { clearTimeout(timer); resolve(v); }, reject: e => { clearTimeout(timer); reject(e); }, method }); this.send({ jsonrpc: "2.0", id, method, params }); }); }
  async onLine(line) { let m; try { m = JSON.parse(line); } catch { return; } if (m && m.id != null && (Object.hasOwn(m, "result") || Object.hasOwn(m, "error"))) { const p = this.pending.get(m.id); if (p) { this.pending.delete(m.id); if (m.error) p.reject(new Error(`RPC_ERROR:${p.method}:${redact(JSON.stringify(m.error)).slice(0, 2000)}`)); else p.resolve(m.result); } return; } if (m?.method === "mcpServer/elicitation/request" && m.id != null) { await this.handleElicitation(m); return; } if (m?.method) this.notifications.push({ method: m.method, paramsShape: sanitizeShape(m.params) }); }
  async handleElicitation(m) { this.notifications.push({ method: m.method, paramsShape: sanitizeShape(m.params) }); console.log("[APPROVAL] Sites requested short-lived repository credential approval."); const a = (await this.consoleRl.question("Type APPROVE to authorize current-source retrieval: ")).trim(); if (a.toUpperCase() !== "APPROVE") { this.send({ jsonrpc: "2.0", id: m.id, result: { action: "decline", content: null } }); return; } let content = null; const schema = m?.params?.requestedSchema ?? m?.params?.requested_schema ?? m?.params?.schema ?? null; if (schema && typeof schema === "object") { const req = Array.isArray(schema.required) ? schema.required : [], props = schema.properties && typeof schema.properties === "object" ? schema.properties : {}, obj = {}; for (const k of req) { const d = props[k] ?? {}; if (d.type === "boolean") obj[k] = true; else if (Array.isArray(d.enum) && d.enum.length) obj[k] = d.enum[0]; else throw new Error(`ELICITATION_REQUIRED_FIELD_UNSUPPORTED:${k}`); } content = obj; } this.send({ jsonrpc: "2.0", id: m.id, result: { action: "accept", content } }); }
  async stop() { try { if (this.consoleRl) await this.consoleRl.close(); } catch {} try { if (this.child && !this.closed) { this.child.stdin.end(); await sleep(300); if (!this.closed) this.child.kill(); } } catch {} }
}
async function toolCall(rpc, threadId, ref, args) { if (!ref) throw new Error("TOOL_REF_MISSING"); return rpc.request("mcpServer/tool/call", { threadId, server: ref.server, tool: ref.tool, arguments: args }, RPC_TIMEOUT_MS); }

function authorPreflight() {
  const worker = path.join(TEMPLATE_DIR, "worker", "growth-r2-forward-runtime-probe.mjs");
  const test = path.join(TEMPLATE_DIR, "tests", "market-score-growth-r2-forward-runtime-probe.test.mjs");
  if (!fs.existsSync(worker) || !fs.existsSync(test)) throw new Error("CANDIDATE_TEMPLATE_MISSING");
  const w = readText(worker), t = readText(test);
  for (const token of ["createGrowthR2ForwardRuntimeProbeHandler", "KFG_V2_CANARY_OPERATOR_EMAIL", "maxProviderRequests", "dbWrites: 0", "persistence: false", "collectGrowthR2ForwardRecords", "GROWTH_R2_FORWARD_DIAGNOSTIC_ONLY"]) if (!w.includes(token)) throw new Error(`WORKER_CONTRACT_TOKEN_MISSING:${token}`);
  for (const token of ["generated route preserves factory handler call contract", "handler rejects unauthenticated before provider", "handler rejects non-owner before provider", "handler calls probe exactly once for owner"]) if (!t.includes(token)) throw new Error(`TEST_CONTRACT_TOKEN_MISSING:${token}`);
  if (w.includes("console.log") || w.includes("console.error")) throw new Error("WORKER_LOGGING_PROHIBITED");
  const fixture = `import { env } from "cloudflare:workers";\nimport { getChatGPTUser } from "../../../chatgpt-auth";\nimport { createCensusRuntimeProbeHandler } from "../../../../worker/census-runtime-probe.mjs";\nconst handler = createCensusRuntimeProbeHandler({\n  authenticate: getChatGPTUser,\n  env,\n});\nexport function GET() {\n  return handler();\n}\n`;
  const generated = generateRouteCore(fixture);
  const pass = generated.routeText.includes("createGrowthR2ForwardRuntimeProbeHandler")
    && generated.routeText.includes("authenticate: getChatGPTUser")
    && /return\s+handler\s*\(\s*\)/s.test(generated.routeText)
    && !generated.routeText.includes("runGrowthR2ForwardRuntimeProbe(");
  return { pass, correctedPriorIssue: "R6FA generated a route that assigned a Promise from runGrowthR2ForwardRuntimeProbe to handler and then called handler() at runtime; targeted tests did not exercise the generated route invocation contract.", approvedFiles: TARGETS, providerRequestLimit: 8, dbReads: 0, dbWrites: 0, persistence: false, sourceMutation: false, commit: false, push: false, saveVersion: false, deploy: false };
}
if (process.argv.includes("--author-preflight")) { try { console.log(JSON.stringify(authorPreflight())); process.exit(0); } catch (e) { console.error(String(e?.stack || e)); process.exit(72); } }
if (process.argv.includes("--author-selftest")) { try { const pf = authorPreflight(); const fake = findCredential({ structuredContent: { remote_url: "https://git.chatgpt-team.site/a/b.git", token: "X".repeat(49), auth_mode: "http_extra_header" } }); console.log(JSON.stringify({ pass: pf.pass && fake?.mode === "http_extra_header", credentialMode: fake?.mode ?? null })); process.exit(pf.pass && fake ? 0 : 73); } catch (e) { console.error(String(e?.stack || e)); process.exit(73); } }

let result = null;
fs.rmSync(E, { recursive: true, force: true }); fs.mkdirSync(E, { recursive: true });
try {
  const pf = authorPreflight();
  writeJson(path.join(E, "TASK_CONTRACT.json"), { schemaVersion: 1, taskId: TASK, mode: "CANDIDATE_PREDEPLOY_VALIDATION", goal: "Expose exact Growth R2 forward-provider runtime failure with a temporary authenticated diagnostic route.", need: "R6FA candidate passed build/tests but code review found its generated route assigned a Promise to handler and then called handler(), so actual route invocation would fail before the probe.", evidence: "ZG_G20_R6FAE.zip plus current authoritative Production source.", minimum: "Reuse valid R6FAE baseline evidence when Production identity is unchanged; correct only the same three approved diagnostic files in isolated source; validate handler factory, auth gates, exact scope, differential, and build; no commit/push/save/deploy/provider runtime call.", owner: "USER_CMD", approvedFiles: TARGETS, providerRuntimeCallsThisStep: 0, dbReads: 0, dbWrites: 0, productionGets: 0, commit: false, push: false, saveVersion: false, deploy: false });
  push(`${TASK} start; correct R6FA route-invocation orchestration only. Current authoritative source read + isolated 3-file predeploy validation. No Production GET, DB read/write, provider runtime call, commit, push, save, or deploy.`);
  for (const [name, p] of [["fixedNode", NODE], ["fixedGit", GIT], ["fixedGitBash", BASH], ["fixedCodex", CODEX]]) if (!fs.existsSync(p)) throw new Error(`${name.toUpperCase()}_MISSING:${p}`);
  const login = run(CODEX, ["login", "status"], { cwd: ROOT, timeout: 30000 });
  writeJson(path.join(E, "LOCAL_PRECHECK.json"), { ...pf, fixedNode: NODE, fixedGit: GIT, fixedGitBash: BASH, fixedCodex: CODEX, codexLoginCode: login.code, verifiedDonor: DONOR_NODE_MODULES });
  if (login.code !== 0) throw new Error("CODEX_LOGIN_INACTIVE");

  rpc = new AppServerRpc(CODEX, ROOT); await rpc.start();
  await rpc.request("initialize", { clientInfo: { name: "zgmini-g20-r6fb", version: "1.0.0" }, capabilities: { experimentalApi: true } }, 60000); rpc.send({ jsonrpc: "2.0", method: "initialized" });
  const thread = await rpc.request("thread/start", { cwd: ROOT, approvalPolicy: "never", sandbox: "danger-full-access", ephemeral: true }, RPC_TIMEOUT_MS);
  const threadId = thread?.thread?.id ?? thread?.threadId ?? thread?.id; if (typeof threadId !== "string") throw new Error("THREAD_ID_MISSING");
  const inv = await listInventory(rpc, threadId);
  const tools = {
    credential: findTool(inv.servers, ["sites.create_source_repository_write_credential"]),
    versions: findTool(inv.servers, ["sites.list_site_versions"]),
    deployment: findTool(inv.servers, ["sites.get_deployment_status"]),
  };
  writeJson(path.join(E, "MCP_DISCOVERY.json"), { pages: inv.pages, selected: Object.fromEntries(Object.entries(tools).map(([k, v]) => [k, v ? { server: v.server, tool: v.tool, advertisedName: v.advertisedName ?? null } : null])) });
  for (const [k, v] of Object.entries(tools)) if (!v) throw new Error(`REQUIRED_MCP_TOOL_MISSING:${k}`);

  const versRes = await toolCall(rpc, threadId, tools.versions, { project_id: PROJECT_ID, limit: 30 });
  const items = versionItems(versRes).sort((a, b) => Number(b.version_number ?? b.versionNumber ?? 0) - Number(a.version_number ?? a.versionNumber ?? 0));
  if (!items.length) throw new Error("SITE_VERSION_LIST_EMPTY");
  let current = null; const checked = [];
  for (const item of items) { const depId = item.deployment_id ?? item.deploymentId ?? null; if (!depId) continue; let status = null; try { status = findStatus(await toolCall(rpc, threadId, tools.deployment, { project_id: PROJECT_ID, deployment_id: depId })); } catch (e) { checked.push({ versionNumber: Number(item.version_number ?? item.versionNumber ?? 0), deploymentId: depId, error: redact(String(e?.message || e)) }); continue; } const row = { versionNumber: Number(item.version_number ?? item.versionNumber ?? 0), versionId: item.id ?? null, commitSha: item?.source?.commit_sha ?? item?.source?.commitSha ?? null, deploymentId: depId, status }; checked.push(row); if (/^succeeded$/i.test(status ?? "")) { current = row; break; } }
  if (!current || !/^[0-9a-f]{40}$/i.test(current.commitSha ?? "")) throw new Error("NO_VALID_SUCCEEDED_PRODUCTION_FOUND");
  writeJson(path.join(E, "CURRENT_PRODUCTION.json"), { current, checked });

  const credRes = await toolCall(rpc, threadId, tools.credential, { project_id: PROJECT_ID });
  credentialIssued = Boolean((decodeJsonStrings(credRes)?.structuredContent ?? {}).token); const cred = findCredential(credRes);
  writeJson(path.join(E, "CREDENTIAL_RESULT.json"), { issued: credentialIssued, found: Boolean(cred), mode: cred?.mode ?? null, remoteHost: cred?.remoteUrl ? hostOfRemote(cred.remoteUrl) : null, secretPersisted: false, secretPrinted: false });
  if (!cred) throw new Error("SUPPORTED_GIT_CREDENTIAL_NOT_FOUND");
  const authEnv = gitAuthEnv(cred.header);
  const ls = run(GIT, ["ls-remote", cred.remoteUrl, "refs/heads/main"], { env: authEnv, timeout: 60000 }); networkGitRead = true;
  if (ls.code !== 0) throw new Error("REMOTE_MAIN_READ_FAILED"); const remoteMain = ls.stdout.trim().split(/\s+/)[0];
  if (remoteMain !== current.commitSha) throw new Error(`REMOTE_PRODUCTION_IDENTITY_MISMATCH:${remoteMain}:${current.commitSha}`);

  tempRepo = path.join(ROOT, ".g20_r6fb_candidate"); safeRemoveRepo(tempRepo); fs.mkdirSync(tempRepo, { recursive: true });
  let g = run(GIT, ["init", tempRepo], { timeout: 30000 }); if (g.code !== 0) throw new Error("TEMP_REPO_INIT_FAILED");
  g = run(GIT, ["-C", tempRepo, "fetch", "--no-tags", "--no-recurse-submodules", cred.remoteUrl, "refs/heads/main:refs/remotes/origin/main"], { env: authEnv, timeout: FETCH_TIMEOUT_MS }); if (g.code !== 0) throw new Error("REMOTE_MAIN_FETCH_FAILED");
  g = run(GIT, ["-C", tempRepo, "checkout", "--detach", remoteMain], { timeout: 60000 }); if (g.code !== 0) throw new Error("CURRENT_SOURCE_CHECKOUT_FAILED");
  if (run(GIT, ["-C", tempRepo, "merge-base", "--is-ancestor", GROWTH_FIX_COMMIT, remoteMain], { timeout: 30000 }).code !== 0) throw new Error("CURRENT_PRODUCTION_NOT_DESCENDANT_OF_GROWTH_FIX");

  const providerPath = path.join(tempRepo, ...PROVIDER_REL.split("/"));
  const workerDomainPath = path.join(tempRepo, ...WORKER_DOMAIN_REL.split("/"));
  const censusRoutePath = path.join(tempRepo, ...CENSUS_ROUTE_REL.split("/"));
  for (const rel of [PROVIDER_REL, SEED_REL, CONTRACT_REL, WORKER_DOMAIN_REL, CENSUS_ROUTE_REL]) if (!fs.existsSync(path.join(tempRepo, ...rel.split("/")))) throw new Error(`REQUIRED_CURRENT_SOURCE_MISSING:${rel}`);
  const providerHash = canonicalHashFile(providerPath), workerDomainHash = canonicalHashFile(workerDomainPath), censusRouteHash = canonicalHashFile(censusRoutePath);
  if (providerHash !== EXPECTED_PROVIDER_HASH) throw new Error(`GROWTH_FORWARD_PROVIDER_SOURCE_DRIFT:${providerHash}`);
  if (censusRouteHash !== EXPECTED_CENSUS_ROUTE_HASH) throw new Error(`CENSUS_ROUTE_VERIFIED_HASH_DRIFT:${censusRouteHash}`);
  const sourceGate = { currentProduction: current, remoteMain, growthFixAncestor: true, provider: { rel: PROVIDER_REL, canonicalLfSha256: providerHash, expected: EXPECTED_PROVIDER_HASH, pass: true }, workerDomain: { rel: WORKER_DOMAIN_REL, canonicalLfSha256: workerDomainHash, r6eeHash: EXPECTED_WORKER_DOMAIN_HASH_R6EE, unchangedSinceR6EE: workerDomainHash === EXPECTED_WORKER_DOMAIN_HASH_R6EE }, censusRoute: { rel: CENSUS_ROUTE_REL, canonicalLfSha256: censusRouteHash, expected: EXPECTED_CENSUS_ROUTE_HASH, exactVerifiedContractReuse: true }, newTargetsBefore: Object.fromEntries(TARGETS.map(rel => [rel, fs.existsSync(path.join(tempRepo, ...rel.split("/"))) ? "EXISTS" : "ABSENT"])) };
  if (Object.values(sourceGate.newTargetsBefore).some(x => x !== "ABSENT")) throw new Error(`NEW_DIAGNOSTIC_TARGET_ALREADY_EXISTS:${JSON.stringify(sourceGate.newTargetsBefore)}`);
  writeJson(path.join(E, "SOURCE_GATE.json"), sourceGate);

  let baseline;
  const r6faBaseline = readJson(path.join(REFERENCE_R6FAE_DIR, "BASELINE_FULL_TEST.json"));
  const r6faCurrent = readJson(path.join(REFERENCE_R6FAE_DIR, "CURRENT_PRODUCTION.json"));
  const r6faCommit = r6faCurrent?.current?.commitSha ?? null;
  const canReuseR6faBaseline = current.commitSha === r6faCommit && remoteMain === r6faCommit && r6faBaseline && r6faBaseline.infrastructureError === false && r6faBaseline.unparsedFailure === false && Array.isArray(r6faBaseline.failures);
  if (canReuseR6faBaseline) {
    push("Reuse R6FAE current-Production baseline full-suite: identical Production commit and validation purpose.");
    baseline = { ...r6faBaseline, label: "BASELINE_REUSED_R6FAE", reusedFrom: "ZG_G20_R6FAE/BASELINE_FULL_TEST.json", currentProductionCommit: current.commitSha };
  } else {
    push("Current Production identity differs from R6FAE; run baseline full-suite once before adding diagnostic files.");
    baseline = runFullSuite(tempRepo, "BASELINE_CURRENT_PRODUCTION");
  }
  writeJson(path.join(E, "BASELINE_FULL_TEST.json"), baseline);
  if (baseline.infrastructureError || baseline.unparsedFailure) throw new Error("BASELINE_FULL_TEST_NOT_DIFFERENTIABLE");

  const generated = generateRouteFromCensusRoute(readText(censusRoutePath), censusRouteHash);
  const workerSrc = path.join(TEMPLATE_DIR, "worker", "growth-r2-forward-runtime-probe.mjs");
  const testSrc = path.join(TEMPLATE_DIR, "tests", "market-score-growth-r2-forward-runtime-probe.test.mjs");
  copyFile(workerSrc, path.join(tempRepo, ...WORKER_REL.split("/")));
  fs.mkdirSync(path.dirname(path.join(tempRepo, ...ROUTE_REL.split("/"))), { recursive: true }); fs.writeFileSync(path.join(tempRepo, ...ROUTE_REL.split("/")), generated.routeText, "utf8");
  copyFile(testSrc, path.join(tempRepo, ...TEST_REL.split("/")));
  writeJson(path.join(E, "ROUTE_GENERATION_AUDIT.json"), { source: CENSUS_ROUTE_REL, sourceHash: canonicalHashFile(censusRoutePath), originalWorkerSymbol: generated.originalWorkerSymbol, originalWorkerImport: generated.originalWorkerImport, generatedWorkerImport: generated.generatedWorkerImport, authContractBasis: generated.authContractBasis, verifiedCensusRouteHash: EXPECTED_CENSUS_ROUTE_HASH, preservedAuthToken: "getChatGPTUser", generatedWorkerSymbol: generated.generatedWorkerSymbol, handlerFactoryContract: "FACTORY_RETURNS_CALLABLE_HANDLER", generatedRouteHash: canonicalHashFile(path.join(tempRepo, ...ROUTE_REL.split("/"))) });

  const scope = trackedAndUntrackedPaths(tempRepo); const exactScope = JSON.stringify(scope) === JSON.stringify([...TARGETS].sort());
  writeJson(path.join(E, "CHANGE_SCOPE.json"), { approvedFiles: TARGETS, actualPaths: scope, exactScope, existingFilesModified: [], allThreeAreNew: true, uiChanged: false });
  if (!exactScope) throw new Error(`CANDIDATE_SCOPE_UNEXPECTED:${JSON.stringify(scope)}`);

  const syntaxChecks = [WORKER_REL, TEST_REL].map(rel => ({ rel, ...run(NODE, ["--check", rel], { cwd: tempRepo, timeout: 30000 }) }));
  writeJson(path.join(E, "SYNTAX.json"), { pass: syntaxChecks.every(x => x.code === 0), checks: syntaxChecks.map(x => ({ ...x, stdout: x.stdout.slice(-10000), stderr: x.stderr.slice(-10000) })) });
  if (!syntaxChecks.every(x => x.code === 0)) throw new Error("CANDIDATE_JS_SYNTAX_FAIL");

  push("Run new diagnostic targeted tests plus existing Growth production provider regression.");
  const targetedFiles = [TEST_REL, "tests/market-score-growth-r2-production-r1.test.mjs"];
  const targeted = run(NODE, ["--test", ...targetedFiles], { cwd: tempRepo, timeout: TEST_TIMEOUT_MS });
  const targetedText = stripAnsi(targeted.stdout + "\n" + targeted.stderr);
  const requiredTitles = ["Growth R2 generated route preserves factory handler call contract", "Growth R2 runtime probe handler factory returns callable route handler", "Growth R2 runtime probe handler rejects unauthenticated before provider", "Growth R2 runtime probe handler rejects non-owner before provider", "Growth R2 runtime probe handler calls probe exactly once for owner", "Growth R2 runtime probe success path executes exactly eight provider requests and returns summary only", "Growth R2 runtime probe preserves failed stage and sanitized Growth error code without leaking secret URL", "Growth R2 runtime probe enforces the approved eight-request diagnostic ceiling"];
  const targetedPass = targeted.code === 0 && requiredTitles.every(x => targetedText.includes(x));
  writeJson(path.join(E, "TARGETED.json"), { pass: targetedPass, status: targeted.code, files: targetedFiles, requiredTitles, stdout: targeted.stdout.slice(-300000), stderr: targeted.stderr.slice(-100000) });
  if (!targetedPass) throw new Error("TARGETED_RUNTIME_PROBE_VALIDATION_FAIL");

  push("Run candidate full-suite and same-base differential.");
  const candidate = runFullSuite(tempRepo, "CANDIDATE_WITH_RUNTIME_PROBE"); writeJson(path.join(E, "CANDIDATE_FULL_TEST.json"), candidate);
  if (candidate.infrastructureError || candidate.unparsedFailure) throw new Error("CANDIDATE_FULL_TEST_NOT_DIFFERENTIABLE");
  const baseSet = new Set(baseline.failures), candSet = new Set(candidate.failures), newFailures = [...candSet].filter(x => !baseSet.has(x)), resolvedFailures = [...baseSet].filter(x => !candSet.has(x));
  const differential = { baselineFailures: baseline.failures, candidateFailures: candidate.failures, newFailures, resolvedFailures, pass: newFailures.length === 0 };
  writeJson(path.join(E, "FULL_DIFFERENTIAL.json"), differential); if (!differential.pass) throw new Error(`FULL_DIFFERENTIAL_NEW_FAILURE:${newFailures.join("|")}`);

  const donor = validateDonorForRepo(tempRepo); const nmDest = path.join(tempRepo, "node_modules"); fs.symlinkSync(donor.path, nmDest, "junction"); nodeModulesLink = true; const linkedReal = fs.realpathSync(nmDest); if (linkedReal.toLowerCase() !== donor.realPath.toLowerCase()) throw new Error("DONOR_JUNCTION_REALPATH_MISMATCH"); writeJson(path.join(E, "DEPENDENCY_DONOR.json"), { ...donor, linkedRealPath: linkedReal, junctionVerified: true });
  push("Run verified candidate build using the previously verified donor dependency tree.");
  const buildScript = path.join(tempRepo, "scripts", "build-verified.sh"); if (!fs.existsSync(buildScript)) throw new Error("VERIFIED_BUILD_SCRIPT_MISSING");
  const buildRaw = fs.readFileSync(buildScript), buildCanonical = Buffer.from(canonicalText(buildRaw.toString("utf8")), "utf8"), buildTemp = path.join(tempRepo, "scripts", ".g20-r6fb-build-verified-lf.sh"); fs.writeFileSync(buildTemp, buildCanonical);
  const buildEnv = { ...process.env, PATH: `${path.dirname(NODE)}${path.delimiter}${process.env.PATH || process.env.Path || ""}` };
  const nodeProbe = run(BASH, ["-lc", "command -v node; node --version"], { cwd: tempRepo, env: buildEnv, timeout: 30000 });
  const build = nodeProbe.code === 0 ? run(BASH, ["./scripts/.g20-r6fb-build-verified-lf.sh"], { cwd: tempRepo, env: buildEnv, timeout: BUILD_TIMEOUT_MS }) : { code: 999, stdout: "", stderr: "FIXED_NODE_BASH_PATH_NOT_EFFECTIVE", signal: null, error: null };
  try { fs.rmSync(buildTemp, { force: true }); } catch {}
  writeJson(path.join(E, "VERIFIED_BUILD.json"), { pass: build.code === 0, status: build.code, launcher: "GIT_BASH_CANONICAL_LF_VERIFIED_DONOR_FIXED_NODE_PATH", nodeProbe: { code: nodeProbe.code, stdout: nodeProbe.stdout.slice(-10000), stderr: nodeProbe.stderr.slice(-10000) }, buildScriptRawSha256: sha(buildRaw), buildScriptCanonicalLfSha256: sha(buildCanonical), stdout: build.stdout.slice(-500000), stderr: build.stderr.slice(-200000) });
  if (build.code !== 0) throw new Error("VERIFIED_BUILD_FAIL");

  const finalScope = trackedAndUntrackedPaths(tempRepo); if (JSON.stringify(finalScope) !== JSON.stringify([...TARGETS].sort())) throw new Error(`POST_BUILD_SCOPE_DRIFT:${JSON.stringify(finalScope)}`);
  const candidateFiles = {};
  for (const rel of TARGETS) { const p = path.join(tempRepo, ...rel.split("/")); candidateFiles[rel] = fileInfo(p); copyFile(p, path.join(E, "CANDIDATE_SOURCE", ...rel.split("/"))); }
  writeJson(path.join(E, "CANDIDATE_FILES.json"), candidateFiles);

  result = { schemaVersion: 1, taskId: TASK, stage: "G-20", process: "R6FB", taskResult: "PASS_PREDEPLOY_RUNTIME_PROBE_VERIFIED", stageComplete: false, nextStageAllowed: false, classification: "G20_FORWARD_RUNTIME_PROBE_HANDLER_CONTRACT_VERIFIED", blocker: "G20_FORWARD_COLLECTOR_RUNTIME_INCOMPLETE", currentProduction: current, change: { files: TARGETS, existingSourceModified: false, diagnosticOnly: true, reusesProductionForwardProvider: true, maxProviderRequests: 8, dbWrites: 0, persistence: false, publicMarketScoreRouteChanged: false, methodologyChanged: false, weightsChanged: false }, validation: { baselineFullDifferentiable: true, targetedPass: true, fullDifferentialPass: true, newFailures: [], verifiedBuildPass: true, exactScope: true }, sideEffects: { localProjectSourceMutation: false, isolatedWorkspaceOnly: true, remoteSourceMutation: false, commit: false, push: false, saveVersion: false, deploy: false, productionGetRequests: 0, databaseReads: 0, databaseWrites: 0, providerRuntimeRequests: 0, credentialIssued, networkGitRead }, next: { goal: "Complete Growth R2 G20 runtime/persistence validation.", need: "Deploy the verified temporary authenticated forward-runtime diagnostic route, then execute it exactly once to capture failedStage/errorCode without DB writes.", evidence: "ZG_G20_R6FBE.zip", minimum: "Explicit Production deployment approval for these exact three corrected diagnostic files; then exact-source commit/push/save/deploy and one authenticated probe call.", owner: "USER_APPROVAL_THEN_USER_CMD" } };
} catch (e) {
  result = { schemaVersion: 1, taskId: TASK, stage: "G-20", process: "R6FB", taskResult: "FAIL_CLOSED", stageComplete: false, nextStageAllowed: false, classification: "G20_R6FB_PREDEPLOY_VALIDATION_FAIL", blocker: "G20_FORWARD_COLLECTOR_RUNTIME_INCOMPLETE", error: redact(String(e?.stack || e)).slice(0, 9000), sideEffects: { localProjectSourceMutation: false, isolatedWorkspaceOnly: true, remoteSourceMutation: false, commit: false, push: false, saveVersion: false, deploy: false, productionGetRequests: 0, databaseReads: 0, databaseWrites: 0, providerRuntimeRequests: 0, credentialIssued, networkGitRead }, next: { goal: "Preserve current Production while diagnosing Growth R2 forward collector.", need: "Review this handler-contract predeploy validation failure only.", evidence: "ZG_G20_R6FBE.zip", minimum: "Do not mutate Production or repeat R6D runtime GETs.", owner: "GPT_REVIEW" } };
} finally {
  try { if (rpc) { writeJson(path.join(E, "APP_SERVER_DIAGNOSTICS.json"), { stderrBytes: rpc.stderrBytes, stderrSample: redact(rpc.stderrSample), notifications: rpc.notifications.slice(0, 100) }); await rpc.stop(); } } catch {}
  safeRemoveRepo(tempRepo); finalize(result);
}
process.exit(result?.taskResult === "PASS_PREDEPLOY_RUNTIME_PROBE_VERIFIED" ? 0 : 2);
