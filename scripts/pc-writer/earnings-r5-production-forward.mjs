import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {extractSecEpsGuidance,buildGuidanceShadowDiagnostic} from '../../lib/market-score/earnings-e1-r5-guidance-r2.mjs';
import {buildCfoSurveyPITRecord,compareCfoSurveyReleases} from '../../lib/market-score/earnings-e1-r5-cfo-survey-r1.mjs';

const finite=value=>typeof value==='number'&&Number.isFinite(value);
const clean=value=>String(value??'').trim();
const sha256=value=>createHash('sha256').update(value).digest('hex');
const padCik=value=>String(value??'').replace(/\D/g,'').padStart(10,'0');
export const E1_R5_CFO_PRODUCTION_HISTORY_VERSION='E1-R5-CFO-PRODUCTION-HISTORY-R1';

export function periodOrdinal(value){const match=String(value??'').match(/^(\d{4})Q([1-4])$/);return match?Number(match[1])*4+Number(match[2])-1:null;}
export function readCfoProductionHistory(document){
 if(document?.version!==E1_R5_CFO_PRODUCTION_HISTORY_VERSION||!Array.isArray(document?.rows))throw Error('CFO_PRODUCTION_HISTORY_INVALID');
 const rows=document.rows.filter(row=>/^\d{4}Q[1-4]$/.test(String(row?.period))&&/^\d{4}-\d{2}-\d{2}$/.test(String(row?.date))&&finite(Number(row?.s12b))).map(row=>({period:String(row.period),date:String(row.date),s12b:Number(row.s12b)})).sort((a,b)=>periodOrdinal(a.period)-periodOrdinal(b.period));
 if(rows.length<2)throw Error(`CFO_PRODUCTION_HISTORY_INSUFFICIENT:${rows.length}`);return rows;
}
export function currentCfoRevision(document,asOf){
 const input=Array.isArray(document)?document:Array.isArray(document?.releases)?document.releases:[],cutoff=Date.parse(asOf),byPeriod=new Map();
 for(const row of input.map(buildCfoSurveyPITRecord).filter(row=>row.status==='READY')){
  const release=Date.parse(clean(row.releaseAt)),stored=Date.parse(clean(row.storedAt));if(!Number.isFinite(release)||!Number.isFinite(stored)||release>cutoff||stored>cutoff)continue;
  const key=`${row.surveyYear}Q${row.surveyQuarter}`,prior=byPeriod.get(key);if(!prior||release>Date.parse(prior.releaseAt)||(row.releaseAt===prior.releaseAt&&stored>Date.parse(prior.storedAt)))byPeriod.set(key,row);
 }
 const periods=[...byPeriod.values()].sort((a,b)=>(a.surveyYear*4+a.surveyQuarter)-(b.surveyYear*4+b.surveyQuarter));if(periods.length<2)return null;
 const current=periods.at(-1),previous=periods.at(-2),comparison=compareCfoSurveyReleases(current,previous);if(comparison.status!=='READY')return null;
 return {period:`${current.surveyYear}Q${current.surveyQuarter}`,date:String(current.releaseAt).slice(0,10),s12b:comparison.raw};
}
function candidateKey(row){return [row?.periodKey,row?.metric,row?.basis,row?.unit].map(clean).join('|');}
function collapse(candidates){const byKey=new Map();for(const row of candidates??[]){if(row?.status!=='READY')continue;const key=candidateKey(row),range=[key,row.low,row.high].join('|');if(!byKey.has(key))byKey.set(key,new Map());byKey.get(key).set(range,row);}const ready=[],ambiguous=[];for(const [key,ranges] of byKey){if(ranges.size===1)ready.push([...ranges.values()][0]);else ambiguous.push(key);}return {ready,ambiguous};}
function availableAt(item){const raw=item?.acceptedAt??item?.filed;if(!raw)return null;const value=String(raw);if(/^\d{4}-\d{2}-\d{2}$/.test(value))return `${value}T23:59:59Z`;const ms=Date.parse(value);return Number.isFinite(ms)?new Date(ms).toISOString():null;}
function locateHistory(root,item){const out=[];for(const row of item?.sourceFiles??[]){const file=path.resolve(root,clean(row?.file)),base=path.resolve(root)+path.sep;if(!file.startsWith(base)||!fs.existsSync(file))return [];const bytes=fs.readFileSync(file),expected=clean(row?.sha256).toLowerCase();if(!/^[a-f0-9]{64}$/.test(expected)||sha256(bytes)!==expected)return [];out.push(bytes);}return out;}
function locateCurrent(root,item){const expected=clean(item?.sourceSha256).toLowerCase(),dir=path.join(root,'documents',padCik(item?.cik),clean(item?.accessionNumber).replaceAll('-',''));if(!fs.existsSync(dir)||!/^[a-f0-9]{64}$/.test(expected))return [];for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(!entry.isFile())continue;const bytes=fs.readFileSync(path.join(dir,entry.name));if(sha256(bytes)===expected)return [bytes];}return [];}
function parseSources(buffers,metadata){const all=[];for(const bytes of buffers){const parsed=extractSecEpsGuidance(bytes.toString('utf8'),metadata);for(const row of parsed?.candidates??[])all.push(row);}return collapse(all);}
export function buildGuidanceTimeline({root,checkpoint,ledger}){
 const byCik=new Map(),add=(item,buffers)=>{const at=availableAt(item);if(!at||!buffers.length)return;const cik=padCik(item?.cik),parsed=parseSources(buffers,{cik,accession:item?.accessionNumber,form:item?.form??'8-K',acceptedAt:at}),row={availableAt:at,accession:clean(item?.accessionNumber),candidates:parsed.ready,ambiguousKeys:parsed.ambiguous};if(!byCik.has(cik))byCik.set(cik,[]);byCik.get(cik).push(row);};
 for(const item of Object.values(ledger?.completed??{}))add(item,locateHistory(root,item));for(const item of Object.values(checkpoint?.completed??{}))add(item,locateCurrent(root,item));for(const rows of byCik.values())rows.sort((a,b)=>Date.parse(a.availableAt)-Date.parse(b.availableAt)||a.accession.localeCompare(b.accession));return byCik;
}
export function guidanceAsOf(timeline,asOf){
 const cutoff=Date.parse(`${asOf}T23:59:59Z`),pairs=[];
 for(const rows of timeline.values()){
  const eligible=rows.filter(row=>Date.parse(row.availableAt)<=cutoff);if(eligible.length<2)continue;const current=eligible.at(-1),priors=eligible.slice(0,-1).reverse(),found=[];
  for(const cur of current.candidates){const key=candidateKey(cur);let selected=null,blocked=false;for(const prior of priors){if(prior.ambiguousKeys.includes(key)){blocked=true;break;}const prev=prior.candidates.find(row=>candidateKey(row)===key);if(prev){selected={current:cur,previous:prev};break;}}if(selected&&!blocked)found.push(selected);}if(found.length===1)pairs.push(found[0]);
 }
 const diagnostic=buildGuidanceShadowDiagnostic(pairs);return {date:asOf,s12aRaw:diagnostic?.s12aRaw??null,s13Raw:diagnostic?.s13Raw??null,comparableCount:diagnostic?.comparableCount??0,directions:diagnostic?.directions??null};
}
