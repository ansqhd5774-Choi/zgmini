import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collectIexPages,MAX_API_REQUESTS} from '../tools/us-market-breadth-r1/iex-intraday-replay-r16.mjs';
import {replay15Min} from '../tools/us-market-breadth-r1/iex-intraday-replay-r15.mjs';

const members=Array.from({length:503},(_,i)=>'T'+i);
const confirmedRows=members.map(ticker=>({ticker,trade_date:'2026-10-30',
  previous_close:100,current_close:102,source:'MarketParquet Free Sample'}));

test('entire 503-member universe survives multi-page collection',async()=>{
  const pages=Array.from({length:15},(_,i)=>{
    const selected=members.slice(i*35,(i+1)*35);
    const bars=Object.fromEntries(selected.map(ticker=>[ticker,[
      {t:'2026-10-30T13:30:00Z',c:101,v:10},
      {t:'2026-10-30T19:45:00Z',c:102,v:10},
    ]]));
    return {bars,next_page_token:i===14?null:'page'+(i+1)};
  });
  const collected=await collectIexPages({fetchPage:async token=>{
    const index=token?Number(token.replace('page','')):0;
    return pages[index];
  }});
  assert.equal(collected.requests,15);
  assert.equal(collected.hasNextPage,false);
  assert.equal(Object.keys(collected.bars).length,503);
  const replay=replay15Min({members,confirmedRows,bars:collected.bars,
    hasNextPage:collected.hasNextPage});
  assert.equal(replay.snapshots.at(-1).observed,503);
  assert.equal(replay.snapshots.at(-1).finalDirectionAgreement,503);
  assert.equal(replay.diagnosticStatus,'REPLAY_READY_FOR_REVIEW');
});

test('24-page ceiling explicitly reports pending pagination',async()=>{
  let count=0;
  const result=await collectIexPages({fetchPage:async()=>({bars:{A:[
    {t:'2026-10-30T13:30:00Z',c:101,v:10}]},
    next_page_token:'page'+(++count)})});
  assert.equal(result.requests,MAX_API_REQUESTS);
  assert.equal(result.hasNextPage,true);
});

test('duplicate pagination tokens cannot loop indefinitely',async()=>{
  await assert.rejects(collectIexPages({fetchPage:async()=>({
    bars:{A:[{t:'2026-10-30T13:30:00Z',c:101,v:10}]},
    next_page_token:'repeated'
  })}),/R16_PAGINATION_INVALID/);
});

test('empty page with continuation is diagnosed',async()=>{
  await assert.rejects(collectIexPages({fetchPage:async()=>({
    bars:{},next_page_token:'another'
  })}),/R16_PAGINATION_INVALID/);
});

test('request budget cannot exceed the safety ceiling',async()=>{
  await assert.rejects(collectIexPages({fetchPage:async()=>({bars:{}}),
    maxRequests:MAX_API_REQUESTS+1}),/R16_REQUEST_BUDGET_INVALID/);
});
