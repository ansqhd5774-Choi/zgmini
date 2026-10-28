import test from 'node:test';
import assert from 'node:assert/strict';
import {probeNineR58} from '../scripts/pc-writer/theme-nine-r58-alpaca-readonly-probe.mjs';

test('existing Alpaca SIP raw 1h is only observed, never approved or published',async()=>{
  const requests=[];
  const fetchImpl=async(url,options)=>{
    const u=new URL(url);requests.push({url:u,options});
    if(u.hostname==='getmarkethistory.com'){
      return new Response(JSON.stringify({symbol:'SPY',timestamp:'2026-10-26T19:00:00Z',
        close:700,open:700,high:700,low:700,volume:1})+'\n');
    }
    if(u.searchParams.get('feed')==='sip'){
      return Response.json({bars:{SPY:[
        {t:'2026-10-26T19:00:00Z',c:700},
        {t:'2026-10-27T19:00:00Z',c:702}]},next_page_token:null});
    }
    return new Response('not enabled',{status:403});
  };
  const result=await probeNineR58({credentials:{id:'TOP_SECRET_ID',
    secret:'TOP_SECRET_KEY'},fetchImpl});
  assert.equal(result.status,'READ_ONLY_PROBE_COMPLETE');
  assert.equal(result.requests,3);
  assert.equal(result.gmh.sessions['2026-10-26'].hasUsableBar,true);
  assert.equal(result.alpaca.sip.sessions['2026-10-27'].hasUsableBar,true);
  assert.equal(result.alpaca.sip.baselineSPY26CloseExactMatch,true);
  assert.equal(result.alpaca.iex.httpStatus,403);
  assert.equal(result.alpaca.iex.baselineSPY26CloseExactMatch,null);
  assert.equal(result.priceModeApproved,false);
  assert.equal(result.d1Writes,0);
  assert.equal(result.rawWrites,0);
  assert.equal(result.published,false);
  assert.equal(requests.length,3);
  assert(requests.every(x=>x.options.method==='GET'));
  assert(requests.slice(1).every(x=>x.url.searchParams.get('adjustment')==='raw'));
  assert(!JSON.stringify(result).includes('TOP_SECRET'));
});

test('no configured credential causes no requests',async()=>{
  const result=await probeNineR58({credentials:null,fetchImpl:()=>{
    throw Error('SHOULD_NOT_CALL');
  }});
  assert.equal(result.status,'STOP_ALPACA_REGISTERED_CREDENTIALS_UNAVAILABLE');
  assert.equal(result.requests,0);
});
