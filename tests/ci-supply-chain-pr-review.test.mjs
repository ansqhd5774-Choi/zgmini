import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow=readFileSync(new URL('../.github/workflows/node.js.yml',import.meta.url),'utf8');
const reviewStep=workflow.slice(workflow.indexOf('      - name: Review PR dependency changes (advisory only)'));
test('PR dependency diff uses audited immutable official v5.0.1 commit SHA',()=>{
 assert.match(workflow,/uses: actions\/dependency-review-action@bbc44d14a204704ccc493733616cd1e93a0321ec/);
 assert.match(reviewStep,/if: \$\{\{ github\.event_name == 'pull_request' \}\}/);
 assert.match(workflow,/pull_request:\s*\n\s+branches: \[main\]/);
});
test('dependency security and license findings are observed without unapproved blocking',()=>{
 assert.match(reviewStep,/warn-only: 'true'/);
 assert.match(reviewStep,/license-check: 'true'/);
 assert.match(reviewStep,/vulnerability-check: 'true'/);
 assert.doesNotMatch(reviewStep,/pull-requests: write/);
 assert.doesNotMatch(reviewStep,/continue-on-error:\s*true/);
});
test('existing high-severity npm audit and previous source checks remain',()=>{
 assert.match(workflow,/npm audit --omit=dev --audit-level=high/);
 assert.match(workflow,/uses: actions\/checkout@v4/);
 assert.match(workflow,/run: npm run build/);
 assert.match(workflow,/run: npm run typecheck/);
 assert.match(workflow,/run: node --test tests\/\*\.test\.mjs/);
});
