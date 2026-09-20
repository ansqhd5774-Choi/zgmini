import test from 'node:test';
import assert from 'node:assert/strict';
const b64 = value => new Uint8Array(Buffer.from(value, 'base64'));
import {readXlsxWorkbook, unzipSelected} from '../lib/diagnostic-layer/xlsx-lite.mjs';
import {
  CMDI_XLSX_URL,
  WORLD_BANK_COPPER_XLSX_URL,
  fetchCmdiWorkbook,
  fetchWorldBankCopper,
  parseCmdiWorkbook,
  parseGscpiWorkbook,
  parseWorldBankCopperWorkbook,
} from '../lib/diagnostic-layer/nyfed-worldbank-adapters.mjs';
import {
  buildCmdiRawContext,
  buildCopperShockRaw,
  buildGscpiScore,
  normalCdf,
} from '../lib/diagnostic-layer/nyfed-worldbank-components.mjs';

const FIXTURES = Object.freeze({
  'cmdi.xlsx': b64('UEsDBBQAAAAIAJdqNF0nJ3MUiQEAANsFAAAYAAAAeGwvd29ya3NoZWV0cy9zaGVldDEueG1sdVTLjoIwFP0V0v1YpD4ngBnFt27msZjVpIGqRCimbXT8+6mONNL07sp53fbkhnD0WxbemQmZVzxC7ZaPPMbTKsv5PkJfn7OXAfKkojyjRcVZhK5MolEcXipxlAfGlKf9XEbooNTpFWOZHlhJZas6Ma6ZXSVKqvSn2GN5Eoxmd1NZ4MD3e7ikOUdxeMcSqmgciuriCX0Pjaa3w1sbeSpCOS9yzj6U0Hgu41DFrLr87ESe0WuIVRziG4rTh2sMubZUHPWdJ9tk6bBNINtyDlkSyLL4hixTyHLqOtQzUN32HfI5KA9c6Qv4Lq70JSjvu9JXoHzoSl/Dclf6BpYPHfItJH9nKZO39W+asF5Fs4+B2cfb6RyTAenqIefnnftn/BbpNolJTQQWkUCOqXE08ZnBLWJuiE6TWJgRTXxp8F6TWNVExxqxNoQ1YmMIK2r7IAzaaJSYRkndaM8KGJP6VX2rUUNYjqQmiPXeKQEaJVCjBGqUAI0SqFECNUqgRgnUKHE2ip/+n9j8mOM/UEsDBBQAAAAIAJdqNF2dbEO9uQAAABsBAAAPAAAAeGwvd29ya2Jvb2sueG1sjU9LrsIwDLxK5D2kZYGeqrZsEBJr4AChcWlEY1d2+LzbE357VjPWaMYz9eoeR3NF0cDUQDkvwCB17AOdGjjsN7M/MJoceTcyYQP/qLBq6xvL+ch8NtlO2sCQ0lRZq92A0emcJ6Ss9CzRpXzKyeok6LwOiCmOdlEUSxtdIHgnVPJLBvd96HDN3SUipXeI4OhSLq9DmBTa+vVBP2jIxVx69+RlHvLErc87wUgVMpGtL8G2tf3a7HdZ+wBQSwMEFAAAAAgAl2o0XVr9gmuxAAAAKAEAABoAAAB4bC9fcmVscy93b3JrYm9vay54bWwucmVsc43PyQrCQAwG4FcZcrdpPYhIp15E6FXqAwzTdKGdhcm49O0dPIgFD55C8pMvpDw+zSzuFHh0VkKR5SDIateOtpdwbc6bPQiOyrZqdpYkLMRwrMoLzSqmFR5GzyIZliUMMfoDIuuBjOLMebIp6VwwKqY29OiVnlRPuM3zHYZvA9amqFsJoW4LEM3i6R/bdd2o6eT0zZCNP07gw4WJB6KYUBV6ihI+I8Z3KbKkAlYlrj6sXlBLAQIUAxQAAAAIAJdqNF0nJ3MUiQEAANsFAAAYAAAAAAAAAAAAAACAAQAAAAB4bC93b3Jrc2hlZXRzL3NoZWV0MS54bWxQSwECFAMUAAAACACXajRdnWxDvbkAAAAbAQAADwAAAAAAAAAAAAAAgAG/AQAAeGwvd29ya2Jvb2sueG1sUEsBAhQDFAAAAAgAl2o0XVr9gmuxAAAAKAEAABoAAAAAAAAAAAAAAIABpQIAAHhsL19yZWxzL3dvcmtib29rLnhtbC5yZWxzUEsFBgAAAAADAAMAywAAAI4DAAAAAA=='),
  'gscpi.xlsx': b64('UEsDBBQAAAAIAJdqNF3m3pc4DAEAAEcCAAAYAAAAeGwvd29ya3NoZWV0cy9zaGVldDEueG1sdZJNboMwEIWvYnkPJkljSmU76o/aZRc0B3BgGqyCjewRaW9fk0QoicLO82befE8ai81v15IBfDDOSrpIM0rAVq42di/p9us9eaQkoLa1bp0FSf8g0I0SB+d/QgOAJPptkLRB7J8YC1UDnQ6p68HGzrfzncZY+j0LvQddH01dy5ZZxlmnjaVKHLU3jVoJ7w7ES7qOajU+nteUoKTGtsZCiT7qJiiBKo6DYKgEG2tWnedf5uY/WrfT7R3H65xjaw1CTUqMpHBtZDHmlJVPWfnMplWWlNAni6LI70UeFwwqydJVwZeCDZfhTr0sfSimxhU8n+D5HHyRfFY4C89PgBvsWU05v8Gyi1ux6ROof1BLAwQUAAAACACXajRdQzxF1r4AAAAZAQAADwAAAHhsL3dvcmtib29rLnhtbI2PS27DMAxEryJwX8vuIigMfxYJCngXoO0BFIuOhVikQSppe/uqdbLvij/M40zTf8XF3FA0MLVQFSUYpJF9oHMLH++vTy9gNDnybmHCFr5Roe+aT5bLiflispy0hTmltbZWxxmj04JXpHyZWKJLeZSz1VXQeZ0RU1zsc1nubHSBYCPU8h8GT1MY8cDjNSKlDSK4uJTN6xxWha75+6D3asjFbPptfxxyjN/N4HNKMFKH3MjgK7BdYx8i+8jV/QBQSwMEFAAAAAgAl2o0XVr9gmuxAAAAKAEAABoAAAB4bC9fcmVscy93b3JrYm9vay54bWwucmVsc43PyQrCQAwG4FcZcrdpPYhIp15E6FXqAwzTdKGdhcm49O0dPIgFD55C8pMvpDw+zSzuFHh0VkKR5SDIateOtpdwbc6bPQiOyrZqdpYkLMRwrMoLzSqmFR5GzyIZliUMMfoDIuuBjOLMebIp6VwwKqY29OiVnlRPuM3zHYZvA9amqFsJoW4LEM3i6R/bdd2o6eT0zZCNP07gw4WJB6KYUBV6ihI+I8Z3KbKkAlYlrj6sXlBLAQIUAxQAAAAIAJdqNF3m3pc4DAEAAEcCAAAYAAAAAAAAAAAAAACAAQAAAAB4bC93b3Jrc2hlZXRzL3NoZWV0MS54bWxQSwECFAMUAAAACACXajRdQzxF1r4AAAAZAQAADwAAAAAAAAAAAAAAgAFCAQAAeGwvd29ya2Jvb2sueG1sUEsBAhQDFAAAAAgAl2o0XVr9gmuxAAAAKAEAABoAAAAAAAAAAAAAAIABLQIAAHhsL19yZWxzL3dvcmtib29rLnhtbC5yZWxzUEsFBgAAAAADAAMAywAAABYDAAAAAA=='),
  'worldbank.xlsx': b64('UEsDBBQAAAAIAJdqNF0fMJM6vAEAAAsHAAAYAAAAeGwvd29ya3NoZWV0cy9zaGVldDEueG1shdXbbtQwFAXQX7EsHkCCOif3oCRVASEh2r5APyDKuJ2IxI5sdwp/j3NRDMjHvCWe7GXrjHZSX/+cRnLhSg9SNBSuIkq46OVpEE8Nffj++V1JiTadOHWjFLyhv7im1239ItUPfebcEJsXuqFnY+b3jOn+zKdOX8mZC/vLo1RTZ+ytemJ6Vrw7raFpZHEU5WzqBkHbel371JmurZV8IaqhmV3tl4ubjBLT0EGMg+DfjLLrg25r09rHec1MW7PlnvX78x++YoGb8XkaxPPkC91ioS9KCiIVf0v6R0X0LI0vfofFP8p55soXuccit3ZGfweYnckxmPwYTI4AD2LwHxILvH7FJvMmsGdx7FkgBFR5dBeBd9slfWkLyGp28eDlgZdBPPbi5YbHpR+vDrwK4okXr1Y8L5GTQ3To9jLEp15+zS+HTxAfnA9BP/P78J/zx86Pg37u9+P9n40QP3F+EvQLv5/s88H81Plp0C/9frr5Cea7lxBgbd38yu9nm59ivusyYN1c/WXAPj/f/AzzXW8hWFzwFxf25uaY76oLwe6Cv7uwl7fAfNdeCNQXsBcPbP0tyn999sf3hh0fsvY3UEsDBBQAAAAIAJdqNF1ytwQZwwAAACMBAAAPAAAAeGwvd29ya2Jvb2sueG1sjY/BTgMxDER/JfKdZsuhQqvd7QUh9YDEAT4gbLxN1MRe2SnQv8dQeudkW6MZzxv2X7W4DxTNTCNsNx04pJljpuMIb69Pdw/gtAWKoTDhCBdU2E/DJ8vpnfnkzE46Qmpt7b3XOWENuuEVyZSFpYZmpxy9roIhakJstfj7rtv5GjLBNaGX/2TwsuQZH3k+V6R2DREsoVl5TXlVmIbfD/o3HYVqpZ+ZWioX9yJmVwP60Q7ReMFJn22RQ9yCnwZ/s/sb4fQNUEsDBBQAAAAIAJdqNF1a/YJrsQAAACgBAAAaAAAAeGwvX3JlbHMvd29ya2Jvb2sueG1sLnJlbHONz8kKwkAMBuBXGXK3aT2ISKdeROhV6gMM03ShnYXJuPTtHTyIBQ+eQvKTL6Q8Ps0s7hR4dFZCkeUgyGrXjraXcG3Omz0Ijsq2anaWJCzEcKzKC80qphUeRs8iGZYlDDH6AyLrgYzizHmyKelcMCqmNvTolZ5UT7jN8x2GbwPWpqhbCaFuCxDN4ukf23XdqOnk9M2QjT9O4MOFiQeimFAVeooSPiPGdymypAJWJa4+rF5QSwECFAMUAAAACACXajRdHzCTOrwBAAALBwAAGAAAAAAAAAAAAAAAgAEAAAAAeGwvd29ya3NoZWV0cy9zaGVldDEueG1sUEsBAhQDFAAAAAgAl2o0XXK3BBnDAAAAIwEAAA8AAAAAAAAAAAAAAIAB8gEAAHhsL3dvcmtib29rLnhtbFBLAQIUAxQAAAAIAJdqNF1a/YJrsQAAACgBAAAaAAAAAAAAAAAAAACAAeICAAB4bC9fcmVscy93b3JrYm9vay54bWwucmVsc1BLBQYAAAAAAwADAMsAAADLAwAAAAA='),
});
const fixture = name => FIXTURES[name];

