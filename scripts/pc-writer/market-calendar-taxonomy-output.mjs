// Reuse the existing pinned private CSV + saved R44 grades; no supplier requests.
import {createHash} from 'node:crypto';
import {parseDeltaScreenerCsv,DELTASCREENER_UPLOAD_SHA256}
 from '../../lib/market-calendar-deltascreener-snapshot.mjs';
import {DELTA_PRIVATE_INPUT_KEY} from './market-calendar-deltascreener-input.mjs';
import {DELTA_R44_OUTPUT_KEY} from '../../lib/market-calendar-deltascreener-public.mjs';
import {MARKET_CALENDAR_TAXONOMY_KEY,makeMarketCalendarTaxonomyPublic}
 from '../../lib/market-calendar-taxonomy-public.mjs';

export async function refreshSavedMarketCalendarTaxonomy({store,now=Date.now()}={}){
 if(!store||typeof store.readInput!=='function'||typeof store.readOutput!=='function'||
  typeof store.writeOutput!=='function'||!Number.isSafeInteger(now)||now<=0)
  throw Error('TAXONOMY_WRITER_INPUT_INVALID');
 const raw=(await store.readInput(DELTA_PRIVATE_INPUT_KEY))?.body;
 if(typeof raw?.text!=='string'||raw.sha256!==DELTASCREENER_UPLOAD_SHA256||
  createHash('sha256').update(Buffer.from(raw.text,'utf8')).digest('hex')!==DELTASCREENER_UPLOAD_SHA256)
  return {status:'SOURCE_NOT_VERIFIED',providerCalls:0};
 const r44=(await store.readOutput(DELTA_R44_OUTPUT_KEY))?.body;
 if(!r44)return {status:'GRADES_MISSING',providerCalls:0};
 const parsed=parseDeltaScreenerCsv(raw.text);
 if(parsed.coverage.rawRows!==4894)return {status:'SOURCE_COVERAGE_INVALID',providerCalls:0};
 const output=makeMarketCalendarTaxonomyPublic(parsed,r44);
 const old=await store.readOutput(MARKET_CALENDAR_TAXONOMY_KEY);
 if(old?.storedAt>now)return {status:'REMOTE_NEWER_PRESERVED',providerCalls:0};
 if(old&&JSON.stringify(old.body)===JSON.stringify(output))
  return {status:'UNCHANGED',providerCalls:0,classified:output.classifiedCount,total:output.tickerCount};
 await store.writeOutput(MARKET_CALENDAR_TAXONOMY_KEY,output,now);
 const saved=await store.readOutput(MARKET_CALENDAR_TAXONOMY_KEY);
 if(saved?.storedAt!==now||JSON.stringify(saved.body)!==JSON.stringify(output))
  throw Error('TAXONOMY_OUTPUT_READBACK_FAILED');
 return {status:'READY_OUTPUT',providerCalls:0,classified:output.classifiedCount,total:output.tickerCount};
}
