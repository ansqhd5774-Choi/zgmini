import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {openStore,hash} from './store.mjs';
import {interpretSource,ARTICLE_PROMPT_VERSION,ARTICLE_INFERENCE,articleEvidenceBlocks} from './ai.mjs';
import {POLICIES,ARTICLE_TEXT_VERSION,officialArticlePolicy,parseOfficialArticle,discoverOfficialArticles,fetchOfficialText,textOnly} from './article-text-r14.mjs';
import {hasMatchingArticleEvaluation} from './evaluate-article-ai-r14.mjs';
const HOUR=3600000;
export const ARTICLE_ANALYSIS_VERSION='IRAN_FULL_ARTICLE_ANALYSIS_R14';
const FEEDS={mofa:'https://www.mofa.go.jp/press/release/index.html',govuk:'https://www.gov.uk/search/news-and-communications.atom?keywords=Iran&order=updated-newest'};
function safeReason(e){const s=String(e?.message??'');return e?.name==='TimeoutError'?'ARTICLE_EXECUTION_TIMEOUT':/^(?:ARTICLE|AI|OLLAMA)_[A-Z0-9_]+$/.test(s)?s:'ARTICLE_ANALYSIS_UNAVAILABLE';}
function putSourceReadback(store,id,body,now){store.putSource(id,body,now);if(store.db.prepare('SELECT body FROM sources WHERE id=?').get(id)?.body!==JSON.stringify(body))throw Error('ARTICLE_SOURCE_READBACK_FAILED');}
export function articleParts(text){
 if(text.length<=12000)return [text];
 const parts=[];let part='';
 for(const block of articleEvidenceBlocks(text)){
  if(part&&part.length+1+block.text.length>11000){parts.push(part);part='';}
  part+=part?' '+block.text:block.text;
 }
 if(part)parts.push(part);
 if(parts.join(' ')!==text||parts.length>6)throw Error('ARTICLE_PARTITION_INVALID');return parts;
}
export async function interpretStoredArticle({store,sourceId,article,model,modelDigest,fetcher,interpreter=interpretSource}={}){
 const parts=articleParts(article.text),results=[];
 for(let i=0;i<parts.length;i++){
  const identity={sourceId,partIndex:i,partHash:hash(parts[i]),model,modelDigest,promptVersion:ARTICLE_PROMPT_VERSION,inferenceConfig:ARTICLE_INFERENCE};
  const id='article-ai-part:'+hash(identity),old=parts.length>1?store.db.prepare('SELECT body FROM decisions WHERE id=?').get(id):null;
  let result;
  if(old)result=JSON.parse(old.body);
  else{result=await interpreter(parts[i],{model,modelDigest,now:Date.now(),mode:'FULL_ARTICLE_TEXT',fetcher});
   if(parts.length>1){result={...result,sourceId,partIndex:i,partCount:parts.length,sourceLevel:'ARTICLE_PART_TEXT',eventVerification:'PENDING'};store.putDecision(id,result,result.interpretedAt);
    if(store.db.prepare('SELECT body FROM decisions WHERE id=?').get(id)?.body!==JSON.stringify(result))throw Error('ARTICLE_PART_READBACK_FAILED');}
  }
  if(result.sourceHash!==hash(parts[i])||[...result.candidates,...(result.scopeRejectedCandidates??[])].some(c=>!parts[i].includes(c.quote)))throw Error('ARTICLE_PART_SOURCE_MISMATCH');results.push(result);
 }
 const candidates=[...new Map(results.flatMap((r,i)=>r.candidates.map(c=>({...c,partIndex:i}))).map(c=>[hash([c.quote,c.type,c.claimStatus]),c])).values()];
 const scopeRejectedCandidates=results.flatMap((r,i)=>(r.scopeRejectedCandidates??[]).map(c=>({...c,partIndex:i})));
 const final={...results.at(-1),sourceHash:article.textHash,sourceLevel:'FULL_ARTICLE_TEXT',partCount:parts.length,partHashes:parts.map(hash),candidates,scopeRejectedCandidates,interpretedAt:Date.now()};delete final.partIndex;return final;
}
async function rightsReceipt(store,site,fetcher,now){
 const cp=store.getCheckpoint('article-rights:'+site);
 if(cp?.checkedAt<=now&&now-cp.checkedAt<7*24*HOUR){
  const row=store.db.prepare('SELECT body FROM sources WHERE id=?').get(cp.sourceId);
  if(row){const b=JSON.parse(row.body);if(cp.sourceId==='article-rights:'+hash(b)&&b.site===site&&b.policy===POLICIES[site].name&&b.commercialReuseConfirmed===true)return cp.sourceId;}
 }
 const p=POLICIES[site],notice=await fetchOfficialText(p.notice,{fetcher}),license=await fetchOfficialText(p.license,{fetcher});
 const n=textOnly(notice),l=textOnly(license);
 const valid=site==='mofa'?/Public Data License \(Version 1.0\)/.test(n)&&/Commercial use of/.test(l)&&/also permitted/.test(l)&&/cite the source/i.test(n)
  :/Open Government Licence/.test(n)&&/commercially/i.test(l)&&/acknowledge/i.test(l)&&/version\/3\//.test(notice);
 if(!valid)throw Error('ARTICLE_RIGHTS_POLICY_CHANGED');
 const body={version:'IRAN_ARTICLE_RIGHTS_R14',site,policy:p.name,noticeUrl:p.notice,licenseUrl:p.license,noticeHash:hash(notice),licenseHash:hash(license),commercialReuseConfirmed:true,textOnlyScope:true,thirdPartyContentExcluded:true,attribution:p.attribution};
 const id='article-rights:'+hash(body);putSourceReadback(store,id,body,now);store.checkpoint('article-rights:'+site,{sourceId:id,checkedAt:now});return id;
}
export function articleAnalysisInstallReady(report){return report?.version===ARTICLE_ANALYSIS_VERSION&&report.sourceLevel==='FULL_ARTICLE_TEXT'
 &&report.publication==='NOT_REQUESTED'&&report.reports?.some(r=>r.status==='CANDIDATE_ONLY'&&r.storageVerified===true&&r.characters>=100);}
