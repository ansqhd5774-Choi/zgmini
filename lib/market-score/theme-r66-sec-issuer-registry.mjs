/** R66 offline research registry, not a price or ETF-holdings data feed.
 * Fund identities are grounded in public SEC filing indexes (497/NPORT/N-CSRS).
 * A 497 registration is NOT a security-holdings observation or daily PIT.
 * Does not call providers, score, store to DB, or authorize publication.
 */
export const R66_VERSION='THEME-R66-21-ETF-SEC-SERIES-CLASS-RESEARCH-V1';
const E={
  CIBR:['0001364608','S000050385','C000159087'],
  BUG:['0001432353','S000066713','C000214985'],
  GNOM:['0001432353','S000062676','C000203266'],
  ARKG:['0001579982','S000042975','C000133119'],
  NLR:['0001137360','S000018475','C000051121'],
  URA:['0001432353','S000029442','C000090393'],
  BOTZ:['0001432353','S000054693','C000171853'],
  ROBO:['0001452937','S000042659','C000131868'],
  SMH:['0001137360','S000034411','C000105869'],
  SOXX:['0001100663','S000004354','C000012084'],
  DRIV:['0001432353','S000061415','C000198888'],
  SKYY:['0001364608','S000033237','C000102221'],
  CLOU:['0001432353','S000065121','C000210838'],
  IBB:['0001100663','S000004350','C000012080'],
  HERO:['0001432353','S000066518','C000214539'],
  ESPO:['0001137360','S000062930','C000203937'],
  FINX:['0001432353','S000054691','C000171851'],
  ARKF:['0001579982','S000064752','C000209702'],
  ITA:['0001100663','S000009423','C000025777'],
  SHLD:['0001432353','S000081193','C000243865'],
  BLOK:['0001633061','S000061158','C000198131'],
};
const P=[
 ['사이버보안','CIBR','BUG'],['AI 신약개발','GNOM','ARKG'],['원전·SMR','NLR','URA'],
 ['로봇·자동화','BOTZ','ROBO'],['AI 반도체','SMH','SOXX'],['자율주행','DRIV','BOTZ'],
 ['클라우드·SaaS','SKYY','CLOU'],['바이오테크','IBB','GNOM'],['게임·e스포츠','HERO','ESPO'],
 ['핀테크','FINX','ARKF'],['방산','ITA','SHLD'],['블록체인·디지털자산','BLOK','ARKF']
];
export const R66_SEC_IDENTITIES=Object.freeze(Object.fromEntries(Object.entries(E).map(([ticker,[cik,seriesId,classId]])=>[ticker,Object.freeze({ticker,cik,seriesId,classId,sourceScope:'PUBLIC_SEC_REGISTRATION_IDENTITY_ONLY'})])));
export const R66_THEME_PAIRS=Object.freeze(P.map(([theme,a,b])=>Object.freeze({theme,etfs:Object.freeze([a,b])})));
const req=(cond,id)=>{if(!cond)throw Error('R66_'+id);};
export function auditR66IdentityBatch({r64=null}={}){
 const keys=Object.keys(R66_SEC_IDENTITIES);
 req(keys.length===21&&R66_THEME_PAIRS.length===12,'COUNT_DRIFT');
 const classes=new Set(),series=new Set(),issuers=new Map();
 for(const [ticker,id] of Object.entries(R66_SEC_IDENTITIES)){
  req(/^[A-Z]{2,5}$/.test(ticker)&&/^\d{10}$/.test(id.cik)&&/^S\d{9}$/.test(id.seriesId)&&/^C\d{9}$/.test(id.classId),'IDENTIFIER_FORMAT');
  req(!classes.has(id.classId)&&!series.has(id.seriesId),'DUPLICATE_SEC_FUND_IDENTITY');
  classes.add(id.classId);series.add(id.seriesId);
  const arr=issuers.get(id.cik)??[];arr.push(ticker);issuers.set(id.cik,arr);
 }
 req(issuers.size===7,'REGISTRANT_COUNT_DRIFT');
 const used=new Set();const seenTheme=new Set();
 for(const p of R66_THEME_PAIRS){
  req(!seenTheme.has(p.theme)&&p.etfs.length===2&&p.etfs[0]!==p.etfs[1],'THEME_PAIR_INVALID');
  seenTheme.add(p.theme);
  for(const ticker of p.etfs){req(keys.includes(ticker),'MISSING_ETF_IDENTITY');used.add(ticker);}
 }
 req(used.size===21,'UNUSED_OR_UNREGISTERED_ETF');
 if(r64!==null){
  req(r64.version==='THEME-R64-12-THEME-OFFLINE-MVP-READINESS-V1'&&r64.items?.length===12,'R64_REQUIRED');
  const map=new Map(r64.items.map(x=>[x.theme,x]));req(map.size===12,'R64_THEME_DUPLICATE');
  for(const p of R66_THEME_PAIRS)req(JSON.stringify(map.get(p.theme)?.etfs)===JSON.stringify(p.etfs),'R64_PAIR_MISMATCH');
  req(r64.validatedFiveAxisScores===0&&r64.publishedThemes===0,'R64_PREMATURE_PUBLISH');
 }
 const grouped=[...issuers.entries()].map(([cik,tickers])=>Object.freeze({cik,etfs:Object.freeze(tickers),count:tickers.length})).sort((a,b)=>b.count-a.count||a.cik.localeCompare(b.cik));
 return Object.freeze({version:R66_VERSION,registeredEtfs:21,themePairs:12,registrants:7,registeredThemes:12,
   issuerGroups:Object.freeze(grouped),identityCoverage:'21_OF_21',holdingsSnapshotRowsParsed:0,
   dailyPITVerified:0,priceVolumeSeriesRecovered:0,reference756Verified:0,
   calculatedFiveAxisThemes:0,publishedThemes:0,status:'OFFICIAL_FUND_IDENTITIES_ONLY_NO_SCORE_OR_PUBLICATION'});
}
