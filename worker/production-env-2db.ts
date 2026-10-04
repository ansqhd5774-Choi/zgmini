import {env as native} from 'cloudflare:workers';

export const env=new Proxy(native as Record<string,unknown>,{
 get(target,property,receiver){
  if(property==='DB')return Reflect.get(target,'DB_CORE',receiver);
  return Reflect.get(target,property,receiver);
 }
});
