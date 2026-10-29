import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleIranMetadataRowsR41} from '../lib/iran-progress/news-metadata-r41.mjs';
import {iranNewsOffTopicReasonR1} from '../lib/iran-progress/news-offtopic-exclusions-r1.mjs';

test('three demonstrated unrelated headlines are filtered',()=>{
 assert.equal(iranNewsOffTopicReasonR1('Saudi actor Yaqoub Alfarhan stars in new Netflix horror show set in 1970s Kuwait'),'OFF_TOPIC_ENTERTAINMENT');
 assert.equal(iranNewsOffTopicReasonR1('Syria court sentences Iran-linked militia member to life in prison'),'OFF_TOPIC_HISTORICAL_SYRIA_TRIAL');
 assert.equal(iranNewsOffTopicReasonR1('Revealed: billionaire Reform donor was in business with foundation linked to Iranian regime'),'OFF_TOPIC_PAST_POLITICAL_BUSINESS');
});

test('do not block Saudi, Yemen, Houthis or current Iran-linked war merely by region',()=>{
 for(const title of [
  'Saudi Arabia intercepts missiles after Iran attack',
  'Yemen Houthis launch drone attacks after Iran war escalates',
  'Iran and Saudi Arabia begin ceasefire negotiations',
  'Syria court investigates new Iran-linked missile attack',
  'UK political donor sanctioned over funding Iranian missile attacks',
  'Netflix documentary examines Iran war and ceasefire talks',
  'Iran-linked militia in Syria responds to Israel strikes',
 ])assert.equal(iranNewsOffTopicReasonR1(title),null,title);
});

test('exclude only distinct conjunctions, never a single ordinary keyword',()=>{
 for(const title of [
  'Saudi envoy meets Yemen officials for peace negotiations',
  'Iran and UK reach a nuclear agreement',
  'Court hears Iran sanctions dispute',
  'Syrian militia fights near border',
  'Iranian business relations threatened by sanctions',
  'Saudi actor reports on Iran ceasefire talks',
  'UK donor discusses Iran war aid',
 ])assert.equal(iranNewsOffTopicReasonR1(title),null,title);
});

test('R41 public read model excludes only the three off-topic types without mutating stored rows',()=>{
 const now=Date.parse('2026-10-30T01:30:00.000Z');
 const titles=[
  'Saudi actor Yaqoub Alfarhan stars in new Netflix horror show set in 1970s Kuwait',
  'Syria court sentences Iran-linked militia member to life in prison',
  'Revealed: billionaire Reform donor was in business with foundation linked to Iranian regime',
  'At Least 14 Killed in Saudi Strikes on Yemen As Attacks Reach 101 in 24 Hours',
  'How Yemen’s Houthis finance their war and evade sanctions',
  'Iran and Saudi Arabia begin ceasefire negotiations',
 ];
 const rows=titles.map((title,index)=>({
  articleId:(index+1).toString(16).padStart(64,'0'),
  sourceId:'arabnews',source:'Arab News',
  sourceUrl:`https://www.arabnews.com/middle-east/filter-test-${index+1}`,
  title,publishedAt:'2026-10-29T08:00:00.000Z',checkedAt:now-1000,
  bodyVerified:true,twoStageKeywordsVerified:true,
 }));
 const snapshot=JSON.stringify(rows);
 const visible=visibleIranMetadataRowsR41(rows,{now});
 assert.deepEqual(visible.map(row=>row.title).sort(),titles.slice(3).sort());
 assert.equal(rows.length,6);
 assert.equal(JSON.stringify(rows),snapshot);
});
