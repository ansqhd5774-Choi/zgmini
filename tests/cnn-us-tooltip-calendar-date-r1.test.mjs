import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cnnUsMultiDayTooltipDate} from '../lib/cnn-tooltip-calendar-date-r1.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const usa=read('app/fear-greed/usa/cnn-panel.tsx');
const renderer=read('app/market-fear-greed-chart-renderer.tsx');
const korea=read('app/korea-composite-view.tsx');
const styles=read('app/globals.css');

test('USA 1W/1M/3M/6M/1Y show US calendar date only, even when intraday archive exists',()=>{
 for(const original of [
  '2026-11-11T00:30:00.000Z', // 11/10 19:30 EST
  '2026-07-11T00:30:00.000Z', // 07/10 20:30 EDT
  '2026-10-11T20:00:00.000Z',
 ])assert.match(cnnUsMultiDayTooltipDate(original),/^\d{4}-\d{2}-\d{2}$/);
 assert.equal(cnnUsMultiDayTooltipDate('2026-11-11T00:30:00.000Z'),'2026-11-10');
 assert.equal(cnnUsMultiDayTooltipDate('2026-07-11T00:30:00.000Z'),'2026-07-10');
 assert.equal(cnnUsMultiDayTooltipDate('2026-10-11T20:00:00.000Z'),'2026-10-11');
 assert.doesNotMatch(cnnUsMultiDayTooltipDate('2026-10-11T20:00:00.000Z'),/\d{2}:\d{2}|동부시간/);
 assert.match(usa,/formatTooltipLabel=\{selectedPeriod==="1D"[\s\S]*?: cnnUsMultiDayTooltipDate\}/);
 assert.doesNotMatch(usa,/archiveHistory\.length>=2\?intradayLabel:dateLabel/);
});
test('CNN published daily dates do not shift back one day when parsed in New York',()=>{
 assert.equal(cnnUsMultiDayTooltipDate('2026-10-13'),'2026-10-13');
 assert.equal(cnnUsMultiDayTooltipDate('2026-11-10'),'2026-11-10');
 assert.equal(cnnUsMultiDayTooltipDate('2026-02-29'),'—');
 assert.equal(cnnUsMultiDayTooltipDate('not-a-date'),'—');
 assert.equal(cnnUsMultiDayTooltipDate(''),'—');
 assert.equal(cnnUsMultiDayTooltipDate(null),'—');
});
test('USA 1D shows genuine Eastern observation time without PC pseudo observations',()=>{
 assert.match(usa,/formatTooltipLabel=\{selectedPeriod==="1D"\s*\? \(value:string\)=>/);
 assert.match(usa,/windowMinutes:1440/);
 assert.match(usa,/CNN 원본 기준 최근 24시간/);
 assert.doesNotMatch(usa,/currentSessionPcDates|data-cnn-minute/);
 assert.match(usa,/\? \(value:string\)=>intradayLabel\(value\)/);
 assert.match(usa,/Number\.isFinite\(timestamp\) \? usIntradayDateTime\.format\(new Date\(timestamp\)\) : "—"/);
 const from=usa.indexOf('formatTooltipLabel={selectedPeriod==="1D"');
 const to=usa.indexOf('emptyLabel=',from);
 assert.ok(from>=0 && to>from,'CNN 1D tooltip definition is present');
 const oneDayTooltip=usa.slice(from,to);
 assert.doesNotMatch(oneDayTooltip,/bucket|구간|마감|진행 중|동부시간/,'no unsolicited 1D tooltip metadata');
 assert.doesNotMatch(usa.slice(usa.indexOf('const intradayLabel'),usa.indexOf('const dateLabel')),/동부시간/);
 assert.match(usa,/timeZone: "America\/New_York", month: "2-digit", day: "2-digit"/);
 assert.match(usa,/history = useMemo\(\(\) => \{/);
 assert.doesNotMatch(usa,/currentCnnSessionHistory\(payload\?\.observedAt/);
 assert.match(usa,/point\.time>=anchor-86400000&&point\.time<=anchor/);
});
test('USA and Korea still use the same existing tooltip card and value band palette',()=>{
 assert.match(renderer,/<div className="cnn-history-tooltip">/);
 assert.match(renderer,/<span>\{formatTooltipLabel\(sourceLabel\)\}<\/span>/);
 assert.match(renderer,/tooltipValue\.toFixed\(1\)/);
 assert.match(renderer,/fearGreedStateColor\(/);
 assert.match(korea,/formatTooltipLabel=\{value=>formatDate\(value\)\}/);
 assert.match(styles,/\.cnn-history-tooltip\{[\s\S]*?min-width:92px;/);
 assert.match(styles,/\.cnn-history-tooltip\{[\s\S]*?background:#071a29;/);
});
