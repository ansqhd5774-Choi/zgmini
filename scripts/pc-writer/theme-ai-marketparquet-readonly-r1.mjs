import {throwMarketParquetRemoved} from '../../lib/marketparquet-retirement.mjs';
// AI-only, read-only inspection of the seven existing themes' archived ETF daily source.
// No provider requests, no new prices, no D1 writes, no scheduler modifications.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';

const SYMBOLS=['SMH','SOXX','SPY'];
const SOURCE='MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED';
const SHA=b=>createHash('sha256').update(b).digest('hex');
const DAY=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&
  !Number.isNaN(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const number=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
const rowDay=x=>x instanceof Date?x.toISOString().slice(0,10):typeof x==='string'?x.slice(0,10):
  Number.isInteger(x)&&x>10000&&x<100000?new Date(x*86400000).toISOString().slice(0,10):null;

async function defaultReader(file,bytes){
 let mod;
 try {mod=await import('hyparquet');}
 catch {
  const root=path.resolve(file,'..','..','..','..');
  const projects=path.join(root,'projects');
  const candidates=[process.env.ZGMINI_HYPARQUET_MODULE,
   path.join(path.dirname(file),'..','marketparquet-r167','node_modules','hyparquet','src','index.js')];
  if(fs.existsSync(projects))for(const name of fs.readdirSync(projects).slice(0,80)){
   candidates.push(path.join(projects,name,'node_modules','hyparquet','src','index.js'));
   candidates.push(path.join(projects,name,'zgmini','node_modules','hyparquet','src','index.js'));
  }
  const found=candidates.find(p=>typeof p==='string'&&fs.existsSync(p));
  if(!found)throw Error('EXISTING_PARQUET_DECODER_UNAVAILABLE');
  mod=await import(pathToFileURL(fs.realpathSync(found)).href);
 }
 if(typeof mod.parquetReadObjects!=='function')throw Error('EXISTING_PARQUET_DECODER_INVALID');
 const arrayBuffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 return mod.parquetReadObjects({file:arrayBuffer,columns:['date','symbol','asset_type','close']});
}

// `targetDate` is the real session to inspect; no date or score is synthesized.
// Each archive date is checked independently. The overlap date is required in
// addition to the target date to compare the two price modes before calculation.
export function inspectExistingSevenAiSource(){return throwMarketParquetRemoved();}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length!==1||args[0]!=='--inspect'){
  console.error('Usage: node theme-ai-marketparquet-readonly-r1.mjs --inspect');process.exitCode=2;
 }else{
  const result=await inspectExistingSevenAiSource({dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data'});
  console.log(JSON.stringify(result,null,2));
  if(result.status!=='ACTUAL_TARGET_AND_OVERLAP_ROWS_VERIFIED')process.exitCode=1;
 }
}