test('XLSX-lite reads deflated workbook entries without a third-party dependency', async () => {
  const entries = await unzipSelected(fixture('cmdi.xlsx'));
  assert.ok(entries.has('xl/workbook.xml'));
  const workbook = await readXlsxWorkbook(fixture('cmdi.xlsx'));
  assert.ok(workbook.sheets.has('Sheet1'));
  assert.equal(workbook.sheets.get('Sheet1')[0].cells.B1.value,'Market CMDI');
});

test('CMDI workbook parser locks exact NY Fed raw columns and Excel dates', async () => {
  const out = await parseCmdiWorkbook(fixture('cmdi.xlsx'));
  assert.equal(out.status,'READY_CURRENT_VINTAGE_RAW');
  assert.equal(out.rows.length,2);
  assert.equal(out.rows[0].observationDate,'2005-01-07');
  assert.equal(out.rows[0].market,0.35);
  assert.equal(out.rows[0].ig,0.25);
  assert.equal(out.rows[0].hy,0.35);
  assert.equal(out.rows[0].percentiles.p50,0.3);
  assert.equal(out.rows[0].availableAt,null);
});

test('GSCPI workbook parser uses SCPI Date + Global and month-start normalization', async () => {
  const out = await parseGscpiWorkbook(fixture('gscpi.xlsx'));
  assert.equal(out.rows.length,2);
  assert.equal(out.rows[0].observationDate,'1997-09-01');
  assert.equal(out.rows[0].value,-0.3962);
  assert.equal(out.rows[1].value,0);
});

