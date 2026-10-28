import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {save} from './d1.mjs';
import {MARKET_COLLECTION_JOBS} from '../../worker/market-collection-jobs.mjs';

const names={macro:'거시경제',macroCredit:'거시 신용',credit:'채권·신용',rates:'금리',supply:'공급',fundFlows:'자금흐름',bisDsr:'부채상환',bisTc:'부채 규모',earnings:'기업실적',consumption:'소비',breadth:'시장 폭',inflation:'물가',employment:'고용',growth:'경기',korea:'한국 시장','fear-greed':'미국 공포·탐욕','market-data':'경제 지표','core-pce':'근원 PCE',publication:'시장 점수 게시',collection:'자료 수집'};
const read=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
export const COLLECTION_RECOVERY_POLICY=Object.freeze({intervalMs:5*60000,maxFailures:3,maxAgeMs:15*60000,healthyPublicationAgeMs:10*60000});
function writeState(base,state){
 state.version=2;state.events=state.events.slice(-200);save(path.join(base,'data-alert-state.json'),state);
 const active=Object.values(state.active),pending=Object.values(state.pending??{});
 const lines=[active.length?'ZGMINI 데이터 경고':pending.length?'ZGMINI 자동 복구 대기':'ZGMINI: 감지된 수집·게시 경고가 모두 해소되었습니다.'];
 for(const x of active)lines.push(`${x.label}: 수집 또는 게시 실패. ${x.detail??''} 최초 감지 ${new Date(x.since).toLocaleString('ko-KR')}`);
 for(const x of pending)lines.push(`${x.label}: 일시 통신 실패 ${x.failures}/${COLLECTION_RECOVERY_POLICY.maxFailures}회 · 자동 복구 대기 · 다음 확인 ${new Date(x.nextAttemptAt).toLocaleString('ko-KR')}`);
 if(active.length||pending.length)lines.push('빈 응답·불완전 점수의 반영을 차단합니다. 정상 자료의 유효기간은 연장하지 않습니다.');
 fs.writeFileSync(path.join(base,'data-alert-status.txt'),'\ufeff'+lines.join('\r\n')+'\r\n','utf8');
}
function healthyPublication(base,now){
 const report=read(path.join(base,'local-writer-last-run.json'),null),config=read(path.join(base,'config.json'),null),at=Date.parse(report?.at??'');
 return report?.status==='VERIFIED'&&report.market?.status==='VERIFIED'&&report.market?.readyDomains===12&&report.providerCalls===0&&
  typeof report.source==='string'&&report.source===config?.source&&Number.isFinite(at)&&now>=at&&now-at<COLLECTION_RECOVERY_POLICY.healthyPublicationAgeMs;
}
export function transientCollectionFailure(report){
 if(!MARKET_COLLECTION_JOBS.includes(report.job)||!['ERROR','FAILED','SOURCE_FAILED'].includes(report.status))return false;
 const statuses=Object.values(report.providers??{}).flatMap(x=>Object.entries(x.statuses??{})).filter(([,n])=>Number(n)>0);
 if(statuses.some(([s])=>s==='PROVIDER_QUOTA_GUARD'||/^[45]\d\d$/.test(s)&&!['500','502','503','504'].includes(s)))return false;
 const d=report.failureDiagnostic,source=report.sourceDiagnostic;
 const transport=['TimeoutError','AbortError'].includes(d?.name)||['ETIMEDOUT','ECONNRESET','ECONNREFUSED','ENOTFOUND','EAI_AGAIN','LOCAL_PROVIDER_NETWORK_ERROR','GROWTH_CENSUS_TRANSPORT_FAILED','GROWTH_CENSUS_HTTP_500','GROWTH_CENSUS_HTTP_502','GROWTH_CENSUS_HTTP_503','GROWTH_CENSUS_HTTP_504'].includes(d?.code);
 const retryHttp=status=>[500,502,503,504].includes(status);
 const fred=source?.provider==='FRED'&&source.failed?.length>0&&source.failed.every(x=>retryHttp(x.httpStatus)||x.httpStatus===null&&['TIMEOUT','ABORTED','ETIMEDOUT','ECONNRESET','ENOTFOUND','EAI_AGAIN','UND_ERR_CONNECT_TIMEOUT'].includes(x.networkCode));
 const bls=source?.provider==='BLS'&&retryHttp(source.httpStatus);
 const wiki=report.job==='earnings'&&source?.provider==='WIKIPEDIA'&&source.stage==='UNIVERSE_REQUEST'&&retryHttp(source.httpStatus)&&Number(report.providers?.['en.wikipedia.org']?.statuses?.[String(source.httpStatus)])>0;
 return (transport||fred||bls||wiki)&&statuses.some(([s])=>['NETWORK_ERROR','500','502','503','504'].includes(s));
}
function queueRecovery(base,report,now){
 const state=read(path.join(base,'data-alert-state.json'),{version:2,active:{},pending:{},events:[]});state.pending??={};
 const key=report.job,previous=state.pending[key],failures=(previous?.failures??0)+1,since=previous?.since??now;
 if(state.active[key]||!healthyPublication(base,now)||failures>=COLLECTION_RECOVERY_POLICY.maxFailures||now-since>=COLLECTION_RECOVERY_POLICY.maxAgeMs)return false;
 state.pending[key]={label:names[key],since,lastSeen:now,failures,nextAttemptAt:now+COLLECTION_RECOVERY_POLICY.intervalMs};
 state.events.push({at:now,key,status:'RECOVERY_PENDING',failures});writeState(base,state);return true;
}
// Called by the existing core lane. No extra daemon, remote write or unbounded retry.
export function dueCollectionRecovery(base,now=Date.now(),notify=launchLocalWarning){
 const state=read(path.join(base,'data-alert-state.json'),{active:{},pending:{},events:[]});
 const list=Object.entries(state.pending??{}).filter(([key])=>MARKET_COLLECTION_JOBS.includes(key)).sort((a,b)=>a[1].nextAttemptAt-b[1].nextAttemptAt);
 for(const [key,item] of list){
  if(now-item.since>=COLLECTION_RECOVERY_POLICY.maxAgeMs||!healthyPublication(base,now)){updateDataAlert(base,{key,failed:true,now},notify);return dueCollectionRecovery(base,now,notify);}
  if(item.nextAttemptAt<=now){item.nextAttemptAt=now+COLLECTION_RECOVERY_POLICY.intervalMs;writeState(base,state);return key;}
 }
 return null;
}
// WScript uses a fixed, UTF-16 script, not interpolated shell commands or raw errors.
export function launchLocalWarning(base){
 if(process.platform!=='win32')return {status:'PLATFORM_UNSUPPORTED'};
 const pidFile=path.join(base,'data-alert-window.json');
 const prior=read(pidFile,null);
 if(prior?.pid){try{process.kill(prior.pid,0);return {status:'WINDOW_ALREADY_OPEN'};}catch(error){if(error.code!=='ESRCH')return {status:'WINDOW_STATE_UNKNOWN'};}}
 const file=path.join(base,'data-alert-window.vbs');
 const detail=path.join(base,'data-alert-status.txt').replaceAll('"','""');
 const active=Object.values(read(path.join(base,'data-alert-state.json'),{active:{}}).active??{});
 const summary=active.map(x=>`${x.label}: ${x.detail??'실패 감지'}`).join(' / ').replace(/[\r\n]/g,' ').slice(0,600).replaceAll('"','""');
 const script='MsgBox "ZGMINI 자료 수집 또는 게시 오류가 감지되었습니다." & vbCrLf & "'+summary+'" & vbCrLf & "기존 정상 자료의 유효기간은 연장하지 않습니다." & vbCrLf & "상세 기록: '+detail+'", 48, "ZGMINI 데이터 경고"\r\n';
 fs.writeFileSync(file,Buffer.concat([Buffer.from([255,254]),Buffer.from(script,'utf16le')]));
 const child=spawn(path.join(process.env.SystemRoot??'C:\\Windows','System32','wscript.exe'),['//nologo',file],{windowsHide:true,detached:true,stdio:'ignore'});
 child.on('error',()=>{try{save(path.join(base,'data-alert-delivery.json'),{status:'WINDOW_FAILED',at:Date.now()});}catch{}});
 if(!child.pid)return {status:'WINDOW_FAILED'};
 save(pidFile,{pid:child.pid,at:Date.now()});child.unref();
 return {status:'WINDOW_STARTED'};
}
export function updateDataAlert(base,{key,failed,now=Date.now(),sourceDiagnostic=null},notify=launchLocalWarning){
 if(!Object.hasOwn(names,key))key='collection';
 const file=path.join(base,'data-alert-state.json');
 const state=read(file,{version:1,active:{},events:[]});
 state.pending??={};
 const previous=state.active[key];
 const pending=state.pending[key];delete state.pending[key];
 let changed=false;
 if(failed){
  const detail=sourceDiagnostic?.provider==='FRED'
   ?`FRED 필수 자료 ${Number.isSafeInteger(sourceDiagnostic.ready)?sourceDiagnostic.ready:'?'}/${Number.isSafeInteger(sourceDiagnostic.requested)?sourceDiagnostic.requested:'?'} · 누락 ${(sourceDiagnostic.missing??[]).filter(x=>/^[A-Z0-9]{1,32}$/.test(x)).join(', ')||'상세 기록 확인'}`
   :sourceDiagnostic?.provider==='BLS'&&Number.isInteger(sourceDiagnostic.attempts)
   ?`BLS 응답 ${Number.isInteger(sourceDiagnostic.httpStatus)?sourceDiagnostic.httpStatus:'통신 실패'} · ${Math.min(2,Math.max(1,sourceDiagnostic.attempts))}회 시도`
   :sourceDiagnostic?.provider==='WIKIPEDIA'&&sourceDiagnostic.stage==='UNIVERSE_REQUEST'&&Number.isInteger(sourceDiagnostic.httpStatus)
   ?`Wikipedia 구성종목 조회 HTTP ${sourceDiagnostic.httpStatus}`:null;
  state.active[key]={since:previous?.since??pending?.since??now,lastSeen:now,label:names[key],...(detail?{detail}:{})};
  if(!previous){state.events.push({at:now,key,status:'FAILED_BLOCKED'});changed=true;}
 }else if(previous||pending){delete state.active[key];state.events.push({at:now,key,status:'RECOVERED'});changed=true;}
 writeState(base,state);
 const active=Object.values(state.active);
 let delivery=null;
 if(changed&&failed){try{delivery=notify(base);}catch{delivery={status:'WINDOW_FAILED'};}save(path.join(base,'data-alert-delivery.json'),{...delivery,at:now});}
 return {active:active.length,changed,delivery};
}
export function alertCollectionReport(base,report,notify){
 const failed=['ERROR','FAILED','SOURCE_FAILED','CONFIGURATION_MISSING'].includes(report.status);
 const success=['COMPLETE','WAITING_PUBLICATION'].includes(report.status);
 if(report.job||report.lane==='korea'){
  const now=Number.isFinite(Date.parse(report.at))?Date.parse(report.at):Date.now();
  const deferred=failed&&transientCollectionFailure(report)&&queueRecovery(base,report,now);
  if((failed||success)&&!deferred)updateDataAlert(base,{key:report.job??'korea',failed,now,sourceDiagnostic:report.sourceDiagnostic},notify);
 }
 for(const feed of report.feeds??[])if(['FAILED','COMPLETE'].includes(feed.status))
  updateDataAlert(base,{key:feed.key,failed:feed.status==='FAILED'},notify);
}
