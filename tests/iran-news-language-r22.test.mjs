import test from 'node:test';
import assert from 'node:assert/strict';
import {iranNewsLanguages} from '../lib/iran-progress/news-language-r22.mjs';
import {validNewsDisplayItem} from '../lib/iran-progress/news-display-r1.mjs';
import {toDisplayNewsItem,RIGHTS_SOURCE,RIGHTS_POLICY_URL} from '../scripts/iran-progress/news-display-r1.mjs';

const now=Date.parse('2026-10-27T12:00:00Z');
const input={source:'GOV.UK',sourceUrl:'https://www.gov.uk/government/news/iran-diplomacy',
 publishedAt:'2026-10-26T05:00:00Z',impact:'neutral',
 title:'Iran diplomacy discussed by ministers',
 summary:'영국 정부 공식 발표에서 이란 관련 내용을 언급했습니다. 상세 내용은 원문에서 확인할 수 있습니다.',
 titleEn:'Iran diplomacy discussed by ministers',
 summaryEn:'Officials discussed diplomatic efforts regarding Iran and the regional security situation.',
 rightsVerified:true,rightsSource:RIGHTS_SOURCE,rightsPolicyUrl:RIGHTS_POLICY_URL};

test('R22 shows reviewed Korean by default and permits English source in place',()=>{
 const item=toDisplayNewsItem({...input,titleKo:'장관들, 이란 외교 현안 논의',
  summaryKo:'당국자들은 이란과 지역 안보 상황에 관한 외교적 노력을 논의했다.',
  translationReviewed:true},{now});
 assert.ok(item);
 assert.equal(validNewsDisplayItem(item,now),true);
 const selected=iranNewsLanguages(item);
 assert.equal(selected.defaultTitle,'장관들, 이란 외교 현안 논의');
 assert.equal(selected.defaultSummary,'당국자들은 이란과 지역 안보 상황에 관한 외교적 노력을 논의했다.');
 assert.equal(selected.titleEn,input.titleEn);
 assert.equal(selected.summaryEn,input.summaryEn);
 assert.equal(selected.canToggle,true);
 assert.equal(selected.canMachineTranslate,false);
});

test('R22 rejects an unreviewed Korean publication; original English remains available',()=>{
 const unreviewed={...input,titleKo:'장관들, 이란 외교 현안 논의',
  summaryKo:'당국자들은 외교적 노력을 논의했다.'};
 assert.equal(toDisplayNewsItem(unreviewed,{now}),null);
 const item=toDisplayNewsItem(input,{now});
 assert.ok(item);
 assert.equal(validNewsDisplayItem(item,now),true);
 const selected=iranNewsLanguages(item);
 assert.equal(selected.canToggle,false);
 assert.equal(selected.canMachineTranslate,true);
 assert.equal(selected.defaultTitle,input.title);
 assert.equal(selected.defaultSummary,input.summary);
 const browserDraft=iranNewsLanguages(item,{titleKo:'장관들, 이란 외교 현안 논의',
  summaryKo:'당국자들이 이란과 지역 안보 관련 외교 노력을 논의했다.'});
 assert.equal(browserDraft.defaultTitle,'장관들, 이란 외교 현안 논의');
 assert.equal(browserDraft.canToggle,true);
});

test('R22 does not confuse generic Korean boilerplate with an article translation',()=>{
 const item=toDisplayNewsItem({...input,titleEn:undefined,summaryEn:undefined},{now});
 const selected=iranNewsLanguages(item);
 assert.equal(selected.canToggle,false);
 assert.equal(selected.canMachineTranslate,false);
 assert.equal(selected.titleKo,null);
 assert.equal(selected.summaryKo,null);
});

test('R22 preserves an old manually reviewed Korean article when no English source was stored',()=>{
 const item=toDisplayNewsItem({...input,titleEn:undefined,summaryEn:undefined,
  title:'영국, 이란 관련 안보 협의',summary:'영국 정부는 회의에서 지역 안보 현안을 논의했다고 밝혔다.'},{now});
 const selected=iranNewsLanguages(item);
 assert.equal(selected.defaultTitle,item.title);
 assert.equal(selected.defaultSummary,item.summary);
 assert.equal(selected.canToggle,false);
});
