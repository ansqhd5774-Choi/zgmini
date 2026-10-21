import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const dashboard=readFileSync(new URL("../app/dashboard-ui.tsx",import.meta.url),"utf8");

test("home risk cards do not render provisional stagflation or earnings labels",()=>{
 assert.doesNotMatch(dashboard,/import\s+(?:EarningsProvisionalSummary|StagflationLatestSummary)\b/);
 assert.doesNotMatch(dashboard,/<(?:EarningsProvisionalSummary|StagflationLatestSummary)\s*\/>/);
 assert.match(dashboard,/diagnosticKeys\[index\]==='earningsRecessionDefense'/);
 assert.match(dashboard,/diagnosticKeys\[index\]==='stagflationSafety'/);
 assert.match(dashboard,/className="zg-r55-subscore-foot"/);
 assert.match(dashboard,/className="zg-subscore-name-link" href=\{s.href\}/);
});
