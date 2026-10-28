import test from 'node:test';
import assert from 'node:assert/strict';
import {buildNineR48PrivateTaskXml}
 from '../scripts/pc-writer/theme-nine-r48-private-schedule.mjs';

test('R48 schedule isolates private R47 task without touching any existing job',()=>{
 const xml=buildNineR48PrivateTaskXml({
  taskPath:'E:\\ZGmini\\projects\\zgmini\\scripts\\pc-writer\\THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd',
  workingDirectory:'E:\\ZGmini\\projects\\zgmini\\scripts\\pc-writer',
  username:'PC\\User',startBoundary:'2026-10-29T11:30:00'});
 assert.match(xml,/<MultipleInstancesPolicy>IgnoreNew<\/MultipleInstancesPolicy>/);
 assert.match(xml,/<LogonType>InteractiveToken<\/LogonType>/);
 assert.match(xml,/<StartBoundary>2026-10-29T11:30:00<\/StartBoundary>/);
 assert.match(xml,/THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd/);
 assert.equal(xml.includes('public_feed_snapshots'),false);
 assert.equal(xml.includes('r181-primary-cycle'),false);
 assert.equal(xml.includes('wrangler'),false);
 assert.equal(/(?<!\r)\n/.test(xml),false);
});

test('bad Windows task action, principal, or schedule is rejected',()=>{
 const p={taskPath:'E:\\ZGmini\\R47.cmd',workingDirectory:'E:\\ZGmini',
  username:'PC\\User',startBoundary:'2026-10-29T11:30:00'};
 assert.throws(()=>buildNineR48PrivateTaskXml({...p,taskPath:'R47.cmd'}),/TASK_XML_INPUT/);
 assert.throws(()=>buildNineR48PrivateTaskXml({...p,username:'root'}),/TASK_XML_INPUT/);
 assert.throws(()=>buildNineR48PrivateTaskXml({...p,startBoundary:'2026-10-29T03:00:00'}),/TASK_XML_INPUT/);
});
