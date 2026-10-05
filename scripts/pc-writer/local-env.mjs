import fs from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {registerHooks} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';

export function loadLocalProviders(base){
 const file=path.join(base,'providers.env');
 if(!fs.existsSync(file))throw Error('LOCAL_PROVIDER_FILE_MISSING');
 return Object.fromEntries(Object.entries(parseEnv(fs.readFileSync(file,'utf8'))).filter(([key,value])=>/^[A-Z][A-Z0-9_]+$/.test(key)&&value.trim()));
}

export function installLocalRuntime(env){
 globalThis.__zgminiLocalProviderEnv=env;
 return registerHooks({resolve(specifier,context,next){
  if(specifier==='cloudflare:workers')return {url:'data:text/javascript,export const env=globalThis.__zgminiLocalProviderEnv;',shortCircuit:true};
  try{return next(specifier,context);}catch(error){
   if(error.code!=='ERR_MODULE_NOT_FOUND'||!specifier.startsWith('.')||!context.parentURL?.startsWith('file:'))throw error;
   const file=fileURLToPath(new URL(specifier,context.parentURL));
   for(const suffix of ['.ts','.mjs','.js','/index.ts'])if(fs.existsSync(file+suffix))return next(pathToFileURL(file+suffix).href,context);
   throw error;
  }
 }});
}
