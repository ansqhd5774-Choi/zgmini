import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesIranNewsDisplayKeywords,matchesIranTwoStageKeywordsR38}
 from '../scripts/iran-progress/news-display-discover-r1.mjs';

test('R38 requires at least one primary and at least one secondary keyword',()=>{
 for(const one of ['이란','후티','사우디','예맨','예멘','Iran','Iranian','Saudi Arabia','Yemen','Houthis']){
  assert.equal(matchesIranNewsDisplayKeywords(one),true,one);
  assert.equal(matchesIranTwoStageKeywordsR38(`${one} 협상`),true,one);
  assert.equal(matchesIranTwoStageKeywordsR38(one),false,one);
 }
 for(const two of ['전쟁','합의','휴전','협상','진전','war','agreement','ceasefire','truce',
  'negotiations','talks','progress','deal','breakthrough']){
  assert.equal(matchesIranTwoStageKeywordsR38(`후티 ${two}`),true,two);
  assert.equal(matchesIranTwoStageKeywordsR38(two),false,two);
 }
});

test('R38 has no hidden importance, sentiment, author or article-length requirement',()=>{
 assert.equal(matchesIranTwoStageKeywordsR38('이란 협상'),true);
 assert.equal(matchesIranTwoStageKeywordsR38('사우디 전쟁'),true);
 assert.equal(matchesIranTwoStageKeywordsR38('예맨 휴전'),true);
 assert.equal(matchesIranTwoStageKeywordsR38('후티 합의'),true);
 assert.equal(matchesIranTwoStageKeywordsR38('이란 진전'),true);
 assert.equal(matchesIranTwoStageKeywordsR38('regional negotiation progress'),false);
 assert.equal(matchesIranTwoStageKeywordsR38('Iran economy investment'),false);
 assert.equal(matchesIranTwoStageKeywordsR38('Saudization deal'),false);
 assert.equal(matchesIranTwoStageKeywordsR38('warped Iranian budget'),false);
 assert.equal(matchesIranTwoStageKeywordsR38(''),false);
 assert.equal(matchesIranTwoStageKeywordsR38(null),false);
});
