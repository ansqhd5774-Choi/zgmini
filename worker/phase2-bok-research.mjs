// Research extension only. Reuses PHASE 1 transport and PHASE 2B statistics.
import {requestStage,wrapperRows,searchableTables,usableItems,numeric,period} from './phase1-korea.mjs';
import {analyzeSeries,correlation} from './phase2-korea-analysis.mjs';

export const BOK_POLICY=Object.freeze({start:'20210101',pageSize:1000,maxRequests:28,maxMetadataPages:3,maxHistoryPages:4,maxTables:6,timeoutMs:12000,totalMs:180000,maxBodyBytes:2097152});
const clean=(v)=>typeof v==='string'&&!/https?:|servicekey|apikey|authorization|bearer/i.test(v)?v.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,120):null;
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_.-]{1,80}$/.test(v)?v:null;
const compact=d=>d.toISOString().slice(0,10).replaceAll('-','');
const unit=v=>clean(v)?.replace(/\s/g,'')??null;
const frequencyRank={D:0,M:1};
const targets=['usdkrw','corporate','government','ccsi'];
const tableMatch=(kind,name)=>kind==='usdkrw'?/환율/.test(name):kind==='ccsi'?/소비자.*심리|소비자동향/.test(name):/금리|수익률|채권/.test(name);
export function matchesBokTarget(kind,name,tableName='',unitName=''){
 const n=clean(name)??'',t=clean(tableName)??'',u=unit(unitName);
 if(kind==='usdkrw')return !/100|달러\s*\/\s*원|KRW\s*\/\s*USD/i.test(n)&&u==='원'&&(/원\s*\/\s*(미국)?달러|USD\s*\/\s*KRW/i.test(n)||/미국.*달러/.test(n)&&/원화/.test(t));
 if(kind==='corporate')return /회사채/.test(n)&&/3\s*년/.test(n)&&/AA\s*[-−]/.test(n)&&!/[A-Z]AA\s*[-−]/.test(n)&&['%','연%'].includes(u);
 if(kind==='government')return /국고채/.test(n)&&/3\s*년/.test(n)&&['%','연%'].includes(u);
 return kind==='ccsi'&&/소비자심리지수|\bCCSI\b/i.test(n)&&!!u;
}
export function selectBokCandidates(tables,itemRows,kind){
 const result=[];
 for(const table of tables){
  if(!id(table.STAT_CODE)||table.SRCH_YN!=='Y'||!tableMatch(kind,table.STAT_NAME??''))continue;
  const rows=itemRows[table.STAT_CODE]??[];
  // Additional classification groups require explicit selection support, not guesses.
  const groups=new Set(rows.map(r=>r.GRP_CODE).filter(Boolean));if(groups.size>1)continue;
  const usable=usableItems({StatisticItemList:{row:rows}})??[];
  for(const item of usable){
   if(!(item.CYCLE in frequencyRank)||kind==='ccsi'&&item.CYCLE!=='M')continue;
   if(!matchesBokTarget(kind,item.ITEM_NAME,table.STAT_NAME,item.UNIT_NAME))continue;
   if(!period(item.START_TIME,item.CYCLE)||!period(item.END_TIME,item.CYCLE))continue;
   result.push({table,item});
  }
 }
 return result.sort((a,b)=>frequencyRank[a.item.CYCLE]-frequencyRank[b.item.CYCLE]||b.item.END_TIME.localeCompare(a.item.END_TIME)||a.table.STAT_CODE.localeCompare(b.table.STAT_CODE)||a.item.ITEM_CODE.localeCompare(b.item.ITEM_CODE));
}
export function sourceDiagnostics(table,item){
 const organization=clean(table.ORG_NAME),itemSource=clean(item.ORG_NAME);
 const source=itemSource||organization;
 return {organization,itemSource,source,sourceField:itemSource?'StatisticItemList.ORG_NAME':organization?'StatisticTableList.ORG_NAME':null,
  producerClassification:source==='한국은행'?'BOK_ATTRIBUTED_NOT_OWNERSHIP_PROOF':source?'EXTERNAL_OR_MIXED_ATTRIBUTION':'UNKNOWN',
  copyrightUsageContext:'SERIES_SPECIFIC_RIGHTS_NOT_VERIFIED',commercialRedistribution:'UNCONFIRMED',
  note:'ECOS distribution and organization attribution do not establish ownership or commercial redistribution permission'};
}
function evidence(c){return {statCode:c.table.STAT_CODE,statName:clean(c.table.STAT_NAME),itemCode:c.item.ITEM_CODE,itemName:clean(c.item.ITEM_NAME),cycle:c.item.CYCLE,unit:unit(c.item.UNIT_NAME),metadataStart:clean(c.item.START_TIME),metadataEnd:clean(c.item.END_TIME),source:sourceDiagnostics(c.table,c.item),selectionBasis:'observed table/item names, cycle, unit and searchable leaf metadata; no fixed series IDs'};}
export function bokHistoryAnalysis(rows,c,nowDate,complete=true){
 const cycle=c.item.CYCLE,expectedUnit=unit(c.item.UNIT_NAME),counts={identityMismatch:0,extraDimension:0,invalidPeriod:0,unitMismatch:0};
 const mapped=[];
 for(const r of rows){
  if(r.STAT_CODE!==c.table.STAT_CODE||r.ITEM_CODE1!==c.item.ITEM_CODE){counts.identityMismatch++;continue;}
  if([2,3,4].some(i=>r[`ITEM_CODE${i}`]!==undefined&&r[`ITEM_CODE${i}`]!==null&&String(r[`ITEM_CODE${i}`]).trim()!=='')){counts.extraDimension++;continue;}
  const p=period(r.TIME,cycle);if(!p||r.CYCLE&&r.CYCLE!==cycle){counts.invalidPeriod++;continue;}
  if(!expectedUnit||unit(r.UNIT_NAME)!==expectedUnit){counts.unitMismatch++;continue;}
  // Monthly observations use month end as an analysis anchor, never daily interpolation.
  const date=cycle==='M'?compact(new Date(Date.UTC(Number(p.slice(0,4)),Number(p.slice(4,6)),0))):p;
  if(date<'20210101'||date>nowDate){counts.invalidPeriod++;continue;}
  mapped.push({basDt:date,value:r.DATA_VALUE});
 }
 // analyzeSeries accepts a field selector, so map into that field explicitly.
 const result=analyzeSeries(mapped.map(r=>({basDt:r.basDt,[c.item.ITEM_CODE]:r.value})),{operation:'StatisticSearch',field:c.item.ITEM_CODE,nowDate,complete,unit:expectedUnit,unitSource:'api-response'});
 result.summary.provider='BOK ECOS';result.summary.metadata=evidence(c);result.summary.sourceCycle=cycle;result.summary.inputRows=rows.length;result.summary.rejections=counts;
 result.summary.dateAnchor=cycle==='M'?'month end; not publication date':'observation date';
 if(cycle==='M')monthlyQuality(result.summary,complete,mapped.length);
 if(Object.values(counts).some(n=>n>0)){result.summary.qualityFlags=result.summary.qualityFlags.filter(f=>f!=='GOOD');result.summary.qualityFlags.push('ROW_VALIDATION_REJECTIONS');}
 return result;
}
function monthlyQuality(s,complete,rowCount){
  s.qualityFlags=s.qualityFlags.filter(f=>!['GOOD','SPARSE','FRESH','STALE','LONG_GAP_REVIEW'].includes(f));
  if(s.latestObservationDate)s.qualityFlags.push(s.latestLagDays>=0&&s.latestLagDays<=62?'FRESH':'STALE');
  if(s.uniqueObservationCount<2||(s.medianGapDays??0)>40||s.missingValueCount+s.nonNumericValueCount>rowCount*.02)s.qualityFlags.push('SPARSE');
  if((s.maxGapDays??0)>70)s.qualityFlags.push('LONG_GAP_REVIEW');
  if(complete&&s.historyYearsApprox>=3&&!s.conflictingDateCount&&!s.qualityFlags.some(f=>['STALE','SPARSE','LONG_GAP_REVIEW'].includes(f)))s.qualityFlags.push('GOOD');
  s.frequencyPolicy={freshCalendarLagDays:62,sparseMedianGapDays:40,longGapReviewDays:70};
 }
