// Temporary server-only diagnostics. Never return upstream bodies, URLs or keys.
// FSC metric: official supplied guide, section 4, crdTrFingWhl. Unit unspecified.
// KOSIS docs: devGuide_0701List, devGuide_060104List (ITM),
// devGuide_060103List (PRD), devGuide_0201List (observations).
const FSC_BASE = 'https://apis.data.go.kr/1160100/service/GetKofiaStatisticsInfoService/';
const KOSIS_BASE = 'https://kosis.kr/openapi/';
const BOK_BASE = 'https://ecos.bok.or.kr/api/';
const id = value => typeof value === 'string' && /^[A-Za-z0-9_.-]{1,80}$/.test(value) ? value : null;
const text = value => typeof value === 'string' && value.trim() ? value.trim() : null;

export function numeric(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(s)) return null;
  const n = Number(s.replaceAll(',', ''));
  return Number.isFinite(n) ? n : null;
}

export function period(value, cycle) {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (['A','Y'].includes(cycle)) return /^\d{4}$/.test(s) && Number(s)>0 ? s : null;
  if (cycle === 'Q') { const m=s.match(/^(\d{4})(?:Q|0)([1-4])$/); return m ? `${m[1]}Q${m[2]}` : null; }
  if (cycle === 'M') return /^\d{4}(0[1-9]|1[0-2])$/.test(s) ? s : null;
  if (cycle === 'D' && /^\d{8}$/.test(s)) {
    const d = new Date(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6)}T00:00:00Z`);
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10).replaceAll('-','')===s ? s : null;
  }
  return null; // Unsupported cycles are explicit errors, never guessed.
}

export function summarize(rows, dateKey, valueKey, cycle, unitKey = null) {
  const unique = new Map(); const conflicts = new Set(); let invalid=0;
  for (const row of rows) {
    const date=period(row?.[dateKey],cycle), value=numeric(row?.[valueKey]);
    const unit=unitKey ? text(row?.[unitKey]) : null;
    if (!date || value===null || (unitKey && !unit)) { invalid++; continue; }
    if (conflicts.has(date)) continue;
    const old=unique.get(date);
    if (old && (old.value!==value || old.unit!==unit)) { unique.delete(date); conflicts.add(date); continue; }
    unique.set(date,{date,value,unit});
  }
  const observations=[...unique.values()].sort((a,b)=>a.date.localeCompare(b.date));
  const latest=observations.at(-1);
  return {observationCount:observations.length, recordCount:observations.length,
    observationDate:latest?.date??null, unit:latest?.unit??null,
    unitSource:latest?.unit?'api-response':null, parserSuccess:observations.length>0,
    historyAvailable:observations.length>=2, nullOrMissing:invalid>0||conflicts.size>0,
    conflictingDateCount:conflicts.size};
}

export function wrapperRows(json, name) {
  return Array.isArray(json?.[name]?.row) ? json[name].row : null;
}
export function parseFsc(json) {
  const items=json?.response?.body?.items?.item;
  const rows=Array.isArray(items)?items:(items && typeof items==='object'?[items]:null);
  if (!rows) return null;
  return summarize(rows,'basDt','crdTrFingWhl','D');
}
export function parseBok(json, cycle) {
  const rows=wrapperRows(json,'StatisticSearch');
  return rows ? summarize(rows,'TIME','DATA_VALUE',cycle,'UNIT_NAME') : null;
}
export function success(o) {
  return o.requestAttempted===true && o.secretPresent===true && o.authSuccess===true
    && o.httpStatus>=200 && o.httpStatus<300 && o.parserSuccess===true
    && o.observationCount>=2 && o.historyAvailable===true && !o.errorType;
}
function initial(provider) {
  return {provider,requestAttempted:false,secretPresent:false,authSuccess:false,httpStatus:null,
    responseReceived:false,metadataCount:0,observationCount:0,recordCount:0,parserSuccess:false,
    observationDate:null,unit:null,unitSource:null,historyAvailable:false,nullOrMissing:null,
    stage:null,elapsedMs:0,apiErrorCode:null,errorType:null,stages:[],technicalValidationSuccess:false,
    requestPrepared:false,fetchFunctionAvailable:false,fetchInvoked:false,urlConstructed:false,
    abortControllerAvailable:typeof globalThis.AbortController==='function',exceptionName:null};
}
class DiagnosticError extends Error {
  constructor(code) { super(code); this.code=code; }
}
function fail(out, code) {
  out.errorType=code;
  const stage=out.stages.at(-1);
  if(stage) { stage.errorType=code; if(code.endsWith('PARSE_ERROR')) stage.parserSuccess=false; }
  throw new DiagnosticError(code);
}

// Only allowlisted codes are exposed: arbitrary upstream messages may echo keys.
const FSC_CODES = new Set(['00','01','03','04','05','10','12','20','22','23','29','30','31',
  'SERVICE_ACCESS_DENIED_ERROR','SERVICE_KEY_IS_NOT_REGISTERED_ERROR','PERMISSION_DENIED',
  'SERVICE_KEY_IS_NULL','DEADLINE_HAS_EXPIRED_ERROR','LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR']);
function apiCode(json, body, provider) {
  if (provider==='FSC') {
    const c=String(json?.response?.header?.resultCode??json?.header?.resultCode??'');
    if (FSC_CODES.has(c)) return c==='00'?null:c;
    for (const c of FSC_CODES) if (c.length>2 && body.includes(c)) return c;
    const m=body.match(/<returnReasonCode>\s*(\d{2})\s*<\/returnReasonCode>/);
    return m && FSC_CODES.has(m[1]) ? m[1] : (c?'UNRECOGNIZED_API_ERROR':null);
  }
  const raw=provider==='BOK'?json?.RESULT?.CODE:json?.err;
  if (raw===undefined || raw===null || raw==='' || raw==='INFO-000') return null;
  const c=String(raw);
  return /^(?:INFO-\d{3}|ERROR-\d{3}|\d{1,4})$/.test(c)?c:'UNRECOGNIZED_API_ERROR';
}

export async function requestStage(out, name, prepareUrl, context) {
  const start=Date.now();
  const s={stage:name,attempted:true,httpStatus:null,elapsedMs:0,responseFormat:null,parserSuccess:false,errorType:null,
    requestPrepared:false,fetchFunctionAvailable:false,fetchInvoked:false,responseReceived:false,
    urlConstructed:false,abortControllerAvailable:typeof globalThis.AbortController==='function',exceptionName:null};
  out.stages.push(s); out.stage=name; out.requestAttempted=true;
  out.httpStatus=null; out.responseReceived=false; out.apiErrorCode=null; out.authSuccess=false;
  let controller,timer; let phase='PREPARE';
  try {
    const resolvedFetch=typeof context.fetch==='function'?context.fetch:globalThis.fetch;
    s.fetchFunctionAvailable=typeof resolvedFetch==='function';
    const url=typeof prepareUrl==='function'?prepareUrl():prepareUrl;
    const target=new URL(url); s.urlConstructed=true;
    controller=new AbortController();
    timer=setTimeout(()=>controller.abort(),context.timeoutMs??12000);
    const options={method:'GET',redirect:'manual',signal:controller.signal,headers:{accept:'application/json'}};
    s.requestPrepared=true; phase='FETCH_INVOCATION';
    if(!s.fetchFunctionAvailable) fail(out,`${name}_FETCH_INVOCATION_ERROR`);
    // Native Worker fetch requires the global receiver, not the DI context object.
    const pending=Reflect.apply(resolvedFetch,globalThis,[target,options]);
    s.fetchInvoked=true; phase='NETWORK';
    const r=await pending;
    s.httpStatus=r.status; out.httpStatus=r.status; s.responseReceived=true; out.responseReceived=true;
    const body=(await r.text()).replace(/^\uFEFF/,'').trim();
    s.responseFormat=body.startsWith('<')?'xml-or-html':/^[\[{]/.test(body)?'json':'unknown';
    let json=null;
    try { json=JSON.parse(body); s.parserSuccess=json!==null && typeof json==='object'; } catch {}
    out.apiErrorCode=apiCode(json,body,out.provider);
    if (!r.ok) fail(out,`${name}_HTTP_ERROR`);
    if (!s.parserSuccess) fail(out,`${name}_PARSE_ERROR`);
    if (out.apiErrorCode) fail(out,`${name}_API_ERROR`);
    out.authSuccess=true;
    return json;
  } catch(e) {
    s.exceptionName=['TypeError','ReferenceError','RangeError','SyntaxError','AbortError','TimeoutError','Error'].includes(e?.name)?e.name:'Other';
    s.errorType=phase==='PREPARE'?`${name}_PREPARE_ERROR`:e instanceof DiagnosticError?e.code:controller?.signal.aborted?`${name}_TIMEOUT`:`${name}_${phase}_ERROR`;
    out.errorType=s.errorType; throw new DiagnosticError(s.errorType);
  } finally {
    if(timer!==undefined) clearTimeout(timer); s.elapsedMs=Date.now()-start;
    for(const k of ['requestPrepared','fetchFunctionAvailable','fetchInvoked','urlConstructed','abortControllerAvailable','exceptionName']) out[k]=s[k];
  }
}
function accept(out, summary, stage) {
  if (!summary) fail(out,`${stage}_PARSE_ERROR`);
  Object.assign(out,summary);
  if (!summary.observationCount) fail(out,`${stage}_EMPTY`);
  if (!summary.historyAvailable) fail(out,`${stage}_HISTORY_INSUFFICIENT`);
  out.errorType=null;
}
function url(base,path,params) { const u=new URL(path,base); for(const [k,v] of Object.entries(params)) u.searchParams.set(k,String(v)); return u; }
function decodeKey(value) { try {return /%[0-9a-f]{2}/i.test(value)?decodeURIComponent(value):value;} catch {throw new DiagnosticError('FSC_KEY_ENCODING_ERROR');} }
function compactDate(d) { return d.toISOString().slice(0,10).replaceAll('-',''); }
function monthsAgo(now,n) { const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-n,1)); d.setUTCDate(Math.min(now.getUTCDate(),new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate())); return d; }

async function fsc(out,key,ctx) {
  const rows=[]; let total=Infinity;
  // Bounded pagination covers 18 months; summarize all pages as one series.
  for(let page=1;page<=10 && rows.length<total;page++) {
    const json=await requestStage(out,'FSC_DATA',()=>{const now=ctx.now();return url(FSC_BASE,'getGrantingOfCreditBalanceInfo',{
      serviceKey:decodeKey(key),resultType:'json',pageNo:page,numOfRows:100,
      beginBasDt:compactDate(monthsAgo(now,18)),endBasDt:compactDate(now)});},ctx);
    if (String(json?.response?.header?.resultCode)!=='00') fail(out,'FSC_DATA_API_STATUS_MISSING');
    const raw=json?.response?.body?.items?.item;
    const batch=Array.isArray(raw)?raw:raw&&typeof raw==='object'?[raw]:null;
    if(!batch) fail(out,'FSC_DATA_PARSE_ERROR');
    rows.push(...batch); total=numeric(json.response.body.totalCount)??Infinity;
    if(batch.length<100) break;
  }
  accept(out,summarize(rows,'basDt','crdTrFingWhl','D'),'FSC_DATA');
  if(rows.length<total && rows.length>=1000) fail(out,'FSC_DATA_PAGE_LIMIT');
}

// Only metadata validated by DATA is cached. No values/keys are cached here.
// Isolate-local cache is temporary; persist reviewed identifiers in future config.
const verifiedKosis = {series:null,expires:0};
export function clearDiagnosticCache() { verifiedKosis.series=null; verifiedKosis.expires=0; }
function kosisArray(out,json,stage) { if(!Array.isArray(json)) fail(out,`${stage}_PARSE_ERROR`); return json; }
function selectedKosis(out,s) { Object.assign(out,{selectedOrgId:s.orgId,selectedTableId:s.tblId,selectedItemId:s.itmId,selectedObjectId:s.objL1,prdSe:s.prdSe}); }
async function kosisRequest(out,stage,prepare,ctx) {
  try { return await requestStage(out,stage,prepare,ctx); }
  catch(e) {
    if(e instanceof DiagnosticError && out.apiErrorCode==='30' && e.code===`${stage}_API_ERROR`) fail(out,`${stage}_NO_DATA`);
    throw e;
  }
}
// KOSIS official devGuide_0201List: objL1 required; objL2..objL8 optional.
// ITM rows with OBJ_ID=ITEM are metrics, not classification dimensions.
export function kosisDimensions(rows) {
  const groups=new Map();
  for(const r of rows) {
    if(r.OBJ_ID==='ITEM'||!id(r.OBJ_ID)) continue;
    if(!groups.has(r.OBJ_ID)) groups.set(r.OBJ_ID,[]);
    groups.get(r.OBJ_ID).push(r);
  }
  if(!groups.size) throw new DiagnosticError('KOSIS_OBJ_NO_DIMENSIONS');
  if(groups.size>8) throw new DiagnosticError('KOSIS_OBJ_TOO_MANY_DIMENSIONS');
  // OBJ_ID_SN orders classification values, not dimensions. Preserve the
  // metadata's classification-group order rather than treating value ranks as levels.
  return [...groups].map(([objId,group],index)=>{
    const values=group.filter(r=>id(r.ITM_ID)).sort((a,b)=>{
      const rank=r=>numeric(r.OBJ_ID_SN)??Number.MAX_SAFE_INTEGER;
      return rank(a)-rank(b)||a.ITM_ID.localeCompare(b.ITM_ID);
    });
    if(!values.length) throw new DiagnosticError('KOSIS_OBJ_NO_VALID_VALUE');
    const byId=new Map(values.map(r=>[r.ITM_ID,r]));
    const depth=r=>{
      const seen=new Set();let n=0,current=r;
      while(current && id(current.UP_ITM_ID) && byId.has(current.UP_ITM_ID)) {
        if(seen.has(current.ITM_ID)) throw new DiagnosticError('KOSIS_OBJ_HIERARCHY_UNRESOLVED');
        seen.add(current.ITM_ID);current=byId.get(current.UP_ITM_ID);n++;
      }
      return n;
    };
    for(const r of values) depth(r);
    const hasChildren=r=>values.some(c=>c.UP_ITM_ID===r.ITM_ID);
    const total=values.find(r=>/^(전체|계|총계|합계|전국)$/.test(text(r.ITM_NM)??''));
    const leaves=values.filter(r=>!hasChildren(r)).sort((a,b)=>depth(a)-depth(b));
    const chosen=total??leaves[0]??values[0];
    const hierarchyKnown=values.every(r=>Object.hasOwn(r,'UP_ITM_ID'));
    return {order:index+1,objId,objName:text(group[0].OBJ_NM),
      selectedValueId:chosen.ITM_ID,selectedValueName:text(chosen.ITM_NM),
      selectionReason:total?'EXPLICIT_TOTAL':leaves.length?'TOP_LEVEL_VALUE':'FIRST_VALID_VALUE',
      hierarchyStatus:hasChildren(chosen)?'HAS_CHILDREN':hierarchyKnown?'LEAF_IN_METADATA':'UNKNOWN',
      queryability:'UNVERIFIED_UNTIL_DATA',orderSource:'METADATA_GROUP_ORDER'};
  });
}
function kosisDimensionDiagnostics(out,dimensions) {
  Object.assign(out,{dimensionCount:dimensions.length,dimensions,
    generatedObjLevels:dimensions.map(d=>`objL${d.order}`)});
}
// Inspect shape only: never expose payload values or arbitrary key text.
export function parseKosisPrd(payload) {
  const object=v=>v!==null && typeof v==='object' && !Array.isArray(v);
  const has=(v,k)=>object(v)&&Object.hasOwn(v,k);
  const record=v=>has(v,'PRD_SE')||has(v,'PRD_DE');
  const keys=v=>object(v)?Object.keys(v).slice(0,20).map(k=>
    /^(?:PRD_SE|PRD_DE|prdSe|prdDe|err|errMsg|row|items|result)$/.test(k)?k:'[UNRECOGNIZED_KEY]'):[];
  const first=Array.isArray(payload)?payload[0]:payload;
  const records=Array.isArray(payload)?payload.filter(record):record(payload)?[payload]:[];
  const diagnostics={prdPayloadType:Array.isArray(payload)?'ARRAY':object(payload)?'OBJECT':'OTHER',
    prdTopLevelKeys:keys(payload),prdRecordCount:records.length,prdFirstRecordKeys:keys(records[0]??first),
    prdHasUppercasePrdSe:has(records[0]??first,'PRD_SE'),prdHasUppercasePrdDe:has(records[0]??first,'PRD_DE'),
    prdHasLowercasePrdSe:has(records[0]??first,'prdSe'),prdHasLowercasePrdDe:has(records[0]??first,'prdDe')};
  const errorType=Array.isArray(payload)&&!payload.length?'KOSIS_PRD_NO_DATA':
    !records.length || (Array.isArray(payload)&&records.length!==payload.length)?'KOSIS_PRD_SCHEMA_UNRECOGNIZED':null;
  return {records,diagnostics,errorType};
}
// PRD_SE/PRD_DE come exclusively from getMeta&type=PRD.
// Current KOSIS request codes: devGuide_0201List.do (period information).
const KOSIS_REQUEST_PERIODS=['M','D','Q','S','Y','F','IR'];
export function canonicalKosisPeriod(value) {
  const code=typeof value==='string'?value.trim().toUpperCase():null;
  if(code==='A') return 'Y'; // Annual output alias; request code is Y.
  return KOSIS_REQUEST_PERIODS.includes(code)?code:null;
}
export function kosisPeriods(rows) {
  const rawPeriodCodes=[...new Set(rows.map(r=>typeof r.PRD_SE==='string' && /^[A-Za-z \t]{1,16}$/.test(r.PRD_SE)?r.PRD_SE:r.PRD_SE==null?'[MISSING]':'[UNRECOGNIZED_VALUE]'))];
  const normalizedPeriodCodes=[...new Set(rows.map(r=>canonicalKosisPeriod(r.PRD_SE)).filter(Boolean))];
  const unrecognizedPeriodCodes=rawPeriodCodes.filter(c=>!canonicalKosisPeriod(c));
  const selectedPrdSe=KOSIS_REQUEST_PERIODS.find(p=>normalizedPeriodCodes.includes(p))??null;
  const selectedRawPrdSe=rows.find(r=>selectedPrdSe && canonicalKosisPeriod(r.PRD_SE)===selectedPrdSe)?.PRD_SE??null;
  return {rawPeriodCodes,normalizedPeriodCodes,unrecognizedPeriodCodes,
    supportedPrdSe:normalizedPeriodCodes,selectedRawPrdSe,selectedPrdSe,requestPrdSe:selectedPrdSe,
    periodNormalizationApplied:rows.some(r=>canonicalKosisPeriod(r.PRD_SE)&&r.PRD_SE!==canonicalKosisPeriod(r.PRD_SE)),
    monthlyAvailable:normalizedPeriodCodes.includes('M'),
    metadataDates:rows.filter(r=>selectedPrdSe && canonicalKosisPeriod(r.PRD_SE)===selectedPrdSe&&text(r.PRD_DE)).map(r=>r.PRD_DE)};
}
function periodDiagnostics(out,p) {
  const {metadataDates,...diagnostics}=p;
  Object.assign(out,diagnostics);
}
function summarizeKosis(rows,cycle,metadataDates) {
  if(['M','D','Q','Y','A'].includes(cycle)) return summarize(rows,'PRD_DE','DT',cycle,'UNIT_NM');
  // Unknown calendar encodings must match official PRD metadata exactly.
  // Map the ordered metadata periods to neutral ranks for the shared validator.
  const dates=[...new Set(metadataDates.filter(d=>/^\d{4,12}$/.test(d)))].sort();
  const mapped=rows.filter(r=>dates.includes(r.PRD_DE)).map(r=>({...r,_rank:String(dates.indexOf(r.PRD_DE)+1).padStart(4,'0')}));
  const result=summarize(mapped,'_rank','DT','Y','UNIT_NM');
  result.observationDate=result.observationDate?dates[Number(result.observationDate)-1]:null;
  return result;
}
async function kosisData(out,key,s,ctx,periodInfo) {
  const json=await kosisRequest(out,'KOSIS_DATA',()=>url(KOSIS_BASE,'Param/statisticsParameterData.do',{
    method:'getList',apiKey:key,format:'json',jsonVD:'Y',...s,newEstPrdCnt:13}),ctx);
  const rows=kosisArray(out,json,'KOSIS_DATA').map(r=>({...r,PRD_SE:canonicalKosisPeriod(r.PRD_SE)}));
  // Keep a single verified dimension tuple, never merge different series by date.
  const matched=rows.filter(r=>r.ORG_ID===s.orgId && r.TBL_ID===s.tblId && r.ITM_ID===s.itmId && r.PRD_SE===s.prdSe && Array.from({length:8},(_,i)=>i+1).every(i=>s[`objL${i}`] ? r[`C${i}`]===s[`objL${i}`] : !r[`C${i}`]));
  accept(out,summarizeKosis(matched,s.prdSe,periodInfo.metadataDates),'KOSIS_DATA');
  selectedKosis(out,s);
  out.latestObservationDate=out.observationDate;
  periodDiagnostics(out,periodInfo);
}
async function kosis(out,key,ctx) {
  if(verifiedKosis.series && verifiedKosis.expires>Date.now()) {
    try { await kosisData(out,key,verifiedKosis.series,ctx,verifiedKosis.periodInfo); kosisDimensionDiagnostics(out,verifiedKosis.dimensions); return; }
    catch(e) {clearDiagnosticCache();throw e;}
  }
  const found=await requestStage(out,'KOSIS_SEARCH',()=>url(KOSIS_BASE,'statisticsSearch.do',{
    method:'getList',apiKey:key,format:'json',jsonVD:'Y',searchNm:'소비자동향',sort:'DATE',startCount:1,resultCount:3}),ctx);
  const tables=kosisArray(out,found,'KOSIS_SEARCH'); out.metadataCount+=tables.length;
  // Keep only public metadata in memory; do not store keys or observation values.
  const candidates=tables.slice(0,3).map((r,candidateIndex)=>({candidateIndex,...Object.fromEntries(
    ['ORG_ID','TBL_ID','TBL_NM','STAT_ID','STRT_PRD_DE','END_PRD_DE','REC_TBL_SE'].map(k=>[k,r[k]??null]))}))
    .filter(r=>id(r.ORG_ID)&&id(r.TBL_ID)&&!/국제|북한/.test(r.TBL_NM??''));
  out.candidateCount=candidates.length;out.candidatesTried=0;out.candidateDiagnostics=[];
  if(!candidates.length) fail(out,'KOSIS_SEARCH_EMPTY');
  for(const table of candidates) {
  out.candidatesTried++;
  Object.assign(out,{dimensionCount:0,dimensions:[],generatedObjLevels:[],supportedPrdSe:[],selectedPrdSe:null,monthlyAvailable:false,latestObservationDate:null});
  const stageStart=out.stages.length;
  const diagnostic={candidateIndex:table.candidateIndex,orgId:table.ORG_ID,tableId:table.TBL_ID,stages:[],apiErrorCode:null,errorType:null};
  out.candidateDiagnostics.push(diagnostic);
  Object.assign(out,{observationCount:0,recordCount:0,parserSuccess:false,observationDate:null,unit:null,unitSource:null,historyAvailable:false,nullOrMissing:null,errorType:null,apiErrorCode:null});
  try {
  const base={orgId:table.ORG_ID,tblId:table.TBL_ID};
  // Official ITM metadata combines classifications and items. OBJ is a diagnostic
  // stage, not a type=OBJ operation. Discover IDs from returned metadata.
  const meta=(extra)=>url(KOSIS_BASE,'statisticsData.do',{method:'getMeta',apiKey:key,format:'json',jsonVD:'Y',...base,...extra});
  const all=kosisArray(out,await kosisRequest(out,'KOSIS_ITM',()=>meta({type:'ITM'}),ctx),'KOSIS_ITM');
  out.metadataCount+=all.length;
  const metric=all.find(r=>r.OBJ_ID==='ITEM' && id(r.ITM_ID));
  if(!metric) fail(out,'KOSIS_ITM_NOT_FOUND');
  const objects=kosisArray(out,await kosisRequest(out,'KOSIS_OBJ',()=>meta({type:'ITM'}),ctx),'KOSIS_OBJ');
  out.metadataCount+=objects.length;
  let dimensions;
  try { dimensions=kosisDimensions(objects); }
  catch(e) { if(e instanceof DiagnosticError) fail(out,e.code); throw e; }
  kosisDimensionDiagnostics(out,dimensions);
  diagnostic.dimensions=dimensions;diagnostic.dimensionCount=dimensions.length;
  const prdPayload=await requestStage(out,'KOSIS_PRD',()=>meta({type:'PRD'}),ctx);
  const parsedPrd=parseKosisPrd(prdPayload);
  Object.assign(out,parsedPrd.diagnostics);Object.assign(diagnostic,parsedPrd.diagnostics);
  if(parsedPrd.errorType) fail(out,parsedPrd.errorType);
  const periods=parsedPrd.records;
  let periodInfo;
  try {periodInfo=kosisPeriods(periods);} catch(e) {if(e instanceof DiagnosticError) fail(out,e.code);throw e;}
  periodDiagnostics(out,periodInfo);
  periodDiagnostics(diagnostic,periodInfo);
  if(!periodInfo.requestPrdSe) fail(out,'KOSIS_PRD_NO_DATA');
  const s={...base,itmId:metric.ITM_ID,...Object.fromEntries(dimensions.map(d=>[`objL${d.order}`,d.selectedValueId])),prdSe:periodInfo.requestPrdSe};
  await kosisData(out,key,s,ctx,periodInfo);
  verifiedKosis.periodInfo=periodInfo; verifiedKosis.series=s; verifiedKosis.dimensions=dimensions; verifiedKosis.expires=Date.now()+3600000;
  out.selectedCandidateIndex=table.candidateIndex;
  return;
  } catch(e) {
    diagnostic.apiErrorCode=out.apiErrorCode;diagnostic.errorType=out.errorType;
    // Auth, transport and malformed payload failures are not absent datasets.
    if(!(e instanceof DiagnosticError) || !/_(NO_DATA|NOT_FOUND|EMPTY|HISTORY_INSUFFICIENT|NO_DIMENSIONS|TOO_MANY_DIMENSIONS|NO_VALID_VALUE|HIERARCHY_UNRESOLVED)$/.test(e.code)) throw e;
  } finally {
    diagnostic.stages=out.stages.slice(stageStart).map(s=>({stage:s.stage,httpStatus:s.httpStatus,parserSuccess:s.parserSuccess,errorType:s.errorType}));
  }
  }
  Object.assign(out,{observationCount:0,recordCount:0,parserSuccess:false,observationDate:null,unit:null,unitSource:null,historyAvailable:false});
  fail(out,'KOSIS_NO_USABLE_CANDIDATE');
}

export function searchableTables(json) {
  const rows=wrapperRows(json,'StatisticTableList');
  return rows===null?null:rows.filter(r=>id(r.STAT_CODE)&&r.SRCH_YN==='Y'&&text(r.CYCLE));
}
export function usableItems(json) {
  const rows=wrapperRows(json,'StatisticItemList');
  return rows===null?null:rows.filter(r=>id(r.ITEM_CODE)&&text(r.CYCLE)&&text(r.START_TIME)&&text(r.END_TIME)
    && numeric(r.DATA_CNT)!==null && numeric(r.DATA_CNT)>0
    && !rows.some(c=>c.P_ITEM_CODE===r.ITEM_CODE && c.ITEM_CODE!==r.ITEM_CODE));
}
export function recentRange(item,now) {
  const cycle=item.CYCLE; const start=period(item.START_TIME,cycle), end=period(item.END_TIME,cycle);
  if(!start||!end||start>end) return null;
  const today=compactDate(now); let cap,lower;
  if(cycle==='D') {cap=today;lower=compactDate(monthsAgo(now,18));}
  else if(cycle==='M') {cap=today.slice(0,6);lower=compactDate(monthsAgo(now,18)).slice(0,6);}
  else if(cycle==='Q') {cap=`${today.slice(0,4)}Q${Math.floor(now.getUTCMonth()/3)+1}`;lower=`${now.getUTCFullYear()-3}Q1`;}
  else if(['A','Y'].includes(cycle)) {cap=today.slice(0,4);lower=String(now.getUTCFullYear()-12);}
  else return null;
  const high=end<cap?end:cap;
  // Anchor old series' recent range to their observed END_TIME, not wall clock.
  if(high<lower) lower=cycle==='D'?`${Number(high.slice(0,4))-2}0101`:cycle==='M'?`${Number(high.slice(0,4))-2}01`:cycle==='Q'?`${Number(high.slice(0,4))-3}Q1`:String(Number(high)-12);
  const low=start>lower?start:lower;
  return low<=high?{start:low,end:high,cycle}:null;
}
async function bok(out,key,ctx) {
  const endpoint=(name,args)=>new URL(`${name}/${[key,'json','kr',...args].map(encodeURIComponent).join('/')}/`,BOK_BASE);
  const tablesJson=await requestStage(out,'BOK_TABLE',()=>endpoint('StatisticTableList',[1,1000]),ctx);
  const tableRows=wrapperRows(tablesJson,'StatisticTableList');
  if(!tableRows) fail(out,'BOK_TABLE_PARSE_ERROR');
  out.metadataCount=tableRows.length;
  const candidates=searchableTables(tablesJson).sort((a,b)=>Number(/환율|금리|심리/.test(b.STAT_NAME??''))-Number(/환율|금리|심리/.test(a.STAT_NAME??''))).slice(0,10);
  if(!candidates.length) fail(out,'BOK_TABLE_EMPTY');
  out.candidateFailures=[];
  for(let index=0;index<candidates.length;index++) {
    const table=candidates[index]; out.selectedStatCode=table.STAT_CODE;
    try {
      const itemJson=await requestStage(out,'BOK_ITEM',()=>endpoint('StatisticItemList',[1,1000,table.STAT_CODE]),ctx);
      const items=usableItems(itemJson);
      if(!items) fail(out,'BOK_ITEM_PARSE_ERROR');
      out.metadataCount+=wrapperRows(itemJson,'StatisticItemList').length;
      const item=items.find(r=>recentRange(r,ctx.now()));
      if(!item) fail(out,items.length && items.every(r=>!['A','Y','Q','M','D'].includes(r.CYCLE))?'BOK_ITEM_CYCLE_UNSUPPORTED':'BOK_ITEM_NOT_FOUND');
      out.selectedItemCode=item.ITEM_CODE; out.cycle=item.CYCLE;
      const range=recentRange(item,ctx.now());
      const json=await requestStage(out,'BOK_DATA',()=>endpoint('StatisticSearch',[1,1000,table.STAT_CODE,range.cycle,range.start,range.end,item.ITEM_CODE]),ctx);
      accept(out,parseBok(json,item.CYCLE),'BOK_DATA'); return;
    } catch(e) {
      if(!(e instanceof DiagnosticError)) throw e;
      out.candidateFailures.push({statCode:table.STAT_CODE,candidateIndex:index,stage:out.stage,errorType:e.code});
    }
  }
  fail(out,out.errorType??'BOK_CANDIDATES_EXHAUSTED');
}

export async function runProvider(provider,key,context={}) {
  const out=initial(provider),started=Date.now();
  const ctx={fetch:globalThis.fetch,now:()=>new Date(),...context};
  out.secretPresent=typeof key==='string'&&key.trim().length>0;
  if(!out.secretPresent) {out.errorType='SECRET_MISSING';return out;}
  try {await ({FSC:fsc,KOSIS:kosis,BOK:bok})[provider](out,key,ctx);}
  catch(e) {out.errorType=e instanceof DiagnosticError?e.code:'INTERNAL_DIAGNOSTIC_ERROR';}
  out.elapsedMs=Date.now()-started;out.technicalValidationSuccess=success(out);
  // Final defense: only serialized summaries are emitted, never upstream data.
  const secrets=[key];try{secrets.push(decodeURIComponent(key));}catch{}
  const safe=JSON.parse(JSON.stringify(out,(_k,v)=>typeof v==='string'&&secrets.some(s=>s&&v.includes(s))?'[REDACTED]':v));
  return safe;
}
let lastRunAt=0;
export async function phase1KoreaDataCheck(request,env) {
  const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'};
  if(request.method!=='GET') return new Response(null,{status:405,headers:{...headers,Allow:'GET'}});
  if(Date.now()-lastRunAt<10000) return Response.json({errorType:'RATE_LIMITED'},{status:429,headers:{...headers,'Retry-After':'10'}});
  lastRunAt=Date.now();
  const providers=['FSC','KOSIS','BOK'];
  const settled=await Promise.allSettled(providers.map(p=>runProvider(p,env[`${p}_API_KEY`])));
  const response={schemaVersion:2,diagnosticOnly:true};
  for(let i=0;i<providers.length;i++) response[providers[i].toLowerCase()]=settled[i].status==='fulfilled'?settled[i].value:{...initial(providers[i]),errorType:'INTERNAL_DIAGNOSTIC_ERROR'};
  return Response.json(response,{headers});
}
