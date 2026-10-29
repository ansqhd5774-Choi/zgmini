// R69: inspect two approved existing Windows Scheduled Tasks and only the
// status-shaped fields of their latest local logs. No task writes or D1/API.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
export const R69_TASKS=Object.freeze([
  Object.freeze({name:'ZGMINI-PC-Theme-Nine-R47-Private',time:'11:30',
    action:'THEME_NINE_R48_PRIVATE_CYCLE.cmd',
    logFolder:'E:/ZGmini/data/pc-writer/theme-nine-r48',
    logPattern:/^THEME_NINE_R48_PRIVATE_CYCLE_\d+_\d+\.txt$/i}),
  Object.freeze({name:'ZGMINI-PC-Theme-Nine-R54-Public',time:'13:30',
    action:'THEME_NINE_R54_PUBLIC_CYCLE.cmd',
    logFolder:'E:/ZGmini/data/pc-writer/theme-nine-r54/logs',
    logPattern:/^THEME_NINE_R54_CYCLE_\d+_\d+\.txt$/i}),
]);

export function decodeR69Windows(bytes){
  if(!Buffer.isBuffer(bytes))return String(bytes??'');
  if(bytes.length>1&&(bytes[0]===0xff&&bytes[1]===0xfe))
    return bytes.subarray(2).toString('utf16le');
  if(bytes.length>3&&bytes[0]===0xef&&bytes[1]===0xbb&&bytes[2]===0xbf)
    return bytes.subarray(3).toString('utf8');
  if(bytes.length>5&&bytes.subarray(1,Math.min(bytes.length,121))
    .filter((b,i)=>i%2===0&&b===0).length>10)return bytes.toString('utf16le');
  if(bytes.toString('utf8').includes('\ufffd')){
    try{return new TextDecoder('euc-kr').decode(bytes);}catch{}
  }
  return bytes.toString('utf8');
}

const element=(xml,name)=>{
  const m=String(xml).match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'));
  return m?m[1].trim():null;
};
export function summarizeR69TaskXml(xml,{action,time}={}){
  const ok=/<Task\b/i.test(xml)&&/<Actions\b/i.test(xml);
  if(!ok)return {xmlReadable:false};
  const start=element(xml,'StartBoundary');
  const command=element(xml,'Command')??'';
  const args=element(xml,'Arguments')??'';
  const startWhenAvailable=element(xml,'StartWhenAvailable');
  const disallowOnBattery=element(xml,'DisallowStartIfOnBatteries');
  const stopOnBattery=element(xml,'StopIfGoingOnBatteries');
  const logonType=element(xml,'LogonType');
  const actionNormalized=command.replaceAll('/','\\').toLowerCase();
  const argsNormalized=args.replaceAll('/','\\').toLowerCase();
  const actionName=String(action).toLowerCase();
  const directAction=actionNormalized===actionName||
    actionNormalized.endsWith('\\'+actionName);
  const cmdAction=(actionNormalized==='cmd.exe'||actionNormalized.endsWith('\\cmd.exe'))&&
    /\/d\s+\/c\s+/i.test(args)&&argsNormalized.includes('\\'+actionName);
  const actionMatches=directAction||cmdAction;
  const info={
    xmlReadable:true,
    expectedActionMatches:actionMatches,
    expectedLocalTimeMatches:!!start&&start.slice(11,16)===time,
    scheduledTime:start?.slice(11,16)??null,
    interactiveLogon:logonType==='InteractiveToken',
    startWhenAvailable:startWhenAvailable===null?false:startWhenAvailable==='true',
    startWhenAvailableExplicit:startWhenAvailable!==null,
    disallowStartOnBattery:disallowOnBattery===null?true:disallowOnBattery==='true',
    stopOnBattery:stopOnBattery===null?true:stopOnBattery==='true',
    multipleInstancesPolicy:element(xml,'MultipleInstancesPolicy'),
  };
  info.riskCodes=[
    ...(!info.expectedActionMatches?['UNEXPECTED_ACTION']:[]),
    ...(!info.expectedLocalTimeMatches?['UNEXPECTED_SCHEDULE_TIME']:[]),
    ...(info.interactiveLogon?['LOGIN_SESSION_REQUIRED']:[]),
    ...(info.disallowStartOnBattery?['BATTERY_START_BLOCKED']:[]),
    ...(info.stopOnBattery?['BATTERY_RUN_STOPS']:[]),
    ...(!info.startWhenAvailable?['MISSED_RUN_NO_CATCHUP']:[]),
  ];
  return info;
}

// Locale-independent fields are not guaranteed in `/V /FO LIST`; only known
// English/Korean labels are selected, never the entire verbose task record.
export function summarizeR69Verbose(raw){
  const info={lastRun:null,lastResult:null,nextRun:null,verboseReadable:raw.length>0};
  const selectors=[
    ['lastRun',/^(?:Last Run Time|마지막 실행 시간|마지막 실행 시각)$/i],
    ['lastResult',/^(?:Last Result|마지막 결과|마지막 실행 결과)$/i],
    ['nextRun',/^(?:Next Run Time|다음 실행 시간|다음 실행 시각)$/i],
  ];
  for(const line of String(raw).split(/\r?\n/)){
    const match=line.match(/^([^:：]+)[:：]\s*(.*)$/);
    if(!match)continue;
    for(const [key,test] of selectors){
      if(!test.test(match[1].trim()))continue;
      // Avoid accidentally logging anything other than a time/result token.
      const value=match[2].trim();
      if(key==='lastResult'&&/^(?:0x[0-9a-f]+|[0-9]+)$/i.test(value))
        info[key]=value;
      else if(key!=='lastResult'&&value.length<80&&
        /^[0-9\s\/\-.:,+APMapm\u3130-\u318f\uac00-\ud7af]+$/.test(value))
        info[key]=value;
    }
  }
  return info;
}

