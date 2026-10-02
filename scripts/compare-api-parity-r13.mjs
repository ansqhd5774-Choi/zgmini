import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';

const sourceBase=process.argv[2];
const targetBase=process.argv[3];
if(!sourceBase||!targetBase)throw Error('Usage: node scripts/compare-api-parity-r13.mjs <sourceBase> <targetBase>');

const routes=[
 '/api/market-score',
 '/api/inflation-detail',
 '/api/recession-detail',
 '/api/liquidity-crisis-detail',
 '/api/credit-risk-detail',
 '/api/earnings-recession-detail',
 '/api/asset-bubble-detail',
 '/api/debt-risk-detail',
 '/api/supply-shock-detail',
];

const canonical=value=>{
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
 return value;
};
const encoded=value=>JSON.stringify(canonical(value));
const sha=value=>createHash('sha256').update(encoded(value)).digest('hex');

async function read(base,route){
 const url=new URL(route,base);
 const began=Date.now();
 const response=await fetch(url,{headers:{accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(20000)});
 const text=await response.text();
 let body=null,error=null;
 try{body=JSON.parse(text)}catch(e){error=String(e?.message??e)}
 return {
  url:url.toString(),status:response.status,contentType:response.headers.get('content-type'),
  elapsedMs:Date.now()-began,bytes:Buffer.byteLength(text),body,error,
 };
}

const rows=[];
for(const route of routes){
 const [source,target]=await Promise.all([read(sourceBase,route),read(targetBase,route)]);
 const sourceHash=source.body!==null?sha(source.body):null;
 const targetHash=target.body!==null?sha(target.body):null;
 const bodyEqual=sourceHash!==null&&sourceHash===targetHash;
 rows.push({
  route,
  source:{status:source.status,bytes:source.bytes,sha256:sourceHash,error:source.error},
  target:{status:target.status,bytes:target.bytes,sha256:targetHash,error:target.error},
  statusEqual:source.status===target.status,
  bodyEqual,
  pass:source.status===200&&target.status===200&&bodyEqual,
 });
 console.log(`${route}: source=${source.status} target=${target.status} equal=${bodyEqual}`);
}

const result={
 observedAt:new Date().toISOString(),
 sourceBase,targetBase,
 method:'Exact canonical JSON equality: object keys sorted; array order and all payload fields retained, including dates/source/updatedAt. No tolerance or field suppression.',
 routes:rows,
 pass:rows.every(x=>x.pass),
};
mkdirSync('docs/migration/r13',{recursive:true});
writeFileSync('docs/migration/r13/api-parity.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
if(!result.pass)process.exitCode=1;
