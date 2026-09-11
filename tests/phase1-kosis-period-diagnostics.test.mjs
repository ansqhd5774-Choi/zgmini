import test from 'node:test';
import assert from 'node:assert/strict';
import {kosisPeriods,sanitizePeriodDiagnostic,parseKosisPrd} from '../worker/phase1-korea.mjs';
test('unknown Z is visible in both code diagnostics',()=>{
 const p=kosisPeriods([{PRD_SE:'Z'}]);assert.deepEqual(p.rawPeriodCodes,['Z']);assert.deepEqual(p.unrecognizedPeriodCodes,['Z']);assert.equal(p.requestPrdSe,null);
});
test('trimmed unknown exposes sanitized length and Unicode code points',()=>{
 const p=kosisPeriods([{PRD_SE:' Z '}]);assert.deepEqual(p.rawPeriodCodeDiagnostics,[{rawPeriodCode:'Z',rawPeriodCodeLength:1,rawPeriodCodeCharCodes:[90]}]);
});
test('controls removed for diagnostics without changing selection',()=>{
 const p=kosisPeriods([{PRD_SE:'M\n\u0000\t'}]);assert.deepEqual(p.rawPeriodCodes,['M']);assert.equal(p.requestPrdSe,null);assert.deepEqual(p.unrecognizedPeriodCodes,['M']);
});
test('diagnostic strings truncate to sixteen Unicode characters',()=>{
 const p=kosisPeriods([{PRD_SE:'ABCDEFGHIJKLMNOPQRST'}]);assert.equal(p.rawPeriodCodes[0],'ABCDEFGHIJKLMNOP');assert.equal(p.rawPeriodCodeDiagnostics[0].rawPeriodCodeCharCodes.length,16);
});
test('non-string metadata remains masked; unrelated values are never copied',()=>{
 const p=kosisPeriods([{PRD_SE:{unknown:'private-value'},unknown:'private-value',DT:'private-number'}]);assert.deepEqual(p.rawPeriodCodes,['[UNRECOGNIZED_VALUE]']);assert.equal(JSON.stringify(p).includes('private-value'),false);
 assert.equal(JSON.stringify(parseKosisPrd({other:'private-value'}).diagnostics).includes('private-value'),false);
});
test('secrets in other fields and credential URLs remain hidden',()=>{
 const p=kosisPeriods([{PRD_SE:'Z',apiKey:'synthetic-private-credential',Authorization:'synthetic-auth'}]);assert.equal(JSON.stringify(p).includes('synthetic-'),false);
 assert.equal(sanitizePeriodDiagnostic('https://example.invalid/?apiKey=synthetic-private'),'[UNRECOGNIZED_VALUE]');
});
