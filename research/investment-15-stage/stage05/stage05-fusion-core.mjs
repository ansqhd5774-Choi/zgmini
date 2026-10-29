/**
 * R89 Stage05 gate. The deprecated realized-industry G1/G2/G/D/M4 and
 * M4-dependent S5 scoring have been removed by explicit user instruction.
 * Only an actual Stage04 user-confirmed theme selection may pass forward.
 */
export const SCHEMA_VERSION = 'STAGE05_USER_CONFIRMED_THEME_HANDOFF_V3';

const isScore = n => typeof n === 'number' && Number.isFinite(n)
  && n >= 0 && n <= 100;
const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
  && !Number.isNaN(Date.parse(`${s}T00:00:00Z`))
  && new Date(`${s}T00:00:00Z`).toISOString().slice(0,10) === s;
const index = (rows, name) => {
  const entries = new Map();
  for (const row of rows) {
    if (!row || typeof row.id !== 'string' || !row.id.trim())
      throw new Error(`${name}_ID_INVALID`);
    if (entries.has(row.id)) throw new Error(`${name}_DUPLICATE_ID_${row.id}`);
    entries.set(row.id,row);
  }
  return entries;
};

/**
 * Input: Stage01-03 completed context and Stage04 final_selection as recorded
 * by user approval. Does not derive scores from the Stage04 forecast CAGR/F.
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
  const finalSelection=input.stage04?.final_selection;
  const confirmed=finalSelection?.state==='FINAL_CONFIRMED'
    &&Array.isArray(finalSelection.confirmed_theme_ids)
    &&finalSelection.confirmed_theme_ids.length>0
    &&typeof finalSelection.approval_evidence==='string'
    &&finalSelection.approval_evidence.trim()!=='' ;
  const confirmedIds=new Set(confirmed?finalSelection.confirmed_theme_ids:[]);
  if(confirmed && (confirmedIds.size!==finalSelection.confirmed_theme_ids.length
    || [...confirmedIds].some(id=>!themes.get(id)?.approved)))
    throw new Error('STAGE04_CONFIRMED_THEME_NOT_IN_STAGE03_APPROVED_ROSTER');
  const rows=[];
  for(const candidate of themes.values()){
    if(candidate.approved!==true)continue;
    const sector=sectors.get(candidate.sectorId);
    const reasons=[];
    if(!marketReady)reasons.push('STAGE01_RESULT_NOT_READY');
    if(input.stage02?.status!=='READY')reasons.push('STAGE02_RESULT_NOT_READY');
    if(input.stage03?.status!=='READY')reasons.push('STAGE03_RESULT_NOT_READY');
    if(input.stage04?.status!=='READY')reasons.push('STAGE04_RESULT_NOT_READY');
    if(!sector||!isScore(sector.score))reasons.push('STAGE02_FINAL_SCORE_MISSING');
    if(!isScore(candidate.score))reasons.push('STAGE03_FINAL_SCORE_MISSING');
    if(!confirmed)reasons.push('STAGE04_USER_CONFIRMATION_MISSING');
    else if(!confirmedIds.has(candidate.id))reasons.push('THEME_NOT_SELECTED_BY_USER');
    if(confirmed && (!isDate(finalSelection.confirmed_at)
      ||finalSelection.confirmed_at>input.snapshotDate))
      reasons.push('STAGE04_USER_CONFIRMATION_DATE_INVALID');
    const eligible=reasons.length===0;
    rows.push({themeId:candidate.id,sectorId:candidate.sectorId,
      status:eligible?'CONFIRMED_FOR_RESEARCH':'BLOCKED',
      stage02Score:isScore(sector?.score)?sector.score:null,
      stage03Score:isScore(candidate.score)?candidate.score:null,
      selectionState:confirmedIds.has(candidate.id)?'USER_SELECTED':'NOT_SELECTED',
      calculation:'NONE_USER_SELECTION_ONLY',blockReasons:reasons});
  }
  const selected=rows.filter(row=>row.status==='CONFIRMED_FOR_RESEARCH');
  return {schemaVersion:SCHEMA_VERSION,mode:'READ_ONLY_NO_NEW_SCORE_NO_TRADE',
    snapshotDate:input.snapshotDate,
    stage01:{risk:marketReady?market.risk:'UNKNOWN',
      status:marketReady?'VERIFIED':'UNAVAILABLE',
      observedDate:marketReady?market.date:null},
    summary:{approvedCandidateCount:rows.length,confirmedCount:selected.length,
      rankableCount:0,blockedCount:rows.length-selected.length,
      selectedThemeId:selected.length===1?selected[0].themeId:null},
    rows,ranking:[],
    confirmedThemeIds:selected.map(row=>row.themeId),
    notes:['Stage04 industry realized YoY, growth acceleration and G/D/M4 are retired.',
      'Stage05 does not calculate M4, S5, or an automatic theme priority ranking.',
      'Only themes explicitly confirmed by the user can progress.']};
}
