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

test('publisher section plus specific arts/sports title excludes the two observed unrelated stories',()=>{
 const arts='The beautiful, shocking work of artist Hoda Afshar: ‘I don’t take freedom of speech for granted’';
 const sport='South Korea captain, LA star Son Heung-min backed by coach amid rift rumour';
 assert.equal(iranNewsOffTopicReasonR1(arts,
  'https://www.theguardian.com/artanddesign/2026/oct/30/artist-hoda-afshar-interview-photography-exhibition-buxton-contemporary'),
  'OFF_TOPIC_ARTS_SECTION');
 assert.equal(iranNewsOffTopicReasonR1(sport,
  'https://www.aljazeera.com/amp/sports/2026/10/29/south-korea-captain-la-star-son-heung-min-backed-by-coach-amid-rift-rumour'),
  'OFF_TOPIC_SPORTS_SECTION');
 // Section evidence is required; a headline keyword alone cannot exclude.
 assert.equal(iranNewsOffTopicReasonR1(arts),null);
 assert.equal(iranNewsOffTopicReasonR1(sport),null);
 assert.equal(iranNewsOffTopicReasonR1(arts,'https://www.theguardian.com/world/iran'),null);
 assert.equal(iranNewsOffTopicReasonR1(sport,'https://www.aljazeera.com/news/iran'),null);
});

test('war headlines and war-disrupted Iranian sport survive both section exclusions',()=>{
 for(const [title,url] of [
  ['Iranian artist photographs missile strikes on Tehran',
   'https://www.theguardian.com/artanddesign/2026/oct/30/war-photo'],
  ['Artist stages exhibition on Iran war and ceasefire talks',
   'https://www.theguardian.com/artanddesign/2026/oct/30/iran-war-art'],
  ['Iran national football squad denied US visas ahead of World Cup',
   'https://www.aljazeera.com/sports/2026/10/30/iran-visas'],
  ['Iran football coach discusses cancellations caused by the war',
   'https://www.aljazeera.com/sports/2026/10/30/iran-cancellations'],
 ])assert.equal(iranNewsOffTopicReasonR1(title,url),null,title);
 assert.equal(iranNewsOffTopicReasonR1('Coach attacks player after football defeat',
  'https://www.aljazeera.com/sports/2026/10/30/coach'),'OFF_TOPIC_SPORTS_SECTION');
 assert.equal(iranNewsOffTopicReasonR1('Artist organises nuclear art exhibition',
  'https://www.theguardian.com/artanddesign/2026/oct/30/arts'),'OFF_TOPIC_ARTS_SECTION');
});

test('R41 read model hides arts and sport without deleting stored metadata',()=>{
 const now=Date.parse('2026-10-31T01:30:00.000Z');
 const originals=[
  ['guardian-iran','The Guardian',
   'https://www.theguardian.com/artanddesign/2026/oct/30/artist-hoda-afshar-interview-photography-exhibition-buxton-contemporary',
   'The beautiful, shocking work of artist Hoda Afshar: ‘I don’t take freedom of speech for granted’'],
  ['aljazeera','Al Jazeera',
   'https://www.aljazeera.com/amp/sports/2026/10/29/south-korea-captain-la-star-son-heung-min-backed-by-coach-amid-rift-rumour',
   'South Korea captain, LA star Son Heung-min backed by coach amid rift rumour'],
  ['aljazeera','Al Jazeera','https://www.aljazeera.com/sports/2026/10/30/iran-visas',
   'Iran national football squad denied US visas ahead of World Cup'],
  ['guardian-iran','The Guardian','https://www.theguardian.com/artanddesign/2026/oct/30/war-photo',
   'Iranian artist photographs missile strikes on Tehran']
 ];
 const rows=originals.map(([sourceId,source,sourceUrl,title],index)=>({
  articleId:(index+1).toString(16).padStart(64,'0'),sourceId,source,sourceUrl,title,
  publishedAt:'2026-10-30T08:00:00.000Z',checkedAt:now-1000,
  bodyVerified:true,twoStageKeywordsVerified:true,
 }));
 const snapshot=JSON.stringify(rows);
 const visible=visibleIranMetadataRowsR41(rows,{now});
 assert.deepEqual(visible.map(row=>row.title),originals.slice(2).map(row=>row[3]));
 assert.equal(rows.length,4);
 assert.equal(JSON.stringify(rows),snapshot);
});
