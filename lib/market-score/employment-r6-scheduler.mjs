
import {
  EMPLOYMENT_R6_GROUPS,
  EMPLOYMENT_R6_RELEASE_CALENDAR_2026,
  EMPLOYMENT_R6_SCHEDULER_REVISION,
} from "./employment-r6-contract.mjs";

const ET = "America/New_York";

function asDate(value) {
  const out = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(out.getTime())) throw new TypeError("DATE_INVALID");
  return out;
}
function partsInZone(date, timeZone = ET) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(fmt.formatToParts(date).filter(x => x.type !== "literal").map(x => [x.type, x.value]));
  return {
    year: Number(p.year), month: Number(p.month), day: Number(p.day),
    hour: Number(p.hour), minute: Number(p.minute), second: Number(p.second),
  };
}
function localToUtc({ year, month, day, hour = 0, minute = 0, second = 0 }, timeZone = ET) {
  const target = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = target;
  for (let i = 0; i < 4; i++) {
    const p = partsInZone(new Date(guess), timeZone);
    const represented = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const diff = target - represented;
    guess += diff;
    if (diff === 0) break;
  }
  return new Date(guess);
}
function addLocalDays({ year, month, day }, delta) {
  const d = new Date(Date.UTC(year, month - 1, day + delta));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}
function parseDetail(row) {
  try { return JSON.parse(String(row?.detail_json ?? "{}")); } catch { return {}; }
}
function latestCompletedAt(row) {
  const t = Date.parse(String(row?.completed_at ?? ""));
  return Number.isFinite(t) ? t : null;
}
function circuitDecision(groupName, latestRun, now = new Date()) {
  if (!latestRun) return null;
  const group = EMPLOYMENT_R6_GROUPS[groupName];
  const status = String(latestRun?.status ?? "");
  if (!["FAIL", "PARTIAL"].includes(status)) return null;
  const completed = latestCompletedAt(latestRun);
  if (completed == null) return null;
  const failure = String(latestRun?.failure_code ?? "");
  const ttl = failure.includes("REQUEST_NOT_PROCESSED") || failure.includes("QUOTA")
    ? group.quotaRetryTtlMs
    : group.retryTtlMs;
  if (now.getTime() < completed + ttl) {
    return {
      status: "CIRCUIT_OPEN",
      retryAt: new Date(completed + ttl).toISOString(),
      failureCode: failure || null,
    };
  }
  return null;
}

export function latestDolClaimsReleaseAt(now = new Date()) {
  const current = asDate(now);
  const local = partsInZone(current, ET);
  for (let delta = 0; delta >= -7; delta--) {
    const ymd = addLocalDays(local, delta);
    const plain = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day));
    if (plain.getUTCDay() !== 4) continue; // Thursday in local calendar
    const release = localToUtc({ ...ymd, hour: 8, minute: 30 }, ET);
    if (current.getTime() >= release.getTime()) return release;
  }
  return null;
}

export function latestFixedReleaseAt(groupName, now = new Date()) {
  const events = EMPLOYMENT_R6_RELEASE_CALENDAR_2026[groupName] ?? [];
  const t = asDate(now).getTime();
  const eligible = events.map(x => new Date(x)).filter(d => Number.isFinite(d.getTime()) && d.getTime() <= t);
  return eligible.sort((a, b) => a - b).at(-1) ?? null;
}

export function releasePlanForGroup(groupName, {
  now = new Date(),
  latestRun = null,
} = {}) {
  const group = EMPLOYMENT_R6_GROUPS[groupName];
  if (!group) throw new Error(`GROUP_UNKNOWN:${groupName}`);
  const current = asDate(now);
  const circuit = circuitDecision(groupName, latestRun, current);
  if (circuit) return { groupName, due: false, status: circuit.status, ...circuit };

  const releaseAt = groupName === "DOL_UI_WEEKLY_CLAIMS"
    ? latestDolClaimsReleaseAt(current)
    : latestFixedReleaseAt(groupName, current);
  if (!releaseAt) return { groupName, due: false, status: "NO_RELEASE_DUE_OR_CALENDAR_EXHAUSTED" };

  const collectAt = new Date(releaseAt.getTime() + group.releaseDelayMs);
  if (current.getTime() < collectAt.getTime()) {
    return {
      groupName, due: false, status: "WAITING_FOR_COLLECTION_WINDOW",
      releaseAt: releaseAt.toISOString(), collectAt: collectAt.toISOString(),
    };
  }

  const detail = parseDetail(latestRun);
  const sameRelease = String(detail?.releaseAt ?? "") === releaseAt.toISOString();
  if (sameRelease && String(latestRun?.status ?? "") === "SUCCESS") {
    return {
      groupName, due: false, status: "RELEASE_ALREADY_STORED",
      releaseAt: releaseAt.toISOString(), collectAt: collectAt.toISOString(),
    };
  }

  return {
    groupName, due: true, status: "DUE",
    releaseAt: releaseAt.toISOString(), collectAt: collectAt.toISOString(),
  };
}

export function orderDuePlans(plans = []) {
  return [...plans].filter(x => x?.due).sort((a, b) => {
    const ta = Date.parse(a.collectAt ?? a.releaseAt ?? 0);
    const tb = Date.parse(b.collectAt ?? b.releaseAt ?? 0);
    return ta - tb || String(a.groupName).localeCompare(String(b.groupName));
  });
}

export const EMPLOYMENT_R6_SCHEDULER_CONTRACT = Object.freeze({
  revision: EMPLOYMENT_R6_SCHEDULER_REVISION,
  releaseAware: true,
  dolWeeklyRule: "THURSDAY_08:30_ET_PLUS_15M",
  blsRule: "OFFICIAL_2026_RELEASE_MANIFEST_PLUS_26H_API_LAG_BUFFER",
  calendarExhaustedFailClosed: true,
  circuitBreakerPerGroup: true,
  scoreComputed: false,
  publicOutput: false,
});
