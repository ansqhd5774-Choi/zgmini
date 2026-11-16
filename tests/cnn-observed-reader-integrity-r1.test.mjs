import test from 'node:test';
import assert from 'node:assert/strict';
import {addStoredCnnObservation,addStoredCnnVerifiedCheck} from '../lib/cnn-observed-reader-integrity-r1.mjs';

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

test('CNN checkedAt exact replay is idempotent and does not add source observations', () => {
 const checks=new Map();
 const checkedAt='2026-11-01T13:15:00.000Z',observedAt='2026-11-01T12:00:00.000Z';
 assert.equal(addStoredCnnVerifiedCheck(checks,checkedAt,observedAt,40),true);
 assert.equal(addStoredCnnVerifiedCheck(checks,checkedAt,observedAt,40),true);
 assert.deepEqual([...checks.values()],[{checkedAt,sourceObservedAt:observedAt,score:40}]);
});

test('CNN checkedAt re-use with a different source observation is rejected without mutation', () => {
 const checks=new Map();
 const checkedAt='2026-11-01T13:15:00.000Z',observedAt='2026-11-01T12:00:00.000Z';
 assert.equal(addStoredCnnVerifiedCheck(checks,checkedAt,observedAt,40),true);
 assert.equal(addStoredCnnVerifiedCheck(checks,checkedAt,'2026-11-01T13:00:00.000Z',40),false);
 assert.equal(addStoredCnnVerifiedCheck(checks,checkedAt,observedAt,41),false);
 assert.deepEqual([...checks.values()],[{checkedAt,sourceObservedAt:observedAt,score:40}]);
});

test('different PC check instants remain separate from the identical CNN source instant', () => {
 const checks=new Map(),source='2026-11-01T12:00:00.000Z';
 assert.equal(addStoredCnnVerifiedCheck(checks,'2026-11-01T13:15:00.000Z',source,40),true);
 assert.equal(addStoredCnnVerifiedCheck(checks,'2026-11-01T13:30:00.000Z',source,40),true);
 assert.equal(checks.size,2);
});
