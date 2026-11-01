import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {releaseImportance,rowsForSelectedDay} from '../lib/market-calendar-importance.mjs';

const client=readFileSync(new URL('../app/market-calendar/market-calendar-client.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/market-calendar/market-calendar.css',import.meta.url),'utf8');

test('importance uses three deterministic editorial levels independent of favorites',()=>{
 assert.equal(releaseImportance('cpi','Consumer Price Index'),3);
 assert.equal(releaseImportance('employment','Employment Situation'),3);
 assert.equal(releaseImportance('fomc','FOMC Rate Decision'),3);
 assert.equal(releaseImportance('gdp','Gross Domestic Product Advance Estimate'),3);
 assert.equal(releaseImportance('gdp','Gross Domestic Product Third Estimate'),2);
 assert.equal(releaseImportance('ppi','Producer Price Index'),2);
 assert.equal(releaseImportance('jolts','Job Openings and Labor Turnover'),2);
 assert.equal(releaseImportance('retail','Retail Sales'),2);
 assert.equal(releaseImportance('productivity','Productivity'),1);
 assert.equal(releaseImportance('bls-unmapped','Annual Survey of Occupations'),1);
 assert.equal(releaseImportance('bea-misc','Personal Consumption Expenditures Price Index'),3);
 for(const id of ['gdp','cpi','fomc','productivity','unmatched'])assert.ok([1,2,3].includes(releaseImportance(id)));
});

test('27 October selection cannot show 29 October releases and clearing it returns the period',()=>{
 const rows=[
  {date:'2026-10-27',key:'tuesday'},
  {date:'2026-10-28',key:'wednesday'},
  {date:'2026-10-29',key:'thursday'},
 ];
 assert.deepEqual(rowsForSelectedDay(rows,null),rows);
 assert.deepEqual(rowsForSelectedDay(rows,'2026-10-27'),[rows[0]]);
 assert.deepEqual(rowsForSelectedDay(rows,'2026-10-29'),[rows[2]]);
 assert.deepEqual(rowsForSelectedDay(rows,'2026-10-30'),[]);
});

test('calendar date button drives the actual row filter and stars precede dates',()=>{
 assert.match(client,/const \[activeDate,setActiveDate\]=useState<string\|null>\(null\)/);
 assert.match(client,/rowsForSelectedDay\(periodRows,activeDate\)/);
 assert.match(client,/aria-pressed=\{activeDate===key\}/);
 assert.match(client,/setActiveDate\(current=>current===key\?null:key\)/);
 assert.match(client,/className="mc-importance" role="img"/);
 assert.match(client,/Array\.from\(\{length:row\.importance\}/);
 assert.ok(client.indexOf('<div className="mc-importance"')<client.indexOf('<div className="mc-date"'));
 assert.match(client,/>중요도<\/span><span>날짜<\/span>/);
 assert.match(css,/\.mc-importance-heading/);
 assert.match(css,/\.mc-day\.today\{outline:/);
 assert.match(css,/\.mc-day\.selected\{background:/);
});
