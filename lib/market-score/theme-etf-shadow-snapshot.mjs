import crypto from 'node:crypto';

// PC-local RESEARCH evidence ONLY. This module does not calculate a new formula,
// grant data rights, or authorize public scores. It validates existing R122 output.
const AXES=['trend','breadth','demand','relativeStrength','volatility'];
const WEIGHTS=[4,4,3,3,3];
const AS_OF='2026-10-16';
const VERSION='THEME-FG-R120-ETF-PAIR-FIVE-AXIS-RESEARCH-UNAPPROVED-V1';
const EXPECTED_R120_SHA='95ead758999a7ace7da6003460735345663a35ba00bf896d2d07f9ade830d7bd';
const EXPECTED=[
 ['로봇·자동화',['BOTZ','ROBO']],
 ['클라우드·SaaS',['SKYY','CLOU']],
 ['자율주행',['DRIV','BOTZ']],
 ['바이오테크',['IBB','GNOM']],
 ['원전·SMR',['NLR','URA']],
 ['방산',['ITA','SHLD']],
 ['핀테크',['FINX','ARKF']],
 ['사이버보안',['CIBR','BUG']],
];
const isDay=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const validScore=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const fail=s=>{throw new Error('THEME_SHADOW_SNAPSHOT_'+s);};
const requireValid=(x,s)=>{if(!x)fail(s);};
export const sha256=x=>crypto.createHash('sha256').update(x).digest('hex');
const calc=a=>AXES.reduce((sum,k,i)=>sum+WEIGHTS[i]*a[k],0)/17;
export function validateR122ResearchEvidence(source,{sourceSha256=null}={}){
 requireValid(source?.audit==='R122_EIGHT_THEME_252_SCORE_HISTORY_LOCAL_READONLY'&&source?.mode==='RESEARCH_SHADOW_NOT_AUTHORIZED_FOR_PUBLICATION','SOURCE_ID');
 requireValid(source.asOf===AS_OF,'ASOF_MISMATCH');
 requireValid(source?.checks?.eightThemes===8&&source.checks.historyPointsPerTheme===252&&source.checks.totalScorePoints===2016&&source.checks.referenceDaysPerTheme===756,'COUNT_CONTRACT');
 requireValid(source.checks.allScoresMatchR120===true&&source.checks.allHistoryPointsRecalculated===true&&source.checks.allChronological===true&&source.checks.gameEsportsDeferred===true,'VERIFICATION_FLAGS');
 requireValid(source?.input?.r9GroupCount===10&&source.input.etfCount===17&&source.input.r120SourceReportSha256===EXPECTED_R120_SHA,'PROVENANCE');
 requireValid(source?.contract?.formulaApproved===false&&source.contract.commercialPublicationRightsVerified===false&&source.contract.publicScores===0,'PUBLICATION_CONTRACT');
 requireValid(source?.safety?.providerCalls===0&&source.safety.networkCalls===0&&source.safety.dbWrites===0&&source.safety.publicWrites===0,'SAFETY_CONTRACT');
 requireValid(Array.isArray(source.results)&&source.results.length===8,'EIGHT_THEMES');
 requireValid(Array.isArray(source.blocked)&&source.blocked.length===1&&source.blocked[0]?.theme==='게임·e스포츠'&&source.blocked[0]?.code==='R116_ZERO_TOTAL_ETF_TURNOVER_2024-10-03','DEFERRED_EXACT');
 const normalized=[];
 const seen=new Set(); let globalDates=null;
 for(const [theme,etfs] of EXPECTED){
  const row=source.results.find(x=>x.theme===theme);
  requireValid(row&&!seen.has(row.theme)&&JSON.stringify(row.etfs)===JSON.stringify(etfs),'PAIR_MISMATCH'); seen.add(theme);
  requireValid(row.asOf===AS_OF&&row.referenceDays===756&&row.historyCount===252&&row.firstDate==='2025-10-16'&&row.lastDate===AS_OF,'HISTORY_DECLARATION');
  requireValid(row.researchOnly===true&&row.productionEligible===false,'RESEARCH_ONLY');
  requireValid(Array.isArray(row.history252)&&row.history252.length===252,'HISTORY_LENGTH');
  const history=[];let previous='';
  for(let i=0;i<252;i++){
   const p=row.history252[i];
   requireValid(isDay(p?.date)&&p.date>previous,'DATE_ORDER');previous=p.date;
   requireValid(p.axes&&AXES.every(k=>validScore(p.axes[k])),'AXIS_RANGE');
   requireValid(validScore(p.score)&&Math.abs(calc(p.axes)-p.score)<1e-9,'WEIGHTED_SCORE');
   history.push({date:p.date,score:p.score,axes:Object.fromEntries(AXES.map(k=>[k,p.axes[k]]))});
  }
  requireValid(history[0].date==='2025-10-16'&&history.at(-1).date===AS_OF,'HISTORY_ENDPOINTS');
  requireValid(validScore(row.latestShadowScore)&&Math.abs(row.latestShadowScore-history.at(-1).score)<1e-9,'LATEST_SCORE');
  const dates=history.map(x=>x.date);
  if(globalDates===null)globalDates=dates;
  else requireValid(dates.every((d,i)=>d===globalDates[i]),'CALENDAR_MISMATCH');
  normalized.push({theme,etfs,asOf:AS_OF,referenceDays:756,historyCount:252,latestShadowScore:row.latestShadowScore,history252:history});
 }
 requireValid(seen.size===8,'UNKNOWN_THEME');
 requireValid(sourceSha256===null||/^[0-9a-f]{64}$/.test(sourceSha256),'SOURCE_SHA_INVALID');
 return {snapshotKind:'THEME_ETF_FIVE_AXIS_LOCAL_SHADOW',status:'RESEARCH_ONLY_NOT_FOR_PUBLICATION',
  formulaVersion:VERSION,formulaApproved:false,commercialRightsVerified:false,publicScore:null,
  sourceVersion:'R122_LOCAL_READONLY_FROM_R120_ETF_ONLY_RESEARCH',sourceSha256,sourceStoredAt:null,
  priorR120ReportSha256:EXPECTED_R120_SHA,observationDate:AS_OF,scoreHistoryLength:252,referenceDays:756,
  passedThemes:8,observations:2016,results:normalized,
  blocked:[{theme:'게임·e스포츠',etfs:['HERO','ESPO'],code:'R116_ZERO_TOTAL_ETF_TURNOVER_2024-10-03'}],
  publication:{authorized:false,api:false,d1:false,sourceSync:false,scheduler:false},
  note:'PC local research evidence only. A validated shadow output is not licensed for commercial publication.'};
}
