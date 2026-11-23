import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

// Isolated read-only Production Chrome CDP verification. No POST, D1 or provider writes.
const origin='https://zgmini.kr',sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const assert=(ok,reason)=>{if(!ok)throw Error(reason)};
const binary=['google-chrome','google-chrome-stable','chromium','chromium-browser']
 .find(name=>spawnSync('which',[name],{encoding:'utf8'}).status===0);
assert(binary,'W01_CHROME_BINARY_NOT_FOUND');
const dir=mkdtempSync(path.join(tmpdir(),'w01-ui-')),out='artifacts/w01-public-ui';
mkdirSync(out,{recursive:true});
const proc=spawn(binary,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
 '--disable-gpu','--no-first-run','--no-default-browser-check','--disable-extensions',
 '--remote-debugging-port=0','--user-data-dir='+dir,'about:blank'],{stdio:'ignore'});
proc.on('error',e=>console.error('W01_CHROME_START_ERROR='+e.message));
let socket,seq=0;const pending=new Map();
async function waitPort(){
 for(let i=0;i<80;i++){
  const f=path.join(dir,'DevToolsActivePort');
  if(existsSync(f))return Number(readFileSync(f,'utf8').split('\n')[0]);
  if(proc.exitCode!==null)throw Error('W01_CHROME_TERMINATED');
  await sleep(200);
 }
 throw Error('W01_CHROME_PORT_TIMEOUT');
}
function connect(url){return new Promise((resolve,reject)=>{
 const ws=new WebSocket(url);
 ws.addEventListener('open',()=>resolve(ws),{once:true});
 ws.addEventListener('error',()=>reject(Error('W01_CDP_CONNECTION_FAILED')),{once:true});
});}
function send(method,params={}){
 const id=++seq;
 return new Promise((resolve,reject)=>{
  pending.set(id,{resolve,reject});
  socket.send(JSON.stringify({id,method,params}));
 });
}
async function evaluate(expression){
 const r=await send('Runtime.evaluate',{expression,returnByValue:true});
 if(r.exceptionDetails)throw Error('W01_BROWSER_EVALUATION_EXCEPTION:'+String(r.exceptionDetails.exception?.description??r.exceptionDetails.text??'UNKNOWN').slice(0,220));
 return r.result?.value;
}
async function state(){
 return evaluate(`(()=>{
 const rows19=[...document.querySelectorAll('tr[data-research-input]')];
 const rows7=[...document.querySelectorAll('tr[data-research-candidate]')];
 const raw19=rows19.filter(x=>x.querySelector('[data-value-kind="raw"]')).length;
 const raw7=rows7.filter(x=>x.querySelector('[data-value-kind="raw"]')).length;
 const mobile19=document.querySelectorAll('.inflation-r2-mobile-list article[data-research-input]').length;
 const mobile7=document.querySelectorAll('.inflation-r2-mobile-list article[data-research-candidate]').length;
 const hero=document.querySelector('[data-testid="inflation-detail-hero"]');
 return {path:location.pathname,rows19:rows19.length,rows7:rows7.length,raw19,raw7,mobile19,mobile7,
  candidate28:document.querySelector('tr[data-research-candidate="28"]')?.textContent.includes('976,044')??false,
  research1:document.querySelector('tr[data-research-input="research-1"]')?.textContent.includes('102')??false,
  candidate28Text:document.querySelector('tr[data-research-candidate="28"]')?.textContent?.slice(0,240)??null,
  research1Text:document.querySelector('tr[data-research-input="research-1"]')?.textContent?.slice(0,240)??null,
  r2Hero:hero?.getAttribute('data-market-state')??null,
  r2ChartLatestDot:!!hero?.querySelector('.cnn-latest-point'),
  r2CorrectScore:hero?.textContent?.includes('58.0')??false,
  r2DateTextCorrect:/2026[^0-9]+11[^0-9]+23/.test(hero?.textContent??''),
  horizontalOverflow:(document.documentElement?.scrollWidth??0)>innerWidth+1};})()`);
}
async function visit(url){
 await send('Page.navigate',{url});
 let lastEvaluationError='NONE',lastState=null;
 for(let i=0;i<65;i++){
  let s;
  try{s=await state();}
  catch(error){lastEvaluationError=String(error.message||error);await sleep(400);continue;}
  lastState=s;
  if(url===origin+'/economic-indicators/inflation/'&&s.path==='/economic-indicators/inflation/'&&s.raw19===19&&s.raw7===7)return s;
  if(url===origin+'/inflation/'&&s.path==='/inflation/'&&s.r2Hero==='ready'&&s.r2ChartLatestDot)return s;
  await sleep(400);
 }
 throw Error('W01_PUBLIC_JS_LOADING_TIMEOUT:'+url+':'+lastEvaluationError+':'+JSON.stringify(lastState).slice(0,450));
}
async function screenshot(name){
 const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 assert(typeof r.data==='string','W01_SCREENSHOT_INVALID');
 writeFileSync(path.join(out,name),Buffer.from(r.data,'base64'));
}
try{
 const port=await waitPort();
 const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 const target=targets.find(t=>t.type==='page');
 assert(target?.webSocketDebuggerUrl,'W01_CDP_TARGET_MISSING');
 socket=await connect(target.webSocketDebuggerUrl);
 socket.addEventListener('message',e=>{
  const x=JSON.parse(String(e.data));
  if(x.id&&pending.has(x.id)){
   const {resolve,reject}=pending.get(x.id);pending.delete(x.id);
   x.error?reject(Error('CDP_'+x.error.message)):resolve(x.result);
  }
 });
 await send('Page.enable');await send('Runtime.enable');
 for(const width of [1440,390]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390});
  const economic=await visit(origin+'/economic-indicators/inflation/');
  assert(economic.rows19===19&&economic.raw19===19&&economic.rows7===7&&economic.raw7===7,
   'W01_ECONOMIC_RAW_ROW_COUNT_'+width);
  assert(economic.mobile19===19&&economic.mobile7===7,'W01_ECONOMIC_MOBILE_ROW_COUNT_'+width);
  await screenshot('economic-'+width+'.png');
  console.log('W01_ECONOMIC_RENDER_OBSERVED='+JSON.stringify({width,...economic}));
  assert(economic.research1&&economic.candidate28,'W01_PUBLIC_VALUE_MISMATCH_'+width);
  console.log('W01_ECONOMIC_RENDER_PASS='+width);
  const r2=await visit(origin+'/inflation/');
  assert(r2.r2Hero==='ready'&&r2.r2ChartLatestDot&&r2.r2CorrectScore&&r2.r2DateTextCorrect,
   'W01_R2_CHART_SCORE_DATE_MISMATCH_'+width);
  assert(!economic.horizontalOverflow&&!r2.horizontalOverflow,'W01_HORIZONTAL_OVERFLOW_'+width);
  await screenshot('r2-'+width+'.png');
  console.log('W01_R2_RENDER_PASS='+JSON.stringify({width,r2Hero:r2.r2Hero,latestDot:r2.r2ChartLatestDot,
   scoreDisplay:r2.r2CorrectScore,dateDisplay:r2.r2DateTextCorrect,noHorizontalOverflow:!r2.horizontalOverflow}));
 }
}catch(error){
 console.error('W01_BROWSER_READBACK_FAIL='+String(error?.stack??error));
 process.exitCode=1;
}finally{
 try{socket?.close()}catch{}
 for(const item of pending.values())item.reject(Error('W01_CDP_CLOSED'));
 proc.kill('SIGTERM');
 try{rmSync(dir,{recursive:true,force:true,maxRetries:10,retryDelay:200});}
 catch(error){console.error('W01_TEMP_CLEANUP_WARNING='+String(error.message||error));}
}
