import path from 'node:path';import os from 'node:os';
import {localDatabase} from './pc-writer/local-db.mjs';
import {marketOperationalStore} from '../worker/market-operational-store.mjs';
import {calculateConsumptionR5} from '../lib/market-score/consumption-r5.mjs';
const db=localDatabase(path.join(os.homedir(),'.zgmini','pc-writer','storage','core.sqlite'));
try{
const input=await marketOperationalStore(db).readInput('consumption-r5-pending');
const r=calculateConsumptionR5(input.body,{asOfDate:new Date().toISOString().slice(0,10)});
console.log(JSON.stringify({status:r.status,score:r.score,areas:r.areas,indicators:r.indicators,trend:r.trend}));
for(const id of ['employmentRatio','realPayroll']){
 const rows=input.body.series[id];console.log(JSON.stringify({id,count:rows.length,first:rows[0],last:rows.at(-1),nulls:rows.filter(x=>x.value===null).length,futureReleases:rows.filter(x=>x.availableDate>'2026-10-10').map(x=>x.observationDate)}));
}
}finally{db.close();}
