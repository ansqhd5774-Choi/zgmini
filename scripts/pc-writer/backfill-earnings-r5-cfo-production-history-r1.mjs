import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const VERSION='E1-R5-CFO-PRODUCTION-HISTORY-R1';
const DEFAULT_BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const writeAtomic=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});const part=`${file}.${process.pid}.part`;fs.writeFileSync(part,JSON.stringify(value,null,2)+'\n','utf8');fs.renameSync(part,file);};
function args(argv=process.argv.slice(2)){const out={};for(const item of argv){const match=item.match(/^--([^=]+)=(.*)$/);if(match)out[match[1]]=match[2];}return out;}
function ordinal(period){const match=String(period??'').match(/^(\d{4})Q([1-4])$/);return match?Number(match[1])*4+Number(match[2])-1:null;}
export function extractCfoProductionHistory(document){
 const arrays=[];const walk=value=>{if(Array.isArray(value)){const rows=value.filter(row=>row&&typeof row==='object'&&/^\d{4}Q[1-4]$/.test(String(row.period))&&/^\d{4}-\d{2}-\d{2}$/.test(String(row.closeDate))&&finite(Number(row.s12bRevisionPublished1dp)));if(rows.length>=2)arrays.push(rows);for(const item of value.slice(0,5))walk(item);}else if(value&&typeof value==='object')for(const item of Object.values(value))walk(item);};walk(document);arrays.sort((a,b)=>b.length-a.length);
 const byPeriod=new Map();for(const row of arrays[0]??[])byPeriod.set(String(row.period),{period:String(row.period),date:String(row.closeDate),s12b:Number(row.s12bRevisionPublished1dp)});return [...byPeriod.values()].sort((a,b)=>ordinal(a.period)-ordinal(b.period));
}
export function seedCfoProductionHistory({sourceFile,base=DEFAULT_BASE,force=false,now=new Date().toISOString()}={}){
 if(!sourceFile||!fs.existsSync(sourceFile))throw Error('CFO_ALIGNMENT_SOURCE_MISSING');const rows=extractCfoProductionHistory(read(sourceFile));if(rows.length<8)throw Error(`CFO_ALIGNMENT_HISTORY_INSUFFICIENT:${rows.length}`);const output=path.join(base,'manual-input','e1-r5','cfo-survey-r1','production-history-r1.json');
 if(fs.existsSync(output)&&!force){const prior=read(output);if(prior?.version===VERSION&&Array.isArray(prior?.rows)&&prior.rows.length>=rows.length)return {status:'EXISTING_VALID',output,rowCount:prior.rows.length,first:prior.rows[0]?.period??null,last:prior.rows.at(-1)?.period??null};}
 writeAtomic(output,{version:VERSION,seededAt:now,sourceKind:'LOCAL_DERIVED_ALIGNMENT_HISTORY',rows});return {status:'SEEDED',output,rowCount:rows.length,first:rows[0].period,last:rows.at(-1).period};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const cli=args();try{const result=seedCfoProductionHistory({sourceFile:cli.source?path.resolve(cli.source):null,base:cli.base?path.resolve(cli.base):undefined,force:cli.force==='1'});console.log(JSON.stringify({...result,networkCalls:0,providerCalls:0,dbWrites:0,d1Writes:0,formulaChanged:false,weightChanged:false}));}catch(error){console.log(JSON.stringify({status:'FAILED',error:String(error?.message??error),networkCalls:0,providerCalls:0,dbWrites:0,d1Writes:0,formulaChanged:false,weightChanged:false}));process.exitCode=1;}}
