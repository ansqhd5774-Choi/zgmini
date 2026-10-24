import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const fearChart=readFileSync(new URL('../app/market-fear-greed-chart.tsx',import.meta.url),'utf8');
const dashboard=readFileSync(new URL('../app/dashboard-ui.tsx',import.meta.url),'utf8');

test('dashboard Fear & Greed and composite score use compact 9px Y-axis labels',()=>{
  assert.match(fearChart,/const mobileAxisRight=useDashboardMobileAxis\(\)/);
  assert.match(fearChart,/ticks=\{\[0, 25, 50, 75, 100\]\}/);
  assert.match(fearChart,/width=\{28\}/);
  assert.match(fearChart,/fontSize: 9/);
  const summaryAxis=dashboard.match(/<YAxis orientation=\{mobileAxisRight\?"right":"left"\} domain=\{\[0,100\]\} ticks=\{\[0,50,100\]\}[^\n]+/);
  assert.ok(summaryAxis,'summary score Y-axis is present');
  assert.match(summaryAxis[0],/fontSize:9/);
  assert.match(summaryAxis[0],/width=\{28\}/);
});
