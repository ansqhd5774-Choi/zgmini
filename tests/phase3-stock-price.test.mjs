import test from 'node:test';
import assert from 'node:assert/strict';
import {parseStockPricePage,summarizeStockRows,createPhase3Handler} from '../worker/phase3-korea-stock-price.mjs';
const page=(rows,total=rows.length)=>({response:{header:{resultCode:'00'},body:{totalCount:total,items:{item:rows}}}});
test('stock price parser and summary preserve zero and market categories',()=>{const rows=[{basDt:'20260911',srtnCd:'1',mrktCtg:'KOSPI',clpr:'0'},{basDt:'20260911',srtnCd:'2',mrktCtg:'KOSDAQ',clpr:'10'}];const p=parseStockPricePage(page(rows));assert.equal(p.ok,true);const s=summarizeStockRows(p.rows);assert.deepEqual(s.countByMarket,{KOSPI:1,KOSDAQ:1});assert.equal(s.fieldQuality.clpr.numericCount,2);});
test('stock price diagnostic fails safely without secret and expires',async()=>{const h=createPhase3Handler();const r=await h(new Request('https://local.test/api/internal/phase3-korea-stock-price-check'),{});const d=await r.json();assert.equal(d.status,'BLOCKED');assert.equal(d.secret.fscApiKeyPresent,false);});
