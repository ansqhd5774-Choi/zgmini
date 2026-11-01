/** Frozen R10 V9 source audit & factor math. Extracted from the PC-verified V9
 * read-only package; no providers, disk writes, or floating-policy changes. */
const SOURCE='MarketParquet Free Sample';
const PROVIDER='MARKETPARQUET_FREE_SAMPLE';
const FEED='stock_daily';
const REVISIONS=new Set(['ZGMINI_B1_PRICE_SOURCE_CONTRACT_R4','ZGMINI_B1_PRICE_SOURCE_CONTRACT_R5']);
const numeric=x=>x===null||x===undefined||x===''?null:Number(x);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const text=x=>String(x??'').trim();
const parse=x=>{try{return typeof x==='string'?JSON.parse(x):x}catch{return null}};
const isDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const sameNum=(a,b)=>finite(numeric(a))&&finite(numeric(b))&&Number(a)===Number(b);
export function validSource(row){
 if(text(row?.source)!==SOURCE||text(row?.feed)!==FEED)return false;
 const p=parse(row?.provenance_json);
 return !!p&&p.provider===PROVIDER&&REVISIONS.has(p.sourceContractRevision)
   &&p.splitAdjusted===true&&p.dividendAdjusted===false
   &&text(p.currentResolvedSymbol).length>0&&text(p.previousResolvedSymbol).length>0;
}
export function validPrice(row,date){
 const close=numeric(row?.current_close),prev=numeric(row?.previous_close),volume=numeric(row?.current_volume);
 return isDate(row?.trade_date)&&row.trade_date===date&&isDate(row?.previous_date)&&row.previous_date<date
  &&finite(close)&&close>0&&finite(prev)&&prev>0&&finite(volume)&&volume>=0;
}
export function priceConflict(current,history){
 for(const h of history){
  if(text(h.previous_date)!==text(current.previous_date)||!sameNum(h.previous_close,current.previous_close)
   ||!sameNum(h.current_close,current.current_close)||!sameNum(h.current_volume,current.current_volume)
   ||text(h.source)!==text(current.source)||text(h.feed)!==text(current.feed)
   ||text(h.provenance_json)!==text(current.provenance_json))return true;
 }
 return false;
}
export function auditDay({date,universe,priceRows=[],historyRows=[]}){
 if(!isDate(date))throw Error('INVALID_DATE');
 if(!universe||!isDate(universe.trade_date)||universe.trade_date>date||!Array.isArray(universe.members))
  return {date,status:'UNIVERSE_NOT_VERIFIED',pass:false,eligible:0};
 const members=universe.members,allowed=new Set(members),required=Math.ceil(members.length*.98);
 if(members.length<1||members.some(m=>typeof m!=='string'||!m.trim())||allowed.size!==members.length||Number(universe.member_count)!==members.length)
  return {date,status:'UNIVERSE_INVALID',pass:false,eligible:0};
 const map=new Map(),dups=new Set(),hist=new Map();
 for(const r of priceRows){if(r.trade_date!==date||!allowed.has(r.ticker))continue;if(map.has(r.ticker))dups.add(r.ticker);else map.set(r.ticker,r)}
 for(const h of historyRows){if(h.trade_date!==date||!allowed.has(h.ticker))continue;const a=hist.get(h.ticker)??[];a.push(h);hist.set(h.ticker,a)}
 let eligible=0;const reject={};const inc=k=>reject[k]=(reject[k]??0)+1;
 for(const ticker of members){const r=map.get(ticker);
  if(!r){inc('MISSING_PRICE');continue}if(dups.has(ticker)){inc('DUPLICATE_PRICE');continue}
  if(!validPrice(r,date)){inc('INVALID_PRICE');continue}if(!validSource(r)){inc('SOURCE_NOT_QUALIFIED');continue}
  const versions=hist.get(ticker)??[];
  if(!versions.length){inc('HISTORY_MISSING');continue}if(priceConflict(r,versions)){inc('HISTORY_CONFLICT');continue}
  eligible++;
 }
 return {date,universeRecordDate:universe.trade_date,members:members.length,required,eligible,coverage:eligible/members.length,pass:eligible>=required,
  shortage:Math.max(0,required-eligible),reject,status:eligible>=required?'DATE_SCOPED_COVERAGE_PASS':'COVERAGE_FAIL'};
}
export function eligibleRows({date,members,priceRows,historyRows}){
 const allowed=new Set(members),seen=new Set(),dup=new Set(),rowsByTicker=new Map(),hist=new Map();
 for(const r of priceRows){if(!allowed.has(r.ticker)||r.trade_date!==date)continue;
  if(seen.has(r.ticker))dup.add(r.ticker);else{seen.add(r.ticker);rowsByTicker.set(r.ticker,r)}}
 for(const h of historyRows){if(!allowed.has(h.ticker)||h.trade_date!==date)continue;
  const a=hist.get(h.ticker)??[];a.push(h);hist.set(h.ticker,a)}
 const out=new Map();
 for(const ticker of members){const r=rowsByTicker.get(ticker);
  if(!r||dup.has(ticker)||!validPrice(r,date)||!validSource(r))continue;
  const versions=hist.get(ticker)??[];
  if(!versions.length||priceConflict(r,versions))continue;
  out.set(ticker,{close:Number(r.current_close),previousClose:Number(r.previous_close),volume:Number(r.current_volume)});
 }
 return out;
}
export function dailyBreadth(members,rows){
 if(rows.size<Math.ceil(members.length*.98))return null;
 let nUp=0,nFlat=0,nValueUp=0,nValueFlat=0,nValueTotal=0;
 for(const row of rows.values()){
  const dollar=row.close*row.volume;
  if(!finite(dollar)||dollar<0)return null;
  if(row.close>row.previousClose){nUp++;nValueUp+=dollar}
  else if(row.close===row.previousClose){nFlat++;nValueFlat+=dollar}
  nValueTotal+=dollar;
 }
 if(!(nValueTotal>0))return null;
 const F1=100*(nUp+.5*nFlat)/rows.size;
 const F2=100*(nValueUp+.5*nValueFlat)/nValueTotal;
 return {F1,F2,dailyComposite:.60*F1+.40*F2};
}
export function emaObserved(values,period){
 if(!Number.isInteger(period)||period<2||!Array.isArray(values)||values.length<period||values.some(x=>!finite(x)))return null;
 let v=values.slice(0,period).reduce((s,x)=>s+x,0)/period;
 const alpha=2/(period+1);
 for(let i=period;i<values.length;i++)v+=alpha*(values[i]-v);
 return v;
}
export function endpointBreadth(current,reference,members){
 let pos=0,flat=0,valid=0;
 for(const ticker of members){const a=current.get(ticker)?.close,b=reference.get(ticker)?.close;
  if(!finite(a)||!finite(b)||a<=0||b<=0)continue;
  valid++;if(a>b)pos++;else if(a===b)flat++;
 }
 return {eligible:valid,required:Math.ceil(members.length*.98),value:valid>=Math.ceil(members.length*.98)?100*(pos+.5*flat)/valid:null};
}
