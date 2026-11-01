import test from 'node:test';
import assert from 'node:assert/strict';
import {IRAN_R41_SOURCE_RIGHTS_R1,r41SourceRightsPolicy,r41DirectEvidenceCandidates}
 from '../scripts/iran-progress/news-r41-source-rights-r1.mjs';

const examples={
 govuk:'https://www.gov.uk/government/news/example',
 tasnim:'https://www.tasnimnews.ir/en/news/2026/10/28/12345/example',
 'guardian-iran':'https://www.theguardian.com/world/2026/oct/28/example',
 'dw-world':'https://www.dw.com/en/example/a-123456',
 'bbc-middle-east':'https://www.bbc.com/news/articles/example',
 aljazeera:'https://www.aljazeera.com/news/2026/10/28/example',
 'un-middle-east':'https://news.un.org/en/story/2026/10/123456',
};

test('all seven known publishers have explicit evidence and terms policy',()=>{
 assert.equal(Object.keys(IRAN_R41_SOURCE_RIGHTS_R1).length,7);
 for(const [sourceId,url] of Object.entries(examples)){
  const policy=r41SourceRightsPolicy(sourceId,url);
  assert.equal(policy.sourceId,sourceId);
  assert.match(policy.termsUrl,/^https:\/\//);
  assert.equal(policy.directlyFetchable,['govuk','tasnim'].includes(sourceId));
 }
});

test('Guardian/BBC/Al Jazeera/DW/UN are not automatically fetched for AI analysis',()=>{
 for(const sourceId of Object.keys(examples).filter(id=>!['govuk','tasnim'].includes(id))){
  const policy=r41SourceRightsPolicy(sourceId,examples[sourceId]);
  assert.equal(policy.reason,'SOURCE_RIGHTS_RESTRICTED');
  assert.equal(policy.rightsReviewRequired,true);
 }
});

test('identity and URL guard never accept lookalike hosts or insecure URLs',()=>{
 for(const sourceUrl of [
  'http://www.bbc.com/news/articles/example',
  'https://www.bbc.com.evil.example/news/articles/example',
  'https://user:pass@www.bbc.com/news/articles/example',
  'https://www.bbc.com/news/articles/example#frag',
  'https://www.bbc.com:8443/news/articles/example',
  'https://www.bbc.com/sport/articles/example',
 ])assert.equal(r41SourceRightsPolicy('bbc-middle-east',sourceUrl).directlyFetchable,false);
 assert.equal(r41SourceRightsPolicy('govuk',
  'https://www.gov.uk/government/news/example?tracking=x').directlyFetchable,false);
 assert.equal(r41SourceRightsPolicy('unknown','https://unverified.example/news').reason,
  'SOURCE_URL_UNVERIFIED');
});

test('analyzer helper selects only original-source evidence adapters',()=>{
 const articles=Object.entries(examples).map(([sourceId,sourceUrl])=>({
  id:sourceId,sourceId,sourceUrl,
 }));
 const result=r41DirectEvidenceCandidates(articles);
 assert.deepEqual(result.eligible.map(article=>article.sourceId),['govuk','tasnim']);
 assert.equal(result.blocked.length,5);
 assert(result.blocked.every(row=>row.reason==='SOURCE_RIGHTS_RESTRICTED'));
});
