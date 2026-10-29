import test from 'node:test';
import assert from 'node:assert/strict';
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
