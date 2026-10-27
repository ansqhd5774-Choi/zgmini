import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {scoreAll252} from '../scripts/pc-writer/theme-optional-score-r188.mjs';
import {auditLegacyNine} from '../scripts/pc-writer/theme-nine-shadow-r1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const scope=JSON.parse(fs.readFileSync(path.join(root,'config/theme-nine-remodel-scope-r1.json'),'utf8'));
const names=scope.themeIds;
const registry={themes:names.map((id,i)=>({id,label:id,
 symbols:[`ETF${i}A`,`ETF${i}B`],benchmark:'SPY',
 methodologyVersion:scope.expectedLegacyMethodology}))};
function dates(count){
 const result=[];
 for(let at=Date.parse('2023-01-02T00:00:00Z');result.length<count;at+=86400000){
  const day=new Date(at);
  if(day.getUTCDay()>0&&day.getUTCDay()<6)result.push(day.toISOString().slice(0,10));
 }
 return result;
}
function sample(id=names[0],count=700){
 const item=registry.themes.find(x=>x.id===id);
 const rows=dates(count).map((date,i)=>({date,SPY:100*Math.exp(.00021*i+Math.sin(.06*i)*.01),
  [item.symbols[0]]:80*Math.exp(.0003*i+Math.sin(.1*i)*.02),
  [item.symbols[1]]:75*Math.exp(.00025*i+Math.cos(.11*i)*.016)}));
 return {id,priceMode:'UNIT_TEST_SYNTHETIC_NEVER_PUBLISH',sourceEvidence:'UNIT_TEST_ONLY',rows};
}
function run(themes,options){return auditLegacyNine({registry,scope,exported:{
 contractVersion:'THEME_NINE_SHADOW_R1',themes},...options});}

test('nine-theme scope is fixed and does not silently capture the next theme',()=>{
 assert.equal(names.length,9);
 assert.deepEqual(new Set(names).size,9);
 assert.throws(()=>run([{...sample(),id:'data-center-power'}]),
  {code:'THEME_NINE_R1_UNAUTHORIZED_OR_DUPLICATE_THEME'});
 const changed=structuredClone(registry);
 changed.themes[0].methodologyVersion='UNAPPROVED_REWEIGHT';
 assert.throws(()=>auditLegacyNine({registry:changed,scope,exported:{
  contractVersion:'THEME_NINE_SHADOW_R1',themes:[]}}),
  {code:'THEME_NINE_R1_REGISTRY_DRIFT'});
});

test('full 628+ real-date fixture: candidate 50:50 equals R188 in every 252-day point',()=>{
 const input=sample(),[a,b]=registry.themes[0].symbols;
 const rows=input.rows;
 const x=scoreAll252(rows.map(v=>v[a]),rows.map(v=>v.SPY));
 const y=scoreAll252(rows.map(v=>v[b]),rows.map(v=>v.SPY));
 input.published=rows.slice(-252).map((row,i)=>({date:row.date,score:(x[i]+y[i])/2}));
 const before=JSON.stringify(input);
 const result=run([input],{includeHistory:true}),first=result.themes[0];
 assert.equal(JSON.stringify(input),before);
 assert.equal(result.status,'READ_ONLY_CANDIDATE_NOT_PUBLICATION_APPROVED');
 assert.equal(result.missingInputThemes.length,8);
 assert.equal(first.yearWindowDates,252);
 assert.equal(first.scoredDays,252);
 assert.equal(first.provisionalDays,0);
 assert.equal(first.referenceComparableDays,252);
 assert.equal(first.publishedComparableDays,252);
 assert.equal(first.referenceParityViolations,0);
 assert.ok(first.referenceMaxAbsDifference<1e-10);
 assert.ok(first.publishedMaxAbsDifference<1e-10);
 assert.equal(first.history.length,252);
 assert.equal(first.latest.date,rows.at(-1).date);
 assert.equal(result.approvedForCutover,false);
 assert.equal(result.approvedForD1Writes,false);
 assert.equal(first.sourceProvenanceShaVerified,false);
});

test('young component keeps real 252-day axis and does not manufacture old ETF scores',()=>{
 const input=sample(names[1]);
 const young=registry.themes[1].symbols[1];
 for(let i=0;i<input.rows.length-120;i++)input.rows[i][young]=null;
 const report=run([input],{includeHistory:true}).themes[1];
 assert.equal(report.yearWindowDates,252);
 assert.equal(report.referenceComparableDays,0);
 assert.ok(report.missingDays>0);
 assert.ok(report.scoredDays>0);
 assert.equal(report.history[0].adaptiveR2Pair50,null);
 assert.equal(report.history[0].date,input.rows.at(-252).date);
 assert.equal(report.history.at(-1).adaptiveStatus,'ADAPTIVE_PROVISIONAL');
});

test('missing observed price is not zero-filled and stops old 628-day parity claim',()=>{
 const input=sample(names[2]);
 const symbol=registry.themes[2].symbols[0];
 input.rows.at(-31)[symbol]=null;
 const report=run([input],{includeHistory:true}).themes[2];
 assert.equal(report.referenceComparableDays,0);
 assert.ok(report.history.some(x=>x.adaptiveR2Pair50===null));
 assert.equal(report.history.at(-31).adaptiveR2Pair50,null);
 assert.equal(report.history.at(-31).legacyR188Reference,null);
});

test('incomplete year and unprovided eight themes are distinctly reported',()=>{
 const input=sample(names[3],120);
 const report=run([input]);
 assert.equal(report.themes[3].status,'INSUFFICIENT_YEAR_WINDOW');
 assert.equal(report.themes[3].scoredDays,0);
 assert.equal(report.missingInputThemes.length,8);
 assert.equal(report.providedThemes,1);
 assert.equal(report.priceSourceVerification,'NOT_PERFORMED_BY_THIS_TOOL');
});

test('input validation blocks forged price, duplicate day and duplicate theme',()=>{
 const input=sample(names[4],252);
 input.rows[20].SPY=0;
 assert.throws(()=>run([input]),{code:'THEME_NINE_R1_INVALID_REAL_PRICE'});
 input.rows[20].SPY=100;
 input.rows[20].date=input.rows[19].date;
 assert.throws(()=>run([input]),{code:'THEME_NINE_R1_INVALID_SESSION_DATE'});
 const clean=sample(names[4],252);
 assert.throws(()=>run([clean,clean]),{code:'THEME_NINE_R1_UNAUTHORIZED_OR_DUPLICATE_THEME'});
});
