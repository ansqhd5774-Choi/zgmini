import fs from 'node:fs';
import path from 'node:path';
import {hash,save,read} from './d1.mjs';
import {calculateRev7,REV7_VERSION} from '../../worker/korea-rev7-engine.mjs';

export async function calculateKorea(client,db,directory){
 const query=async(sql,params=[])=>(await client.query(db,sql,params)).results;
 const dates=await query("SELECT date,rows_stored,fetched_at,methodology_version FROM kfg_rev7_market_dates WHERE status='COMPLETE' ORDER BY date");
 if(dates.length<1030||dates.length>2000||dates.some(x=>x.methodology_version!==REV7_VERSION))throw Error('KOREA_HISTORY_NOT_READY');
 const marketRows=[];
 for(let offset=0;offset<dates.length;offset+=10){
  const group=dates.slice(offset,offset+10),file=path.join(directory,hash(group)+'.json');let rows;
  if(fs.existsSync(file)){const cached=read(file);if(hash(cached.rows)!==cached.hash)throw Error('KOREA_CACHE_CORRUPT');rows=cached.rows;}
  else{rows=await query('SELECT date,security_id AS securityId,short_code AS shortCode,close,high,low,change_amount AS changeAmount,share_volume AS shareVolume FROM kfg_rev7_kospi_rows WHERE date>=? AND date<=? ORDER BY date,security_id',[group[0].date,group.at(-1).date]);save(file,{rows,hash:hash(rows)});rows=read(file).rows;}
  const counts=new Map();let previous='';for(const row of rows){const identity=row.date+'|'+row.securityId;if(identity<=previous)throw Error('KOREA_ROW_IDENTITY');previous=identity;counts.set(row.date,(counts.get(row.date)??0)+1);}
  if(rows.length!==group.reduce((sum,x)=>sum+x.rows_stored,0)||group.some(x=>counts.get(x.date)!==x.rows_stored))throw Error('KOREA_ROW_COUNT');
  for(const row of rows)marketRows.push(row);
 }
 const dailySeries=await query('SELECT date,kospi_close AS kospiClose,vkospi200_close AS vkospi200Close,ktb_total_return AS ktbTotalReturn,government_prime_total_return AS governmentPrimeTotalReturn,standard_put_volume AS standardPutVolume,standard_call_volume AS standardCallVolume,put_call_ratio AS putCallRatio,aa_minus_3y AS aaMinus3Y,bbb_minus_3y AS bbbMinus3Y,junk_spread AS junkSpread FROM kfg_rev7_daily_series WHERE date>=? AND date<=? ORDER BY date',[dates[0].date,dates.at(-1).date]);
 if(dailySeries.length!==dates.length||dailySeries.some((row,i)=>row.date!==dates[i].date))throw Error('KOREA_SERIES_COUNT');
 const seriesFile=path.join(directory,'series.json');save(seriesFile,dailySeries);
 const result=calculateRev7({marketRows,dailySeries:read(seriesFile)});
 if(result.status!=='READY'||result.observationDate!==dates.at(-1).date||!Number.isFinite(result.score))throw Error('KOREA_SCORE_NOT_READY');
 const after=await query("SELECT date,rows_stored,fetched_at,methodology_version FROM kfg_rev7_market_dates WHERE status='COMPLETE' ORDER BY date");
 if(hash(dates)!==hash(after))throw Error('KOREA_SOURCE_CHANGED');
 save(path.join(directory,'result.json'),result);
 return result;
}
