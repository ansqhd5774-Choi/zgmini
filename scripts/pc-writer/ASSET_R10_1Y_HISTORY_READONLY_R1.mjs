// Approved R10 PC storage: read-only one-year source coverage audit.
// Requires no provider keys, Cloudflare access, SQL mutations or deployment.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {base,readR10Inputs,r10InputSlice} from './asset-r10-storage.mjs';
import {assetR10PcPreflight} from './ASSET_R10_RAW_PREFLIGHT_R1.mjs';
import {buildAssetR10OneYearReadOnly}
 from '../../lib/diagnostic-layer/asset-bubble-r10-1y-history-readonly-r1.mjs';

export function assetR10OneYearPcAudit({pcHome=base}={}){
 const previous=assetR10PcPreflight({pcHome});
 const file=path.join(pcHome,'storage','core.sqlite');
 const before=fs.statSync(file);
 const input=readR10Inputs();
 if(input.macro?.key!==previous.storedInputs.macroBatchKey
  ||input.price?.key!==previous.storedInputs.priceBatchKey
  ||input.macro?.storedAt!==previous.storedInputs.macroStoredAt
  ||input.price?.storedAt!==previous.storedInputs.priceStoredAt)
  throw Error('ASSET_R10_1Y_STORED_SOURCE_DRIFT');
 const local=name=>JSON.parse(fs.readFileSync(path.join(pcHome,
  `local-asset-bubble-r10-${name}.json`),'utf8'));
 const macro=r10InputSlice(input.macro);
 const result=buildAssetR10OneYearReadOnly({macroSeries:macro.series,
  sp500Rows:input.price.body.series.SP500,
  breadth:local('breadth-research'),
  quality:local('alpaca-pit-validation'),
  audit:local('alpaca-collected-audit'),
  release:local('release-payload')});
 const after=fs.statSync(file);
 if(before.size!==after.size||before.mtimeMs!==after.mtimeMs)
  throw Error('ASSET_R10_1Y_SQLITE_CHANGED_DURING_READ');
 return {...result,storedInputs:previous.storedInputs};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--dry-run'){
  console.error('ERROR=ASSET_R10_1Y_READONLY_FLAG_REQUIRED');
  process.exitCode=2;
 }else try{
  const result=assetR10OneYearPcAudit({pcHome:process.env.ZGMINI_PC_HOME
   ||'E:\\ZGmini\\data\\pc-writer'});
  console.log(JSON.stringify(result));
 }catch(error){
  const message=String(error?.message??'');
  console.error('ERROR='+(/^[A-Z][A-Z0-9_]{2,110}$/.test(message)
   ?message:'ASSET_R10_1Y_READONLY_AUDIT_FAILED'));
  process.exitCode=1;
 }
}