export function creditSpread(corporate,government,nowDate){
 if(!corporate||!government)return {errorType:'MISSING_LEG'};
 if(corporate.summary.sourceCycle!==government.summary.sourceCycle)return {errorType:'FREQUENCY_MISMATCH'};
 const u=corporate.summary.unit;if(!['%','연%'].includes(u)||u!==government.summary.unit)return {errorType:'UNIT_MISMATCH'};
 const gov=new Map(government.points.map(p=>[p.date,p.value]));
 const rows=corporate.points.filter(p=>gov.has(p.date)).map(p=>({basDt:p.date,value:p.value-gov.get(p.date)}));
 const complete=corporate.summary.fetchComplete&&government.summary.fetchComplete;
 const a=analyzeSeries(rows,{operation:'derived same-date corporate minus government',field:'value',nowDate,complete,unit:'percentage points',unitSource:'difference of identical rate units'});
 a.summary.provider='BOK ECOS';a.summary.field='creditSpread';a.summary.sourceCycle=corporate.summary.sourceCycle;a.summary.alignment='exact same observation date intersection, no fill';
 if(a.summary.sourceCycle==='M')monthlyQuality(a.summary,complete,rows.length);
 if(!corporate.summary.qualityFlags.includes('GOOD')||!government.summary.qualityFlags.includes('GOOD')){
  a.summary.qualityFlags=a.summary.qualityFlags.filter(f=>f!=='GOOD');a.summary.qualityFlags.push('LEG_QUALITY_REVIEW');
 }
 a.summary.legUnits=[u,u];a.summary.legSources=[corporate.summary.metadata.source,government.summary.metadata.source];
 a.summary.excludedUnmatchedDates=corporate.points.length+government.points.length-2*rows.length;
 return a;
}
export function fscOverlap(analysis,fsc){
 return ['crdTrFingWhl','brkTrdUcolMnyVsOppsTrdAmt'].map(field=>({fscField:field,raw:correlation(analysis?.points??[],fsc[field]?.points??[]),change20:correlation(analysis?.changes?.[20]??[],fsc[field]?.changes[20]??[],true)}));
}
export function researchDecision(kind,a,overlap=[]){
 const s=a?.summary,monthly=s?.sourceCycle==='M';
 const paired=overlap.filter(o=>o.change20.overlapCount>=252&&o.change20.pearson!==null&&o.change20.spearman!==null);
 const highOverlap=paired.some(o=>Math.abs(o.change20.pearson)>=.85||Math.abs(o.change20.spearman)>=.85);
 const quality=!!s&&s.historyYearsApprox>=3&&s.fetchComplete&&s.qualityFlags.includes('GOOD');
 const decision=!s||s.uniqueObservationCount<2?'REJECT':!quality?'WEAK':'OPTIONAL';
 return {decision,technicalCandidate:quality&&!monthly&&!highOverlap&&paired.length===2?'CORE_CANDIDATE':null,
  directness:kind==='ccsi'?'CONSUMER_MACRO_SENTIMENT_NOT_EQUITY_SENTIMENT':kind==='usdkrw'?'FX_RISK_OFF_PROXY':'CREDIT_STRESS_PROXY',
  frequencyPenalty:monthly?'MONTHLY_COMPARISON_ONLY':'NONE',qualityPassed:quality,highOverlap,overlapEvidence:paired.length===2?'SUFFICIENT_FOR_SCREENING':'INSUFFICIENT',
  licenseGate:'RIGHTS_UNCONFIRMED_CORE_PROMOTION_BLOCKED',directionCandidate:kind==='usdkrw'?'RISE = WON_WEAKNESS / RISK_OFF_CANDIDATE':kind==='ccsi'?'NOT_ASSIGNED':'WIDENING = CREDIT_STRESS_CANDIDATE',
  criteria:'3y, complete, GOOD; monthly penalty; overlap screening requires 252 aligned change pairs and |correlation| >= .85; no automatic elimination or final score'};
}
async function boundedFetch(url,options,fetchFn){
 const response=await Reflect.apply(fetchFn,globalThis,[url,options]);
 if(Number(response.headers.get('content-length'))>BOK_POLICY.maxBodyBytes){await response.body?.cancel();throw Error('BOK_BODY_LIMIT');}
 const reader=response.body?.getReader();if(!reader)return response;
 const chunks=[];let bytes=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>BOK_POLICY.maxBodyBytes){await reader.cancel();throw Error('BOK_BODY_LIMIT');}chunks.push(value);}}finally{reader.releaseLock();}
 const body=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length;}
 return new Response(body,{status:response.status,headers:{'content-type':response.headers.get('content-type')??'application/json'}});
}
async function pages(service,args,key,state,ctx,maxPages){
 const rows=[],signatures=new Set();let total=null;
 try{for(let page=0;page<maxPages;page++){
  if(ctx.requests>=BOK_POLICY.maxRequests||Date.now()-ctx.started>=BOK_POLICY.totalMs)throw Error('RESEARCH_BUDGET_EXCEEDED');
  ctx.requests++;
  const json=await requestStage(state,service,()=>new URL(`${service}/${[key,'json','kr',page*1000+1,(page+1)*1000,...args].map(encodeURIComponent).join('/')}/`,'https://ecos.bok.or.kr/api/'),{fetch:(u,o)=>boundedFetch(u,o,ctx.fetch),timeoutMs:Math.min(BOK_POLICY.timeoutMs,BOK_POLICY.totalMs-(Date.now()-ctx.started))});
  const batch=wrapperRows(json,service),rawCount=json?.[service]?.list_total_count;
  const count=typeof rawCount==='number'||typeof rawCount==='string'&&/^\d+$/.test(rawCount)?Number(rawCount):NaN;
  if(!batch||!Number.isSafeInteger(count)||count<0||total!==null&&total!==count)throw Error('PAGINATION_SCHEMA_ERROR');
  total=count;if(batch.length>1000||rows.length+batch.length>count)throw Error('PAGINATION_SCHEMA_ERROR');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(batch)))),b=>b.toString(16).padStart(2,'0')).join('');
  if(batch.length&&signatures.has(hash))throw Error('PAGINATION_INCOMPLETE');signatures.add(hash);
  rows.push(...batch);if(rows.length===count)return {rows,complete:true,errorType:null};if(!batch.length)throw Error('PAGINATION_INCOMPLETE');
 }
 return {rows,complete:false,errorType:'PAGE_LIMIT'};
 }catch(e){return {rows,complete:false,errorType:state.errorType||(['RESEARCH_BUDGET_EXCEEDED','PAGINATION_SCHEMA_ERROR','PAGINATION_INCOMPLETE'].includes(e.message)?e.message:'BOK_RESEARCH_ERROR')};}
}
export async function runBokResearch(env,context={},fsc={}){
 const key=env?.BOK_API_KEY;
 if(typeof key!=='string'||!key.trim())return {status:'FAILED',errorType:'SECRET_MISSING',requestCount:0};
 const now=context.now??new Date(),today=compact(now),ctx={fetch:context.fetch??globalThis.fetch,requests:0,started:Date.now()},state={provider:'BOK',stages:[]};
 const tableData=await pages('StatisticTableList',[],key,state,ctx,BOK_POLICY.maxMetadataPages);
 const tables=searchableTables({StatisticTableList:{row:tableData.rows}})??[];
 // Round-robin discovery across three topics prevents one topic consuming the table budget.
 const groups=['usdkrw','corporate','ccsi'].map(k=>tables.filter(t=>tableMatch(k,t.STAT_NAME??'')).sort((a,b)=>(frequencyRank[a.CYCLE]??9)-(frequencyRank[b.CYCLE]??9)||a.STAT_CODE.localeCompare(b.STAT_CODE)));
 const chosen=[];for(let i=0;i<BOK_POLICY.maxTables;i++)for(const g of groups)if(g[i]&&!chosen.some(t=>t.STAT_CODE===g[i].STAT_CODE)&&chosen.length<BOK_POLICY.maxTables)chosen.push(g[i]);
 const itemRows={},metadataFailures=[];
 for(const t of chosen){state.errorType=null;const d=await pages('StatisticItemList',[t.STAT_CODE],key,state,ctx,1);if(d.complete)itemRows[t.STAT_CODE]=d.rows;else metadataFailures.push({statCode:t.STAT_CODE,errorType:d.errorType});}
 const selected={},analyses={},attempts={};
 for(const kind of targets){
  const candidates=selectBokCandidates(chosen,itemRows,kind);attempts[kind]=[];
  for(const c of candidates.slice(0,2)){
   // Credit legs must have identical frequency; no resampling or substitutions.
   if(kind==='government'&&selected.corporate&&c.item.CYCLE!==selected.corporate.item.CYCLE)continue;
   const cycle=c.item.CYCLE,start=cycle==='D'?'20210101':'202101',cap=cycle==='D'?today:today.slice(0,6);
   const low=c.item.START_TIME>start?c.item.START_TIME:start,high=c.item.END_TIME<cap?c.item.END_TIME:cap;
   if(low>high)continue;
   state.errorType=null;const d=await pages('StatisticSearch',[c.table.STAT_CODE,cycle,low,high,c.item.ITEM_CODE],key,state,ctx,BOK_POLICY.maxHistoryPages);
   const a=bokHistoryAnalysis(d.rows,c,today,d.complete);
   attempts[kind].push({metadata:evidence(c),complete:d.complete,errorType:d.errorType,observationCount:a.summary.uniqueObservationCount});
   if(a.summary.uniqueObservationCount>=2){selected[kind]=c;analyses[kind]=a;break;}
   if(d.errorType)break;
  }
 }
 const spread=creditSpread(analyses.corporate,analyses.government,today);
 // Internal-only consumer; raw points are never attached to the response.
 if(typeof context.onResearchAnalyses==='function')context.onResearchAnalyses({creditSpread:spread.summary?spread:null,usdkrw:analyses.usdkrw??null});
 const overlap={usdkrw:fscOverlap(analyses.usdkrw,fsc),creditSpread:fscOverlap(spread,fsc)};
 const output={provider:'BOK ECOS',status:analyses.usdkrw?.summary.fetchComplete&&spread.summary?.fetchComplete&&spread.summary.uniqueObservationCount>=2?'SUCCESS':Object.keys(analyses).length?'PARTIAL':'FAILED',requestCount:ctx.requests,
  discovery:{tableCount:tables.length,tableListComplete:tableData.complete,errorType:tableData.errorType,tablesTried:chosen.length,metadataFailures,boundedSearch:true,exhaustive:false},attempts,
  series:Object.fromEntries(Object.entries(analyses).map(([k,a])=>[k,a.summary])),creditSpread:spread.summary??spread,overlap,
  decisions:{usdkrw:researchDecision('usdkrw',analyses.usdkrw,overlap.usdkrw),creditSpread:researchDecision('creditSpread',spread,overlap.creditSpread),ccsi:researchDecision('ccsi',analyses.ccsi)},
  stages:state.stages,policy:BOK_POLICY,license:'Per-series rights unresolved; ECOS availability does not grant commercial redistribution rights'};
 return JSON.parse(JSON.stringify(output,(_k,v)=>typeof v==='string'&&v.includes(key)?'[REDACTED]':v));
}
