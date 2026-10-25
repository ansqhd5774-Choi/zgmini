// Windows user-level, one-time Business Quant API registration.
// The API key is never logged or written to any project file.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync,spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const DIRECTORY=path.dirname(fileURLToPath(import.meta.url));
const ENV_NAME='M2_BUSINESSQUANT_API_KEY';

export function validateKey(key){
 // Provider keys are treated as opaque ASCII; reject whitespace/control chars.
 return typeof key==='string'&&key.length>=8&&key.length<=250&&/^[\x21-\x7e]+$/.test(key);
}

function readMasked(prompt){
 return new Promise((resolve,reject)=>{
  if(!process.stdin.isTTY||typeof process.stdin.setRawMode!=='function'){
   reject(Error('INTERACTIVE_WINDOWS_CMD_REQUIRED'));return;
  }
  process.stdout.write(prompt);
  let value='';
  const finish=(result,error)=>{
   process.stdin.removeListener('data',onData);
   process.stdin.setRawMode(false);process.stdin.pause();
   process.stdout.write('\n');
   if(error)reject(error);else resolve(result);
  };
  const onData=chunk=>{
   const input=chunk.toString('utf8');
   for(const char of input){
    if(char==='\r'||char==='\n'){finish(value);return;}
    if(char==='\u0003'){finish('',Error('USER_CANCELLED'));return;}
    if(char==='\u007f'||char==='\b'){
     if(value.length){value=value.slice(0,-1);process.stdout.write('\b \b');}
     continue;
    }
    if(char>=' '&&char<='~'&&value.length<250){value+=char;process.stdout.write('*');}
   }
  };
  process.stdin.setRawMode(true);process.stdin.resume();process.stdin.on('data',onData);
 });
}

function register(key,{spawnProcess=spawnSync}={}){
 const registration=spawnProcess('setx.exe',[ENV_NAME,key],{
  stdio:'ignore',shell:false,windowsHide:true,timeout:10000,
 });
 if(registration.error||registration.status!==0)throw Error('SETX_REGISTRATION_FAILED');
 // setx changes future environments only; this process explicitly passes the
 // key to its immediately launched private research subprocess.
 process.env[ENV_NAME]=key;
}

function launchResearch(){
 const entry=path.join(DIRECTORY,'M2_RUN_READONLY.mjs');
 if(!fs.existsSync(entry)){
  console.log('REGISTERED=YES');
  console.log('NEXT=Copy both registration files into the extracted M2 folder, then run M2_RUN_READONLY.cmd.');
  return;
 }
 console.log('REGISTERED=YES');
 console.log('RUNNING=PRIVATE_M2_READ_ONLY');
 const run=spawnSync(process.execPath,[entry],{cwd:DIRECTORY,
  env:{...process.env,NODE_USE_ENV_PROXY:'1'},stdio:'inherit',windowsHide:false,timeout:120000,
 });
 if(run.error||run.status!==0)throw Error('M2_RUN_FAILED');
 const report=path.join(DIRECTORY,'M2_LATEST_REPORT.html');
 if(fs.existsSync(report)&&process.platform==='win32'){
  const child=spawn('cmd.exe',['/d','/c',`start "" "${report}"`],{cwd:DIRECTORY,
   windowsHide:true,stdio:'ignore'});
  child.on('error',()=>{});child.unref();
 }
 console.log('RESULT_FILE=M2_LATEST_STATUS.txt');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.platform!=='win32')throw Error('WINDOWS_ONLY');
  console.log('Get your FREE key at https://businessquant.com/api-keys');
  console.log('The key stays on this Windows user account and will not be printed.');
  const key=await readMasked('Paste API key (hidden), then press Enter: ');
  if(!validateKey(key))throw Error('INVALID_KEY_FORMAT_OR_LENGTH');
  register(key);
  launchResearch();
 }catch(error){
  console.error(`REGISTRATION_ERROR=${error?.message||'UNKNOWN'}`);
  process.exitCode=1;
 }
}
