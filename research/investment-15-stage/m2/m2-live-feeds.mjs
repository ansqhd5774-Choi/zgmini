// ZGMINI's own public, stored-score feeds. No direct provider access or mutation.
import https from 'node:https';
import {buildThemeResearch} from './m2-theme-research.mjs';

export const SOURCE_ORIGIN = 'https://zgmini.kr';
export const FEEDS = Object.freeze({
  market: '/api/fear-greed',
  sector: '/api/sector-fear-greed',
  theme: '/api/theme-fear-greed',
});

const SECTORS = Object.freeze([
  ['technology', '정보기술'], ['communication', '커뮤니케이션'],
  ['discretionary', '임의소비재'], ['industrials', '산업재'],
  ['financials', '금융'], ['utilities', '유틸리티'],
  ['healthcare', '헬스케어'], ['materials', '소재'], ['energy', '에너지'],
  ['staples', '필수소비재'], ['realEstate', '부동산'],
]);
const score = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const stamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const dateFromStamp = value => stamp(value) ? new Date(value).toISOString().slice(0, 10) : null;
const fail = why => { throw new Error(why); };
const ordered = points => points.every((point, i) => !i || point.date > points[i - 1].date);

/** HTTPS GET restricted to the three already published ZGMINI JSON endpoints. */
export async function downloadFeed(kind, {timeoutMs = 12000} = {}) {
  const endpoint = FEEDS[kind];
  if (!endpoint) throw new Error('UNKNOWN_FEED');
  const url = new URL(endpoint, SOURCE_ORIGIN);
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {'accept': 'application/json', 'user-agent': 'ZGMINI-Investment-M2-ReadOnly/2.0'},
      timeout: timeoutMs,
    }, response => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`HTTP_${response.statusCode}`));
        return;
      }
      const contentType = String(response.headers['content-type'] || '');
      if (!contentType.toLowerCase().includes('json')) {
        response.resume();
        reject(new Error('NON_JSON_RESPONSE'));
        return;
      }
      const chunks = [];
      let size = 0;
      response.on('data', chunk => {
        size += chunk.length;
        if (size > 2 * 1024 * 1024) {
          request.destroy(new Error('RESPONSE_TOO_LARGE'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch { reject(new Error('INVALID_JSON_RESPONSE')); }
      });
      response.on('error', reject);
    });
    request.on('timeout', () => request.destroy(new Error('NETWORK_TIMEOUT')));
    request.on('error', reject);
  });
}

export function normalizeMarket(body) {
  if (body?.status !== 'verified' || !score(body.score) || !stamp(body.observedAt)) fail('MARKET_NOT_VERIFIED');
  if (!Array.isArray(body.history) || body.history.length < 2) fail('MARKET_HISTORY_MISSING');
  const points = body.history.map(row => ({
    date: date(row?.date) ? row.date : dateFromStamp(row?.timestamp),
    score: row?.score ?? row?.value,
  }));
  if (points.some(point => !date(point.date) || !score(point.score)) || !ordered(points)) fail('MARKET_HISTORY_INVALID');
  const last = points.at(-1);
  if (last.date !== dateFromStamp(body.observedAt) || Math.abs(last.score - body.score) > .0001)
    fail('MARKET_SCORE_DATE_MISMATCH');
  return {kind:'market',status:'READY',date:last.date,phase:'VERIFIED',score:body.score,
    name:'미국 시장 · CNN',rating:String(body.rating || '평가 없음'),points,
    source:SOURCE_ORIGIN + FEEDS.market,notes:[],
    detail:`원본 공개 이력 ${points.length}개 · 종목 선택 신호가 아닌 시장 심리`,
  };
}

