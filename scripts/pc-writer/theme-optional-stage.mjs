// Stage an immutable, minimal PC source snapshot for the two optional ETF themes.
// Never touches existing tasks, D1, providers, price records, or the original seven themes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

const REPO = 'ansqhd5774-Choi/zgmini';
const SHA_RE = /^[a-f0-9]{40}$/;
const FILES = Object.freeze([
  'config/theme-data-registry.json',
  'scripts/pc-writer/theme-optional-cycle.cmd',
  'scripts/pc-writer/theme-optional-cycle.mjs',
  'scripts/pc-writer/theme-ai-task-mirror-r1.mjs',
  'scripts/pc-writer/theme-ai-marketparquet-readonly-r1.mjs',
  'scripts/pc-writer/theme-ai-marketparquet-provisional-r2.mjs',
  'scripts/pc-writer/theme-optional-collect.mjs',
  'scripts/pc-writer/theme-optional-audit.mjs',
  'scripts/pc-writer/theme-optional-score-r188.mjs',
  'scripts/pc-writer/theme-data-center-power-r1.cmd',
  'scripts/pc-writer/theme-data-center-power-r1.mjs',
  'scripts/pc-writer/theme-data-center-power-cycle-r2.cmd',
  'scripts/pc-writer/theme-data-center-power-cycle-r2.mjs',
  'scripts/pc-writer/theme-data-center-power-r3.cmd',
  'scripts/pc-writer/theme-data-center-power-public-r3.mjs',
  'scripts/pc-writer/theme-data-center-power-d1-r3.mjs',
  'scripts/pc-writer/theme-data-center-power-publish-r3.mjs',
  'scripts/pc-writer/theme-biotech-auth-r7.mjs',
  'scripts/pc-writer/theme-data-inventory.mjs',
  'worker/theme-ai-semiconductor-optional.mjs',
  'worker/theme-history-reference.mjs',
  'worker/theme-etf-only-public.mjs',
  'worker/theme-biotech-optional.mjs',
  'worker/theme-biotech-continuation-r2.mjs',
  'worker/theme-biotech-provisional-r1.mjs',
  'worker/theme-data-center-power-r1.mjs',
  'worker/theme-etf-rolling-public.mjs',
  'worker/public-feed-store.mjs',
  'worker/public-display-freshness.mjs',
  'lib/market-score/theme-etf-provisional.mjs',
]);
const HASH = data => createHash('sha256').update(data).digest('hex');
const need = (ok, code) => { if (!ok) throw new Error(code); };

export function filesForStage() { return [...FILES]; }
export function sourceTreeRoot(projectsRoot, sha) {
  need(SHA_RE.test(sha), 'SOURCE_SHA_INVALID');
  return path.join(projectsRoot, 'zgmini-theme-optional', 'releases', sha);
}
async function download(url, fetchImpl) {
  const response = await fetchImpl(url, {headers: {'User-Agent': 'ZGMINI-theme-optional-stage'}, signal: AbortSignal.timeout(30000)});
  need(response.ok, `DOWNLOAD_FAILED_HTTP_${response.status}`);
  const body = Buffer.from(await response.arrayBuffer());
  need(body.length > 0 && body.length < 1_000_000, 'SOURCE_FILE_SIZE_INVALID');
  return body;
}
export async function fetchSnapshot({fetchImpl = fetch, sourceSha = null} = {}) {
  let sha = sourceSha;
  if (sha === null) {
    const response = await fetchImpl(`https://api.github.com/repos/${REPO}/commits/main`, {
      headers: {'Accept': 'application/vnd.github+json', 'User-Agent': 'ZGMINI-theme-optional-stage'},
      signal: AbortSignal.timeout(30000),
    });
    need(response.ok, 'MAIN_SHA_LOOKUP_FAILED');
    sha = (await response.json()).sha;
  }
  need(SHA_RE.test(sha), 'SOURCE_SHA_INVALID');
  const assets = [];
  for (const relative of FILES) {
    const url = `https://raw.githubusercontent.com/${REPO}/${sha}/${relative}`;
    const bytes = await download(url, fetchImpl);
    // GitHub 404/HTML errors must never be installed as an executable.
    need(!bytes.toString('utf8', 0, 100).includes('<!DOCTYPE html'), 'SOURCE_NOT_CODE');
    assets.push({path: relative, sha256: HASH(bytes), bytes});
  }
  const registry = JSON.parse(assets.find(x => x.path === 'config/theme-data-registry.json').bytes.toString('utf8'));
  need(['ai-semiconductor', 'biotech'].every(id => registry.themes?.some(t => t.id === id)), 'REGISTRY_OPTIONAL_THEMES_MISSING');
  return {sha, assets};
}

function checkExisting(destination, assets) {
  const manifestFile = path.join(destination, 'source-manifest.json');
  need(fs.existsSync(manifestFile), 'EXISTING_RELEASE_WITHOUT_MANIFEST');
  const existing = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  need(existing.files?.length === assets.length, 'EXISTING_RELEASE_FILE_COUNT_MISMATCH');
  for (const item of assets) {
    const file = path.join(destination, ...item.path.split('/'));
    need(fs.existsSync(file), 'EXISTING_RELEASE_FILE_MISSING');
    need(HASH(fs.readFileSync(file)) === item.sha256, 'EXISTING_RELEASE_HASH_MISMATCH');
  }
}

