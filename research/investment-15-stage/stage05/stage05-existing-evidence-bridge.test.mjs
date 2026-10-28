import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildExistingEvidenceAudit} from './stage05-existing-evidence-bridge.mjs';
import {selectThemeF} from '../stage04/latest-f-readonly.mjs';
import {normalizeSelectedThemeF,STAGE03_THEME_IDS} from '../stage04-r67/live-f-adapter-r67.mjs';

const original=readFileSync(new URL(
  '../STAGE04_INVESTMENT_BOT_R17_SENTIMENT_INDUSTRY_CONTRAST_20261025.md',import.meta.url),'utf8');
const run = additional=>buildExistingEvidenceAudit({r17Markdown:original,
  asOfDate:'2026-10-28',...additional});

test('actual preserved R17: nine approved themes + 7 industrial sources + 6 change directions',()=>{
  const r=run();
  assert.deepEqual(r.coverage,{approvedThemes:9,historicalF:9,
    historicalIndustrySourceObserved:7,historicalIndustryDirectionKnown:6,
    currentFMatched:0,sectorPriceRelativeStrengthVerified:0,
    themePriceTrendVerified:0,realizedM4Verified:0});
  assert.equal(r.selection.approvedCandidateCount,9);
  assert.equal(r.selection.rankableCount,0);
  assert.equal(r.ranking.length,0);
  assert.equal(r.selection.selectedThemeId,null);
});
test('historical observation date never upgraded to current',()=>{
  const r=run();
  assert.equal(r.historicalSource.fObservedAt,'2026-10-23');
  assert.equal(r.themes[0].historicalF.notCurrent,true);
  assert.equal(r.themes[0].currentF,null);
  assert.ok(r.rows.every(row=>row.S5===null&&row.E===null&&row.T===null));
});
test('current F overlays separate field only; does not manufacture price trend or M4',()=>{
  const r=run({liveF:{records:[{topic_id:12,score:35.14,
    observed_at:'2026-10-28',status:'PROVISIONAL',source:'https://zgmini.kr/api/theme-fear-greed',
    source_version:'test-only'}],diagnostics:{source_status:'PARTIAL_LIVE_F'}}});
  assert.equal(r.coverage.currentFMatched,1);
  assert.equal(r.themes[0].historicalF.score,20.69);
  assert.equal(r.themes[0].currentF.score,35.14);
  assert.equal(r.themes[0].stage03PriceTrend,null);
  assert.equal(r.selection.selectedThemeId,null);
});
test('reuses official R67 phase selector for nine current F scores without extra API call',()=>{
  const names=Object.keys(STAGE03_THEME_IDS);
  const payload={status:'READY',sourceVersion:'R79_MOCK_ONLY',
    themes:names.map((theme,i)=>({theme,score:30+i,
      history:[{date:'2026-10-27',score:30+i}]})),
    provisional:{points:[{date:'2026-10-28',scores:{[names[0]]:19}}]}};
  const selected=selectThemeF(payload,{asOfDate:'2026-10-28',expectedThemes:9});
  const normalized=normalizeSelectedThemeF(selected,'https://zgmini.kr/api/theme-fear-greed');
  const audit=run({liveF:normalized});
  assert.equal(audit.coverage.currentFMatched,9);
  assert.equal(audit.themes[0].currentF.score,19);
  assert.equal(audit.themes[0].currentF.phase,'PROVISIONAL');
  assert.equal(audit.themes[1].currentF.observedAt,'2026-10-27');
  assert.equal(audit.selection.rankableCount,0);
});
test('R25 research theme roster cannot replace R67 approved nine silently',()=>{
  const feedNames=['로봇·자동화','클라우드·SaaS','자율주행','원전·SMR','방산',
    '핀테크','사이버보안','바이오·신약','AI 반도체'];
  const r=run({liveModel:{feeds:{market:{status:'READY'},sector:{status:'READY'},
    theme:{status:'READY',items:feedNames.map(name=>({name}))}}}});
  assert.deepEqual(r.liveFeedCoverage.unapprovedNamesIgnored,['AI 반도체']);
  assert.deepEqual(r.liveFeedCoverage.approvedNamesAbsent,['데이터센터·전력']);
  assert.equal(r.liveFeedCoverage.themeNamesMatched,8);
  assert.equal(r.coverage.approvedThemes,9);
});
test('unknown F topic is ignored rather than approving a 10th theme',()=>{
  const r=run({liveF:{records:[{topic_id:999,score:55}]}});
  assert.equal(r.coverage.approvedThemes,9);
  assert.equal(r.coverage.currentFMatched,0);
});
test('future live F is rejected instead of being interpreted as today',()=>{
  assert.throws(()=>run({liveF:{records:[{topic_id:12,score:50,
    observed_at:'2026-10-29',status:'CONFIRMED',
    source:'https://zgmini.kr/api/theme-fear-greed'}]}}),
  /LIVE_F_EVIDENCE_INVALID_OR_FUTURE/);
});
test('duplicate live F IDs rejected and cannot overwrite another observation',()=>{
  const record={topic_id:12,score:5,observed_at:'2026-10-27',
    status:'CONFIRMED',source:'https://zgmini.kr/api/theme-fear-greed'};
  assert.throws(()=>run({liveF:{records:[record,{...record,score:99}]}}),
    /LIVE_F_DUPLICATE_OR_INVALID_TOPIC_ID/);
});
test('archive data loss is a hard stop, not silent approval or rank',()=>{
  const corrupted=original.replace('| 데이터센터·전력 | 12.32', '| 미승인항목 | 12.32');
  assert.throws(()=>buildExistingEvidenceAudit({r17Markdown:corrupted,
    asOfDate:'2026-10-28'}),/R17_THEME_COUNT_MISMATCH/);
});
