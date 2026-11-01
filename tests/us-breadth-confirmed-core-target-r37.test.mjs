import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const command=fs.readFileSync(path.join(root,'tools/us-market-breadth-r1',
 'US_BREADTH_R37_APPROVED_CORE_PERCENT_HISTORY_PUBLISH.cmd'));

test('R37 Windows CMD is ASCII, CRLF, explicit and only launches isolated R33',()=>{
 assert.equal(command.includes(0),false);
 assert.equal(command[0],0x40);
 assert.equal(command.every(byte=>byte<128),true);
 const script=command.toString('ascii');
 assert.equal(/(?<!\r)\n/.test(script),false,'must have CRLF Windows endings');
 assert.match(script,/set "SCRIPT=%~dp0scripts\\pc-writer\\us-breadth-confirmed-percent-history-runner-r33\.mjs"/);
 assert.match(script,/E:\\ZGmini\\runtime\\node\.exe/);
 assert.match(script,/choice \/C YN/);
 assert.match(script,/--publish-approved --allow-d1-final-write --approved-sha256/);
 assert.match(script,/31ae5b3aa062d84ee9b28954fe726a47c36bde6bfcdfc957624fba4babee9728/);
 assert.match(script,/R37_OPERATOR_DECLINED_NO_D1_WRITE/);
 assert.match(script,/R37_PUBLISH_EXIT_NONZERO/);
 assert.doesNotMatch(script,/schtasks|wrangler d1 execute|DELETE FROM|DROP TABLE/i);
});
