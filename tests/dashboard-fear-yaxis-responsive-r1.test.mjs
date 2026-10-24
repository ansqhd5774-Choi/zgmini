import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const fearChart=readFileSync(new URL('../app/market-fear-greed-chart.tsx',import.meta.url),'utf8');

test('dashboard Fear & Greed y axis matches summary scale on desktop without changing mobile',()=>{
  assert.match(fearChart,/const mobileAxisRight=useDashboardMobileAxis\(\)/);
  assert.match(fearChart,/ticks=\{\[0, 25, 50, 75, 100\]\}/);
  assert.match(fearChart,/width=\{mobileAxisRight\?28:36\}/);
  assert.match(fearChart,/fontSize: mobileAxisRight\?9:13/);
});
