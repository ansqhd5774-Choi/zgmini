import test from 'node:test';
import assert from 'node:assert/strict';
import {configuredChartSeries} from '../lib/theme-configured-series.ts';

test('confirmed to provisional boundary shares only the bordering point',()=>{
 const rows=configuredChartSeries([
  {date:'2026-10-24',score:40,status:'R188_COMPATIBLE'},
  {date:'2026-10-25',score:41,status:'R188_COMPATIBLE'},
  {date:'2026-10-26',score:45,status:'ADAPTIVE_PROVISIONAL'},
  {date:'2026-10-27',score:47,status:'ADAPTIVE_PROVISIONAL'},
 ]);
 assert.deepEqual(rows,[
  {date:'2026-10-24',confirmed:40,provisional:null},
  {date:'2026-10-25',confirmed:41,provisional:41},
  {date:'2026-10-26',confirmed:null,provisional:45},
  {date:'2026-10-27',confirmed:null,provisional:47},
 ]);
});

test('null and unsupported states remain gaps; no line crosses missing data',()=>{
 const rows=configuredChartSeries([
  {date:'2026-10-25',score:39,status:'R188_COMPATIBLE'},
  {date:'2026-10-26',score:null,status:'INSUFFICIENT_OR_UNAPPROVED_PAIR'},
  {date:'2026-10-27',score:42,status:'ADAPTIVE_PROVISIONAL'},
 ]);
 assert.deepEqual(rows,[
  {date:'2026-10-25',confirmed:39,provisional:null},
  {date:'2026-10-26',confirmed:null,provisional:null},
  {date:'2026-10-27',confirmed:null,provisional:42},
 ]);
});

test('R32 confirmed modes are not confused with provisional feed phase',()=>{
 const rows=configuredChartSeries([
  {date:'2026-11-02',score:40,status:'NORMALIZED_DATED_OFFICIAL_AUM_THREE_PLUS',phase:'CONFIRMED'},
  {date:'2026-11-03',score:42,status:'R32_APPROVED_SINGLE_REAL_ETF',phase:'CONFIRMED'},
 ],{date:'2026-11-04',score:44,phase:'PROVISIONAL'});
 assert.deepEqual(rows,[
  {date:'2026-11-02',confirmed:40,provisional:null},
  {date:'2026-11-03',confirmed:42,provisional:42},
  {date:'2026-11-04',confirmed:null,provisional:44},
 ]);
});

test('unverified or stale R32 provisional dates never create phantom points',()=>{
 const history=[{date:'2026-11-03',score:42,status:'NORMALIZED_DATED_OFFICIAL_AUM_THREE_PLUS',phase:'CONFIRMED'}];
 assert.deepEqual(configuredChartSeries(history,{date:'2026-11-03',score:99,phase:'PROVISIONAL'}),
  [{date:'2026-11-03',confirmed:42,provisional:null}]);
 assert.deepEqual(configuredChartSeries(history),
  [{date:'2026-11-03',confirmed:42,provisional:null}]);
});
