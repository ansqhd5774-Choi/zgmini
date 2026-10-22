import fs from 'node:fs/promises';
import {parseGscpiWorkbook} from '../lib/diagnostic-layer/nyfed-worldbank-adapters.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertSourceAvailable,parseSupplyFredCsv,storeValidatedSupplySource} from './supply-source-validation.mjs';
export async function collectSupplyExtraSources(directory,{fetcher=fetch}={}){
await fs.mkdir(directory,{recursive:true});
const results=await Promise.all([
 ['gscpi','https://www.newyorkfed.org/medialibrary/research/interactives/gscpi/downloads/gscpi_data.xlsx'],
 ['PCEC96','https://fred.stlouisfed.org/graph/fredgraph.csv?id=PCEC96'],
 ['DPCERA3M086SBEA','https://fred.stlouisfed.org/graph/fredgraph.csv?id=DPCERA3M086SBEA'],
].map(async([id,url])=>{
 try{
  const response=await fetcher(url,{signal:AbortSignal.timeout(45000)});
  const bytes=new Uint8Array(await response.arrayBuffer());
  assertSourceAvailable(bytes,response.status);
  if(id==='gscpi'){
   const parsed=await parseGscpiWorkbook(bytes);
   if(!Array.isArray(parsed.rows)||parsed.rows.length<180)throw Error('SUPPLY_R10_HISTORY_INCOMPLETE');
   await storeValidatedSupplySource(directory,id,'xlsx',bytes,parsed);
   return {id,status:'STORED',parsed};
  }
  const rows=parseSupplyFredCsv(bytes,id);
  if(rows.length<180)throw Error('SUPPLY_R10_HISTORY_INCOMPLETE');
  await storeValidatedSupplySource(directory,id,'csv',bytes,rows);
  return {id,status:'STORED',count:rows.length,first:rows[0]?.observationDate,last:rows.at(-1)?.observationDate};
 }catch(error){return {id,status:'SOURCE_FAILED',error:error.message};}
}));
await fs.writeFile(`${directory}/extra-manifest.json`,JSON.stringify(results,null,2));
return results;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
const results=await collectSupplyExtraSources(process.argv[2]??'work/supply-r10-sources');
console.log(JSON.stringify(results.map(({parsed,...result})=>parsed?{...result,count:parsed.rows.length,first:parsed.rows[0]?.observationDate,last:parsed.rows.at(-1)?.observationDate}:result),null,2));
}
