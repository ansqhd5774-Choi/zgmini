import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchRev7Date} from '../worker/korea-rev7-provider.mjs';

const date='20260915';
const response=body=>Response.json(body);
const rows=items=>({OutBlock_1:items});
const bok=value=>({StatisticSearch:{row:[{TIME:date,DATA_VALUE:String(value)}]}});

function fixtureFetch(calls) {
  return async url=>{
    const u=new URL(url);
    calls.push(u.pathname+u.search);
    if(u.hostname==='ecos.bok.or.kr') {
      if(u.pathname.endsWith('/010300000')) return response(bok(3.5));
      if(u.pathname.endsWith('/010320000')) return response(bok(5.5));
      throw Error('unexpected BOK');
    }
    if(u.pathname.endsWith('/idx/kospi_dd_trd')) return response(rows([{BAS_DD:date,IDX_NM:'코스피',CLSPRC_IDX:'3000'}]));
    if(u.pathname.endsWith('/idx/bon_dd_trd')) return response(rows([
      {BAS_DD:date,BND_IDX_GRP_NM:'KTB 지수',TOT_EARNG_IDX:'15000'},
      {BAS_DD:date,BND_IDX_GRP_NM:'국고채프라임지수',TOT_EARNG_IDX:'200'},
    ]));
    if(u.pathname.endsWith('/idx/drvprod_dd_trd')) return response(rows([{BAS_DD:date,IDX_NM:'코스피 200 변동성지수',CLSPRC_IDX:'22.5'}]));
    if(u.pathname.endsWith('/drv/opt_bydd_trd')) return response(rows([
      {BAS_DD:date,PROD_NM:'코스피200 옵션',RGHT_TP_NM:'CALL',ACC_TRDVOL:'100'},
      {BAS_DD:date,PROD_NM:'코스피200 옵션',RGHT_TP_NM:'PUT',ACC_TRDVOL:'75'},
      {BAS_DD:date,PROD_NM:'미니코스피200 옵션',RGHT_TP_NM:'PUT',ACC_TRDVOL:'999'},
    ]));
    if(u.pathname.endsWith('/sto/stk_bydd_trd')) return response(rows(Array.from({length:501},(_,i)=>({
      BAS_DD:date,ISU_CD:String(i).padStart(6,'0'),TDD_CLSPRC:'100',TDD_HGPRC:'105',TDD_LWPRC:'95',
      CMPPREVDD_PRC:i%2?'1':'-1',ACC_TRDVOL:'1000'
    }))));
    throw Error('unexpected '+u);
  };
}
test('exact KRX/BOK primary series and standard KOSPI200 option are selected',async()=>{
  const calls=[];
  const out=await fetchRev7Date(date,{krxKey:'k',bokKey:'b',fetchImpl:fixtureFetch(calls)});
  assert.equal(out.status,'SUCCESS');
  assert.equal(out.krxRequestCount,5);
  assert.equal(out.bokRequestCount,2);
  assert.equal(out.rows.length,501);
  assert.equal(out.series.kospiClose,3000);
  assert.equal(out.series.vkospi200Close,22.5);
  assert.equal(out.series.ktbTotalReturn,15000);
  assert.equal(out.series.putCallRatio,.75);
  assert.equal(out.series.junkSpread,2);
  assert.equal(out.researchOnly,true);
  assert.equal(out.productionEligible,false);
});
test('non-trading day stops after KOSPI index probe',async()=>{
  const calls=[];
  const out=await fetchRev7Date('20260913',{krxKey:'k',bokKey:'b',fetchImpl:async url=>{calls.push(String(url));return response(rows([]));}});
  assert.equal(out.status,'NO_TRADING_OBSERVATION');
  assert.equal(calls.length,1);
  assert.equal(out.krxRequestCount,1);
  assert.equal(out.bokRequestCount,0);
});
