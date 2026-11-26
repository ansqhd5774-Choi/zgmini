import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('every browser script invoked by the existing Playwright workflow triggers its own PR CI',()=>{
 const workflow=readFileSync(
   new URL('../.github/workflows/community-chat-browser.yml',import.meta.url),'utf8');
 const trigger=workflow.slice(0,workflow.indexOf('\n  workflow_dispatch:'));
 assert.match(trigger,/pull_request:\s*\n\s+branches: \[main\]/);
 const scripts=[...workflow.matchAll(/run:\s+node\s+(tests\/[^\s'"\\]+\.mjs)/g)]
   .map(match=>match[1]);
 assert.equal(scripts.length,19,'existing browser E2E step list changed; review CI trigger coverage');
 for(const script of scripts){
  assert.ok(trigger.includes("      - '"+script+"'"),'missing browser PR path: '+script);
 }
 assert.match(workflow,/runs-on: ubuntu-24\.04/);
 assert.match(workflow,/npx playwright install --with-deps chromium/);
});

test('shared npm dependencies and Vite runtime changes trigger the existing browser PR job',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/community-chat-browser.yml',import.meta.url),'utf8');
 const trigger=workflow.slice(0,workflow.indexOf('\n  workflow_dispatch:'));
 for(const file of ['package.json','package-lock.json','vite.config.ts']){
  assert.ok(trigger.includes("      - '"+file+"'"),'missing browser dependency trigger: '+file);
 }
 assert.match(trigger,/pull_request:[\s\S]*?paths:/);
 assert.ok(trigger.includes("      - '.github/workflows/community-chat-browser.yml'"));
 assert.doesNotMatch(trigger,/      - '\*\*'/);
});

test('shared home/about components and styles trigger existing browser CI when edited alone',()=>{
 const workflow=readFileSync(
   new URL('../.github/workflows/community-chat-browser.yml',import.meta.url),'utf8');
 const trigger=workflow.slice(0,workflow.indexOf('\n  workflow_dispatch:'));
 const required=[
  ['app/page.tsx','components/site-header.tsx'],
  ['app/page.tsx','components/site-footer.tsx'],
  ['app/page.tsx','components/dashboard-side-rails.tsx'],
  ['app/dashboard-ui.tsx','components/live-score-value.tsx'],
  ['app/layout.tsx','components/score-arrow-provider.tsx'],
  ['app/layout.tsx','app/responsive.css'],
  ['app/about/page.tsx','app/about/about.module.css']
 ];
 for(const [owner,file] of required){
  const source=readFileSync(new URL('../'+owner,import.meta.url),'utf8');
  const segment=file.replace(/\.(?:tsx|css)$/,'').split('/').at(-1);
  assert.ok(source.includes(segment)||file==='app/responsive.css',
   'expected UI dependency no longer imported: '+owner+' -> '+file);
  assert.ok(trigger.includes("      - '"+file+"'"),
   'shared browser route edit must trigger PR CI: '+file);
 }
});