export function normalizeSector(body) {
  if (body?.status !== 'READY' || !date(body.observationDate)) fail('SECTOR_NOT_READY');
  if (!Array.isArray(body.history) || ![252, 253].includes(body.history.length)) fail('SECTOR_252_HISTORY_MISSING');
  const provisionalDate = body.phase === 'PROVISIONAL' ? body?.provisional?.date : null;
  if (provisionalDate !== null && (!date(provisionalDate) || body.history.length !== 253)) fail('SECTOR_PROVISIONAL_INVALID');
  if (provisionalDate === null && body.history.length !== 252) fail('SECTOR_CONFIRMED_HISTORY_INVALID');
  const dates = body.history.map(row => row?.date);
  if (dates.some(d => !date(d)) || !ordered(dates.map(d => ({date:d})))) fail('SECTOR_DATES_INVALID');
  if (dates.at(-1) !== (provisionalDate || body.observationDate)) fail('SECTOR_LATEST_DATE_MISMATCH');
  if (provisionalDate && dates.at(-2) !== body.observationDate) fail('SECTOR_BASE_DATE_MISMATCH');
  if (!Array.isArray(body.sectors) || body.sectors.length !== SECTORS.length) fail('SECTOR_COUNT_INVALID');
  const items = SECTORS.map(([id, name]) => {
    const record = body.sectors.find(row => row?.id === id);
    if (!record || !score(record.score)) fail(`SECTOR_MISSING_${id}`);
    const points = body.history.map(row => ({date:row.date,score:row[id]}));
    if (points.some(p => !score(p.score))) fail(`SECTOR_HISTORY_INVALID_${id}`);
    if (Math.abs(points.at(-1).score - record.score) > .0001) fail(`SECTOR_SCORE_MISMATCH_${id}`);
    return {id,name,score:record.score,date:dates.at(-1),confirmedDate:body.observationDate,
      phase:provisionalDate?'PROVISIONAL':'CONFIRMED',points,provisionalFrom:provisionalDate?252:253,
      notes:[],source:SOURCE_ORIGIN+FEEDS.sector};
  });
  return {kind:'sector',status:'READY',date:dates.at(-1),confirmedDate:body.observationDate,
    phase:provisionalDate?'PROVISIONAL':'CONFIRMED',items,
    source:SOURCE_ORIGIN+FEEDS.sector,notes:[],historyLength:body.history.length};
}

export function normalizeTheme(body) {
  if (body?.status !== 'READY' || !date(body.observationDate) || !Array.isArray(body.themes))
    fail('THEME_NOT_READY');
  if (!body.themes.length || body.themes.length > 30) fail('THEME_COUNT_INVALID');
  const candidatePoints = body.phase === 'PROVISIONAL' && Array.isArray(body.provisional?.points)
    ? body.provisional.points : [];
  const names = new Set();
  const items = body.themes.map((theme, index) => {
    if (typeof theme?.theme !== 'string' || !theme.theme.trim() || names.has(theme.theme))
      fail(`THEME_NAME_INVALID_${index}`);
    names.add(theme.theme);
    if (!score(theme.score) || !Array.isArray(theme.history) || theme.history.length !== 252)
      fail(`THEME_252_HISTORY_MISSING_${index}`);
    const points = theme.history.map(p => ({date:p?.date,score:p?.score}));
    if (points.some(p => !date(p.date) || !score(p.score)) || !ordered(points))
      fail(`THEME_HISTORY_INVALID_${index}`);
    if (Math.abs(points.at(-1).score - theme.score) > .0001) fail(`THEME_SCORE_MISMATCH_${index}`);
    const confirmedDate = points.at(-1).date;
    const provisionalFrom = points.length;
    for (const p of candidatePoints) {
      if (date(p?.date) && p.date > points.at(-1).date && score(p.scores?.[theme.theme]))
        points.push({date:p.date,score:p.scores[theme.theme]});
    }
    if (!ordered(points)) fail(`THEME_PROVISIONAL_INVALID_${index}`);
    return {id:`theme-${index}`,name:theme.theme,
      score:points.at(-1).score,date:points.at(-1).date,confirmedDate,
      phase:points.length > provisionalFrom?'PROVISIONAL':'CONFIRMED',points,provisionalFrom,
      notes:[],source:SOURCE_ORIGIN+FEEDS.theme};
  });
  // The API's aggregate observationDate is NOT necessarily the latest theme day.
  // On 2026-10-24 the aggregate date was 10-22, while eight individual themes
  // already had actual provisional observations dated 10-23.
  const latestDate = items.reduce((latest, item) => item.date > latest ? item.date : latest, '0000-00-00');
  const provisionalCount = items.filter(item => item.phase === 'PROVISIONAL').length;
  return {kind:'theme',status:'READY',date:latestDate,apiObservationDate:body.observationDate,
    phase:provisionalCount?'PROVISIONAL':'CONFIRMED',items,
    source:SOURCE_ORIGIN+FEEDS.theme,notes:[]};
}

