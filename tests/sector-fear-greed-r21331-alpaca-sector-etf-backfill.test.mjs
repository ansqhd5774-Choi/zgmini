import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {TARGETS,START,END,EXPECTED_SESSIONS,MAX_PROVIDER_REQUESTS,normalizeR21331Bars,buildR21331RequestUrl} from "../scripts/pc-writer/sector-fear-greed-r21331-alpaca-sector-etf-backfill.mjs";

function dates(n){const out=[];let d=new Date("2024-01-01T00:00:00Z");while(out.length<n){const day=d.getUTCDay();if(day!==0&&day!==6)out.push(d.toISOString().slice(0,10));d.setUTCDate(d.getUTCDate()+1);}return out.slice(-n);}

test("R2.13.31 normalizes all 11 ETF series with one shared 89-session set",()=>{
  const ds=dates(EXPECTED_SESSIONS).map((_,i)=>{const d=new Date("2024-04-09T00:00:00Z");d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);}).filter(d=>d>=START&&d<=END).slice(0,EXPECTED_SESSIONS);
  while(ds.length<EXPECTED_SESSIONS){const d=new Date(ds.at(-1)+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+1);const s=d.toISOString().slice(0,10);if(s<=END)ds.push(s);else break;}
  assert.equal(TARGETS.length,11);assert.equal(MAX_PROVIDER_REQUESTS,1);
  const use=Array.from({length:EXPECTED_SESSIONS},(_,i)=>{const d=new Date("2024-04-09T00:00:00Z");d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);});
  const payload={bars:Object.fromEntries(TARGETS.map((t,j)=>[t,use.map((d,i)=>({t:`${d}T00:00:00Z`,c:100+j+i/10,v:1000+i}))])),next_page_token:null};
  const r=normalizeR21331Bars(payload,{start:use[0],end:use.at(-1),expectedSessions:EXPECTED_SESSIONS});assert.equal(r.sessions,89);assert.equal(r.totalRows,979);
});

test("R2.13.31 request is exactly one multi-symbol IEX split-adjusted daily window",()=>{const u=buildR21331RequestUrl();assert.equal(u.searchParams.get("symbols"),TARGETS.join(","));assert.equal(u.searchParams.get("timeframe"),"1Day");assert.equal(u.searchParams.get("feed"),"iex");assert.equal(u.searchParams.get("adjustment"),"split");assert.equal(u.searchParams.get("start"),`${START}T00:00:00Z`);assert.equal(u.searchParams.get("end"),`${END}T23:59:59Z`);});

test("R2.13.31 source preserves Production contracts",()=>{const src=fs.readFileSync(fileURLToPath(new URL("../scripts/pc-writer/sector-fear-greed-r21331-alpaca-sector-etf-backfill.mjs",import.meta.url)),"utf8");assert.match(src,/MAX_PROVIDER_REQUESTS=1/);assert.match(src,/productionFormulaChanged:false/);assert.match(src,/referenceRequirementChanged:false/);assert.match(src,/normalizationChanged:false/);assert.match(src,/weightsChanged:false/);assert.match(src,/productionBenchmarkSourceChanged:false/);assert.doesNotMatch(src,/wrangler\s+deploy/i);assert.doesNotMatch(src,/DELETE\s+FROM|DROP\s+TABLE/i);});
