// R40: inspect already-stored official calendar output; never mutate the DB or source events.
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
const HOME=process.env.ZGMINI_PC_HOME||'E:\\ZGmini\\data\\pc-writer';
const DB=path.join(HOME,'storage','core.sqlite');
const OUTPUT=path.join(path.dirname(fileURLToPath(import.meta.url)),'MARKET_CALENDAR_R40_OVERLAP_AUDIT_RESULT.txt');
const months='January February March April May June July August September October November December'.split(' ').join('|');
const monthTail=new RegExp('(?:\\s*[·,–-]\\s*|\\s*\\(\\s*)('+months+')\\s+(20\\d{2})(?:\\))?\\s*$','i');
const quarterTail=/(?:\s*[·,–-]\s*|\s*\(\s*)(?:([1-4])(?:st|nd|rd|th) Quarter|Q([1-4]))[ ,]+(20\d{2})\)?\s*$/i;
const normalized=s=>String(s??'').replace(/&amp;/gi,'&').replace(/&/g,' and ').replace(/\bU\.S\./gi,'US').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
export function identity(row){
 let title=String(row?.title??'').replace(/\s+/g,' ').trim(),period=null,m=title.match(monthTail);
 if(m){period=m[1].toLowerCase()+' '+m[2];title=title.slice(0,m.index).trim();}
 else if((m=title.match(quarterTail))){period='q'+(m[1]||m[2])+' '+m[3];title=title.slice(0,m.index).trim();}
 return {base:normalized(title),period};
}
export function auditOverlaps(events){
 const rows=(Array.isArray(events)?events:[]).filter(e=>e&&/^20\d\d-\d\d-\d\d$/.test(e.date)&&typeof e.source==='string'&&typeof e.title==='string'&&typeof e.id==='string');
 const groups=new Map(),bySource={},pairs=[],intra=[];
 for(const row of rows){
  const id=identity(row),key=row.date+':'+id.base;
  bySource[row.source]=(bySource[row.source]??0)+1;
  if(!id.base)continue;
  const group=groups.get(key)??[];
  group.push(row);groups.set(key,group);
 }
 const shown=e=>({source:e.source,id:e.id,date:e.date,title:e.title,period:identity(e).period});
 for(const group of groups.values()){
  for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){
   const a=group[i],b=group[j],x=identity(a),y=identity(b);
   const kind=a.source===b.source?'SAME_SOURCE':x.period&&y.period?(x.period===y.period?'EXACT_SAME_PERIOD':'DIFFERENT_PERIOD'):'PERIOD_UNVERIFIED';
   const pair={kind,day:a.date,base:x.base,a:shown(a),b:shown(b)};
   (kind==='SAME_SOURCE'?intra:pairs).push(pair);
  }
 }
 const rank={EXACT_SAME_PERIOD:0,PERIOD_UNVERIFIED:1,DIFFERENT_PERIOD:2};
 pairs.sort((a,b)=>(rank[a.kind]-rank[b.kind])||a.day.localeCompare(b.day)||a.base.localeCompare(b.base));
 const count=k=>pairs.filter(x=>x.kind===k).length;
 const sourcePairs={};
 for(const p of pairs){const k=[p.a.source,p.b.source].sort().join(' + ');sourcePairs[k]=(sourcePairs[k]??0)+1;}
 return {totalEvents:rows.length,censusEvents:rows.filter(x=>x.source==='census').length,bySource,sourcePairs,
  exactCrossSourcePairCount:count('EXACT_SAME_PERIOD'),reviewCrossSourcePairCount:count('PERIOD_UNVERIFIED'),
  confirmedDifferentPeriodPairCount:count('DIFFERENT_PERIOD'),sameSourceSameDayTitlePairCount:intra.length,
  crossSourcePairs:pairs.slice(0,160),crossSourcePairsTruncated:pairs.length>160,
  sameSourcePairs:intra.slice(0,40),sameSourcePairsTruncated:intra.length>40,
  verdict:pairs.length?'REVIEW_PAIR_DETAILS_BEFORE_UI_CHANGE':'NO_SAME_TITLE_CROSS_SOURCE_COLLISIONS'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report={audit:'MARKET_CALENDAR_R40_OVERLAP_AUDIT',at:new Date().toISOString(),mode:'READ_ONLY',providerRequests:0,d1Writes:0,dbMutations:0,status:'NOT_STARTED'};
 let db;
 try{
  if(!fs.existsSync(DB))throw Error('DATABASE_NOT_FOUND');
  db=new DatabaseSync(DB,{readOnly:true});
  const row=db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key='release-calendar' AND snapshot_key='current'").get();
  if(!row)throw Error('CALENDAR_SNAPSHOT_NOT_FOUND');
  const data=JSON.parse(row.body);
  Object.assign(report,auditOverlaps(data.events));
  report.storedAt=new Date(row.stored_at).toISOString();
  report.calendarStatus=data.status??null;report.censusStatus=data.sources?.census?.status??null;
  report.status='READ_ONLY_RETRIEVED';
 }catch(e){report.status='READ_FAILED';report.errorCode=['DATABASE_NOT_FOUND','CALENDAR_SNAPSHOT_NOT_FOUND'].includes(e.message)?e.message:'READ_OR_FORMAT_ERROR';process.exitCode=1;}
 finally{db?.close();fs.writeFileSync(OUTPUT,JSON.stringify(report,null,2)+'\n','utf8');console.log('R40='+report.status);console.log('RESULT='+OUTPUT);}
}
