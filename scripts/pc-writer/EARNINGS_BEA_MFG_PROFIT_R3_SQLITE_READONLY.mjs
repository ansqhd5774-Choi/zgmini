// BEA manufacturing profits: bounded, read-only inspection of existing PC ledgers.
// Never issues INSERT/UPDATE/DELETE, PRAGMA journal_mode, network, D1, or collection.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const DBS=['storage/core.sqlite','storage/history.sqlite'];
const CODE='N400RC';
const MAX_TABLES=100,MAX_ROWS=20_000,MAX_COLUMNS=24;
const MAX_FIELD_LENGTH=100_000;
const quote=s=>'"'+s.replaceAll('"','""')+'"';
const rel=s=>s.replaceAll('\\','/');
const isSafeRoot=root=>typeof root==='string'&&path.isAbsolute(root)
  &&fs.existsSync(root)&&fs.statSync(root).isDirectory()
  &&fs.existsSync(path.join(root,'storage'));

function inspectOne({filename,relative,DatabaseSync}){
  const result={database:relative,status:'NOT_INSPECTED',tablesVisited:0,
    tablesLimited:false,rowsLimited:false,columnsLimited:false,
    matches:[],errors:[]};
  if(!fs.existsSync(filename)){result.status='NOT_PRESENT';return result;}
  let db;
  try{
    // readOnly:true forbids data mutation. Do not request immutable=1: a live
    // PC writer may be updating WAL, so suppressing change detection is unsafe.
    db=new DatabaseSync(filename,{readOnly:true,timeout:1000,
      allowExtension:false});
    db.exec('PRAGMA query_only=ON');
    const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
    result.tablesLimited=tables.length>MAX_TABLES;
    for(const {name} of tables.slice(0,MAX_TABLES)){
      result.tablesVisited++;
      if(name.includes(CODE)){
        result.matches.push({table:name,field:'TABLE_NAME'});
        continue;
      }
      try{
        const cols=db.prepare(`PRAGMA table_info(${quote(name)})`).all()
          .filter(c=>!/\b(?:int|real|float|double|numeric|decimal|blob)\b/i.test(c.type??''));
        if(cols.length>MAX_COLUMNS)result.columnsLimited=true;
        const selected=cols.slice(0,MAX_COLUMNS);
        for(const col of selected){
          if(col.name.includes(CODE))result.matches.push({table:name,field:col.name,kind:'COLUMN_NAME'});
        }
        if(!selected.length)continue;
        // Bound each table to its first 20k rows. Test the full text values in
        // SQLite; output only table and field names, never record contents.
        const selects=selected.map(c=>`${quote(c.name)} AS ${quote(c.name)}`).join(',');
        const clause=selected.map(c=>{
          const v=quote(c.name);
          return `(length(CAST(${v} AS TEXT))<=${MAX_FIELD_LENGTH} AND instr(upper(CAST(${v} AS TEXT)), '${CODE}')>0)`;
        }).join(' OR ');
        const matched=db.prepare(`SELECT 1 AS found FROM (SELECT ${selects} FROM ${quote(name)} LIMIT ${MAX_ROWS}) WHERE ${clause} LIMIT 1`).get();
        if(matched)result.matches.push({table:name,field:'ROW_TEXT_MATCH'});
        const more=db.prepare(`SELECT 1 AS more FROM ${quote(name)} LIMIT 1 OFFSET ${MAX_ROWS}`).get();
        if(more)result.rowsLimited=true;
      }catch{
        result.errors.push('TABLE_SCAN_INCOMPLETE');
      }
    }
    result.status=result.matches.length?'CANDIDATE_PRESENT':
      result.errors.length||result.tablesLimited||result.rowsLimited||result.columnsLimited
        ?'NO_MATCH_BOUNDED_SCAN_INCOMPLETE':'NO_MATCH_SQLITE_SCAN';
  }catch(e){
    result.status='SQLITE_READ_FAILED';
    result.errors.push(String(e?.code??'OPEN_OR_QUERY_FAILED'));
  }finally{try{db?.close();}catch{result.errors.push('CLOSE_FAILED');}}
  return result;
}

export function inspectBeaManufacturingSqlite({root,DatabaseSync:driver}={}){
  if(!isSafeRoot(root))throw Error('BEA_MFG_PC_ROOT_NOT_RECOGNIZED');
  let DatabaseSync=driver;
  if(!DatabaseSync){
    try{({DatabaseSync}=require('node:sqlite'));}catch{
      return {status:'SQLITE_DRIVER_UNAVAILABLE',seriesId:CODE,
        databases:DBS.map(database=>({database,status:'NOT_INSPECTED'})),
        matchCount:0,safeToAutoCapture:false,sqlWrites:0,d1Writes:0,
        warnings:['APPROVED_NODE_RUNTIME_NEEDS_SQLITE_READ_SUPPORT']};
    }
  }
  const databases=DBS.map(relative=>inspectOne({
    filename:path.join(root,...relative.split('/')),relative,DatabaseSync}));
  const matchCount=databases.reduce((sum,d)=>sum+d.matches.length,0);
  const complete=databases.every(d=>d.status==='NO_MATCH_SQLITE_SCAN'||d.status==='NOT_PRESENT');
  return {status:matchCount?'CANDIDATE_EXISTING_SQLITE_FOUND':complete?
    'NO_MATCH_IN_SQLITE_SCAN':'SQLITE_INSPECTION_INCOMPLETE',
    seriesId:CODE,matchCount,databases,
    // SQLite scan cannot prove absence in XLSX, large files or alternate aliases.
    safeToAutoCapture:false,sqlWrites:0,d1Writes:0,
    warnings:complete?['XLSX_AND_OTHER_RAW_SOURCES_NOT_INSPECTED']:[]};
}

const self=fileURLToPath(import.meta.url);
if(process.argv[1]&&path.resolve(process.argv[1])===self){
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--root'||!args[1]){
    console.error('ERROR=BEA_MFG_INVALID_ARGUMENT');process.exitCode=2;
  }else{
    try{console.log(JSON.stringify(inspectBeaManufacturingSqlite({root:args[1]}),null,2));}
    catch(e){console.error('ERROR='+String(e?.message??'SQLITE_PREFLIGHT_FAILED'));process.exitCode=1;}
  }
}
