import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {calculateConsumptionR4} from '../lib/market-score/consumption-r4.mjs';
const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
const rows=JSON.parse(fs.readFileSync(path.join(base,'supply-r10','PCEC96.json'),'utf8'));
const result=calculateConsumptionR4(rows,{asOfDate:new Date().toISOString().slice(0,10)});
console.log(JSON.stringify({status:result.status,methodologyVersion:result.methodologyVersion,score:result.score,updatedAt:result.updatedAt,historyMode:result.historyMode,providerRequests:0,remoteWrites:0,trend:result.trend,indicators:result.indicators},null,2));
if(result.status!=='READY')process.exitCode=1;