/** Read-only completeness/date audit. No data is interpolated or re-scored. */
export function auditLiveModel(model) {
  const {market,sector,theme} = model.feeds;
  const checks = [];
  const add = (id,status,description) => checks.push({id,status,description});
  if (market.status === 'READY') {
    add('MARKET_SOURCE','PASS',`원본과 마지막 점수·관측일 일치 · 실제 이력 ${market.points.length}개`);
  } else add('MARKET_SOURCE','FAIL',`시장 자료 차단 · ${market.reason}`);
  if (sector.status === 'READY') {
    const valid = sector.items.length === 11 && sector.items.every(item =>
      [252,253].includes(item.points.length) && item.points.at(-1).score === item.score);
    add('SECTOR_HISTORY',valid?'PASS':'FAIL',
      `섹터 ${sector.items.length}개 · 각 ${sector.historyLength}개 실제 관측 · 최신 ${sector.date}`);
  } else add('SECTOR_HISTORY','FAIL',`섹터 자료 차단 · ${sector.reason}`);
  let themeAlignment = null;
  if (theme.status === 'READY') {
    const confirmedCount = theme.items.filter(item => item.points.length - (item.phase === 'PROVISIONAL'
      ? item.points.length-item.provisionalFrom : 0) === 252).length;
    const all = theme.items.length;
    const newestDate = market.status === 'READY' ? market.date : null;
    const sameDay = newestDate ? theme.items.filter(item => item.date === newestDate) : [];
    const unmatched = newestDate ? theme.items.filter(item => item.date !== newestDate) : [...theme.items];
    const provisional = theme.items.filter(item => item.phase === 'PROVISIONAL');
    themeAlignment = {referenceDate:newestDate,matchingCount:sameDay.length,total:all,
      provisionalCount:provisional.length,confirmed252Count:confirmedCount,
      unmatched:unmatched.map(({name,date,confirmedDate}) => ({name,date,confirmedDate}))};
    add('THEME_HISTORY',confirmedCount===all?'PASS':'FAIL',
      `테마 ${all}개 · 확정 이력 252개 검증 ${confirmedCount}/${all} · 잠정 포함 ${provisional.length}개`);
    add('THEME_DATES',!newestDate?'REVIEW':sameDay.length===all?'PASS':'REVIEW',
      newestDate ? `시장 ${newestDate} 기준 테마 최신일 일치 ${sameDay.length}/${all}`
        : '시장 관측일 부재로 테마 날짜 비교 보류');
    if (unmatched.length) add('THEME_DATE_EXCEPTIONS','REVIEW',
      unmatched.map(item => `${item.name} ${item.date} (확정 ${item.confirmedDate})`).join(' · '));
  } else add('THEME_HISTORY','FAIL',`테마 자료 차단 · ${theme.reason}`);
  if(market.status==='READY'&&sector.status==='READY'){
    add('MARKET_SECTOR_DATE',market.date===sector.date?'PASS':'REVIEW',
      `시장 ${market.date} · 섹터 ${sector.date}`);
  }
  const status=checks.some(check=>check.status==='FAIL')?'FAIL':
    checks.some(check=>check.status==='REVIEW')?'REVIEW':'PASS';
  return {status,checks,themeAlignment};
}

/** Never merge prices or create missing observations. Stages 1-3 only; no investment ranking. */
export function buildLiveModel(responses, {retrievedAt = new Date().toISOString()} = {}) {
  const adapters = {market:normalizeMarket,sector:normalizeSector,theme:normalizeTheme};
  const result = {retrievedAt,sourceOrigin:SOURCE_ORIGIN,feeds:{},status:'UNAVAILABLE'};
  for (const [kind, adapter] of Object.entries(adapters)) {
    const response = responses[kind];
    try {
      if (response?.error) throw new Error(response.error);
      result.feeds[kind] = adapter(response?.body ?? response);
    } catch (error) {
      result.feeds[kind] = {kind,status:'UNAVAILABLE',reason:String(error?.message || 'UNKNOWN_ERROR'),
        source:SOURCE_ORIGIN + FEEDS[kind]};
    }
  }
  const present = Object.values(result.feeds).filter(feed => feed.status === 'READY').length;
  result.status = present===3?'READY':present?'PARTIAL':'UNAVAILABLE';
  const marketDate = result.feeds.market.status==='READY'?result.feeds.market.date:null;
  const sectorDate = result.feeds.sector.status==='READY'?result.feeds.sector.date:null;
  const themeItems = result.feeds.theme.status==='READY'?result.feeds.theme.items:[];
  result.stages = {
    market:marketDate?'OBSERVED':'BLOCKED',
    sector:marketDate && sectorDate && marketDate===sectorDate?'SAME_DATE_REVIEW':'DATE_OR_DATA_GAP',
    theme:sectorDate && themeItems.some(item=>item.date===sectorDate)?'DATED_REVIEW':'DATE_OR_DATA_GAP',
    attractiveness:'NOT_EVALUATED',
  };
  result.audit = auditLiveModel(result);
  result.themeResearch = buildThemeResearch(result.feeds.theme,marketDate,retrievedAt);
  return result;
}
