/**
 * R32 re-survey of every live ZGMINI sector/theme, one publisher search each.
 * A submarket report whose market SUBJECT differs from the requested keyword
 * is never used as an unqualified sector/theme forecast. Research-only.
 * R31 behavior remains available unchanged via its existing entry point.
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { researchAll } from './keyword-growth-all-r31-readonly.mjs';

export const R32_REPORT_NAME = 'STAGE04_ALL_SECTORS_THEMES_R32_DIRECT_SCOPE_READONLY';

export function researchAllStrict(options = {}) {
  return researchAll({ ...options, strictMarketScope: true,
    reportName: R32_REPORT_NAME });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const model = process.argv[2] || 'gemma3:4b';
  const outputFile = join(dirname(fileURLToPath(import.meta.url)),
    'R32_ALL_SECTOR_THEME_GROWTH_RESULT.txt');
  researchAllStrict({ model, outputFile, onProgress: (row, index, total) => {
    console.log(`${index}/${total} ${row.type}=${row.name} ` +
      `STATE=${row.state} MARKET_RATE=${row.growth_pct ?? 'NULL'} ` +
      `AUDIT=${row.source_audit} FAILURE=${row.failure || 'NULL'}`);
  } }).then(({ counts, status, errors }) => {
    console.log(`STATUS=${status} SECTORS=${counts.sectors} THEMES=${counts.themes} ` +
      `PUBLISHER_MARKET_PASS=${counts.passed} ` +
      `PENDING=${counts.missing} FEED_ERRORS=${errors.join(',') || 'NONE'}`);
    console.log('NOTE=SOURCE_MARKET_FORECAST_NOT_WHOLE_ETF_CATEGORY_GROWTH');
    console.log(`RESULT_FILE=${outputFile}`);
    process.exitCode = status === 'RESEARCH_PASS' ? 0 : 2;
  }).catch(error => {
    console.error(`R32_RUN_FAILED=${String(error?.message || error)}`);
    process.exitCode = 1;
  });
}
