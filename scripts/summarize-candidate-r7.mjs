import {readFileSync,writeFileSync} from 'node:fs';
const before=JSON.parse(readFileSync('docs/migration/r6/route-profile.json'));
const after=JSON.parse(readFileSync('docs/migration/r7/route-profile.json'));
const rows=after.summary.map(a=>({route:a.route,before:before.summary.find(b=>b.route===a.route),after:a}));
const status=rows.some(r=>r.after.cpu_samples<31)?'NOT_PROVEN':rows.some(r=>r.after.verdict==='FAIL')?'FAIL':rows.every(r=>r.after.cpu_p99<=10)?'PASS':'WARN';
writeFileSync('docs/migration/r7/before-after.json',JSON.stringify({version:'565d438c-8c40-40d7-9d87-ececab4e35d1',status,rows,outliers:after.outliers},null,2));
const table=['| Route | n CPU | R6 P99 | R7 P50 | P90 | P95 | P99 | max | status |','|---|---:|---:|---:|---:|---:|---:|---:|---|',...rows.map(({route,before:b,after:a})=>`| ${route} | ${a.cpu_samples} | ${b.cpu_p99} | ${a.cpu_p50} | ${a.cpu_p90} | ${a.cpu_p95} | ${a.cpu_p99} | ${a.cpu_max} | ${a.verdict} |`)];
writeFileSync('docs/migration/r7/CPU_RESULTS.md',`# R7 CPU evidence\n\nVersion 565d438c-8c40-40d7-9d87-ececab4e35d1; overall ${status}.\n\n${table.join('\n')}\n\nCPU and wallTime are independent official trace fields. R6 workload, pacing, routes and sampling retained; extra inflation-detail API is retained for comparability. First-observed samples do not prove cold starts. Integer 0ms is rounded, not zero work. Subrequest counts unavailable. API503 indicates deliberately unbound D1, not data-path performance.\n\nOutliers: ${after.outliers.length}; parser errors: ${after.parseErrors}.\n`);
console.log(JSON.stringify({status,summary:after.summary},null,2));
