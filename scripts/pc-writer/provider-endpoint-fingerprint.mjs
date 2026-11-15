// One-way identity of an HTTP METHOD + hostname + pathname.
// No URL, query parameters, credentials or raw paths are persisted.
import {createHash} from 'node:crypto';
const METHODS=new Set(['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS']);
const HOST=/^(?=.{4,180}$)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;
export const PROVIDER_ENDPOINTS_PER_HOST_MAX=128;
export function providerEndpointFingerprint(input,init){
 try{
  const raw=typeof input==='string'||input instanceof URL?input:input?.url;
  if(typeof raw!=='string'&&!(raw instanceof URL))return null;
  const u=new URL(raw);
  if(!['http:','https:'].includes(u.protocol)||!HOST.test(u.hostname)||u.pathname.length>1500)return null;
  const m=String(init?.method??(typeof input==='object'?input?.method:null)??'GET').toUpperCase();
  if(!METHODS.has(m))return null;
  // Query strings distinguish SERIES/RESOURCES, not HTTP endpoint method+path.
  // Path secrets are never returned, only a bounded one-way digest.
  const id=createHash('sha256').update(m+'\0'+u.hostname+'\0'+u.pathname).digest('hex').slice(0,32);
  return {host:u.hostname,id};
 }catch{return null;}
}