export function stageSnapshot({projectsRoot, snapshot}) {
  const destination = sourceTreeRoot(projectsRoot, snapshot.sha);
  if (fs.existsSync(destination)) {
    checkExisting(destination, snapshot.assets);
    return {destination, mode: 'ALREADY_STAGED_VERIFIED'};
  }
  const parent = path.dirname(destination);
  fs.mkdirSync(parent, {recursive: true});
  // No existing file or source tree is overwritten. A failed stage remains
  // non-executable under a distinctive .incomplete name for investigation.
  const staging = path.join(parent, `.incomplete-${snapshot.sha}-${process.pid}`);
  need(!fs.existsSync(staging), 'STAGING_PATH_ALREADY_EXISTS');
  fs.mkdirSync(staging);
  for (const asset of snapshot.assets) {
    const file = path.join(staging, ...asset.path.split('/'));
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, asset.bytes, {flag: 'wx'});
    need(HASH(fs.readFileSync(file)) === asset.sha256, 'STAGED_SOURCE_HASH_MISMATCH');
  }
  const manifest = {
    version: 1, sourceRepository: REPO, sourceSha: snapshot.sha,
    stagedAt: new Date().toISOString(),
    files: snapshot.assets.map(({path: relative, sha256}) => ({path: relative, sha256})),
  };
  fs.writeFileSync(path.join(staging, 'source-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, {flag: 'wx'});
  fs.renameSync(staging, destination);
  return {destination, mode: 'STAGED_NEW_RELEASE'};
}

function taskState(task) {
  if (process.platform !== 'win32') return 'PC_ONLY';
  const result = spawnSync('schtasks.exe', ['/Query', '/TN', task], {encoding: 'utf8', windowsHide: true});
  return result.status === 0 ? 'REGISTERED' : 'NOT_REGISTERED';
}
async function inspectRaw(dataRoot, id, sourceDir) {
  const f = path.join(dataRoot, 'themes', id, 'raw-manifest.json');
  if (!fs.existsSync(f)) return 'MANIFEST_MISSING';
  try {
    const inventory = await import(pathToFileURL(path.join(sourceDir, 'scripts', 'pc-writer', 'theme-data-inventory.mjs')).href);
    return inventory.inspectManifest(dataRoot, `themes/${id}/raw-manifest.json`, id).status;
  } catch (error) {
    return `MANIFEST_INSPECTION_FAILED_${String(error?.message ?? 'UNKNOWN').replace(/[^A-Za-z0-9_]/g, '_').slice(0, 48)}`;
  }
}
export async function stageOnPc({projectsRoot = 'E:\\ZGmini\\projects', dataRoot = 'E:\\ZGmini\\data',
  nodeExecutable = 'E:\\ZGmini\\runtime\\node.exe', fetchImpl = fetch, sourceSha = null} = {}) {
  need(fs.existsSync(projectsRoot), 'APPROVED_PROJECT_ROOT_MISSING');
  need(fs.existsSync(dataRoot), 'APPROVED_DATA_ROOT_MISSING');
  need(fs.existsSync(nodeExecutable), 'APPROVED_NODE_MISSING');
  const snapshot = await fetchSnapshot({fetchImpl, sourceSha});
  const stage = stageSnapshot({projectsRoot, snapshot});
  const output = {
    report: 'ZGMINI_THEME_OPTIONAL_PC_STAGE_R1', sourceSha: snapshot.sha,
    sourcePath: stage.destination, stageResult: stage.mode,
    originalSevenTask: taskState('ZGMINI-PC-GetMarketHistory-ETF'),
    aiTask: taskState('ZGMINI-PC-Theme-AI-Semiconductor'),
    biotechTask: taskState('ZGMINI-PC-Theme-Biotech'),
    aiRawManifest: await inspectRaw(dataRoot, 'ai-semiconductor', stage.destination),
    biotechRawManifest: await inspectRaw(dataRoot, 'biotech', stage.destination),
    taskWrites: 0, d1Writes: 0, providerCalls: 0,
    nextStep: 'PC_READONLY_GATES_THEN_EXPLICIT_SCHEDULER_INSTALL',
  };
  return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.platform !== 'win32') {
    console.log('RESULT=BLOCKED; REASON=WINDOWS_PC_REQUIRED');
    process.exitCode = 2;
  } else {
    try {
      const args=process.argv.slice(2);
      need(args.length<=1 && (args.length===0 || /^--source-sha=[a-f0-9]{40}$/.test(args[0])),'SOURCE_SHA_ARGUMENT_INVALID');
      const result = await stageOnPc({sourceSha:args.length?args[0].slice('--source-sha='.length):null});
      for (const [key, value] of Object.entries(result)) console.log(`${key}=${value}`);
      console.log('RESULT=STAGED_ONLY_NO_SCHEDULE_NO_D1_WRITE');
    } catch (error) {
      console.error(`RESULT=BLOCKED; REASON=${String(error?.message ?? 'UNKNOWN').replace(/[^A-Za-z0-9_]/g, '_')}`);
      process.exitCode = 1;
    }
  }
}
