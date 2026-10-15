import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');

test('release guides surface the next verified official schedule without inventing live freshness',()=>{
  const calendar=read('app/guides/release-calendar.tsx');
  assert.match(calendar,/확인 당시 다음 공식 일정/);
  assert.match(calendar,/const nextEvent=\[\.\.\.events\]\.sort/);
  assert.match(calendar,/snapshot\.checkedAt/);
  assert.doesNotMatch(calendar,/D-\$\{/);
});

test('release snapshot events are later than the snapshot verification date',()=>{
  const snapshot=JSON.parse(read('app/guides/release-snapshot.json'));
  const checkedAt=new Date(`${snapshot.checkedAt}T00:00:00Z`).getTime();
  assert.ok(snapshot.events.length>=4);
  for(const event of snapshot.events){
    assert.ok(new Date(event.at).getTime()>checkedAt,`${event.id} must be after checkedAt`);
  }
});
