import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INFLATION_PIT_SERIES,
  INFLATION_PIT_BATCHES,
  fredInitialReleaseUrl,
  parseFredInitialReleasePayload,
  collectInflationPitBatch,
} from '../worker/inflation-pit-backfill.mjs';
import {buildInflationHistoryPlan,API_HISTORY_INFLATION_CONTRACT} from '../worker/api-history-store.mjs';
import {loadStoredInflationPitSeries} from '../worker/inflation-pit-reader.mjs';
import {readFile} from 'node:fs/promises';

test('backfill contract has two bounded batches of 8',()=>{
  assert.equal(INFLATION_PIT_SERIES.length,16);
  assert.deepEqual(INFLATION_PIT_BATCHES.map(x=>x.length),[8,8]);
});

test('FRED initial release URL is PIT output_type=4 over complete realtime range',()=>{
  const u=fredInitialReleaseUrl('PCEPILFE','a'.repeat(32),{observationEnd:'2026-09-24'});
  assert.equal(u.hostname,'api.stlouisfed.org');
  assert.equal(u.searchParams.get('output_type'),'4');
  assert.equal(u.searchParams.get('realtime_start'),'1776-07-04');
  assert.equal(u.searchParams.get('realtime_end'),'9999-12-31');
  assert.equal(u.searchParams.get('observation_end'),'2026-09-24');
  assert.equal(u.searchParams.get('limit'),'100000');
});

test('initial release parser maps realtime_start to releaseDate and availableAt',()=>{
  const rows=parseFredInitialReleasePayload({
    output_type:4,count:2,observations:[
      {date:'2020-01-01',value:'1.25',realtime_start:'2020-02-13'},
      {date:'2020-02-01',value:'1.50',realtime_start:'2020-03-12'},
    ]
  },'PCEPILFE',{observationEnd:'2026-09-24'});
  assert.equal(rows.length,2);
  assert.equal(rows[0].releaseDate,'2020-02-13');
  assert.equal(rows[0].availableAt,'2020-02-13');
  assert.equal(rows[0].vintageMethod,'FRED_INITIAL_RELEASE_OUTPUT_TYPE_4');
});

test('store accepts initial-release history and research candidate dataset',async()=>{
  assert.ok(API_HISTORY_INFLATION_CONTRACT.datasets.includes('ECIALLCIV'));
  assert.ok(API_HISTORY_INFLATION_CONTRACT.acceptedStatuses.includes('READY_INITIAL_RELEASE_HISTORY'));
  const plans=await buildInflationHistoryPlan([{
    seriesId:'ECIALLCIV',
    status:'READY_INITIAL_RELEASE_HISTORY',
    authority:'BLS',
    transport:'FRED_API_OUTPUT_TYPE_4',
    frequency:'QUARTERLY',
    historyMode:'INITIAL_RELEASE_ONLY',
    releaseDatePolicy:'FRED_REALTIME_START_INITIAL_RELEASE',
    availableAtPolicy:'FRED_REALTIME_START_INITIAL_RELEASE',
    sourceCount:1,requestCount:1,
    rows:[{
      observationDate:'2020-01-01',value:100,
      releaseDate:'2020-01-31',availableAt:'2020-01-31',
      realtimeStart:'2020-01-31',realtimeEnd:null,
      vintageId:'2020-01-31',vintageMethod:'FRED_INITIAL_RELEASE_OUTPUT_TYPE_4',
      revision:'INITIAL_RELEASE'
    }]
  }],{asOf:'2026-09-24',retrievedAt:'2026-09-24T00:00:00.000Z'});
  assert.equal(plans.length,1);
  assert.equal(plans[0].historyMode,'INITIAL_RELEASE_ONLY');
});

test('collector uses no retry and at most 8 requests per batch',async()=>{
  let calls=0;
  const fetchImpl=async input=>{
    calls+=1;
    const u=new URL(String(input));
    const id=u.searchParams.get('series_id');
    const body=JSON.stringify({
      output_type:4,count:1,observations:[
        {date:'2020-01-01',value:'1.0',realtime_start:'2020-02-01'}
      ]
    });
    return new Response(body,{status:200,headers:{'content-type':'application/json'}});
  };
  const result=await collectInflationPitBatch({
    key:'a'.repeat(32),batch:1,observationEnd:'2026-09-24',fetchImpl
  });
  assert.equal(result.requestCount,8);
  assert.equal(calls,8);
  assert.equal(result.results.filter(x=>x.status==='READY_INITIAL_RELEASE_HISTORY').length,8);
});

class Stmt {
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  async first(){
    if(this.sql.includes('api_history_snapshots_v1')){
      assert.match(this.sql,/history_mode='INITIAL_RELEASE_ONLY'/);
      return {
        snapshot_sha256:'s',retrieved_at:'2026-09-24T00:00:00.000Z',
        history_mode:'INITIAL_RELEASE_ONLY',row_count:3,
        chunk_hashes_json:'["c"]'
      };
    }
    if(this.sql.includes('api_history_chunks_v1')){
      return {payload_json:JSON.stringify([
        {observationDate:'2020-01-01',value:1,availableAt:'2020-02-01',releaseDate:'2020-02-01'},
        {observationDate:'2020-02-01',value:2,availableAt:'2020-03-01',releaseDate:'2020-03-01'},
        {observationDate:'2020-03-01',value:3,availableAt:'2020-04-01',releaseDate:'2020-04-01'},
      ])};
    }
    throw new Error('UNEXPECTED_SQL');
  }
}
class Db { prepare(sql){return new Stmt(sql);} }

test('stored PIT reader excludes values not yet available at asOf',async()=>{
  const r=await loadStoredInflationPitSeries(new Db(),{
    asOf:'2020-03-15',seriesIds:['PCEPILFE']
  });
  assert.equal(r.status,'READY_STORED_PIT_HISTORY');
  assert.equal(r.series.PCEPILFE.length,2);
  assert.equal(r.series.PCEPILFE.at(-1).observationDate,'2020-02-01');
  assert.equal(r.lookAheadSafe,true);
});

test('active scoring reader is pinned to CURRENT_VINTAGE_ONLY snapshots',async()=>{
  const text=await readFile(new URL('../worker/inflation-history-reader.mjs',import.meta.url),'utf8');
  assert.match(text,/history_mode='CURRENT_VINTAGE_ONLY'/);
});