export async function processOfficialArticles({store,maxArticles=2,fetcher=fetch,interpreter=interpretSource,now=Date.now(),model='qwen3:4b',urls=null,delay=ms=>new Promise(r=>setTimeout(r,ms)),requireEvaluation=false}={}){
 if(!store||!Number.isSafeInteger(now)||!Number.isInteger(maxArticles)||maxArticles<1||maxArticles>3)throw Error('ARTICLE_ANALYSIS_ARGS_INVALID');
 const report={version:ARTICLE_ANALYSIS_VERSION,promptVersion:ARTICLE_PROMPT_VERSION,startedAt:now,sourceLevel:'FULL_ARTICLE_TEXT',model,feeds:[],reports:[],eventVerified:false,coverageVerified:false,scoreInputVerified:false,publication:'NOT_REQUESTED'};
 let modelDigest;
 try{
  const r=await fetcher('http://127.0.0.1:11434/api/tags',{redirect:'error',signal:AbortSignal.timeout(5000)});
  if(!r.ok)throw Error('OLLAMA_TAGS_FAILED');
  const matches=(await r.json()).models?.filter(m=>m.name===model)??[];
  if(matches.length!==1||!matches[0].digest)throw Error('OLLAMA_MODEL_IDENTITY_AMBIGUOUS');modelDigest=matches[0].digest;
 }catch(e){return finish({status:'PENDING',reason:safeReason(e)});}
 report.modelDigest=modelDigest;
 if(requireEvaluation&&!hasMatchingArticleEvaluation(store,model,modelDigest))return finish({status:'PENDING',reason:'AI_MODEL_EVALUATION_REQUIRED'});
 const analysisIdentity=hash({model,modelDigest,promptVersion:ARTICLE_PROMPT_VERSION,inferenceConfig:ARTICLE_INFERENCE});
 let discovered=[];
 if(urls){if(!Array.isArray(urls)||urls.length>40)throw Error('ARTICLE_ANALYSIS_ARGS_INVALID');discovered=urls.map(u=>officialArticlePolicy(u).url);}
 else for(const [site,url] of Object.entries(FEEDS)){
  const old=store.getCheckpoint('article-feed:'+site);
  if(old?.retryAt>now){report.feeds.push({site,status:'DEFERRED',reason:old.reason});continue;}
  try{
   const html=await fetchOfficialText(url,{fetcher});const found=discoverOfficialArticles(html,{site});discovered.push(...found);
   const receipt={version:'IRAN_OFFICIAL_ARTICLE_DISCOVERY_R14',site,sourceUrl:url,bodyHash:hash(html),urls:found,coverageVerified:false};
   const id='article-discovery:'+hash(receipt);putSourceReadback(store,id,receipt,now);store.checkpoint('article-feed:'+site,{sourceId:id,checkedAt:now});
   report.feeds.push({site,status:'COLLECTED',articleUrls:found.length});
  }catch(e){const reason=safeReason(e);store.checkpoint('article-feed:'+site,{reason,retryAt:now+6*HOUR});report.feeds.push({site,status:'PENDING',reason});}
 }
 const oldQueue=store.getCheckpoint('article-queue-r14')?.items??[];
 const queue=new Map(oldQueue.map(i=>[i.url,i]));
 for(const u of new Set(discovered))if(!queue.has(u))queue.set(u,{url:u,lastAttemptAt:0,retryAt:0});
 // Bound execution, preserve unprocessed URLs; discovery is not an event observation window.
 const needsResume=i=>!!i.sourceId&&i.lastAnalysisIdentity!==analysisIdentity&&!i.blocked;
 const items=[...queue.values()].sort((a,b)=>Number(needsResume(b))-Number(needsResume(a))||a.lastAttemptAt-b.lastAttemptAt);
 const policies=new Map(),siteHolds=new Set();let attempted=0;
 for(const item of items){
  if(attempted>=maxArticles)break;if(urls&&!urls.includes(item.url))continue;
  const changedParser=['ARTICLE_PUBLICATION_DATE_INVALID','ARTICLE_PUBLICATION_DATE_MISSING','ARTICLE_CONTAINER_MISSING','ARTICLE_BODY_MARKER_MISSING','ARTICLE_TEXT_LENGTH_INVALID'].includes(item.reason)&&item.lastParserVersion!==ARTICLE_TEXT_VERSION;
  if((item.blocked&&!changedParser)||(item.retryAt>now&&!needsResume(item)&&!changedParser))continue;
  const site=officialArticlePolicy(item.url).site,siteCp=store.getCheckpoint('article-site:'+site);
  if(siteHolds.has(site)||siteCp?.retryAt>now||siteCp?.blocked)continue;attempted++;
  item.lastAttemptAt=now;item.retryAt=now+6*HOUR;
  if(changedParser)item.blocked=false;
  try{
   const policy=officialArticlePolicy(item.url);
   if(!policies.has(policy.site)){
    try{policies.set(policy.site,await rightsReceipt(store,policy.site,fetcher,now));}catch(e){policies.set(policy.site,{error:safeReason(e)});}
   }
   const rightsId=policies.get(policy.site);if(typeof rightsId!=='string')throw Error(rightsId.error);
   let sourceId,source;
   if(needsResume(item)){
    const row=store.db.prepare('SELECT body FROM sources WHERE id=?').get(item.sourceId);
    if(!row)throw Error('ARTICLE_STORED_SOURCE_MISSING');source=JSON.parse(row.body);sourceId=item.sourceId;
    if(source.sourceUrl!==item.url||source.sourceLevel!=='FULL_ARTICLE_TEXT'||hash(source.text)!==source.textHash||sourceId!=='official-article:'+hash(source))throw Error('ARTICLE_STORED_SOURCE_INVALID');
   }else{
    await delay(1000);
    const html=await fetchOfficialText(item.url,{fetcher});
    item.lastParserVersion=ARTICLE_TEXT_VERSION;
    source={...parseOfficialArticle(html,item.url),rightsReceiptId:rightsId};sourceId='official-article:'+hash(source);
   }
   const article=source,publishedAt=Date.parse(article.publishedDate);
   const today=Math.floor(now/(24*HOUR))*24*HOUR;
   if(publishedAt>today||publishedAt<today-30*24*HOUR)throw Error('ARTICLE_OUTSIDE_30_DAY_WINDOW');
   putSourceReadback(store,sourceId,source,now);item.sourceId=sourceId;
   const decisionId='article-ai:'+hash({sourceId,model,modelDigest,promptVersion:ARTICLE_PROMPT_VERSION,inferenceConfig:ARTICLE_INFERENCE});
   const old=store.db.prepare('SELECT body FROM decisions WHERE id=?').get(decisionId);
   if(old){report.reports.push({sourceId,status:'UNCHANGED',candidateCount:JSON.parse(old.body).candidates.length,characters:article.text.length,storageVerified:true});continue;}
   item.lastAnalysisIdentity=analysisIdentity;
   const interpreted=await interpretStoredArticle({store,sourceId,article,model,modelDigest,fetcher,interpreter});
   const decision={...interpreted,sourceId,sourceUrl:article.sourceUrl,publishedDate:article.publishedDate,sourceLevel:'FULL_ARTICLE_TEXT',eventVerification:'PENDING',scoreInputVerified:false,attribution:article.attribution};
   store.putDecision(decisionId,decision,decision.interpretedAt);
   if(store.db.prepare('SELECT body FROM decisions WHERE id=?').get(decisionId)?.body!==JSON.stringify(decision))throw Error('ARTICLE_DECISION_READBACK_FAILED');
   report.reports.push({sourceId,status:'CANDIDATE_ONLY',candidateCount:decision.candidates.length,characters:article.text.length,partCount:decision.partCount,storageVerified:true});
  }catch(e){item.reason=safeReason(e);
   if(['ARTICLE_HTTP_401','ARTICLE_HTTP_403','ARTICLE_HTTP_404','ARTICLE_RIGHTS_EXCEPTION','ARTICLE_RIGHTS_POLICY_CHANGED','ARTICLE_CONTAINER_MISSING','ARTICLE_BODY_MARKER_MISSING','ARTICLE_PUBLICATION_DATE_INVALID','ARTICLE_PUBLICATION_DATE_MISSING','ARTICLE_OUTSIDE_30_DAY_WINDOW','ARTICLE_IRAN_CONTENT_MISSING','ARTICLE_TEXT_LENGTH_INVALID'].includes(item.reason))item.blocked=true;
   if(item.reason==='ARTICLE_HTTP_429'){siteHolds.add(site);store.checkpoint('article-site:'+site,{reason:item.reason,retryAt:now+6*HOUR});}
   if(item.reason==='ARTICLE_RIGHTS_POLICY_CHANGED'){siteHolds.add(site);store.checkpoint('article-site:'+site,{reason:item.reason,blocked:true});}
   report.reports.push({sourceId:item.sourceId??null,status:'PENDING',reason:item.reason});}
 }
 store.checkpoint('article-queue-r14',{version:'IRAN_ARTICLE_QUEUE_R14',items,updatedAt:now,coverageVerified:false});
 return finish({status:report.reports.length&&report.reports.every(r=>['CANDIDATE_ONLY','UNCHANGED'].includes(r.status))?'ANALYSIS_COMPLETE':'PENDING',attempted,queueSize:items.length});
 function finish(extra){Object.assign(report,extra,{finishedAt:Date.now()});store.checkpoint('article-analysis-last-run-r14',report);return report;}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const args=process.argv.slice(2);if(args.some(a=>!/^--max=[1-3]$/.test(a)&&!a.startsWith('--url='))||args.filter(a=>a.startsWith('--url=')).length>3)throw Error('ARTICLE_ANALYSIS_ARGS_INVALID');
 const urls=args.filter(a=>a.startsWith('--url=')).map(a=>officialArticlePolicy(a.slice(6)).url);
 const base=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13'),file=path.join(base,'iran.sqlite');
 if(!fs.existsSync(file))throw Error('IRAN_SQLITE_NOT_FOUND');
 const store=openStore(file),owner=randomUUID();try{
  if(!store.claim(owner,Date.now()))console.log(JSON.stringify({status:'RUNNING',reason:'LEASE_HELD'}));
  else{const r=await processOfficialArticles({store,maxArticles:Number(args.find(a=>a.startsWith('--max='))?.slice(6)??2),urls:urls.length?urls:null});fs.writeFileSync(path.join(base,'article-analysis-last-run.json'),JSON.stringify(r,null,2));console.log(JSON.stringify(r));}
 }finally{store.release(owner);store.close();}
}
