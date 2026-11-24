import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const text=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('eight-area standard lists applicable site CI evidence without new workflows',()=>{
 const standard=text('docs/CI_EIGHT_AREA_STANDARD_R1.md');
 for(const area of ['Lint','Type Check','Build','Unit','Integration','E2E','Security','Secret']){
  assert.match(standard,new RegExp('\\| '+area+' \\|'));
 }
 assert.match(standard,/운영 기능의 수집·게시·배포 완료 인증을 대체하지 않는다/);
 const node=text('.github/workflows/node.js.yml');
 for(const command of ['npm ci','npm run build','npm run typecheck',
  'node --test tests/*.test.mjs','node scripts/lint-changed-ci.mjs','npm audit --omit=dev']){
  assert.ok(node.includes(command),'missing existing Node CI: '+command);
 }
 const codeql=text('.github/workflows/codeql-source.yml');
 assert.match(codeql,/github\/codeql-action\/analyze@/);
 const secret=text('.github/workflows/secret-scan.yml');
 assert.match(secret,/gitleaks\/gitleaks-action@/);
 const browser=text('.github/workflows/community-chat-browser.yml');
 assert.match(browser,/npx playwright install --with-deps chromium/);
 assert.match(browser,/pull_request:/);
 assert.match(browser,/node tests\/community-chat-browser-r1\.mjs/);
});
