// R55: private, pure market-cap star preview. No public-reader integration.
// Consumes only the R54 acceptance result: no market-cap calculation or provider request.
// The returned mode/status are deliberately incompatible with the public HTML reader.
const DATE=/^20\d\d-\d\d-\d\d$/;
const ROW=/^<article class="mc-row mc-vendor-row" data-search="([a-z0-9.\-]{1,12}) [^"]*">/;
const IMPACT=/<div class=mc-importance aria-label="중요도 ([123])">(★{1,3})<\/div>/g;
const MAX_EVENTS=5000;
const empty=(status,reason,stats={})=>({status,reason,readOnly:true,providerRequests:0,dbWrites:0,d1Writes:0,publicStarsChanged:false,publishReady:false,shadow:null,...stats});
const dayValid=s=>typeof s==='string'&&DATE.test(s)&&!Number.isNaN(Date.parse(`${s}T00:00:00Z`))&&new Date(`${s}T00:00:00Z`).toISOString().slice(0,10)===s;

export function buildMarketCapShadowPreview(display,gradeResult){
 if(display?.status!=='READY_DISPLAY'||display.mode!=='OWN_SITE_HTML_ONLY'||display.rawVendorJsonExposed!==false||display.publicJsonFeed!==false||display.redistribution!==false||
 !Array.isArray(display.coveredDays)||display.coveredDays.length!==14||!display.byDay||typeof display.byDay!=='object'||
 !Number.isInteger(display.recordCount)||display.recordCount<0||display.recordCount>MAX_EVENTS){
  return empty('R55_SOURCE_CONTRACT_STOP','DISPLAY_CONTRACT_INVALID');
 }
 const dates=display.coveredDays;
 if(new Set(dates).size!==14||dates.some((d,i)=>!dayValid(d)||(i>0&&dates[i-1]>=d))){
  return empty('R55_SOURCE_CONTRACT_STOP','DISPLAY_DATES_INVALID');
 }
 const validGrades=gradeResult?.status==='R54_OFFLINE_GATE_COMPLETE'&&gradeResult.publishReady===false&&
  Array.isArray(gradeResult.items)&&Number.isInteger(gradeResult.accepted)&&Number.isInteger(gradeResult.unverified)&&
  gradeResult.accepted+gradeResult.unverified===gradeResult.items.length&&gradeResult.publicStarsChanged===false;
 if(!validGrades)return empty('R55_GATE_CLOSED','R54_NOT_ACCEPTED');
 const gradeByTicker=new Map(),ambiguous=new Set();
 for(const item of gradeResult.items){
  const t=item?.ticker;
  if(typeof t!=='string'||!(/^[A-Z0-9.\-]{1,12}$/).test(t))return empty('R55_GATE_CLOSED','R54_ITEM_INVALID');
  if(gradeByTicker.has(t)){ambiguous.add(t);continue;}
  gradeByTicker.set(t,item);
 }
 if(ambiguous.size)return empty('R55_GATE_CLOSED','R54_DUPLICATE_TICKERS');
 const seenByIssuer=new Map();
 for(const item of gradeByTicker.values()){
  if(item.status!=='VALIDATED_CANDIDATE_ONLY')continue;
  if(![1,2,3].includes(item.stars)||typeof item.issuerId!=='string'||!/^[0-9]{10}$/.test(item.issuerId))return empty('R55_GATE_CLOSED','R54_GRADE_INVALID');
  const prior=seenByIssuer.get(item.issuerId);
  if(prior&&prior!==item.stars)return empty('R55_GATE_CLOSED','R54_ISSUER_GRADE_CONFLICT');
  seenByIssuer.set(item.issuerId,item.stars);
 }
 let total=0,missing=0,changed=0;
 const counts={1:0,2:0,3:0}, preview={};
 for(const date of dates){
  const rows=display.byDay[date];
  if(!Array.isArray(rows)||rows.length>MAX_EVENTS)return empty('R55_SOURCE_CONTRACT_STOP','DISPLAY_DAY_INVALID');
  const next=[];
  for(const html of rows){
   total++;
   if(total>MAX_EVENTS||typeof html!=='string'||html.length>1600||!html.endsWith('</article>'))return empty('R55_SOURCE_CONTRACT_STOP','DISPLAY_ROW_INVALID');
   const m=ROW.exec(html);
   const matches=[...html.matchAll(IMPACT)];
   if(!m||matches.length!==1||matches[0][1].length!==matches[0][2].length||
      !html.includes('<span class=mc-tag-status>예정 · 미확정</span>'))return empty('R55_SOURCE_CONTRACT_STOP','DISPLAY_MARKUP_INVALID');
   const item=gradeByTicker.get(m[1].toUpperCase());
   if(!item||item.status!=='VALIDATED_CANDIDATE_ONLY'){missing++;continue;}
   const star=item.stars;
   if(![1,2,3].includes(star))return empty('R55_GATE_CLOSED','R54_STAR_INVALID');
   const newImportance=`<div class=mc-importance aria-label="중요도 ${star}">${'★'.repeat(star)}</div>`;
   const transformed=html.replace(IMPACT,newImportance);
   if(transformed.length>1600)return empty('R55_SOURCE_CONTRACT_STOP','DISPLAY_ROW_OVERSIZE');
   if(transformed!==html)changed++;
   counts[star]++;
   next.push(transformed);
  }
  preview[date]=next;
 }
 if(total!==display.recordCount)return empty('R55_SOURCE_CONTRACT_STOP','DISPLAY_RECORD_COUNT_MISMATCH');
 if(missing)return empty('R55_GATE_CLOSED','UNVERIFIED_ROWS', {totalRows:total,unverifiedRows:missing,verifiedRows:total-missing});
 // No existing row is silently downgraded to priority stars and no incomplete calendar is emitted.
 return empty('R55_PRIVATE_SHADOW_COMPLETE','NOT_AUTHORIZED_FOR_PUBLICATION',{
  totalRows:total,unverifiedRows:0,verifiedRows:total,changedRows:changed,
  countsByImportance:counts,
  shadow:{status:'PRIVATE_SHADOW_ONLY',mode:'NOT_PUBLICABLE_HTML',coveredDays:[...dates],recordCount:total,byDay:preview}
 });
}
