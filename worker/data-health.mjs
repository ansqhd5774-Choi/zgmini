// Server-only diagnostics. Never return provider payloads, request URLs, or exception text.
export const SERIES = 'PCEPILFE CPILFESL PPIFIS T10YIE UNRATE PAYEMS IC4WSA CCSA JTSJOL LNS12300060 CFNAI INDPRO RRSFS W875RX1 GDPC1 DFII10 NFCI DFF DGS10 T10Y2Y DCOILWTICO'.split(' ');
const KEYS = ['FRED_API_KEY','EIA_API_KEY','BLS_API_KEY','BEA_API_KEY'];
export function numeric(v) {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const s = String(v).trim();
  if (!s || s === '.' || /^(NA|N\/A|null)$/i.test(s)) return null;
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(s)) return null;
  const n = Number(s); return Number.isFinite(n) ? n : null;
}
const fail = (reason,http=null) => ({status:'FAIL',reason,http});
async function request(url, init={}) {
  const started=Date.now();
  try {
    const r=await fetch(url,{...init,redirect:'manual',signal:AbortSignal.timeout(18000)});
    if(r.status>=300&&r.status<400)return fail('UNEXPECTED_UPSTREAM_REDIRECT',r.status);
    let body; try {body=await r.json();} catch {return {...fail(r.status===429?'RATE_LIMITED':'NON_JSON_RESPONSE',r.status)};}
    if (!r.ok || body.error || body.error_code || body.BEAAPI?.Results?.Error || body.BEAAPI?.Error) {
      // Inspect internally, emit only a fixed classification; upstream errors may echo credentials.
      const msg=JSON.stringify(body).toLowerCase();
      const reason= /api.key|api_key|userid|registrationkey|invalid.key|not.registered|not.activated/.test(msg) ? 'AUTHENTICATION_REJECTED' : 'UPSTREAM_ERROR';
      return fail(reason,r.status);
    }
    return {status:'PASS',http:r.status,body};
  } catch (error) {const message=String(error?.message??'').toLowerCase();return {...fail('NETWORK_OR_TIMEOUT'),elapsedMs:Date.now()-started,errorType:['TypeError','Error','AbortError','TimeoutError','ReferenceError'].includes(error?.name)?error.name:'Other',diagnosticTokens:['abortsignal','timeout','not a function','not defined','fetch','network','outbound','outgoing','blocked','forbidden','proxy','subrequest','limit','disallowed','unsupported','redirect','illegal','invocation','asynchronous','global','scope','i/o','context','invalid'].filter(token=>message.includes(token))};}
}
function fredUrl(path,key,params) { const u=new URL('https://api.stlouisfed.org/fred/'+path);u.search=new URLSearchParams({api_key:key,file_type:'json',...params});return u; }
async function fredSeries(id,key,asOf) {
  const [m,o]=await Promise.all([
    request(fredUrl('series',key,{series_id:id})),
    request(fredUrl('series/observations',key,{series_id:id,sort_order:'desc',limit:'1000',observation_end:asOf}))
  ]);
  if(m.status!=='PASS'||o.status!=='PASS')return {id,...(m.status!=='PASS'?m:o)};
  const meta=m.body.seriess?.[0]; const rows=(o.body.observations??[]).flatMap(r=>{const value=numeric(r.value);return value===null||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||r.date>asOf?[]:[{date:r.date,value,realtime_start:r.realtime_start,realtime_end:r.realtime_end}];}).sort((a,b)=>a.date.localeCompare(b.date));
  if(!meta||!rows.length)return {id,...fail('MISSING_METADATA_OR_OBSERVATIONS')};
  return {id,status:'PASS',http:200,title:meta.title,latest:rows.at(-1),unit:meta.units,frequency:meta.frequency,seasonal_adjustment:meta.seasonal_adjustment,last_updated:meta.last_updated,rows};
}
export function transform(s) {
  if(s?.status!=='PASS')return {status:'FAILED',reason:'RAW_DATA_UNAVAILABLE'};
  const rows=s.rows, t=rows.at(-1); const month=n=>{const d=new Date(t.date+'T00:00:00Z');d.setUTCMonth(d.getUTCMonth()-n);return rows.find(r=>r.date.slice(0,7)===d.toISOString().slice(0,7))?.value??null;};
  if(['PCEPILFE','CPILFESL','PPIFIS'].includes(s.id)) {
    const y=month(12),q=month(3);return {status:y>0&&q>0?'PASS':'PARTIAL',date:t.date,raw:t.value,YoY:y>0?(t.value/y-1)*100:null,annualized3M:q>0?((t.value/q)**4-1)*100:null};
  }
  if(s.id==='PAYEMS') {const p=month(1),q=month(3);return {status:p!==null&&q!==null?'PASS':'PARTIAL',date:t.date,raw:t.value,monthlyChange:p!==null?t.value-p:null,average3M:q!==null?(t.value-q)/3:null,unit:'Thousands of persons'};}
  if(s.id==='DCOILWTICO') {const r=rows.slice(-21);if(r.length!==21||r.some(p=>p.value<=0))return {status:'FAILED',reason:'INSUFFICIENT_POSITIVE_PRICES'};const logs=r.slice(1).map((p,i)=>Math.log(p.value/r[i].value));const mean=logs.reduce((a,b)=>a+b,0)/20;return {status:'PASS',date:t.date,realizedVolatility20:Math.sqrt(logs.reduce((a,b)=>a+(b-mean)**2,0)/19)*Math.sqrt(252)*100,unit:'Annualized percent',observations:21};}
  return null;
}
const BLS_MAP={UNRATE:'LNS14000000',PAYEMS:'CES0000000001',CPILFESL:'CUSR0000SA0L1E',PPIFIS:'WPSFD4'};
async function bls(key,year) {
  const r=await request('https://api.bls.gov/publicAPI/v2/timeseries/data/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({registrationkey:key,seriesid:Object.values(BLS_MAP),startyear:String(year-2),endyear:String(year),catalog:true})});
  if(r.status!=='PASS')return r;
  if(r.body.status!=='REQUEST_SUCCEEDED')return fail('BLS_REQUEST_NOT_SUCCEEDED',r.http);
  const series=Object.entries(BLS_MAP).map(([fredId,id])=>{const s=r.body.Results?.series?.find(s=>s.seriesID===id);const rows=(s?.data??[]).flatMap(p=>{const v=numeric(p.value);return v===null||!/^M(0[1-9]|1[012])$/.test(p.period)?[]:[{date:`${p.year}-${p.period.slice(1)}-01`,value:v,preliminary:(p.footnotes??[]).some(f=>f.code==='P')}];}).sort((a,b)=>a.date.localeCompare(b.date));return {id,fredId,status:rows.length?'PASS':'FAIL',latest:rows.at(-1)??null,catalog:s?.catalog?{series_title:s.catalog.series_title,seasonality:s.catalog.seasonality}:null,rows};});
  return {status:series.every(s=>s.status==='PASS')?'PASS':'FAIL',http:r.http,series};
}
async function bea(key,year) {
  const series=[];
  for(const [id,table,freq]of[['PCEPILFE','T20804','M'],['GDPC1','T10106','Q']]) {
    const u=new URL('https://apps.bea.gov/api/data');u.search=new URLSearchParams({UserID:key,method:'GetData',datasetname:'NIPA',TableName:table,Frequency:freq,Year:[year-2,year-1,year].join(','),ResultFormat:'JSON'});
    const r=await request(u);if(r.status!=='PASS'){series.push({id,...r});continue;}
    const rows=(r.body.BEAAPI?.Results?.Data??[]).filter(p=>id==='GDPC1'?p.LineNumber==='1':/excluding food and energy/i.test(p.LineDescription)&&!/market.based/i.test(p.LineDescription)).flatMap(p=>{const value=numeric(typeof p.DataValue==='string'?p.DataValue.replaceAll(',',''):p.DataValue);const period=p.TimePeriod;const date=/^\d{4}M\d{2}$/.test(period)?period.slice(0,4)+'-'+period.slice(5)+'-01':/^\d{4}Q[1-4]$/.test(period)?period.slice(0,4)+'-'+String((Number(period.slice(5))-1)*3+1).padStart(2,'0')+'-01':null;return value===null||!date?[]:[{date,value,period,unit:p.CL_UNIT,unitMultiplier:p.UNIT_MULT,description:p.LineDescription,line:p.LineNumber,seriesCode:p.SeriesCode}];}).sort((a,b)=>a.date.localeCompare(b.date));
    series.push({id,status:rows.length?'PASS':'FAIL',reason:rows.length?null:'MATCHING_DATA_NOT_FOUND',http:r.http,table,latest:rows.at(-1)??null,rows});
  }
  return {status:series.every(s=>s.status==='PASS')?'PASS':'FAIL',series};
}
async function eia(key) {
  const series=[];
  for(const [id,path,frequency]of[['RWTC','petroleum/pri/spt','daily'],['WCESTUS1','petroleum/stoc/wstk','weekly']]) {
    const u=new URL(`https://api.eia.gov/v2/${path}/data/`);u.search=new URLSearchParams({api_key:key,frequency,'data[0]':'value','facets[series][]':id,'sort[0][column]':'period','sort[0][direction]':'desc',length:id==='RWTC'?'1000':'600'});
    const r=await request(u);if(r.status!=='PASS'){series.push({id,...r});continue;}
    const rows=(r.body.response?.data??[]).flatMap(p=>{const value=numeric(p.value);return value===null||!/^\d{4}-\d{2}-\d{2}$/.test(p.period)?[]:[{date:p.period,value,unit:p['value-units']??p.units??null}];}).sort((a,b)=>a.date.localeCompare(b.date));
    series.push({id,status:rows.length?'PASS':'FAIL',http:r.http,latest:rows.at(-1)??null,earliest:rows[0]?.date??null,count:rows.length,rows});
  }
  return {status:series.every(s=>s.status==='PASS')?'PASS':'FAIL',series};
}
async function mapLimit(items,fn){const out=[];for(let i=0;i<items.length;i+=3)out.push(...await Promise.all(items.slice(i,i+3).map(fn)));return out;}
const memo=new Map();
export async function dataHealth(requestObject,env) {
  const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Content-Type':'application/json; charset=utf-8'};
  if(requestObject.method!=='GET')return new Response(null,{status:405,headers:{...headers,Allow:'GET'}});
  const secrets=Object.fromEntries(KEYS.map(k=>[k,typeof env[k]==='string'&&env[k].trim()?'PRESENT':'MISSING']));
  if(Object.values(secrets).includes('MISSING'))return Response.json({status:'FAILED',secrets,reason:'MISSING_SECRET',v3Active:false},{status:503,headers});
  const params=new URL(requestObject.url).searchParams;const mode=params.get('provider')??'all';const window=params.get('window')??'1M';
  if(!['all','fred','bls','bea','eia','vintage'].includes(mode))return Response.json({status:'FAILED',reason:'INVALID_PROVIDER'},{status:400,headers});
  if(mode==='vintage'&&!['1M','3M','6M','1Y','revision'].includes(window))return Response.json({status:'FAILED',reason:'INVALID_WINDOW'},{status:400,headers});
  const cacheKey=mode==='vintage'?mode+window:mode;const cached=memo.get(cacheKey);if(cached&&cached.until>Date.now())return Response.json(await cached.promise,{headers});
  const promise=(async()=>{
    const now=new Date(),asOf=now.toISOString().slice(0,10),year=now.getUTCFullYear();
    const out={schemaVersion:2,checkedAt:now.toISOString(),secrets,v3Active:false,scoreCalculation:'NOT_RUN',status:'PARTIAL'};
    if(mode==='vintage'){out.vintage=await vintage(env.FRED_API_KEY,asOf,window);out.status=out.vintage.status;return out;}
    if(mode==='all'||mode==='fred'){const series=await mapLimit(SERIES,id=>fredSeries(id,env.FRED_API_KEY,asOf));out.fred={status:series.every(s=>s.status==='PASS')?'PASS':'FAIL',series};out.transforms=Object.fromEntries(series.filter(s=>['PCEPILFE','CPILFESL','PPIFIS','PAYEMS','DCOILWTICO'].includes(s.id)).map(s=>[s.id,transform(s)]));}
    if(mode==='all'||mode==='bls')out.bls=await bls(env.BLS_API_KEY,year);
    if(mode==='all'||mode==='bea')out.bea=await bea(env.BEA_API_KEY,year);
    if(mode==='all'||mode==='eia')out.eia=await eia(env.EIA_API_KEY);
    out.status=['fred','bls','bea','eia'].filter(k=>out[k]).every(k=>out[k].status==='PASS')?'OK':'FAILED';
    // Final defensive redaction over allowlisted output. Never return raw upstream errors/payloads.
    let serialized=JSON.stringify(out);for(const k of KEYS)serialized=serialized.split(env[k]).join('[REDACTED]');return JSON.parse(serialized);
  })().catch(()=>({status:'FAILED',reason:'DIAGNOSTIC_FAILED',secrets,v3Active:false}));
  memo.set(cacheKey,{until:Date.now()+600000,promise});return Response.json(await promise,{headers});
}


async function vintage(key,today,window) {
  let date;let event=null;
  if(window==='revision') {
    const v=await request(fredUrl('series/vintagedates',key,{series_id:'PAYEMS',sort_order:'desc',limit:'20'}));
    if(v.status!=='PASS')return v;
    date=v.body.vintage_dates?.find(d=>d<today);if(!date)return fail('REVISION_DATE_UNAVAILABLE');
    const previous=new Date(date+'T00:00:00Z');previous.setUTCDate(previous.getUTCDate()-1);const previousDate=previous.toISOString().slice(0,10);
    const [a,b]=await Promise.all([asOfRows('PAYEMS',key,previousDate),asOfRows('PAYEMS',key,date)]);
    const revisions=a.status==='PASS'&&b.status==='PASS'?b.rows.flatMap(p=>{const old=a.rows.find(q=>q.date===p.date);return old&&old.value!==p.value?[{observation_date:p.date,before:old.value,after:p.value}]:[]}):[];
    event={series:'PAYEMS',date,previousDate,status:revisions.length?'PASS':'REVISION_NOT_DEMONSTRATED',revisions};
  } else {const d=new Date(today+'T00:00:00Z');d.setUTCMonth(d.getUTCMonth()-({'1M':1,'3M':3,'6M':6,'1Y':12}[window]));date=d.toISOString().slice(0,10);}
  const series=await mapLimit(SERIES,id=>asOfRows(id,key,date));
  return {status:series.every(s=>s.status==='PASS')?'PASS':'FAIL',asOf:date,event,scoreCalculation:'BLOCKED_UNTIL_ALL_API_AND_PROVENANCE_GATES_PASS',series};
}
async function asOfRows(id,key,date) {
 const r=await request(fredUrl('series/observations',key,{series_id:id,realtime_start:date,realtime_end:date,observation_end:date,sort_order:'desc',limit:'36'}));
 if(r.status!=='PASS')return {id,...r};
 const raw=r.body.observations??[];
 const future=raw.filter(p=>p.date>date||p.realtime_start>date).length;
 const rows=raw.flatMap(p=>{const value=numeric(p.value);return value===null||p.date>date||p.realtime_start>date?[]:[{date:p.date,value,realtime_start:p.realtime_start,realtime_end:p.realtime_end}];}).sort((a,b)=>a.date.localeCompare(b.date));
 return {id,status:rows.length&&future===0?'PASS':'FAIL',http:r.http,asOf:date,latest:rows.at(-1)??null,futureDataLeak:future,releasePolicy:'ALFRED as-of availability; realtime window is not original publication date',rows};
}
