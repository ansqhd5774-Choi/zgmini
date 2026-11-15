// Exact R44 public output D1 readback evidence. No network or DB access here.
// The existing approved Writer supplies rows already read from local SQLite/D1.
import {createHash} from 'node:crypto';
import {DELTA_R44_OUTPUT_KEY} from '../../lib/market-calendar-deltascreener-public.mjs';
const digest=text=>typeof text==='string'?
 createHash('sha256').update(Buffer.from(text,'utf8')).digest('hex'):null;
const epoch=value=>Number.isSafeInteger(value)&&value>0?value:null;
export function r44D1Readback(local,d1){
 if(local?.feed_key!==DELTA_R44_OUTPUT_KEY)return null;
 const localStoredAt=epoch(local.stored_at),d1StoredAt=epoch(d1?.stored_at);
 const localBodySha256=digest(local.body),d1BodySha256=digest(d1?.body);
 const matched=localStoredAt!==null&&localStoredAt===d1StoredAt&&
  localBodySha256!==null&&localBodySha256===d1BodySha256&&
  local.body===d1.body;
 const status=matched?'MATCHED':!d1?'D1_ROW_MISSING':
  d1StoredAt!==null&&localStoredAt!==null&&d1StoredAt>localStoredAt?
   'REMOTE_NEWER_PRESERVED':'NOT_MATCHED';
 return {key:DELTA_R44_OUTPUT_KEY,status,localStoredAt,d1StoredAt,
  localBodySha256,d1BodySha256};
}
