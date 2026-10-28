import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

test('R50 repairs only the missing private task, produces diagnostic TXT',()=>{
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const file=path.join(root,'scripts','pc-writer',
    'THEME_NINE_R50_REPAIR_PRIVATE_TASK.cmd');
  const bytes=fs.readFileSync(file),text=bytes.toString('ascii');
  assert.equal(bytes.equals(Buffer.from(text,'ascii')),true);
  assert.equal(/(?<!\r)\n/.test(text),false);
  assert.match(text,/THEME_NINE_R50_REPAIR_TASK_RESULT_/);
  assert.match(text,/ZGMINI-PC-Theme-Nine-R47-Private/);
  assert.match(text,/schtasks \/Create \/SC DAILY \/ST 11:30/);
  assert.match(text,/\/IT/);
  assert.match(text,/\/RL LIMITED/);
  assert.doesNotMatch(text,/schtasks \/(delete|change|end|run)/i);
  const create=text.split('\r\n').find(line=>/^schtasks \/Create /i.test(line));
  assert.ok(create);
  assert.doesNotMatch(create,/\s\/F(?:\s|$)/i);
  assert.match(text,/STOP_TASK_CREATE_FAILED_WINDOWS_MESSAGE_ABOVE/);
  assert.match(text,/STAGE_EXISTING=PENDING_REVIEW/);
  assert.match(text,/D1_WRITES=0/);
  assert.match(text,/PUBLICATION_WRITES=0/);
});
