// Paid, dated S&P500 aggregates. Prices remain in the existing private daily store.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {paidMcpCall} from './theme-paid-hourly-source.mjs';
import {paidDates,readPaidDaily,readPaidProjection} from './marketparquet-paid-store.mjs';
import {marketParquetSymbolVariants} from '../../lib/market-score/breadth-b1-r3-history-r4.mjs';
import {normalizePitTicker} from '../../lib/market-score/sp500-pit-universe-r1.mjs';
import {parseSectorFearGreedR3PitCsv} from '../../lib/market-score/sector-fear-greed-r3-rolling.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const need=(ok,code)=>{if(!ok)throw Object.assign(Error(code),{code});};
const wantedMember=(s,members)=>typeof s==='string'&&members.includes(s);
const date=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
export function paidBreadthSql(entries,start,end){
 need(date(start)&&date(end)&&start<=end,'BREADTH_PAID_RANGE');
 const relevant=entries.filter(e=>e.dateAdded<=end&&(!e.dateRemoved||e.dateRemoved>start));
 need(relevant.length>=490&&relevant.every(e=>/^[A-Z0-9][A-Z0-9.-]*$/.test(e.ticker)&&date(e.dateAdded)&&(!e.dateRemoved||date(e.dateRemoved))),'BREADTH_PAID_PIT');
 const values=relevant.map(e=>"('"+e.ticker+"',DATE '"+e.dateAdded+"',DATE '"+(e.dateRemoved??'9999-12-31')+"')").join(',');
 const variants=[...new Set(relevant.flatMap(e=>[...marketParquetSymbolVariants(e.ticker),...marketParquetSymbolVariants(normalizePitTicker(e.ticker))].map(v=>JSON.stringify([e.ticker,v]))))].map(v=>JSON.parse(v));
 const aliases=variants.map(([ticker,provider])=>"('"+ticker+"','"+provider+"')").join(',');
 return `WITH pit(symbol,first_date,last_date) AS (VALUES ${values}), aliases(symbol,provider_symbol) AS (VALUES ${aliases}),
 raw_source AS (SELECT CAST(date AS DATE) d,symbol provider_symbol,close,volume FROM bars WHERE symbol IN (SELECT provider_symbol FROM aliases)),
 raw AS (SELECT d,a.symbol,min(close) AS "close",min(volume) AS "volume" FROM raw_source r JOIN aliases a USING(provider_symbol) GROUP BY d,a.symbol HAVING count(*)=1),
 dates AS (SELECT d,lag(d) OVER(ORDER BY d) previous_date FROM (SELECT DISTINCT d FROM raw)),
 members AS (SELECT dates.d,count(*) member_count,count(DISTINCT pit.symbol) unique_members FROM dates JOIN pit ON dates.d>=pit.first_date AND dates.d<pit.last_date GROUP BY dates.d),
 prices AS (SELECT *,lag(d) OVER(PARTITION BY symbol ORDER BY d) pd,lag(close) OVER(PARTITION BY symbol ORDER BY d) pc FROM raw),
 eligible AS (SELECT p.*,dates.previous_date FROM prices p JOIN dates USING(d) JOIN pit ON p.symbol=pit.symbol AND p.d>=pit.first_date AND p.d<pit.last_date),
 valid AS (SELECT *,pd=previous_date AND isfinite(pc) AND pc>0 AND isfinite(close) AND close>0 valid_return FROM eligible),
 sums AS (SELECT d,previous_date,count(*) received,count(DISTINCT symbol) unique_received,
 count(*) FILTER(WHERE valid_return) return_count,
 count(*) FILTER(WHERE valid_return AND isfinite(volume) AND volume>=0) value_count,
 sum(CASE WHEN valid_return THEN CASE WHEN close>pc THEN 1.0 WHEN close=pc THEN 0.5 ELSE 0 END ELSE 0 END) advance_units,
 sum(CASE WHEN valid_return AND isfinite(volume) AND volume>=0 THEN close*volume ELSE 0 END) total_value,
 sum(CASE WHEN valid_return AND isfinite(volume) AND volume>=0 THEN close*volume*(CASE WHEN close>pc THEN 1.0 WHEN close=pc THEN 0.5 ELSE 0 END) ELSE 0 END) advance_value,
 to_json(list(struct_pack(ticker := symbol, previous_date := CAST(pd AS VARCHAR), previous_close := pc, current_close := close, current_volume := volume)) FILTER(WHERE d=DATE '${end}' AND valid_return AND isfinite(volume) AND volume>=0)) current_pairs
 FROM valid GROUP BY d,previous_date)
 SELECT CAST(sums.d AS VARCHAR) trade_date,CAST(previous_date AS VARCHAR) previous_date,member_count,unique_members,received,unique_received,return_count,value_count,advance_units,total_value,advance_value,current_pairs
 FROM sums JOIN members USING(d) WHERE previous_date IS NOT NULL ORDER BY sums.d`;
}
export function parsePaidBreadthAggregates(value){
 need(value?.truncated===false&&Array.isArray(value.columns)&&Array.isArray(value.rows),'BREADTH_PAID_QUERY_INCOMPLETE');
 const rows=value.rows.map(r=>Object.fromEntries(value.columns.map((k,i)=>[k,r[i]])));
 need(rows.length>0,'BREADTH_PAID_EMPTY');let previous='';
 for(const r of rows){if(typeof r.advance_units==='string'&&/^\d+(?:\.\d+)?$/.test(r.advance_units))r.advance_units=Number(r.advance_units);need(date(r.trade_date)&&date(r.previous_date)&&r.previous_date<r.trade_date&&r.trade_date>previous&&r.member_count===r.unique_members&&r.received===r.unique_received&&r.member_count>=490&&r.member_count<=520,'BREADTH_PAID_AGGREGATE_IDENTITY');
  for(const k of ['return_count','value_count','advance_units','total_value','advance_value'])need(Number.isFinite(r[k])&&r[k]>=0,'BREADTH_PAID_AGGREGATE_VALUE');
  need(r.value_count<=r.return_count&&r.return_count<=r.member_count&&r.advance_units<=r.return_count&&r.advance_value<=r.total_value,'BREADTH_PAID_AGGREGATE_BOUNDS');previous=r.trade_date;
 }
 return rows;
}
export async function loadPaidBreadthInputs(base,{call=paidMcpCall}={}){
 const pitFile=path.join(base,'local-sector-fear-greed-r1-pit-gics.csv'),pitBytes=fs.readFileSync(pitFile),pit=parseSectorFearGreedR3PitCsv(pitBytes.toString());
 const catalog=(await call(base,'list_datasets',{})).value,dataset=catalog.datasets?.find(d=>d.dataset==='stock_daily'),end=dataset?.coverage?.[1];
 need(catalog.plan==='full'&&catalog.mcp_included===true&&date(end),'BREADTH_PAID_ENTITLEMENT');
 const start=new Date(Date.parse(end+'T00:00:00Z')-430*86400000).toISOString().slice(0,10),pitSha256=sha(pitBytes);
 const dir=path.join(base,'marketparquet-paid','breadth-aggregates-resolved-v2',pitSha256);fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,end+'.json'),receiptFile=file+'.receipt.json';let acquired=0;
 if(!fs.existsSync(receiptFile)){
  const {value,bytes}=await call(base,'query_sql',{asset:'stock',timeframe:'daily',start_date:start,end_date:end,sql:paidBreadthSql(pit.entries,start,end),max_rows:500});
  parsePaidBreadthAggregates(value);const receipt={schema:'BREADTH_PAID_AGGREGATES_RESOLVED_V2',plan:'full',dataset:'stock_daily',start,end,pitSha256,sha256:sha(bytes),sourceStoredAt:new Date().toISOString()};
  if(fs.existsSync(file))need(sha(fs.readFileSync(file))===receipt.sha256,'BREADTH_PAID_ORPHAN_BYTES');else fs.writeFileSync(file,bytes,{flag:'wx'});
  fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});acquired=1;
 }
 const receipt=JSON.parse(fs.readFileSync(receiptFile)),bytes=fs.readFileSync(file);need(receipt.plan==='full'&&receipt.end===end&&receipt.pitSha256===pitSha256&&receipt.sha256===sha(bytes),'BREADTH_PAID_STORED_SHA');
 const rpc=JSON.parse(bytes.toString().trim().startsWith('{')?bytes:bytes.toString().split(/\r?\n/).find(s=>s.startsWith('data: ')).slice(6));
 const value=rpc.result.structuredContent??JSON.parse(rpc.result.content.find(c=>c.type==='text').text),rows=parsePaidBreadthAggregates(value),latest=rows.at(-1);
 need(latest.trade_date===end,'BREADTH_PAID_LATEST_MISSING');
 const members=pit.entries.filter(e=>e.dateAdded<=end&&(!e.dateRemoved||end<e.dateRemoved)).map(e=>e.ticker).sort();need(new Set(members).size===members.length&&members.length===latest.member_count,'BREADTH_PAID_CURRENT_PIT');
 if(typeof latest.current_pairs==='string'){const pairs=JSON.parse(latest.current_pairs).map(p=>({...p,trade_date:end,source:'MARKETPARQUET_PAID_SPLIT_ADJUSTED_DAILY'}));need(Array.isArray(pairs)&&pairs.length===latest.value_count&&pairs.every(p=>wantedMember(p.ticker,members)&&p.previous_date===latest.previous_date&&Number.isFinite(p.previous_close)&&p.previous_close>0&&Number.isFinite(p.current_close)&&p.current_close>0&&Number.isFinite(p.current_volume)&&p.current_volume>=0),'BREADTH_PAID_CURRENT_PAIRS');return {rows,members,pairs,receipt,acquired};}
 need(paidDates(base,'stock_daily').includes(end)&&paidDates(base,'stock_daily').includes(latest.previous_date),'BREADTH_PAID_CURRENT_DAILY_NOT_STORED');
 const current=readPaidProjection(base,'stock_daily',end),previous=new Map(readPaidProjection(base,'stock_daily',latest.previous_date).map(r=>[r.symbol,r]));
 const wanted=new Set(members),pairs=current.filter(r=>wanted.has(r.symbol)&&previous.has(r.symbol)).map(r=>({ticker:r.symbol,trade_date:end,previous_date:latest.previous_date,previous_close:previous.get(r.symbol).close,current_close:r.close,current_volume:r.volume,source:'MARKETPARQUET_PAID_SPLIT_ADJUSTED_DAILY'}));
 return {rows,members,pairs,receipt,acquired,currentReceipt:readPaidDaily(base,'stock_daily',end).receipt,previousReceipt:readPaidDaily(base,'stock_daily',latest.previous_date).receipt};
}