test('World Bank Copper parser locks Monthly Prices / BM / $ per mt', async () => {
  const out = await parseWorldBankCopperWorkbook(fixture('worldbank.xlsx'));
  assert.equal(out.column,'BM');
  assert.equal(out.unit,'($/mt)');
  assert.equal(out.rows.length,13);
  assert.deepEqual(out.rows[0],{
    observationDate:'1960-01-01',value:715,releaseDate:null,availableAt:null,
    vintageId:null,vintageMethod:'CURRENT_VINTAGE_ONLY',unit:'$/mt',
  });
});

test('GSCPI scoring is direct 100*Phi(-GSCPI)', () => {
  const out = buildGscpiScore([
    {observationDate:'2026-01-01',value:0},
    {observationDate:'2026-02-01',value:1},
    {observationDate:'2026-03-01',value:-1},
  ]);
  assert.ok(Math.abs(out.score[0].value-50)<1e-6);
  assert.ok(out.score[1].value<50);
  assert.ok(out.score[2].value>50);
  assert.ok(Math.abs(normalCdf(0)-0.5)<1e-6);
});

test('Copper only emits approved raw 1M/3M positive log shock, not a guessed score', () => {
  const rows = Array.from({length:5},(_,i)=>({
    observationDate:`2026-${String(i+1).padStart(2,'0')}-01`,
    value:100+i*10,
  }));
  const out = buildCopperShockRaw(rows);
  assert.equal(out.status,'RAW_ONLY_PARTIAL');
  assert.match(out.reason,/WARMUP_NOT_ENCODED/);
  assert.ok(out.shock.length>0);
});

