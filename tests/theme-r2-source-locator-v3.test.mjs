import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {locateThemeR2SourceNames} from '../scripts/pc-writer/theme-r2-source-locator-v3.mjs';

test('V3 locates theme files by filename and size, without opening price data',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r2-locator-'));
  try{
    fs.mkdirSync(path.join(root,'data','pc-writer'),{recursive:true});
    fs.writeFileSync(path.join(root,'data','pc-writer','local-theme-raw-prices.json'),'{invalid-raw-json');
    fs.writeFileSync(path.join(root,'data','pc-writer','BOTZ-price-history.csv'),'date,close\n');
    fs.writeFileSync(path.join(root,'data','pc-writer','local-sector-price-history.json'),'{invalid-json');
    fs.writeFileSync(path.join(root,'data','pc-writer','password-theme-prices.json'),'secret');
    const result=locateThemeR2SourceNames({roots:[{id:'TEST',dir:root,maxDepth:3,projectOnly:false}]});
    assert.equal(result.scan.matchingFiles,3);
    assert.equal(result.candidates[0].path.endsWith('BOTZ-price-history.csv'),true);
    assert.equal(result.candidates[1].path.endsWith('local-theme-raw-prices.json'),true);
    assert.equal(result.priceValuesRead,0);
    assert.equal(result.dbWrites,0);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
