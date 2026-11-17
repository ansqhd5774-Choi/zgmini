// R2-11: bounded, source-only SEC CompanyFacts coverage audit.
// A trusted, already-approved PC owner must supply local readSource(cik).
// This module has no entrypoint, HTTP, filesystem access, database write, or scheduler.
import {createHash} from 'node:crypto';
import {
  E1_R5_SEC_CONTRACT,
  padSecCik,
  validateSecCompanyFactsDocument,
} from '../../lib/market-score/earnings-e1-r5-input-contract.mjs';
import {
  selectFiscalComparablePair,
  selectFiscalCurrentQuarter,
} from '../../lib/market-score/earnings-e1-r5-fiscal-inputs.mjs';

export const SEC_FACTS_COVERAGE_SCHEMA = 'ZGMINI_EARNINGS_R2_11_SEC_FACTS_COVERAGE_R1';
const MAX_ISSUERS = 600;
const MAX_DOC_BYTES = 32_000_000;
const METRICS = Object.freeze(Object.keys(E1_R5_SEC_CONTRACT.tags));
const HASH = /^[0-9a-f]{64}$/;
const isoDay = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const ms=Date.parse(value+'T00:00:00Z');
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0,10)===value;
};
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

// The passed-in reader is the only boundary to operating PC data.
// Read source bytes in one issuer at a time; never return raw facts or CIKs.
export function auditStoredSecFactsCoverage({issuerCiks,asOf,readSource}={}) {
  if (!isoDay(asOf) || !Array.isArray(issuerCiks) ||
      issuerCiks.length < 1 || issuerCiks.length > MAX_ISSUERS ||
      typeof readSource !== 'function')
    throw Error('SEC_COVERAGE_ARGUMENT_INVALID');

  const universe = [];
  for (const raw of issuerCiks) {
    if (typeof raw !== 'string' || !/^\d{1,10}$/.test(raw))
      throw Error('SEC_COVERAGE_UNIVERSE_CIK_INVALID');
    const cik = padSecCik(raw);
    if (!cik || cik === '0000000000' || universe.includes(cik))
      throw Error('SEC_COVERAGE_UNIVERSE_DUPLICATE_OR_INVALID');
    universe.push(cik);
  }

  const metricCounts = Object.fromEntries(METRICS.map(metric =>
    [metric,{currentIssuerCount:0,comparableIssuerCount:0,
      currentWithoutAlignedPriorIssuerCount:0,olderPairExcludedIssuerCount:0,
      conflictedIssuerCount:0}]));
  const summary = {
    schemaVersion:SEC_FACTS_COVERAGE_SCHEMA,
    status:'SOURCE_COVERAGE_NOT_VERIFIED',
    asOf,universeIssuerCount:universe.length,
    sourceFilesFound:0,sourceFilesMissing:0,sourceFilesRejected:0,
    contentSha256Computed:0,providedSha256Matched:0,
    aggregateContentSha256:null,sourceCoverageComplete:false,
    metrics:metricCounts,
    providerCalls:0,sqliteWrites:0,d1Writes:0,
    productionActivation:false,sourceArchiveShaVerified:false,
  };
  const manifest = [];

  for (const cik of universe.sort()) {
    let entry;
    try { entry=readSource(cik); }
    catch { summary.sourceFilesRejected++; continue; }
    if (entry == null) { summary.sourceFilesMissing++; continue; }
    if (!entry || typeof entry !== 'object' ||
        !(Buffer.isBuffer(entry.bytes) || typeof entry.bytes === 'string')) {
      summary.sourceFilesRejected++; continue;
    }
    const bytes=Buffer.isBuffer(entry.bytes)?entry.bytes:Buffer.from(entry.bytes,'utf8');
    if (bytes.length < 16 || bytes.length > MAX_DOC_BYTES) {
      summary.sourceFilesRejected++; continue;
    }
    const contentSha=digest(bytes);
    summary.contentSha256Computed++;
    if (entry.expectedSha256 != null &&
        (!HASH.test(entry.expectedSha256) || entry.expectedSha256 !== contentSha)) {
      summary.sourceFilesRejected++; continue;
    }
    // A matching SHA supplied by the reader proves byte equality only; it is
    // not independent verification of the original SEC bulk vintage.
    if (entry.expectedSha256 === contentSha) summary.providedSha256Matched++;

    let document;
    try { document=JSON.parse(bytes.toString('utf8')); }
    catch { summary.sourceFilesRejected++; continue; }
    const check=validateSecCompanyFactsDocument(document);
    if (check.status !== 'PASS' || check.cik !== cik) {
      summary.sourceFilesRejected++; continue;
    }
    summary.sourceFilesFound++;
    manifest.push(cik+'|'+contentSha);
    for (const metric of METRICS) {
      try {
        const current=selectFiscalCurrentQuarter(document,{metric,asOf});
        const pair=selectFiscalComparablePair(document,{metric,asOf});
        if (current?.fact) metricCounts[metric].currentIssuerCount++;
        // Never count a prior quarter's valid pair as coverage of the
        // latest accepted current quarter. Compare exact source geometry.
        const aligned=Boolean(current?.fact && pair?.current && pair?.prior &&
          ['tag','unit','start','end'].every(key=>current.fact[key]===pair.current[key]));
        if (aligned) metricCounts[metric].comparableIssuerCount++;
        else if (current?.fact) {
          metricCounts[metric].currentWithoutAlignedPriorIssuerCount++;
          if (pair?.current && pair?.prior) metricCounts[metric].olderPairExcludedIssuerCount++;
        }
        if ((Number.isSafeInteger(current?.conflicts)&&current.conflicts>0) ||
            (Number.isSafeInteger(pair?.conflicts)&&pair.conflicts>0))
          metricCounts[metric].conflictedIssuerCount++;
      } catch {
        metricCounts[metric].conflictedIssuerCount++;
      }
    }
  }

  summary.aggregateContentSha256=manifest.length
    ? digest(Buffer.from(manifest.join('\n'),'utf8')):null;
  // If a source file is missing, the observed counts are only lower bounds.
  // Null must not be silently represented as 0% confirmed coverage.
  summary.sourceCoverageComplete=summary.sourceFilesFound===universe.length;
  for (const values of Object.values(metricCounts)) {
    values.currentCoverageLowerBound=values.currentIssuerCount / universe.length;
    values.comparableCoverageLowerBound=values.comparableIssuerCount / universe.length;
    values.currentCoverage=summary.sourceCoverageComplete
      ? values.currentCoverageLowerBound:null;
    values.comparableCoverage=summary.sourceCoverageComplete
      ? values.comparableCoverageLowerBound:null;
  }
  // Hashes computed from local bytes do not attest that the underlying SEC
  // bulk archive or vendor vintage was captured and verified at the PC.
  summary.status=summary.sourceFilesFound===universe.length &&
    summary.providedSha256Matched===universe.length
    ? 'ALL_FILES_PROVIDED_SHA_MATCH_ARCHIVE_UNVERIFIED'
    : 'PARTIAL_FILES_OR_PROVENANCE_UNVERIFIED';
  return summary;
}
