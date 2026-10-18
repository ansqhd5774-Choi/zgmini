import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {scoreBreadthR8Guarded} from '../../lib/market-score/breadth-r8-source-pure-guard.mjs';
import {buildBreadthR8ComponentsR2} from '../../lib/market-score/breadth-r8-shadow-r2.mjs';

const SOURCE='MarketParquet Free Sample',FEED='stock_daily';
const isDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s);
const readJson=file=>fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;

/** Read-only R8 Shadow runner. No HTTP, writer, D1, or production path. */
export function analyzeBreadthR8SourcePure(base){
 const pitFile=path.join(base,'local-breadth-r7-pit-universe.json');
 const dbFile=path.join(base,'storage','core.sqlite');
 if(!fs.existsSync(pitFile)||!fs.existsSync(dbFile))throw Error('R8_INPUT_FILES_MISSING');
 const pit=readJson(pitFile);
 if(pit?.status!=='READY'||pit?.membershipLookAheadSafe!==true||pit?.currentUniverseSurvivorshipBiasRemoved!==true)throw Error('R8_PIT_NOT_SAFE');
 const asOfDate=String(pit.currentDate??pit.last??'');
 if(!isDate(asOfDate))throw Error('R8_PIT_CURRENT_DATE_MISSING');
 // Only the dedicated, provenance-reviewed RSP/SPY input contract may be used.
 // Never scrape a generic sector ETF cache and mark it as RSP/SPY automatically.
 const relative=readJson(path.join(base,'local-breadth-r8-relative-rsp-spy.json'));
 const db=new DatabaseSync(dbFile,{readOnly:true});
 db.exec('PRAGMA query_only=ON');
 try{
  const rows=db.prepare('SELECT trade_date,ticker,previous_date,previous_close,current_close,current_volume,source,feed '+
   'FROM market_score_breadth_b1_r3_current_v1 WHERE trade_date<=? ORDER BY trade_date,ticker').all(asOfDate);
  const assessed=scoreBreadthR8Guarded({
   rows,universes:pit.universes??[],relativeSeries:relative,
   asOfDate,source:SOURCE,feed:FEED,
  },buildBreadthR8ComponentsR2);
  return {mode:'R8_SOURCE_PURE_SHADOW_READONLY',
   providerCalls:0,inputFileWrites:0,dbD1Writes:0,publicMutation:false,productionFormulaChanged:false,
   asOfDate,source:SOURCE,feed:FEED,sourceRows:rows.length,
   status:assessed.status,score:assessed.score,reason:assessed.reason??null,
   blockers:assessed.assessment?.blockers??[],
   relative:assessed.assessment?.relative??null,
   missingDates:assessed.assessment?.recent252ShortDates??[],
   originalR8Method:assessed.calculation?.methodologyVersion??null,
   inputReadiness:assessed.assessment?.status??null};
 }finally{db.close();}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const base=process.env.ZGMINI_PC_HOME;
  if(!base)throw Error('ZGMINI_PC_HOME_REQUIRED');
  console.log(JSON.stringify(analyzeBreadthR8SourcePure(base)));
 }catch(error){
  console.log(JSON.stringify({status:'ERROR',code:String(error?.message??error),providerCalls:0,dbD1Writes:0,publicMutation:false}));
  process.exitCode=1;
 }
}
