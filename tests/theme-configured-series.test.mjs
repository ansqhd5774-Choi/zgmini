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
