import {gunzipSync} from 'node:zlib';
import {Buffer} from 'node:buffer';
import {buildRateSentimentR1,RATE_SENTIMENT_R1_RESEARCH} from '../../lib/market-score/rate-sentiment-r1-research.mjs';

export const RATE_SENTIMENT_PUBLIC_KEY='public:rate-sentiment:v1';
const finite=Number.isFinite;
const display=x=>Number(x.toFixed(2));

function decode(body){
 if(typeof body!=='string')throw Error('RATE_SENTIMENT_RATE_BATCH_INVALID');
 const json=body.startsWith('gzip:')?gunzipSync(Buffer.from(body.slice(5),'base64'),{maxOutputLength:32000000}).toString('utf8'):body;
 return JSON.parse(json);
}
export async function preparePublicRateSentiment(core,now=Date.now()){
 const source=await core.prepare("SELECT body,stored_at FROM market_input_batches_v1 WHERE batch_key LIKE 'rates:%' ORDER BY stored_at DESC LIMIT 1").first();
 if(!source)return {status:'NOT_READY',reason:'STORED_RATES_MISSING',prepared:false};
 const timestamp=Number(source.stored_at);
 if(!Number.isSafeInteger(timestamp)||timestamp<1||timestamp>now+60000)throw Error('RATE_SENTIMENT_SOURCE_STORED_AT_INVALID');
 const series=decode(source.body)?.rateR2?.series??{};
 const result=buildRateSentimentR1({
  dgs2Rows:series.DGS2??[],dgs3moRows:series.DGS3MO??[],dgs10Rows:series.DGS10??[],
  asOfDate:new Date(now).toISOString().slice(0,10),
 });
 if(result.status!=='READY')return {status:result.status,reason:result.reason,observationDate:result.observationDate,prepared:false};
 const formatPoint=row=>({label:row.date,value:display(row.score)});
 const body={
  status:'READY',score:display(result.score),observationDate:result.observationDate,
  version:RATE_SENTIMENT_R1_RESEARCH.version,source:'FEDERAL_RESERVE_H15_STORED_RATES',
  sourceStoredAt:timestamp,historyMode:'CURRENT_VINTAGE_ONLY',
  interpretation:'금리 심리 점수(0~100). FedWatch 금리 인상·동결 확률이 아닙니다.',
  weights:RATE_SENTIMENT_R1_RESEARCH.weights,
  week:result.week.map(formatPoint),oneMonth:result.oneMonth.map(formatPoint),
 };
 const encoded=JSON.stringify(body);
 if(Buffer.byteLength(encoded)>30000)throw Error('RATE_SENTIMENT_PUBLIC_PAYLOAD_LIMIT');
 const old=await core.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind(RATE_SENTIMENT_PUBLIC_KEY).first();
 if(old&&Number(old.stored_at)>timestamp)return {status:'LOCAL_NEWER_PRESERVED',prepared:false,observationDate:body.observationDate};
 if(!old||old.body!==encoded||Number(old.stored_at)!==timestamp){
  await core.prepare('INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE excluded.stored_at>=market_public_snapshots_v1.stored_at').bind(RATE_SENTIMENT_PUBLIC_KEY,encoded,timestamp).run();
 }
 return {status:'LOCAL_READY',prepared:true,observationDate:body.observationDate,sourceStoredAt:timestamp,body};
}
export async function publishPublicRateSentiment(remote,db,prepared){
 if(!prepared?.prepared)return {status:'SKIPPED_NOT_READY'};
 const body=prepared.body,storedAt=prepared.sourceStoredAt,encoded=JSON.stringify(body);
 const before=(await remote.query(db,'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',[RATE_SENTIMENT_PUBLIC_KEY])).results?.[0]??null;
 if(before&&Number(before.stored_at)>storedAt)return {status:'REMOTE_NEWER_PRESERVED'};
 if(before&&before.body===encoded&&Number(before.stored_at)===storedAt)return {status:'UNCHANGED'};
 await remote.request(db,[{
  sql:'INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE excluded.stored_at>=market_public_snapshots_v1.stored_at',
  params:[RATE_SENTIMENT_PUBLIC_KEY,encoded,storedAt],
 }]);
 const after=(await remote.query(db,'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',[RATE_SENTIMENT_PUBLIC_KEY])).results?.[0]??null;
 if(!after||Number(after.stored_at)!==storedAt||after.body!==encoded)throw Error('RATE_SENTIMENT_PUBLICATION_READBACK_MISMATCH');
 return {status:'VERIFIED',observationDate:body.observationDate,storedAt};
}
