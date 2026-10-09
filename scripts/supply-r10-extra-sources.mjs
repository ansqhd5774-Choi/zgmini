import fs from 'node:fs/promises';
import {parseGscpiWorkbook} from '../lib/diagnostic-layer/nyfed-worldbank-adapters.mjs';
const directory=process.argv[2]??'work/supply-r10-sources';
await fs.mkdir(directory,{recursive:true});
const results=await Promise.all([
 ['gscpi','https://www.newyorkfed.org/medialibrary/research/interactives/gscpi/downloads/gscpi_data.xlsx'],
 ['PCEC96','https://fred.stlouisfed.org/graph/fredgraph.csv?id=PCEC96'],
 ['DPCERA3M086SBEA','https://fred.stlouisfed.org/graph/fredgraph.csv?id=DPCERA3M086SBEA'],
].map(async([id,url])=>{
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw new Error(`HTTP_${response.status}`);
  const bytes=new Uint8Array(await response.arrayBuffer());
  await fs.writeFile(`${directory}/${id}.${id==='gscpi'?'xlsx':'csv'}`,bytes);
  if(id==='gscpi'){
   const parsed=await parseGscpiWorkbook(bytes);
   await fs.writeFile(`${directory}/${id}.json`,JSON.stringify(parsed));
   return {id,status:'STORED',parsed};
  }
  const text=new TextDecoder().decode(bytes),lines=text.trim().split(/\r?\n/);
  if(!lines[0].includes(id))throw new Error('FRED_CSV_SCHEMA');
  const rows=lines.slice(1).flatMap(line=>{const [observationDate,raw]=line.split(',');return /^\d{4}-\d{2}-\d{2}$/.test(observationDate)&&raw!=='.'&&raw!==''&&Number.isFinite(Number(raw))?[{observationDate,value:Number(raw)}]:[];});
  await fs.writeFile(`${directory}/${id}.json`,JSON.stringify(rows));
  return {id,status:'STORED',count:rows.length,first:rows[0]?.observationDate,last:rows.at(-1)?.observationDate};
 }catch(error){return {id,status:'SOURCE_FAILED',error:error.message};}
}));
await fs.writeFile(`${directory}/extra-manifest.json`,JSON.stringify(results,null,2));
console.log(JSON.stringify(results.map(({parsed,...result})=>parsed?{...result,count:parsed.rows.length,first:parsed.rows[0]?.observationDate,last:parsed.rows.at(-1)?.observationDate}:result),null,2));
