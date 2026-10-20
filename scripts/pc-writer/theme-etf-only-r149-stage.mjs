import {THEME_ETF_ONLY_PAIRS,THEME_ETF_ONLY_PUBLIC_VERSION,THEME_ETF_ONLY_METHOD} from '../../worker/theme-etf-only-public.mjs';

// Pure private candidate adapter for verified R145 7x252 research outputs.
// No file I/O, fetch, D1 writes, scheduled tasks, publication, or rights escalation.
const assert=(ok,reason)=>{if(!ok)throw Error('THEME_R149_'+reason)};
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'));
const score=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
export function makeThemeEtfOnlyResearchCandidate(report,{sourceStoredAt,sourceVersion}={}){
 assert(report?.status==='PRIVATE_252_RESEARCH_READY_NO_PUBLICATION'&&report.etf252Ready===13&&report.themes252Ready===7,'R145_SHADOW_NOT_COMPLETE');
 assert(report?.weights?.trend===.4&&report?.weights?.relativeStrength===.2&&report?.weights?.volatility===.4&&report?.pairWeight===.5,'WEIGHT_DRIFT');
 assert(report.individualStocksUsed===0&&report.scoreMethod==='ETF_ONLY_PROXY','ETF_ONLY_REQUIRED');
 assert(report.upstreamThirdPartyCommercialRightsVerified===false&&report.adjustedCloseVerified===false,'UNEXPECTED_UPSTREAM_ATTESTATION');
 assert(date(report.observationDate)&&typeof sourceVersion==='string'&&sourceVersion.length>0&&typeof sourceStoredAt==='string'&&Number.isFinite(Date.parse(sourceStoredAt)),'SOURCE_PROVENANCE_REQUIRED');
 assert(Array.isArray(report.themes)&&report.themes.length===7,'THEME_COUNT');
 const themes=report.themes.map((row,i)=>{
  const pair=THEME_ETF_ONLY_PAIRS[i];
  assert(row.theme===pair.theme&&JSON.stringify(row.etfs)===JSON.stringify(pair.etfs),'PAIR_DRIFT');
  assert(row.status==='RESEARCH_252_READY_NOT_PUBLIC'&&row.validPoints===252&&Array.isArray(row.days)&&row.days.length===252,'MISSING_252');
  const history=row.days.map(d=>{assert(date(d.date)&&score(d.score),'INVALID_DAILY_SCORE');return {date:d.date,score:d.score}});
  assert(history.at(-1).date===report.observationDate&&Math.abs(history.at(-1).score-row.latestScore)<.00001,'LATEST_DRIFT');
  assert(history.every((d,j)=>j===0||d.date>history[j-1].date),'DATES_INVALID');
  return {theme:pair.theme,etfs:[...pair.etfs],latestScore:row.latestScore,history};
 });
 const dates=themes[0].history.map(p=>p.date);
 assert(themes.every(t=>t.history.every((d,i)=>d.date===dates[i])),'THEME_DATE_DRIFT');
 return {version:THEME_ETF_ONLY_PUBLIC_VERSION,status:'CANDIDATE_RESEARCH_NOT_APPROVED',methodologyVersion:THEME_ETF_ONLY_METHOD,
  publicationAuthorized:false,upstreamCommercialRightsVerified:false,derivedLicenseVerified:report.derivedProviderLicenseExists===true,
  individualStocksUsed:0,scoreMethod:'ETF_ONLY_PROXY',sourcePriceMode:'UNADJUSTED_HOURLY_CLOSE_PROXY_DISCLOSED',
  observationDate:report.observationDate,sourceVersion,sourceStoredAt,publishedAt:null,
  weights:{trend:.4,relativeStrength:.2,volatility:.4},pairWeight:.5,themes};
}
