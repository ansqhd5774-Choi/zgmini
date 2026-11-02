import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const route=fs.readFileSync(new URL('../app/api/market-breadth/route.ts',import.meta.url),'utf8');

test('R2 confirmed is a separate stored-only read alias and default R1 503 route remains',()=>{
  assert.match(route,/if\(phase==='confirmed-r2'\)return fullMarketConfirmedR2GET\(\);/);
  assert.match(route,/readFullMarketPublicCurrent\(/);
  assert.match(route,/if\(phase==='provisional'\)return provisionalGET\(\);/);
  assert.match(route,/Response\.json\(usIexPublicPercentOnly\(record\)/);
  assert.match(route,/US_BREADTH_CURRENT_KEY/);
  assert.match(route,/validUsBreadthRecord\(record\)/);
  assert.match(route,/if\(phase!==null&&phase!=='confirmed'\)/);
  assert.doesNotMatch(route,/STAGING_KEY|publishFullMarketStaging|promoteVerifiedFullMarketStaging/);
});

test('explicit R2 and IEX phases short-circuit before the legacy R1 reader',()=>{
  const get=route.slice(route.indexOf('export async function GET(request:Request){'));
  const order=[
    "const phase=url.searchParams.get('phase');",
    "if(phase==='provisional')return provisionalGET();",
    "if(phase==='confirmed-r2')return fullMarketConfirmedR2GET();",
    "if(phase!==null&&phase!=='confirmed')",
    'bind(US_BREADTH_CURRENT_KEY)',
  ].map(needle=>get.indexOf(needle));
  assert.ok(order.every((position,index)=>position>=0&&
    (index===0||position>order[index-1])),
  'explicit phases must return before the legacy R1 snapshot read');

  const r2Start=route.indexOf('async function fullMarketConfirmedR2GET(){');
  const iexStart=route.indexOf('async function provisionalGET(){');
  const visitorStart=route.indexOf('// Visitor read-only:');
  assert.ok(r2Start>=0&&iexStart>r2Start&&visitorStart>iexStart);
  const r2=route.slice(r2Start,iexStart);
  assert.match(r2,/readFullMarketPublicCurrent\(/);
  assert.match(r2,/if\('reason' in result\)return Response\.json\(\{reason:result\.reason\}/);
  assert.match(r2,/\{status:503,headers:/);
  assert.doesNotMatch(r2,/US_BREADTH_CURRENT_KEY|validUsBreadthRecord|provisionalGET/);

  const iex=route.slice(iexStart,visitorStart);
  assert.match(iex,/bind\(US_BREADTH_PROVISIONAL_KEY\)/);
  assert.match(iex,/Response\.json\(usIexPublicPercentOnly\(record\)/);
  assert.doesNotMatch(iex,/US_BREADTH_CURRENT_KEY|validUsBreadthRecord|fullMarketConfirmedR2GET/);
});

test('native CORE binding is preferred and all three phases fail closed when missing',()=>{
  const helper=route.slice(route.indexOf('function coreSnapshotsDb()'),
    route.indexOf('// R2 full-market read alias'));
  assert.match(helper,/native\.DB_CORE\?\?native\.DB/);
  assert.doesNotMatch(helper,/(?:native|env)\.DB_HISTORY/);
  assert.equal((route.match(/const db=coreSnapshotsDb\(\);/g)||[]).length,3);
  assert.equal((route.match(/db\.prepare\('SELECT body,stored_at FROM market_public_snapshots_v1/g)||[]).length,3);
  assert.doesNotMatch(route,/env\.DB\.prepare/);
  for(const status of ['FULL_MARKET_CORE_DATABASE_UNAVAILABLE','PROVISIONAL_STORED_OUTPUT_UNAVAILABLE','STORED_OUTPUT_UNAVAILABLE'])
    assert.match(route,new RegExp("reason:'"+status+"'"));
  const get=route.slice(route.indexOf('export async function GET(request:Request){'));
  assert.ok(get.indexOf("if(phase!==null&&phase!=='confirmed')")<
    get.indexOf('const db=coreSnapshotsDb();'));
});
