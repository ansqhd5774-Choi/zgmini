import {readFileSync} from 'node:fs';
// The public wrapper, renderer and motion context form the same chart contract.
export function marketChartSource(){
 return ['market-fear-greed-chart.tsx','market-fear-greed-chart-renderer.tsx','market-chart-animation-context.ts']
  .map(name=>readFileSync(new URL('../../app/'+name,import.meta.url),'utf8')).join('\n');
}
