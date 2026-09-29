import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readGrowthR2StoredInput,validateGrowthR2StoredRecords} from '../lib/market-score/growth-r2-store-r1.mjs';
import {buildGrowthR2Score} from '../lib/market-score/growth-r2-score-r1.mjs';
import {projectGrowthR2Public} from '../lib/market-score/growth-r2-public-r1.mjs';

function arg(name) {
  const i=process.argv.indexOf(name);
  return i>=0 ? process.argv[i+1] : null;
}
const dataRoot=arg('--data-root');
const asOf=arg('--as-of') ?? new Date().toISOString();
if (!dataRoot) throw new Error('DATA_ROOT_REQUIRED');
const store=readGrowthR2StoredInput(dataRoot);
const quality=validateGrowthR2StoredRecords(store.featureRecords);
if (!quality.pass) throw new Error(`STORE_QUALITY_FAIL:${quality.issues.slice(0,5).join(',')}`);
const codeSha=crypto.createHash('sha256')
  .update(fs.readFileSync(fileURLToPath(new URL('../lib/market-score/growth-r2-score-r1.mjs',import.meta.url))))
  .digest('hex');
const snapshot=buildGrowthR2Score({featureRecords:store.featureRecords,asOf,codeSha});
process.stdout.write(JSON.stringify({
  schemaVersion:1,
  generatedAt:new Date().toISOString(),
  store:{pitSha256:store.pitSha256,harmSha256:store.harmSha256,quality},
  snapshot,
  publicProjection:projectGrowthR2Public(snapshot),
},null,2)+'\n');
