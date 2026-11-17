import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {buildEarningsCostIndicatorView,KNOWN_EARNINGS_COST_INDICATORS,
 OPTIONAL_EARNINGS_COST_INDICATORS,EARNINGS_C_COST_SCHEMA} from "./earnings-cost-indicator-list.mjs";

const page=readFileSync(new URL("./page.tsx",import.meta.url),"utf8");
const risk=readFileSync(new URL("./earnings-risk-only-panel.tsx",import.meta.url),"utf8");
const styles=readFileSync(new URL("./earnings-indicator-r2.css",import.meta.url),"utf8");

test("BLS observations are rendered inside the existing risk indicator table",()=>{
 assert.ok(page.includes("<EarningsRiskOnlyPanel/>"));
 assert.ok(!page.includes("EarningsCompanionPanel"));
 assert.ok(!existsSync(new URL("./earnings-companion-panel.tsx",import.meta.url)));
 assert.ok(!existsSync(new URL("./earnings-companion-panel.css",import.meta.url)));
 const table=risk.slice(risk.indexOf("<tbody>"),risk.indexOf("</tbody>"));
 assert.ok(table.includes("ids.map"));
 assert.ok(table.includes("costIndicators.map"));
 assert.ok(risk.includes('useStoredIndex<CostPayload>("/api/earnings-recession-indicators")'));
 assert.equal(EARNINGS_C_COST_SCHEMA,"earnings-companion-c-r4-v1");
 assert.ok(risk.includes('buildEarningsCostIndicatorView(costPayload)'));
 assert.ok(risk.includes("추가 {costIndicators.length}개는 BLS 비용 압력 원자료"));
 assert.ok(!risk.includes("추가 5개는 BLS 비용 압력 원자료"));
 assert.equal((risk.match(/costIndicators\.map\(meta/g)??[]).length,2);
 assert.deepEqual(KNOWN_EARNINGS_COST_INDICATORS.map(row=>row.id),[
  "bls_ppi_final_demand_yoy_sa","bls_ppi_final_demand_index",
  "bls_ppi_goods_yoy_sa","bls_ppi_goods_index","bls_unit_labor_cost_yoy"
 ]);
 assert.ok(risk.includes('row.freshness?.status==="FRESH"'));
 assert.ok(risk.includes("costFormat(row.value,row.unit)"));
 assert.ok(risk.includes("<CostSpark history={row.history}/>"));
 assert.ok(risk.includes("earnings-r2-cost-mobile-card"));
 assert.ok(styles.includes(".earnings-r2-cost-spark"));
});

test("BLS cost values do not modify the E1 risk score or diagnostics",()=>{
 assert.ok(risk.includes('const {payload,loading}=useStoredIndex<RiskPayload>("/api/earnings-recession-detail");'));
 assert.ok(risk.includes('const score=payload?.status==="READY"&&validScore(payload?.score)?payload.score:null;'));
 assert.ok(!risk.includes("costRows.get(id)"));
 assert.ok(!risk.includes("score+cost"));
 assert.ok(risk.includes("점수 미반영"));
});


test("BEA manufacturing YoY is only rendered from a READY stored sidecar on desktop and mobile",()=>{
 assert.ok(risk.includes('useStoredIndex<BeaMfgPayload>("/api/earnings-recession-bea-manufacturing-profit")'));
 assert.ok(risk.includes('earnings-bea-manufacturing-profits-r1-v1'));
 assert.ok(risk.includes('N400RC1Q027SBEA'));
 assert.ok(risk.includes('payload.freshness?.status==="FRESH"'));
 assert.ok(risk.includes('mfgReady&&mfgRow&&<tr'));
 assert.ok(risk.includes('mfgReady&&mfgRow&&<article'));
 assert.equal((risk.match(/data-source="bea-manufacturing-profit"/g)??[]).length,2);
 assert.ok(risk.includes("mfgProfitFormat(mfgRow.currentProfitsBillionsUsdAnnualRate)"));
 assert.ok(risk.includes("mfgYoYFormat(mfgRow.value)"));
 assert.ok(risk.includes("점수 미반영"));
 assert.ok(!risk.includes("score+mfg"));
 assert.ok(!risk.includes("setScore("));
});

const storedCostRow=(meta,{value=0,...override}={})=>({
 indicatorId:meta.id,name:meta.name,category:"COST_PRESSURE",kind:meta.kind,
 value,unit:meta.unit,frequency:"MONTHLY",adjustment:"SA",
 changeUnit:meta.unit==="INDEX"?"INDEX_POINTS":"PERCENTAGE_POINTS",
 provider:"BLS",seriesId:meta.series,
 sourceURL:"https://data.bls.gov/timeseries/"+meta.series,
 status:"READY",freshness:{status:"FRESH",reason:null},...override,
});
const costFixture=rows=>({
 schemaVersion:EARNINGS_C_COST_SCHEMA,
 historicalMode:"CURRENT_RETRIEVAL_NOT_PIT",
 rows,
});

test("WPSFD42 appears on both desktop and mobile only when the verified service pair exists",()=>{
 const base=KNOWN_EARNINGS_COST_INDICATORS.map(meta=>storedCostRow(meta));
 const extra=OPTIONAL_EARNINGS_COST_INDICATORS.map(meta=>storedCostRow(meta));
 const before=buildEarningsCostIndicatorView(costFixture(base));
 assert.equal(before.valid,true);
 assert.equal(before.indicators.length,5);
 assert.equal(before.rows.length,5);
 assert.equal(before.rows[0].value,0); // a real zero must not be turned into missing
 assert.equal(buildEarningsCostIndicatorView(costFixture([...base,extra[0]])).indicators.length,5);
 const after=buildEarningsCostIndicatorView(costFixture([...base,...extra]));
 assert.equal(after.indicators.length,7);
 assert.deepEqual(after.indicators.slice(5).map(row=>row.id),[
  "bls_ppi_services_yoy_sa","bls_ppi_services_index"
 ]);
 assert.equal(after.rows.length,7);
 assert.equal(after.rows[5].value,0);
 assert.equal((risk.match(/costIndicators\.map\(meta/g)??[]).length,2);
});

test("W05 UI rejects unapproved, duplicate and malformed service display rows",()=>{
 const base=KNOWN_EARNINGS_COST_INDICATORS.map(meta=>storedCostRow(meta));
 const [yoy,index]=OPTIONAL_EARNINGS_COST_INDICATORS.map(meta=>storedCostRow(meta));
 const unknown=storedCostRow({...yoy,id:"bls_unknown_series_indicator"});
 assert.equal(buildEarningsCostIndicatorView(costFixture([...base,yoy,index,unknown]))
  .indicators.length,7);
 assert.equal(buildEarningsCostIndicatorView(costFixture([...base,yoy,yoy,index]))
  .rows.length,7);
 const wrongUnit={...index,unit:"PERCENT",changeUnit:"PERCENTAGE_POINTS"};
 assert.equal(buildEarningsCostIndicatorView(costFixture([...base,yoy,wrongUnit]))
  .indicators.length,5);
 const wrongSource={...index,sourceURL:"https://example.org/not-bls"};
 assert.equal(buildEarningsCostIndicatorView(costFixture([...base,yoy,wrongSource]))
  .indicators.length,5);
 assert.equal(buildEarningsCostIndicatorView({schemaVersion:"unapproved",rows:[...base,yoy,index]})
  .indicators.length,5);
});

test("WPSFD42 optional UI rows require BOTH READY and FRESH; base five remain",()=>{
 const base=KNOWN_EARNINGS_COST_INDICATORS.map(meta=>storedCostRow(meta));
 const [yoy,index]=OPTIONAL_EARNINGS_COST_INDICATORS.map(meta=>storedCostRow(meta));
 const cases=[
  {label:"partial service index",row:{...index,status:"PARTIAL",value:null}},
  {label:"stale status",row:{...index,status:"STALE",value:null,freshness:{status:"STALE",reason:"OBSERVATION_EXPIRED"}}},
  {label:"stale freshness on nominal ready",row:{...index,freshness:{status:"STALE",reason:"SOURCE_RETRIEVAL_EXPIRED"}}},
  {label:"unavailable",row:{...index,status:"UNAVAILABLE",value:null}},
  {label:"no freshness proof",row:{...index,freshness:undefined}},
  {label:"invalid missing value",row:{...index,value:null}},
 ];
 for(const {label,row} of cases){
  const view=buildEarningsCostIndicatorView(costFixture([...base,yoy,row]));
  assert.deepEqual(view.indicators.map(meta=>meta.id),base.map(meta=>meta.indicatorId),label);
  assert.equal(view.rows.length,5,label);
  assert.equal(view.rows[0].value,0,label);
 }
 const published=buildEarningsCostIndicatorView(costFixture([...base,yoy,index]));
 assert.equal(published.indicators.length,7);
 assert.equal(published.rows.length,7);
 assert.equal(published.rows[5].value,0);
});
