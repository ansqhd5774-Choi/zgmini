import test from 'node:test';
import assert from 'node:assert/strict';
import {parseR44TaskAction} from './theme-nine-r44-marketparquet-task-shape.mjs';

test('locates a task JS entrypoint without exposing unrelated args',()=>{
 const xml='<Task><Actions><Exec><Command>E:\\ZGmini\\runtime\\node.exe</Command><Arguments>&quot;E:\\ZGmini\\data\\theme-market-history-r131\\marketparquet-r167\\etf-market-cycle.mjs&quot; --key dummy</Arguments></Exec></Actions></Task>';
 const v=parseR44TaskAction(xml);
 assert.equal(v.sourcePaths.length,1);
 assert.equal(v.sourcePaths[0].endsWith('etf-market-cycle.mjs'),true);
 assert.equal(JSON.stringify(v).includes('dummy'),false);
 assert.equal(v.actionSha256.length,64);
});

test('rejects sources outside approved storage root and empty task actions',()=>{
 const xml='<Task><Actions><Exec><Command>E:\\ZGmini\\runtime\\node.exe</Command><Arguments>&quot;C:\\Other\\collector.mjs&quot;</Arguments></Exec></Actions></Task>';
 const v=parseR44TaskAction(xml);
 assert.equal(v.sourceLocationVerified,false);
 assert.deepEqual(v.sourcePaths,[]);
 assert.throws(()=>parseR44TaskAction('<Task/>'),/R44_TASK_ACTION_NOT_FOUND/);
});

test('unquoted command and argument drive paths are not concatenated',()=>{
 const xml='<Task><Command>E:\\ZGmini\\runtime\\node.exe</Command><Arguments>E:\\ZGmini\\data\\theme-market-history-r131\\marketparquet-r167\\the-cycle.mjs --once</Arguments></Task>';
 const v=parseR44TaskAction(xml);
 assert.deepEqual(v.sourcePaths,['E:\\ZGmini\\data\\theme-market-history-r131\\marketparquet-r167\\the-cycle.mjs']);
});
