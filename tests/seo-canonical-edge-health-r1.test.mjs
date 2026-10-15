import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectEdgeRedirect} from '../scripts/seo-canonical-edge-health.mjs';

test('edge redirect inspector requires permanent redirect and exact apex location',()=>{
  assert.deepEqual(inspectEdgeRedirect({status:301,location:'https://zgmini.kr/recession/?x=1'},'https://zgmini.kr/recession/?x=1'),[]);
  assert.deepEqual(inspectEdgeRedirect({status:308,location:'https://zgmini.kr/'},'https://zgmini.kr/'),[]);
  assert.deepEqual(inspectEdgeRedirect({status:200,location:''},'https://zgmini.kr/'),['http_200','location:missing']);
});

test('production SEO workflow verifies www to apex after the main SEO health gate',()=>{
  const workflow=readFileSync('.github/workflows/seo-production-health.yml','utf8');
  const script=readFileSync('scripts/seo-canonical-edge-health.mjs','utf8');
  assert.match(workflow,/node scripts\/seo-production-health\.mjs[\s\S]*node scripts\/seo-canonical-edge-health\.mjs/);
  assert.match(script,/https:\/\/www\.zgmini\.kr\/recession\//);
  assert.match(script,/http:\/\/www\.zgmini\.kr\/recession\//);
  assert.match(script,/https:\/\/zgmini\.kr\/recession\//);
  assert.match(script,/SEO_EDGE_HEALTH_PASS=/);
});
