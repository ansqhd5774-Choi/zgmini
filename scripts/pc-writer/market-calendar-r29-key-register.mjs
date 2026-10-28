// R29 key registration is local-only: never print, transmit or log the key.
// This command does not install or enable the earnings API collector.
import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {parseEnv} from 'node:util';
import {fileURLToPath} from 'node:url';

export const KEY_NAME='EARNINGS_API_KEY';
const KEY_PATTERN=/^[A-Za-z0-9._~+\-]{8,256}$/;
const KEY_LINE=/^\s*(?:export\s+)?EARNINGS_API_KEY\s*=/;
const DEFAULT_PC_HOME=String.raw`E:\ZGmini\data\pc-writer`;

export function replaceEarningsKey(original,key){
 if(typeof original!=='string'||original.includes('\uFFFD'))throw Error('PROVIDER_ENV_ENCODING_INVALID');
 if(typeof key!=='string'||!KEY_PATTERN.test(key))throw Error('API_KEY_FORMAT_INVALID');
 const before=parseEnv(original);
 const eol=original.includes('\r\n')?'\r\n':'\n';
 const lines=original.split(/\r?\n/);
 let inserted=false;
 const edited=[];
 for(const line of lines){
  if(KEY_LINE.test(line)){
   if(!inserted)edited.push(`${KEY_NAME}="${key}"`);
   inserted=true;
  }else edited.push(line);
 }
 if(!inserted){
  const lastEmpty=edited.length&&edited.at(-1)==='';
  if(lastEmpty)edited.splice(-1,0,`${KEY_NAME}="${key}"`);
  else edited.push(`${KEY_NAME}="${key}"`);
 }
 const updated=edited.join(eol);
 const after=parseEnv(updated);
 if(after[KEY_NAME]!==key)throw Error('PROVIDER_ENV_VERIFICATION_FAILED');
 for(const [name,value] of Object.entries(before)){
  if(name!==KEY_NAME&&after[name]!==value)throw Error('EXISTING_PROVIDER_CHANGED');
 }
 return {updated,unchanged:before[KEY_NAME]===key&&original===updated};
}

export function registerEarningsApiKey(key,{pcHome=process.env.ZGMINI_PC_HOME||DEFAULT_PC_HOME,
 fileSystem=fs,now=Date.now(),randomSuffix=randomBytes(4).toString('hex')}={}){
 const file=path.join(pcHome,'providers.env');
 if(!fileSystem.existsSync(file))throw Error('EXISTING_PROVIDER_ENV_MISSING');
 const type=fileSystem.lstatSync(file);
 if(!type.isFile()||type.isSymbolicLink())throw Error('PROVIDER_ENV_TARGET_UNSAFE');
 const original=fileSystem.readFileSync(file,'utf8');
 const {updated,unchanged}=replaceEarningsKey(original,key);
 if(unchanged)return {status:'ALREADY_REGISTERED',keyName:KEY_NAME};
 // Backup stays beside the existing credentials file, with its same directory
 // security policy. Write in-place to preserve the original Windows ACL.
 const suffix=new Date(now).toISOString().replace(/[-:T.Z]/g,'').slice(0,14);
 if(!/^[a-f0-9]{8}$/.test(randomSuffix))throw Error('BACKUP_SUFFIX_INVALID');
 const backup=path.join(pcHome,`providers.env.r29-${suffix}-${randomSuffix}.bak`);
 fileSystem.copyFileSync(file,backup,fs.constants.COPYFILE_EXCL);
 try{
  fileSystem.writeFileSync(file,updated,{encoding:'utf8'});
  const checked=parseEnv(fileSystem.readFileSync(file,'utf8'));
  if(checked[KEY_NAME]!==key)throw Error('PROVIDER_ENV_WRITE_VERIFY_FAILED');
  for(const [name,value] of Object.entries(parseEnv(original))){
   if(name!==KEY_NAME&&checked[name]!==value)throw Error('EXISTING_PROVIDER_WRITE_CHANGED');
  }
 }catch{
  // Never rewrite the original again on a failure; leave an exact backup for
  // explicit recovery and stop. No secret values enter console output.
  throw Error('REGISTRATION_WRITE_FAILED_BACKUP_PRESERVED');
 }
 return {status:'REGISTERED',keyName:KEY_NAME,backupCreated:true};
}

async function readHiddenKey(){
 if(!process.stdin.isTTY||typeof process.stdin.setRawMode!=='function')throw Error('INTERACTIVE_CONSOLE_REQUIRED');
 process.stdout.write('Paste your EarningsAPI.com API key, then press Enter (input hidden): ');
 return await new Promise((resolve,reject)=>{
  let value='';
  const done=(error)=>{
   process.stdin.off('data',onData);
   process.stdin.setRawMode(false);
   process.stdin.pause();
   process.stdout.write('\r\n');
   if(error)reject(error);else resolve(value);
  };
  const onData=chunk=>{
   for(const char of chunk){
    if(char==='\r'||char==='\n'){done(null);return;}
    if(char==='\u0003'){done(Error('CANCELLED'));return;}
    if(char==='\b'||char==='\u007f'){value=value.slice(0,-1);continue;}
    if(char<' '||char==='\u007f')continue;
    value+=char;
    if(value.length>256){done(Error('API_KEY_TOO_LONG'));return;}
   }
  };
  process.stdin.setEncoding('utf8');
  process.stdin.setRawMode(true);
  process.stdin.on('data',onData);
  process.stdin.resume();
 });
}

export async function main(){
 if(process.platform!=='win32')throw Error('WINDOWS_ONLY');
 const key=await readHiddenKey();
 const result=registerEarningsApiKey(key);
 process.stdout.write(`R29_KEY_${result.status}\r\n`);
 process.stdout.write('Existing providers.env entries preserved. No API request was made.\r\n');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(error=>{
  const safe=new Set(['EXISTING_PROVIDER_ENV_MISSING','PROVIDER_ENV_TARGET_UNSAFE',
   'INTERACTIVE_CONSOLE_REQUIRED','WINDOWS_ONLY','CANCELLED','API_KEY_FORMAT_INVALID',
   'API_KEY_TOO_LONG','REGISTRATION_WRITE_FAILED_BACKUP_PRESERVED']);
  process.stderr.write(`R29_KEY_REGISTRATION_FAILED: ${safe.has(error.message)?error.message:'STOP_SAFETY_CHECK'}\r\n`);
  process.exitCode=2;
 });
}
