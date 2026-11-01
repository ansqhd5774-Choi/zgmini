/** Independent, read-only US S&P 500 daily counts from the existing PC SQLite.
 * The B1 weighted score and its history are deliberately not changed. */
import {auditDay,eligibleRows} from './breadth-r10-v9-shadow/audit.mjs';
import {latestCompletedSession} from '../../lib/market-score/breadth-b1-r3-calendar.mjs';
import {calculateMarketBreadthCounts} from '../../lib/market-breadth/compute.mjs';
import {US_BREADTH_SOURCE,US_BREADTH_CURRENT_KEY,US_BREADTH_DAILY_KEY_PREFIX,validUsBreadthRecord} from '../../lib/market-breadth/us-public-r1.mjs';

const PRICE_COLS='trade_date,ticker,previous_date,previous_close,current_close,current_volume,source,feed,provenance_json';
const TABLES=['market_score_breadth_b1_r3_universe_v1','market_score_breadth_b1_r3_current_v1','market_score_breadth_b1_r3_history_v1'];

export async function prepareUsBreadth(core,{now=new Date()}={}) {
  const expectedDate=latestCompletedSession(now);
  const tables=(await core.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).results;
  if(TABLES.some(table=>!tables.some(row=>row.name===table)))return {status:'SOURCE_TABLE_MISSING',prepared:false,expectedDate};
  const universeRow=await core.prepare('SELECT trade_date,members_json,member_count FROM market_score_breadth_b1_r3_universe_v1 WHERE trade_date=?').bind(expectedDate).first();
  if(!universeRow)return {status:'LATEST_SESSION_NOT_STORED',prepared:false,expectedDate};
  let members;
  try{members=JSON.parse(universeRow.members_json);}catch{return {status:'UNIVERSE_INVALID',prepared:false,expectedDate};}
  if(!Array.isArray(members)||members.length<490||members.length>520||new Set(members).size!==members.length)
    return {status:'UNIVERSE_INVALID',prepared:false,expectedDate};
  const priceRows=(await core.prepare(`SELECT ${PRICE_COLS} FROM market_score_breadth_b1_r3_current_v1 WHERE trade_date=?`).bind(expectedDate).all()).results;
  const historyRows=(await core.prepare(`SELECT ${PRICE_COLS} FROM market_score_breadth_b1_r3_history_v1 WHERE trade_date=?`).bind(expectedDate).all()).results;
  const universe={trade_date:universeRow.trade_date,members,member_count:universeRow.member_count};
  const audit=auditDay({date:expectedDate,universe,priceRows,historyRows});
  if(!audit.pass)return {status:'SOURCE_AUDIT_NOT_READY',prepared:false,expectedDate,eligibleCount:audit.eligible,required:audit.required};
  const valid=eligibleRows({date:expectedDate,members,priceRows,historyRows});
  if(valid.size!==audit.eligible)throw Error('US_BREADTH_AUDIT_MISMATCH');
  const rows=[...valid].map(([securityId,row])=>({securityId,change:row.close-row.previousClose}));
  const result=calculateMarketBreadthCounts({market:'usa',observationDate:expectedDate,expectedCount:members.length,rows,minimumCoverage:.98});
  if(result?.status!=='READY')return {status:'COUNT_NOT_READY',prepared:false,expectedDate};
  const body={version:1,universe:'SP500',source:US_BREADTH_SOURCE,calculatedAt:new Date(now).toISOString(),
    market:'usa',...result};
  if(!validUsBreadthRecord(body))throw Error('US_BREADTH_CONTRACT_INVALID');
  return {status:'PREPARED',prepared:true,body};
}

export async function publishUsBreadth(remote,database,prepared,{now=Date.now()}={}) {
  if(prepared?.prepared!==true)return {status:'SKIPPED_NOT_READY'};
  const body=prepared.body;
  if(!validUsBreadthRecord(body))throw Error('US_BREADTH_CONTRACT_INVALID');
  const currentKey=US_BREADTH_CURRENT_KEY;
  const dailyKey=US_BREADTH_DAILY_KEY_PREFIX+body.observationDate;
  const read=key=>remote.query(database,'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',[key]);
  const before=(await read(currentKey)).results?.[0]??null;
  let old=null;
  try{old=before?.body?JSON.parse(before.body):null;}catch{}
  if(old && validUsBreadthRecord(old) && old.observationDate>body.observationDate)return {status:'REMOTE_NEWER_OBSERVATION_PRESERVED'};
  if(before && Number(before.stored_at)>now)return {status:'REMOTE_NEWER_PUBLICATION_PRESERVED'};
  const dailyBefore=(await read(dailyKey)).results?.[0]??null;
  if(dailyBefore && Number(dailyBefore.stored_at)>now)return {status:'REMOTE_NEWER_DAILY_PRESERVED'};
  // An unchanged observation should not generate a new publication on every PC cycle.
  if(old && validUsBreadthRecord(old) && old.observationDate===body.observationDate
    && old.expectedCount===body.expectedCount && old.eligibleCount===body.eligibleCount
    && JSON.stringify(old.counts)===JSON.stringify(body.counts)
    && dailyBefore?.body===before.body)
    return {status:'ALREADY_VERIFIED',observationDate:body.observationDate};
  const encoded=JSON.stringify(body);
  const upsert='INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE market_public_snapshots_v1.stored_at=? AND market_public_snapshots_v1.body=?';
  let failed=false;
  try{await remote.request(database,[
    {sql:upsert,params:[dailyKey,encoded,now,dailyBefore?.stored_at??-1,dailyBefore?.body??'']},
    {sql:upsert,params:[currentKey,encoded,now,before?.stored_at??-1,before?.body??'']},
  ]);}catch{failed=true;}
  const [currentAfter,dailyAfter]=await Promise.all([read(currentKey),read(dailyKey)]);
  if(currentAfter.results?.[0]?.body!==encoded||dailyAfter.results?.[0]?.body!==encoded)
    throw Error(failed?'US_BREADTH_PUBLICATION_UNKNOWN':'US_BREADTH_READBACK_MISMATCH');
  return {status:'VERIFIED',observationDate:body.observationDate,eligibleCount:body.eligibleCount};
}