const SAFE_STATES=/\b(?:WAIT_[A-Z0-9_]+|STOP_[A-Z0-9_]+|PUBLIC_API_VERIFIED|PUBLIC_R32_LIVE_VERIFIED|D1_VERIFIED_AWAIT_PUBLIC_API_REFRESH|R48_PRIVATE_CANDIDATE_STAGED_NOT_PUBLISHED|R48_PRIVATE_CYCLE_COMPLETE_NO_PUBLICATION|PRIVATE_SHADOW_ALREADY_VERIFIED|PRIVATE_SHADOW_SAVED_NOT_PUBLISHED|R35_DELTA_PRIVATE_COLLECTION_COMPLETE|WAIT_WINDOW_ALREADY_CHECKED)\b/g;
export function summarizeR69Log(contents){
  const lines=String(contents).split(/\r?\n/);
  const headers={};
  for(const line of lines.slice(0,20)){
    const match=line.match(/^(REPORT|STARTED|STATUS|STAGE|RESULT)=([^\r\n]+)$/);
    if(match&&match[2].length<90&&/^[\x20-\x7e]+$/.test(match[2]))
      headers[match[1]]=match[2];
  }
  const states=[...new Set(String(contents).match(SAFE_STATES)??[])].slice(-12);
  const numeric={};
  for(const [key,pattern] of Object.entries({
    providerCalls:/"providerCalls"\s*:\s*(\d+)/g,
    d1Writes:/"d1Writes"\s*:\s*(\d+)/g,
    publicWrites:/"publicWrites"\s*:\s*(\d+)/g,
  })){
    const all=[...String(contents).matchAll(pattern)];
    numeric[key]=all.length?Number(all.at(-1)[1]):null;
  }
  return {headers,states,numeric};
}

function latestApprovedLog({folder,pattern}){
  if(!fs.existsSync(folder))return {status:'FOLDER_ABSENT'};
  let chosen=null;
  for(const name of fs.readdirSync(folder)){
    if(!pattern.test(name))continue;
    const file=path.join(folder,name);
    const stat=fs.lstatSync(file);
    if(!stat.isFile()||stat.size>1024*1024)continue;
    if(!chosen||stat.mtimeMs>chosen.mtimeMs)
      chosen={file,name,mtimeMs:stat.mtimeMs};
  }
  if(!chosen)return {status:'NO_MATCHING_LOG'};
  return {status:'READ_ONLY_LOG_SUMMARY',file:chosen.name,
    modifiedAt:new Date(chosen.mtimeMs).toISOString(),
    ...summarizeR69Log(fs.readFileSync(chosen.file,'utf8'))};
}

export function collectR69ReadOnly({run=spawnSync}={}){
  if(process.platform!=='win32')throw Error('R69_WINDOWS_PC_REQUIRED');
  const timezone=run('tzutil',['/g'],{encoding:null,timeout:15000,windowsHide:true});
  const tz=decodeR69Windows(timezone.stdout??Buffer.alloc(0)).trim();
  const outputs=[];
  for(const task of R69_TASKS){
    const xml=run('schtasks',['/Query','/TN',task.name,'/XML'],
      {encoding:null,timeout:20000,windowsHide:true,maxBuffer:1024*1024});
    const verbose=run('schtasks',['/Query','/TN',task.name,'/V','/FO','LIST'],
      {encoding:null,timeout:20000,windowsHide:true,maxBuffer:1024*1024});
    outputs.push({task:task.name,queryXmlExit:xml.status,
      queryVerboseExit:verbose.status,
      xml:xml.status===0?summarizeR69TaskXml(decodeR69Windows(xml.stdout),task):null,
      verbose:verbose.status===0?summarizeR69Verbose(decodeR69Windows(verbose.stdout)):null,
      latestLog:latestApprovedLog({folder:task.logFolder,pattern:task.logPattern})});
  }
  return {report:'THEME_NINE_R69_SCHEDULE_AND_LOGS_READONLY',
    source:'EXISTING_WINDOWS_SCHEDULED_TASKS_AND_LOCAL_LOG_HEADERS',
    inspectedAt:new Date().toISOString(),
    timezoneIsKorea:tz==='Korea Standard Time',
    taskWrites:0,d1Writes:0,providerCalls:0,otherFilesChanged:0,
    tasks:outputs,conclusion:'OBSERVATION_ONLY_NOT_AUTO_REFRESH_SUCCESS'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{if(process.argv.length!==2)throw Error('R69_NO_ARGUMENTS');
    process.stdout.write(JSON.stringify(collectR69ReadOnly(),null,2)+'\n');
  }catch(e){process.stderr.write(JSON.stringify({status:'STOP_R69_READONLY',
    reason:e?.message??'UNKNOWN',taskWrites:0,d1Writes:0})+'\n');
    process.exitCode=1;}
}
