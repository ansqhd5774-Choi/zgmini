// R38: strictly read-only inspection of the existing PC public calendar snapshot.
// Does not read credentials, request providers, modify SQLite, publish or run tasks.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';

const base=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`;
const dbPath=path.join(base,'storage','core.sqlite');
const out=path.join(process.cwd(),'MARKET_CALENDAR_R38_CENSUS_INVENTORY_RESULT.txt');
const report={audit:'MARKET_CALENDAR_R38_CENSUS_INVENTORY',at:new Date().toISOString(),
 mode:'READ_ONLY',providerRequests:0,d1Writes:0,dbMutations:0,
 status:'NOT_CHECKED',decision:'NOT_DECIDED'};
const norm=e=>String(e.title??'').split(' · ')[0].replace(/\s+/g,' ').trim();
const targets=[
 {id:'durable-goods',name:'내구재 주문(속보)',pattern:/^Advance Report on Durable Goods\b/i},
 {id:'housing-starts-permits',name:'주택착공·건축허가',pattern:/^New Residential Construction\b/i},
 {id:'new-home-sales',name:'신규주택판매',pattern:/^New Residential Sales\b/i},
 {id:'construction-spending',name:'건설지출',pattern:/^Construction Spending\b/i},
 {id:'business-inventories',name:'기업재고·판매',pattern:/^Manufacturing and Trade: Inventories and Sales\b/i},
];
const newCandidates=[
 {id:'initial-claims',name:'주간 신규 실업수당 청구건수',pattern:/\b(?:initial unemployment claims|initial claims|unemployment insurance weekly claims)\b/i},
 {id:'ism-manufacturing',name:'ISM 제조업 PMI',pattern:/\bISM\b.*\bmanufacturing\b.*\bPMI\b/i},
 {id:'ism-services',name:'ISM 서비스업 PMI',pattern:/\bISM\b.*\bservices\b.*\bPMI\b/i},
 {id:'michigan-sentiment',name:'미시간대 소비자심리지수',pattern:/\b(?:university of michigan|surveys of consumers|michigan consumer sentiment)\b/i},
 {id:'conference-board-confidence',name:'Conference Board 소비자신뢰지수',pattern:/\bconference board\b.*\bconsumer confidence\b/i},
];
export function inventory(body,storedAt,now=Date.now()){
 const events=Array.isArray(body?.events)?body.events:[];
 const census=events.filter(e=>e?.source==='census'&&typeof e.title==='string'&&typeof e.date==='string');
 const groups=new Map();
 for(const e of census){const name=norm(e);const g=groups.get(name)??{title:name,count:0,dates:new Set(),upcomingDates:new Set()};g.count++;g.dates.add(e.date);if(e.date>=new Date(now).toISOString().slice(0,10))g.upcomingDates.add(e.date);groups.set(name,g);}
 const categories=[...groups.values()].map(g=>({title:g.title,count:g.count,uniqueDays:g.dates.size,upcomingDays:g.upcomingDates.size,nextDate:[...g.upcomingDates].sort()[0]??null})).sort((a,b)=>b.count-a.count||a.title.localeCompare(b.title));
 const coverage=targets.map(t=>({id:t.id,name:t.name,count:census.filter(e=>t.pattern.test(norm(e))).length,
  found:census.some(e=>t.pattern.test(norm(e)))}));
 const other=newCandidates.map(t=>({id:t.id,name:t.name,
  matchingSavedEvents:events.filter(e=>t.pattern.test(String(e?.title??''))).length}));
 const bySource={};for(const e of events)if(typeof e?.source==='string')bySource[e.source]=(bySource[e.source]??0)+1;
 const checkedAt=body?.sources?.census?.checkedAt??null;
 const age=checkedAt?now-Date.parse(checkedAt):NaN;
 return {calendarStatus:body?.status??null,censusStatus:body?.sources?.census?.status??null,
  censusCheckedAt:checkedAt,calendarStoredAt:storedAt,
  freshness:!Number.isFinite(age)?'UNKNOWN':age<0?'FUTURE_CLOCK':age>48*3600000?'OLDER_THAN_48H':'WITHIN_48H',
  totalSavedEvents:events.length,censusEventCount:census.length,
  censusDistinctTitles:groups.size,censusTitleCounts:categories,
  previouslyProposedCensus:coverage,nonCensusCandidates:other,bySource};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!fs.existsSync(dbPath)){report.status='PC_DB_MISSING';report.decision='STOP_NO_DB';}
 else{
  let db;
  try{
   db=new DatabaseSync(dbPath,{readOnly:true});
   const row=db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key='release-calendar' AND snapshot_key='current'").get();
   if(!row){report.status='CALENDAR_OUTPUT_MISSING';report.decision='STOP_NO_SNAPSHOT';}
   else{Object.assign(report,inventory(JSON.parse(row.body),new Date(row.stored_at).toISOString()));
    report.status='READ_ONLY_RETRIEVED';report.decision=report.censusStatus==='READY'?'CENSUS_COVERAGE_REVIEW':'CENSUS_SOURCE_NOT_READY';}
  }catch{report.status='PC_DB_READ_FAILED';report.decision='STOP_DB_READ_ERROR';}
  finally{db?.close();}
 }
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n','utf8');
 console.log('R38='+report.status);
 console.log('RESULT='+out);
 if(report.status!=='READ_ONLY_RETRIEVED')process.exitCode=1;
}