test('CMDI raw context refuses to invent credit scoring', async () => {
  const parsed = await parseCmdiWorkbook(fixture('cmdi.xlsx'));
  const out = buildCmdiRawContext(parsed);
  assert.equal(out.status,'READY_CURRENT_VINTAGE_RAW');
  assert.equal(out.scoringStatus,'UNRESOLVED_NO_FABRICATION');
  assert.equal(out.rows.length,2);
});

test('bounded CMDI fetch uses only the exact recovered official URL', async () => {
  assert.equal(CMDI_XLSX_URL,
    'https://www.newyorkfed.org/medialibrary/research/interactives/data/cmdi/cmdi_interactive_data.xlsx');
  let calls=0;
  const bytes=fixture('cmdi.xlsx');
  const result=await fetchCmdiWorkbook({
    fetchImpl:async function(url,init){
      calls++;
      assert.equal(this,globalThis);
      assert.equal(init.redirect,'manual');
      assert.equal(url.toString(),CMDI_XLSX_URL);
      return new Response(bytes,{status:200,headers:{'content-type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}});
    },
  });
  assert.equal(calls,1);
  assert.equal(result.status,'READY_CURRENT_VINTAGE_RAW');
  assert.equal(result.requestCount,1);
});

test('bounded World Bank fetch uses only the exact recovered workbook URL', async () => {
  assert.equal(WORLD_BANK_COPPER_XLSX_URL,
    'https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/CMO-Historical-Data-Monthly.xlsx');
  let calls=0;
  const bytes=fixture('worldbank.xlsx');
  const result=await fetchWorldBankCopper({
    fetchImpl:async function(url,init){
      calls++;
      assert.equal(this,globalThis);
      assert.equal(init.redirect,'manual');
      assert.equal(url.toString(),WORLD_BANK_COPPER_XLSX_URL);
      return new Response(bytes,{status:200});
    },
  });
  assert.equal(calls,1);
  assert.equal(result.status,'READY_CURRENT_VINTAGE_RAW');
  assert.equal(result.rows[0].value,715);
});

test('GSCPI production fetch stays unimplemented because exact current URL is unresolved', () => {
  // Parser and score are implemented from captured workbook schema.
  // There is intentionally no exported GSCPI download URL/fetcher.
  assert.equal(typeof parseGscpiWorkbook,'function');
});
