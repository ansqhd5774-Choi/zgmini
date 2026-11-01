import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');

test('inflation hero removes internal version and duplicate date from DOM',()=>{
  const badge=read('app/market-state-badge.tsx');
  const orb=read('app/market-score-orb.tsx');

  assert.match(badge,/!source\.startsWith\('INFLATION_R2'\)/);
  assert.match(badge,/showSource\?<small role="status">\{source\}<\/small>:null/);
  assert.match(orb,/comparisonAriaLabel !== '인플레이션 안정성 점수 변화'/);
  assert.match(orb,/showMetaDate \? <div className="cnn-score-observed-date">\{metaDate\}<\/div> : null/);
});
