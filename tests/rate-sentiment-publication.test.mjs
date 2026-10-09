import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {preparePublicRateSentiment,publishPublicRateSentiment,RATE_SENTIMENT_PUBLIC_KEY} from '../scripts/pc-writer/rate-sentiment-publication.mjs';
import {storedRateSentimentResponse} from '../worker/rate-sentiment-public.mjs';
import {buildRateSentimentR1} from '../lib/market-score/rate-sentiment-r1-research.mjs';

function dbState({series=null,storedAt=Date.parse('2026-10-08T00:00:00Z')}={}){
 const data=new Map();
 const input=series?{body:'gzip:'+gzipSync(JSON.stringify({rateR2:{series}})).toString('base64'),stored_at:storedAt}:null;
 const db={prepare(sql){return {bind(...args){this.args=args;return this;},async first(){if(sql.includes('market_input_batches_v1'))return input;const k=this.args[0],r=data.get(k);return r?{body:r.body,stored_at:r.storedAt}:null;},async run(){const[k,body,at]=this.args;data.set(k,{body,storedAt:at});return {success:true};}};}};
 return {db,data};
}
function sample(){
 const series={DGS2:[],DGS3MO:[],DGS10:[]};
 const d=new Date('2023-01-02T12:00:00Z');
 for(let i=0;i<950;i++){while([0,6].includes(d.getUTCDay()))d.setUTCDate(d.getUTCDate()+1);
  const observationDate=d.toISOString().slice(0,10);
  series.DGS2.push({observationDate,value:4+Math.sin(i/13)*.12});
  series.DGS3MO.push({observationDate,value:4.15+Math.sin(i/29)*.06});
  series.DGS10.push({observationDate,value:4.7+Math.cos(i/17)*.18});
  d.setUTCDate(d.getUTCDate()+1);
 }
 return series;
}
test('PC calculation preserves score through calendar day 7 and expires on day 8',()=>{
 const s=sample(),last=s.DGS2.at(-1).observationDate;
 const calc=days=>buildRateSentimentR1({dgs2Rows:s.DGS2,dgs3moRows:s.DGS3MO,dgs10Rows:s.DGS10,asOfDate:new Date(Date.parse(last+'T00:00:00Z')+days*86400000).toISOString().slice(0,10)});
 assert.equal(calc(7).status,'READY');assert.equal(calc(7).score,calc(0).score);
 assert.equal(calc(8).status,'STALE');assert.equal(calc(8).score,null);
});
test('writer publishes only bounded display data and requires remote readback',async()=>{
 const series=sample(),asOf=series.DGS2.at(-1).observationDate;
 const now=Date.parse(asOf+'T12:00:00Z');
 const {db,data}=dbState({series,storedAt:now-3600000});
 const computed=await preparePublicRateSentiment(db,now);
 assert.equal(computed.status,'LOCAL_READY');
 const body=computed.body;
 assert.equal(body.week.length,5);assert.equal(body.oneMonth.length,22);assert.ok(body.score>0);
 assert.equal(body.sourceStoredAt,now-3600000);
 assert.ok(!JSON.stringify(body).includes('DGS2')); // only display points, not raw source series
 const remote={query:async (_db,_sql,[key])=>({results:data.has(key)?[{body:data.get(key).body,stored_at:data.get(key).storedAt}]:[]}),request:async()=>({success:true})};
 // same local and remote state should be unchanged
 assert.equal((await publishPublicRateSentiment(remote,'core',computed)).status,'UNCHANGED');
 const separate=new Map();
 const remote2={query:async (_db,_sql,[key])=>({results:separate.has(key)?[separate.get(key)]:[]}),request:async (_db,[statement])=>{const[k,b,at]=statement.params;separate.set(k,{body:b,stored_at:at});}};
 assert.equal((await publishPublicRateSentiment(remote2,'core',computed)).status,'VERIFIED');
 assert.equal(JSON.parse(separate.get(RATE_SENTIMENT_PUBLIC_KEY).body).week.length,5);
});
test('missing stored rates never fabricate a score or call remote publisher',async()=>{
 const {db}=dbState();const x=await preparePublicRateSentiment(db,Date.now());assert.equal(x.status,'NOT_READY');assert.equal(x.prepared,false);
});
test('public API returns READY only for valid recent stored observation',async()=>{
 const series=sample(),asOf=series.DGS2.at(-1).observationDate,now=Date.parse(asOf+'T12:00:00Z');
 const {db,data}=dbState({series,storedAt:now-3600000});
 await preparePublicRateSentiment(db,now);
 const request=new Request('https://example.test/api/rate-sentiment');
 const response=await storedRateSentimentResponse(request,{db,now});
 assert.equal(response.status,200);
 assert.equal((await response.json()).status,'READY');
 const stale=await storedRateSentimentResponse(request,{db,now:now+12*86400000});
 assert.equal(stale.status,503);
 assert.equal((await storedRateSentimentResponse(new Request('https://example.test/api/rate-sentiment',{method:'POST'}),{db,now})).status,405);
});
test('score is only calculated on PC and GET route never calls provider or computes',()=>{
 const writer=fs.readFileSync(new URL('../scripts/pc-writer/run-local.mjs',import.meta.url),'utf8');
 const get=fs.readFileSync(new URL('../worker/rate-sentiment-public.mjs',import.meta.url),'utf8');
 const index=fs.readFileSync(new URL('../worker/index.ts',import.meta.url),'utf8');
 const ui=fs.readFileSync(new URL('../app/outbreak-events.tsx',import.meta.url),'utf8');
 assert.match(writer,/preparePublicRateSentiment/);
 assert.match(writer,/publishPublicRateSentiment/);
 assert.match(index,/api\/rate-sentiment/);
 assert.match(ui,/useRateSentiment/);
 assert.match(ui,/금리 심리/);
 assert.doesNotMatch(get,/fetch\(|INSERT INTO|UPDATE |calculateMarket|buildRateSentimentR1/);
});

test('vinext App Router exposes the stored-only fallback without provider calls or writes',()=>{
 const source=fs.readFileSync(new URL('../app/api/rate-sentiment/route.ts',import.meta.url),'utf8');
 assert.match(source,/export async function GET\(request:Request\)/);
 assert.match(source,/storedRateSentimentResponse\(request,\{db:env\.DB\}\)/);
 assert.doesNotMatch(source,/fetch\(|INSERT INTO|UPDATE |--publish|CREATE TABLE|ALTER TABLE/);
});
