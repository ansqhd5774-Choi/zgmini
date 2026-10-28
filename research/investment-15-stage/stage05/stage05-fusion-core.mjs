/**
 * Stage05: consume the completed Stage01-04 scores without re-scoring them.
 * Stage04 owns G1/G2/F/G/D/M4; Stage02/03 own ETF and sentiment indicators.
 * Stage05 passes the published M4 through as its research-priority value and
 * carries the earlier scores as independent context for Ollama's selection.
 * No prices, news, new weights, Stage01-04 code or live-trading paths are used.
 */
export const SCHEMA_VERSION = 'STAGE05_COMPLETED_STAGE_RESULTS_V2';

const isScore = n => typeof n === 'number' && Number.isFinite(n)
  && n >= 0 && n <= 100;
const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
  && !Number.isNaN(Date.parse(`${s}T00:00:00Z`))
  && new Date(`${s}T00:00:00Z`).toISOString().slice(0,10) === s;
const index = (rows, name) => {
  const result = new Map();
  for (const row of rows) {
    if (!row || typeof row.id !== 'string' || !row.id.trim())
      throw new Error(`${name}_ID_INVALID`);
    if (result.has(row.id)) throw new Error(`${name}_DUPLICATE_ID_${row.id}`);
    result.set(row.id,row);
  }
  return result;
};

/**
 * Input: already-completed Stage01-04 output, normalized into this Stage05-only
 * handoff. No raw RS, trend, G1, G2 or F fields are required or recomputed.
 * {
 *  schemaVersion, snapshotDate,
 *  stage01:{status:'READY',date,risk},
 *  stage02:{status:'READY',sectors:[{id,score}]},
 *  stage03:{status:'READY',themes:[{id,sectorId,approved,score}]},
 *  stage04:{status:'READY',themes:[{id,status:'QUANTIFIED',M4,
 *    scoreKind:'STAGE04_M4_FINAL',scoreValidation:'VERIFIED',validatedDate}]}
 * }
 * Stage02/03 scores and Stage01 risk are context, never a second weighted
 * contribution to the Stage04 result. Only Stage03-approved themes are ranked.
 */
export function calculateFusionStage05(input) {
  if(input?.schemaVersion!==SCHEMA_VERSION)
    throw new Error('INPUT_SCHEMA_VERSION_MISMATCH');
  if(!isDate(input?.snapshotDate))throw new Error('SNAPSHOT_DATE_INVALID');
  const market=input.stage01;
  const marketReady=market?.status==='READY'&&isDate(market.date)
    &&market.date<=input.snapshotDate
    &&['NORMAL','CAUTION','HIGH_RISK','UNKNOWN'].includes(market.risk);
  const sectors=index(input.stage02?.sectors||[],'STAGE02_SECTOR');
  const themes=index(input.stage03?.themes||[],'STAGE03_THEME');
  const industry=index(input.stage04?.themes||[],'STAGE04_THEME');
  const rows=[];

  for(const candidate of themes.values()){
    if(candidate.approved!==true)continue;
    const sector=sectors.get(candidate.sectorId);
    const final=industry.get(candidate.id);
    const reasons=[];
    if(!marketReady)reasons.push('STAGE01_RESULT_NOT_READY');
    if(input.stage02?.status!=='READY')reasons.push('STAGE02_RESULT_NOT_READY');
    if(input.stage03?.status!=='READY')reasons.push('STAGE03_RESULT_NOT_READY');
    if(input.stage04?.status!=='READY')reasons.push('STAGE04_RESULT_NOT_READY');
    if(!sector||!isScore(sector.score))reasons.push('STAGE02_FINAL_SCORE_MISSING');
    if(!isScore(candidate.score))reasons.push('STAGE03_FINAL_SCORE_MISSING');
    if(!final||final.status!=='QUANTIFIED'||!isScore(final.M4)
      ||final.scoreKind!=='STAGE04_M4_FINAL'
      ||final.scoreValidation!=='VERIFIED')
      reasons.push('STAGE04_FINAL_M4_MISSING');
    if(!isDate(final?.validatedDate)||final.validatedDate>input.snapshotDate)
      reasons.push('STAGE04_RESULT_DATE_INVALID');

    const eligible=reasons.length===0;
    rows.push({themeId:candidate.id,sectorId:candidate.sectorId,
      status:eligible?'RANKABLE':'BLOCKED',
      stage02Score:isScore(sector?.score)?sector.score:null,
      stage03Score:isScore(candidate.score)?candidate.score:null,
      stage04M4:isScore(final?.M4)&&final?.status==='QUANTIFIED'
        &&final.scoreKind==='STAGE04_M4_FINAL'
        &&final.scoreValidation==='VERIFIED'?final.M4:null,
      // S5 is a passthrough of the completed M4, not a new additive formula.
      S5:eligible?final.M4:null,
      calculation:'STAGE04_FINAL_SCORE_REUSED_NO_REWEIGHTING',
      blockReasons:reasons});
  }

  const ranked=rows.filter(row=>row.status==='RANKABLE')
    .sort((a,b)=>b.S5-a.S5||a.themeId.localeCompare(b.themeId));
  return {schemaVersion:SCHEMA_VERSION,mode:'READ_ONLY_RESEARCH',
    snapshotDate:input.snapshotDate,
    stage01:{risk:marketReady?market.risk:'UNKNOWN',
      status:marketReady?'VERIFIED':'UNAVAILABLE',
      observedDate:marketReady?market.date:null},
    summary:{approvedCandidateCount:rows.length,rankableCount:ranked.length,
      blockedCount:rows.length-ranked.length,selectedThemeId:null},
    rows,ranking:ranked.map((row,i)=>({rank:i+1,themeId:row.themeId,
      S5:row.S5,stage02Score:row.stage02Score,stage03Score:row.stage03Score})),
    notes:['Stage05 does not select the final theme; Ollama selects from these completed results.',
      'S5 is the already-computed Stage04 M4 research priority, not a fresh score or buy signal.',
      'Earlier Stage02/03 scores are passed as context; raw RS/trend or G1/G2/F is never recalculated.',
      'An unavailable final input remains NULL. Saved R77 forecast CAGR is not M4.']};
}
