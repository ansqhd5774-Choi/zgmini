import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateFusionStage05,SCHEMA_VERSION} from './stage05-fusion-core.mjs';

export function fixture(){
  return {schemaVersion:SCHEMA_VERSION,snapshotDate:'2026-10-29',
    stage01:{status:'READY',date:'2026-10-28',risk:'CAUTION'},
    stage02:{status:'READY',sectors:[{id:'s1',score:74},{id:'s2',score:31}]},
    stage03:{status:'READY',themes:[
      {id:'a',name:'로봇',sectorId:'s1',approved:true,score:89},
      {id:'b',name:'바이오',sectorId:'s2',approved:true,score:65},
      {id:'c',name:'우주 연구',sectorId:'s1',approved:false,score:99}]},
    stage04:{status:'READY',final_selection:{state:'UNRANKED_REVIEW',
      confirmed_theme_ids:null,approval_evidence:null}}};
}
const confirm=data=>{data.stage04.final_selection={
  state:'FINAL_CONFIRMED',confirmed_theme_ids:['a'],
  approval_evidence:'USER_APPROVED_STAGE04_20261029',
  confirmed_at:'2026-10-29'};return data;};

test('user approval missing: research and ranking blocked without a default score',()=>{
  const r=calculateFusionStage05(fixture());
  assert.equal(r.summary.confirmedCount,0);
  assert.deepEqual(r.ranking,[]);
  assert.ok(r.rows.every(row=>row.status==='BLOCKED'));
  assert.ok(r.rows.every(row=>!('S5'in row)&&!('stage04M4'in row)));
});
test('only the explicitly user-confirmed Stage03-approved theme may progress',()=>{
  const r=calculateFusionStage05(confirm(fixture()));
  assert.deepEqual(r.confirmedThemeIds,['a']);
  assert.equal(r.summary.confirmedCount,1);
  assert.equal(r.rows.find(row=>row.themeId==='b').status,'BLOCKED');
  assert.equal(r.rows.some(row=>row.themeId==='c'),false);
  assert.deepEqual(r.ranking,[]);
});
test('retired growth/acceleration/M4 fields cannot influence research eligibility',()=>{
  const d=confirm(fixture());
  Object.assign(d.stage04,{G1:99,G2:88,M4:77,actual_yoy:22});
  assert.deepEqual(calculateFusionStage05(d).confirmedThemeIds,['a']);
  d.stage04.final_selection.approval_evidence=null;
  assert.equal(calculateFusionStage05(d).summary.confirmedCount,0);
});
test('unapproved or duplicated theme selection cannot bypass gate',()=>{
  const d=confirm(fixture());
  d.stage04.final_selection.confirmed_theme_ids=['c'];
  assert.throws(()=>calculateFusionStage05(d),/NOT_IN_STAGE03_APPROVED_ROSTER/);
  d.stage04.final_selection.confirmed_theme_ids=['a','a'];
  assert.throws(()=>calculateFusionStage05(d),/NOT_IN_STAGE03_APPROVED_ROSTER/);
});
test('stale/future confirmation or missing preceding context blocks forwarding',()=>{
  const d=confirm(fixture());
  d.stage04.final_selection.confirmed_at='2026-10-30';
  assert.equal(calculateFusionStage05(d).summary.confirmedCount,0);
  d.stage04.final_selection.confirmed_at='2026-10-29';
  d.stage02.status='UNAVAILABLE';
  assert.equal(calculateFusionStage05(d).summary.confirmedCount,0);
});
test('schema and roster duplicates are rejected',()=>{
  const d=fixture();
  d.stage03.themes.push({...d.stage03.themes[0]});
  assert.throws(()=>calculateFusionStage05(d),/DUPLICATE_ID_a/);
  d.stage03.themes.pop();
  d.schemaVersion='OLD';
  assert.throws(()=>calculateFusionStage05(d),/INPUT_SCHEMA_VERSION_MISMATCH/);
});
