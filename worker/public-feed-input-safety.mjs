import {parseCnnIndex} from '../lib/cnn-index.mjs';
const rows=values=>Array.isArray(values)&&values.some(p=>typeof p?.date==='string'&&Number.isFinite(p.value));
const required=['corePce','cpi','ppi','unemployment','payrolls','tenYear','oil'];
export function assertFeedInput(key,body,now){
 if(key==='fear-greed'){parseCnnIndex(body,now);return;}
 if(key==='market-data'){
  const bls=new Map(Array.isArray(body?.blsRows)?body.blsRows:[]);
  const fred=new Map((Array.isArray(body?.fredResults)?body.fredResults:[]).map(r=>[r.name,r]));
  if(body?.blsStatus!=='SUCCESS'||!['CUUR0000SA0','WPSFD4','LNS14000000','CES0000000001'].every(id=>rows(bls.get(id)))
    ||!['corePce','tenYear','oil'].every(id=>fred.get(id)?.status==='SUCCESS'&&rows(fred.get(id)?.data)))throw Error('FEED_REQUIRED_INPUT_MISSING');
 }
 if(key==='core-pce'&&(!rows(body?.f?.rows)||!Array.isArray(body?.b?.series?.[0]?.rows)||!body.b.series[0].rows.length))throw Error('FEED_REQUIRED_INPUT_MISSING');
}
export function assertFeedOutput(key,body){
 if(key==='fear-greed'&&(!Number.isFinite(body?.score)||!Array.isArray(body?.history)||!body.history.length))throw Error('FEED_REQUIRED_OUTPUT_MISSING');
 if(key==='market-data'&&(!required.every(id=>Number.isFinite(body?.indicators?.[id]?.currentValue)&&body.indicators[id].chart?.length>0)||!body?.summary?.length))throw Error('FEED_REQUIRED_OUTPUT_MISSING');
 if(key==='core-pce'&&(!Array.isArray(body?.actual)||!body.actual.length))throw Error('FEED_REQUIRED_OUTPUT_MISSING');
}
