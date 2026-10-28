// Public news is a separate, rights-gated display projection, not an R3/R5 score input.
import {validSourceRightsNews} from './news-source-rights-r2.mjs';
export const IRAN_NEWS_DISPLAY_VERSION='IRAN_NEWS_DISPLAY_R1';
export const IRAN_NEWS_DISPLAY_KEY='public:iran-progress:news:iran:r1';
export const NEWS_DISPLAY_DAYS=14;
export const NEWS_PC_RETENTION_DAYS=30;
const DAY_MS=86400000;
const IMPACTS=new Set(['positive','negative','neutral']);
const DATE_PATTERN=/^\d{4}-\d{2}-\d{2}$/;

export function kstNewsDay(time=Date.now()){
 if(!Number.isSafeInteger(time)||!Number.isFinite(new Date(time).getTime()))throw Error('NEWS_TIME_INVALID');
 return new Date(time+9*3600000).toISOString().slice(0,10);
}
export function kstDayWindow(time=Date.now(),days=NEWS_DISPLAY_DAYS){
 if(!Number.isInteger(days)||days<1||days>366)throw Error('NEWS_WINDOW_INVALID');
 const end=kstNewsDay(time);
 const start=new Date(Date.parse(end+'T00:00:00Z')-(days-1)*DAY_MS).toISOString().slice(0,10);
 return {start,end};
}
function urlValid(sourceUrl){
 try{const u=new URL(sourceUrl);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&u.hostname==='www.gov.uk'&&u.pathname.startsWith('/government/');}
 catch{return false;}
}
function validPublishedAt(value,now){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value))return false;
 const at=Date.parse(value);
 return Number.isSafeInteger(at)&&new Date(at).toISOString()===new Date(value).toISOString()&&at<=now;
}
export function validNewsDisplayItem(item,now=Date.now()){
 if(!item||typeof item!=='object'||Array.isArray(item))return false;
 return typeof item.id==='string'&&/^[a-f0-9]{64}$/.test(item.id)
  &&(item.source==='GOV.UK'?(urlValid(item.sourceUrl)&&
   item.rightsVerified!==false&&item.displayEligible!==false):validSourceRightsNews(item,now))
  &&typeof item.title==='string'&&item.title.trim().length>0&&item.title.length<=500
  &&typeof item.summary==='string'&&item.summary.trim().length>0&&item.summary.length<=1000
  &&IMPACTS.has(item.impact)
  &&validPublishedAt(item.publishedAt,now);
}
export function visibleIranNewsItems(items,{now=Date.now(),days=NEWS_DISPLAY_DAYS}={}){
 if(!Array.isArray(items))throw Error('NEWS_ITEMS_INVALID');
 const {start,end}=kstDayWindow(now,days),seen=new Set();
 return items.filter(item=>{
  if(!validNewsDisplayItem(item,now))return false;
  const date=kstNewsDay(Date.parse(item.publishedAt));
  if(date<start||date>end||seen.has(item.id))return false;
  seen.add(item.id);return true;
 }).sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.id.localeCompare(b.id));
}
export function validIranNewsSnapshot(body,{now=Date.now()}={}){
 return Boolean(body&&body.version===IRAN_NEWS_DISPLAY_VERSION&&body.status==='READY'
  &&Number.isSafeInteger(body.publishedAt)&&body.publishedAt<=now&&body.publishedAt>0
  &&body.asOfDate===kstNewsDay(body.publishedAt)&&body.displayDays===NEWS_DISPLAY_DAYS
  &&Array.isArray(body.items)&&body.items.length===body.itemCount
  &&body.items.every(item=>validNewsDisplayItem(item,body.publishedAt)));
}
export function buildIranNewsSnapshot(items,{now=Date.now()}={}){
 const visible=visibleIranNewsItems(items,{now});
 return {version:IRAN_NEWS_DISPLAY_VERSION,status:'READY',publishedAt:now,
  asOfDate:kstNewsDay(now),displayDays:NEWS_DISPLAY_DAYS,itemCount:visible.length,items:visible};
}
export function readIranNewsSnapshot(body,{now=Date.now()}={}){
 if(!validIranNewsSnapshot(body,{now}))throw Error('NEWS_PUBLIC_SNAPSHOT_INVALID');
 const items=visibleIranNewsItems(body.items,{now});
 return {version:body.version,status:now-body.publishedAt>DAY_MS?'UPDATE_DELAYED':'READY',
  publishedAt:body.publishedAt,asOfDate:kstNewsDay(now),displayDays:NEWS_DISPLAY_DAYS,
  itemCount:items.length,items};
}
