import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalHttpsRedirect} from '../worker/canonical-https-redirect.mjs';

test('raw worker redirects canonical HTTP to exact HTTPS URL',()=>{
  const response=canonicalHttpsRedirect(new Request('http://zgmini.kr/recession/?x=1'));
  assert.ok(response);
  assert.equal(response.status,308);
  assert.equal(response.headers.get('location'),'https://zgmini.kr/recession/?x=1');
});

test('raw worker leaves canonical HTTPS and noncanonical hosts untouched',()=>{
  assert.equal(canonicalHttpsRedirect(new Request('https://zgmini.kr/recession/?x=1')),null);
  assert.equal(canonicalHttpsRedirect(new Request('http://example.com/recession/?x=1')),null);
  assert.equal(canonicalHttpsRedirect(new Request('https://zgmini-migration-candidate-r5.example.workers.dev/')),null);
});

test('worker entry enforces the raw redirect before vinext routing',async()=>{
  const {readFileSync}=await import('node:fs');
  const source=readFileSync('worker/index.ts','utf8');
  assert.match(source,/import \{canonicalHttpsRedirect\} from "\.\/canonical-https-redirect\.mjs"/);
  assert.match(source,/const canonicalRedirect=canonicalHttpsRedirect\(request\);\s*\n\s*if\(canonicalRedirect\) return canonicalRedirect;\s*\n\s*const url = new URL\(request\.url\);/);
});
