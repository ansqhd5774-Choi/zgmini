import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {auditThemeR2Sources} from '../scripts/pc-writer/theme-r2-pc-source-readonly.mjs';

test('R2 source discovery distinguishes price history from actual verified rights',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r2-source-'));
  try {
    const date=i=>new Date(Date.UTC(2024,0,2+i)).toISOString().slice(0,10);
    const days=(n,b)=>Array.from({length:n},(_,i)=>({date:date(i),proxyClose:b+i/100}));
    fs.writeFileSync(path.join(root,'local-theme-joined-price-history.json'),JSON.stringify({joined:{
      SPY:{days:days(420,100)},BOTZ:{days:days(420,35)},ROBO:{days:days(220,28)},
    }}));
    fs.writeFileSync(path.join(root,'local-sector-iex-price-history.json'),JSON.stringify({series:{
      QTUM:days(400,50).map(x=>({date:x.date,close:x.proxyClose})),
    }}));
    fs.writeFileSync(path.join(root,'local-theme-score-history.json'),JSON.stringify({
      series:{WQTM:Array.from({length:500},(_,i)=>({date:date(i),score:77}))},
    }));
    fs.writeFileSync(path.join(root,'local-etf-secrets.json'),'{bad JSON}');
    const result=await auditThemeR2Sources(root);
    assert.equal(result.status,'BOUNDED_DISCOVERY_NOT_VALIDATED');
    assert.equal(result.inventory.SPY.candidateSources[0].sampledUniqueDates,420);
    assert.equal(result.inventory.BOTZ.candidateSources[0].sampledUniqueDates,420);
    assert.equal(result.inventory.ROBO.candidateSources[0].sampledUniqueDates,220);
    assert.equal(result.inventory.QTUM.candidateSources[0].sourceClass,'EXCLUDED_IEX_HIST');
    assert.equal(result.inventory.WQTM.candidateSources.length,0,'scores must not be misread as prices');
    assert.equal(result.priceScoresComputed,false);
    assert.equal(result.published,false);
    assert.equal(result.thresholds.absoluteEtfAdmissionRequirement,false);
    assert.equal(result.scan.jsonInspected,3,'sensitive filename is excluded');
    assert.equal(result.inventory.BOTZ.candidateSources[0].sampledUniqueDates>=377,true);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test('absent PC source is an explicit incomplete report with no fallback',async()=>{
  const result=await auditThemeR2Sources('/unlikely/zgmini/no-pc-source-here');
  assert.equal(result.status,'SOURCE_ROOT_MISSING');
  assert.equal(result.files.length,0);
  assert.equal(result.blockingReasons.includes('SOURCE_ROOT_MISSING'),true);
  assert.equal(result.providerCalls,0);
});
