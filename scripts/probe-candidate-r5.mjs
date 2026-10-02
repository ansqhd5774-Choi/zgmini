import {writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const base=new URL(process.argv[2]);
assert(base.hostname.startsWith('zgmini-migration-candidate-r5.')&&base.hostname.endsWith('.workers.dev'));
const results=[];let html='';
async function probe(path,method='GET') {
 const response=await fetch(new URL(path,base),{method,redirect:'manual',signal:AbortSignal.timeout(20000)});
 const body=await response.text();
 const exposed=/Authorization:\s*Bearer|(?:TypeError|ReferenceError):|\bat\s+\w+.*\([^\n]+:\d+:\d+\)|00000000-0000-4000-8000-000000000000/.test(body);
 const item={path,method,status:response.status,content_type:response.headers.get('content-type'),bytes:Buffer.byteLength(body),credential_or_stack_pattern:exposed,redirect:response.headers.get('location')};
 if(path==='/'&&method==='GET')html=body;
 if(path.startsWith('/api/')&&response.headers.get('content-type')?.includes('json')){try{const j=JSON.parse(body);item.reason=j.reason??null;}catch{}}
 results.push(item);return {response,body};
}
await probe('/');
 for(const path of ['/inflation/','/recession/','/asset-bubble/','/flags/us.svg','/api/candidate-status','/api/market-score','/api/inflation-detail','/api/core-pce','/api/session','/api/internal/market-refresh','/api/favorites','/signin-with-chatgpt'])await probe(path);
for(const method of ['POST','PUT','PATCH','DELETE'])await probe('/api/market-score',method);
for(const path of ['/api/favorites','/api/session','/api/internal/market-refresh'])await probe(path,'POST');
const assetPaths=[...new Set([...html.matchAll(/(?:src|href)="([^"<>]+\.(?:js|css)(?:\?[^"<>]*)?)"/g)].map(x=>x[1]))].filter(p=>new URL(p,base).origin===base.origin);
for(const path of assetPaths) {const {body}=await probe(path);if(path.includes('.css'))results.at(-1).gauge_css_present=body.includes('zg-r55-gauge-ring');}
mkdirSync('docs/migration/r5',{recursive:true});
const report={observed_at:new Date().toISOString(),url:base.href,html_rendered:html.includes('<html')&&html.includes('종합'),html_gauge_present:html.includes('zg-r55-gauge-ring'),assets_from_html:assetPaths.length,results};
writeFileSync('docs/migration/r5/http-runtime.json',JSON.stringify(report,null,2)+'\n');
writeFileSync('work/r5-candidate.html',html);
console.log(JSON.stringify(report,null,2));
