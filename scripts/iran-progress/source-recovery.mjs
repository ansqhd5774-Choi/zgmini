// Source-recovery research only: no provider requests, no verification promotion.
const TYPES=Object.freeze(['export.CSV.zip','mentions.CSV.zip','gkg.csv.zip']);
const alternatives=Object.freeze({
 ukmto: Object.freeze([
  Object.freeze({id:'MARAD_MSCI_ALERTS',url:'https://www.maritime.dot.gov/msci-alerts',role:'INCIDENT_DISCOVERY_ONLY'}),
  Object.freeze({id:'MARAD_MSCI_ADVISORIES',url:'https://www.maritime.dot.gov/msci-advisories',role:'OFFICIAL_RISK_CONTEXT_ONLY'}),
  Object.freeze({id:'UKMTO_WEEKLY_REPORTS',url:'https://www.ukmto.org/ukmto-products/weekly-reports',role:'ACCESS_UNVERIFIED_RESEARCH_ONLY'}),
 ]),
 gdelt: Object.freeze([
  Object.freeze({id:'GDELT_2_EVENTS_ARCHIVE',url:'https://data.gdeltproject.org/gdeltv2/lastupdate.txt',role:'DISCOVERY_ONLY_NOT_VERIFIED_ATTACKS'}),
 ]),
});
const forbiddenOutcome=Object.freeze({attackCount:null,coverageVerified:false,eventVerified:false,productionEligible:false});
function stampToEpoch(value){
 if(!/^\d{14}$/.test(value))throw Error('GDELT_TIMESTAMP_INVALID');
 const iso=value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6,8)+'T'+value.slice(8,10)+':'+value.slice(10,12)+':'+value.slice(12,14)+'Z';
 const epoch=Date.parse(iso);
 if(!Number.isFinite(epoch)||new Date(epoch).toISOString()!==iso.slice(0,19)+'.000Z')throw Error('GDELT_TIMESTAMP_INVALID');
 return epoch;
}
export function parseGdeltArchiveManifest(raw){
 if(typeof raw!=='string'||raw.length>4096)throw Error('GDELT_MANIFEST_INVALID');
 const lines=raw.trim().split(/\r?\n/);
 if(lines.length!==3)throw Error('GDELT_MANIFEST_CARDINALITY');
 const archives=[];
 let at=null;
 for(let i=0;i<3;i++){
  const match=lines[i].trim().match(/^([1-9]\d{0,11}) ([a-f0-9]{31,32}) (https?:\/\/data\.gdeltproject\.org\/gdeltv2\/(\d{14})\.(export\.CSV\.zip|mentions\.CSV\.zip|gkg\.csv\.zip))$/);
  if(!match||match[5]!==TYPES[i])throw Error('GDELT_MANIFEST_SOURCE_INVALID');
  const epoch=stampToEpoch(match[4]);
  if(at!==null&&at!==epoch)throw Error('GDELT_MANIFEST_VERSION_MISMATCH');
  at=epoch;
  archives.push({type:TYPES[i],bytes:Number(match[1]),reportedMd5:match[2],checksumVerified:false,url:match[3],publishedAt:epoch});
 }
 return {status:'MANIFEST_ONLY',publishedAt:at,archives,discoveryOnly:true,...forbiddenOutcome};
}
export function inspectMaradAlertsListing(html){
 if(typeof html!=='string'||html.length>3000000)throw Error('MARAD_INDEX_INVALID');
 const plain=html.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
 if(!/Active Alerts/i.test(plain))return {status:'UNPARSEABLE',...forbiddenOutcome};
 if(/There are no active alerts at this time/i.test(plain))
  return {status:'NO_ACTIVE_ALERTS_LISTED',note:'Does not prove no maritime incidents',...forbiddenOutcome};
 return {status:'ALERT_DETAILS_REQUIRED',...forbiddenOutcome};
}
export function planIranSourceRecovery({sources={},discovery={}}={}){
 const ukmto=sources.ukmto??{};
 const u=ukmto.httpStatus===403?{status:'ACCESS_DENIED',reason:'UKMTO_403',alternatives:alternatives.ukmto}
  :ukmto.httpStatus===429?{status:'RATE_LIMITED',reason:'UKMTO_429',alternatives:alternatives.ukmto}
  :{status:'NO_ALTERNATE_SELECTED',reason:null,alternatives:[]};
 const gdelt=discovery.error==='GDELT_HTTP_429'?{
  status:'COOLDOWN_PRESERVED',reason:'GDELT_DOC_429',retryAt:discovery.retryAt??null,alternatives:alternatives.gdelt,
 }:{status:'NO_ALTERNATE_SELECTED',reason:null,alternatives:[]};
 return {ukmto:{...u,...forbiddenOutcome},gdelt:{...gdelt,...forbiddenOutcome},
  policy:'RESEARCH_ONLY_NO_NEW_PROVIDER_CALLS_NO_READY_PROMOTION_NO_SCORING_CHANGES'};
}
