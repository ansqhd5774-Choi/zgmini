import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {readXlsxWorkbook} from '../lib/diagnostic-layer/xlsx-lite.mjs';
import {assertSourceAvailable,storeValidatedSupplySource} from './supply-source-validation.mjs';

// Isolated research storage: never writes the operating database or public feeds.
const directory = path.resolve(process.argv[2] ?? 'work/supply-r10-sources');
await fs.mkdir(directory, {recursive:true});
const sources = [
  ['sf-pce', 'https://www.frbsf.org/wp-content/uploads/supply-demand-pce-inflation.xlsx', 'xlsx'],
  ['eia-stocks', 'https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=WCESTUS1&f=W', 'html'],
  ...['WCRFPUS2','WCRRIUS2','WCRIMUS2','WCREXUS2','WRPUPUS2'].map(id=>[id,`https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=${id}&f=W`,'html']),
];
const results = await Promise.all(sources.map(async ([id,url,extension]) => {
  try {
    const response = await fetch(url, {signal:AbortSignal.timeout(45000)});
    const bytes = new Uint8Array(await response.arrayBuffer());
    assertSourceAvailable(bytes,response.status);
    const filename = `${id}.${extension}`;
    const record = {id,url,filename,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),collectedAt:new Date().toISOString(),historyMode:'CURRENT_VINTAGE_ONLY'};
    if(extension === 'xlsx') {
      const workbook = await readXlsxWorkbook(bytes);
      record.sheets = [...workbook.sheets].map(([name,rows]) => ({name,rowCount:rows.length,headerPreview:rows.slice(0,4)}));
      const sheet=workbook.sheets.get('Data');
      if(!sheet)throw new Error('SF_DATA_SHEET_MISSING');
      const header=Object.entries(sheet[0].cells).find(([,cell])=>cell.value==='Supply-driven Inflation (core, m/m)');
      if(!header)throw new Error('SF_CORE_SUPPLY_COLUMN_MISSING');
      const column=header[0].replace(/\d+$/,'');
      const parsed=sheet.slice(1).flatMap(row=>{
        const date=String(row.cells[`A${row.rowNum}`]?.value??'').trim();
        const match=/^(\d{4})m(\d{1,2})$/.exec(date);
        const cell=row.cells[`${column}${row.rowNum}`];
        if(!match||!cell||String(cell.value).trim()==='')return [];
        const value=Number(cell.value);if(!Number.isFinite(value))throw new Error('SF_INVALID_NUMBER');
        return [{observationDate:`${match[1]}-${match[2].padStart(2,'0')}-01`,value}];
      });
      record.parsed={count:parsed.length,first:parsed[0]?.observationDate,last:parsed.at(-1)?.observationDate,column:header[1].value};
      if(parsed.length<180)throw new Error('SUPPLY_R10_HISTORY_INCOMPLETE');
      await storeValidatedSupplySource(directory,id,extension,bytes,parsed);
    } else {
      const html = new TextDecoder().decode(bytes);
      record.title=/<title>([^<]+)<\/title>/i.exec(html)?.[1]??null;
      record.downloadLinks = [...html.matchAll(/href=["']([^"']+(?:xls|xlsx|csv)[^"']*)["']/gi)].map(match=>new URL(match[1].replaceAll('&amp;','&'),url).href);
      const clean=value=>value.replace(/<[^>]*>/g,'').replaceAll('&nbsp;',' ').trim();
      const parsed=[];
      for(const tr of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)){
        const cells=[...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>clean(m[1]));
        const year=/^(\d{4})-[A-Za-z]+$/.exec(cells[0]??'')?.[1];
        if(!year)continue;
        for(let i=1;i+1<cells.length;i+=2){
          if(!/^\d{2}\/\d{2}$/.test(cells[i])||!cells[i+1])continue;
          const value=Number(cells[i+1].replaceAll(',',''));if(!Number.isFinite(value))throw new Error('EIA_INVALID_NUMBER');
          parsed.push({observationDate:`${year}-${cells[i].replace('/','-')}`,value});
        }
      }
      if(!parsed.length)throw new Error('EIA_SCHEMA_OR_HISTORY_MISSING');
      parsed.sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
      record.parsed={count:parsed.length,first:parsed[0].observationDate,last:parsed.at(-1).observationDate};
      if(parsed.length<180)throw new Error('SUPPLY_R10_HISTORY_INCOMPLETE');
      await storeValidatedSupplySource(directory,id,extension,bytes,parsed);
    }
    return {...record,status:'STORED'};
  } catch(error) {return {id,status:'SOURCE_FAILED',error:error.name==='TimeoutError'?'EXECUTION_TIMEOUT':error.message};}
}));
await fs.writeFile(path.join(directory,'manifest.json'),JSON.stringify(results,null,2));
console.log(JSON.stringify(results.map(({sheets,...result})=>result),null,2));
