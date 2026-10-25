import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {save} from './d1.mjs';

const names={macro:'거시경제',macroCredit:'거시 신용',credit:'채권·신용',rates:'금리',supply:'공급',fundFlows:'자금흐름',bisDsr:'부채상환',bisTc:'부채 규모',earnings:'기업실적',consumption:'소비',breadth:'시장 폭',inflation:'물가',employment:'고용',growth:'경기',korea:'한국 시장','fear-greed':'미국 공포·탐욕','market-data':'경제 지표','core-pce':'근원 PCE',publication:'시장 점수 게시',collection:'자료 수집'};
const read=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
// WScript uses a fixed, UTF-16 script, not interpolated shell commands or raw errors.
export function launchLocalWarning(base){
 if(process.platform!=='win32')return {status:'PLATFORM_UNSUPPORTED'};
 const pidFile=path.join(base,'data-alert-window.json');
 const prior=read(pidFile,null);
 if(prior?.pid){try{process.kill(prior.pid,0);return {status:'WINDOW_ALREADY_OPEN'};}catch(error){if(error.code!=='ESRCH')return {status:'WINDOW_STATE_UNKNOWN'};}}
 const file=path.join(base,'data-alert-window.vbs');
 const detail=path.join(base,'data-alert-status.txt').replaceAll('"','""');
 const script='MsgBox "ZGMINI 자료 수집 또는 게시 오류가 감지되었습니다." & vbCrLf & "기존 정상 자료의 유효기간은 연장하지 않습니다." & vbCrLf & "상세 기록: '+detail+'", 48, "ZGMINI 데이터 경고"\r\n';
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
 const previous=state.active[key];
 let changed=false;
 if(failed){
  const detail=sourceDiagnostic?.provider==='BLS'&&Number.isInteger(sourceDiagnostic.attempts)
   ?`BLS 응답 ${Number.isInteger(sourceDiagnostic.httpStatus)?sourceDiagnostic.httpStatus:'통신 실패'} · ${Math.min(2,Math.max(1,sourceDiagnostic.attempts))}회 시도`:null;
  state.active[key]={since:previous?.since??now,lastSeen:now,label:names[key],...(detail?{detail}:{})};
  if(!previous){state.events.push({at:now,key,status:'FAILED_BLOCKED'});changed=true;}
 }else if(previous){delete state.active[key];state.events.push({at:now,key,status:'RECOVERED'});changed=true;}
 state.events=state.events.slice(-200);
 save(file,state);
 const active=Object.values(state.active);
 const text=active.length
  ?'ZGMINI 데이터 경고\r\n'+active.map(x=>`${x.label}: 수집 또는 게시 실패. ${x.detail??''} 최초 감지 ${new Date(x.since).toLocaleString('ko-KR')}`).join('\r\n')+'\r\n빈 응답·불완전 점수의 반영을 차단합니다. 정상 자료의 유효기간은 연장하지 않습니다.\r\n'
  :'ZGMINI: 감지된 수집·게시 경고가 모두 해소되었습니다.\r\n';
 fs.writeFileSync(path.join(base,'data-alert-status.txt'),'\ufeff'+text,'utf8');
 let delivery=null;
 if(changed&&failed){try{delivery=notify(base);}catch{delivery={status:'WINDOW_FAILED'};}save(path.join(base,'data-alert-delivery.json'),{...delivery,at:now});}
 return {active:active.length,changed,delivery};
}
export function alertCollectionReport(base,report,notify){
 const failed=['ERROR','FAILED','SOURCE_FAILED','CONFIGURATION_MISSING'].includes(report.status);
 const success=['COMPLETE','WAITING_PUBLICATION'].includes(report.status);
 if(report.job||report.lane==='korea'){
  if(failed||success)updateDataAlert(base,{key:report.job??'korea',failed,sourceDiagnostic:report.sourceDiagnostic},notify);
 }
 for(const feed of report.feeds??[])if(['FAILED','COMPLETE'].includes(feed.status))
  updateDataAlert(base,{key:feed.key,failed:feed.status==='FAILED'},notify);
}
