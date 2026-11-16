import test from 'node:test';
import assert from 'node:assert/strict';
import {addStoredCnnObservation} from '../lib/cnn-observed-reader-integrity-r1.mjs';

test('CNN stored reader accepts first observation and identical replay', () => {
 const byTime=new Map();
 assert.equal(addStoredCnnObservation(byTime,'2026-11-01T12:00:00.000Z',40),true);
 assert.equal(addStoredCnnObservation(byTime,'2026-11-01T12:00:00.000Z',40),true);
 assert.deepEqual([...byTime.values()],[{observedAt:'2026-11-01T12:00:00.000Z',score:40}]);
});
test('CNN stored reader rejects conflicting scores for identical observedAt without mutation', () => {
 const byTime=new Map([['2026-11-01T12:00:00.000Z',{observedAt:'2026-11-01T12:00:00.000Z',score:40}]]);
 assert.equal(addStoredCnnObservation(byTime,'2026-11-01T12:00:00.000Z',41),false);
 assert.equal(byTime.get('2026-11-01T12:00:00.000Z').score,40);
});
test('CNN stored reader keeps separate actual observation timestamps', () => {
 const byTime=new Map();
 assert.equal(addStoredCnnObservation(byTime,'2026-11-01T12:00:00.000Z',40),true);
 assert.equal(addStoredCnnObservation(byTime,'2026-11-01T12:05:00.000Z',41),true);
 assert.equal(byTime.size,2);
});
