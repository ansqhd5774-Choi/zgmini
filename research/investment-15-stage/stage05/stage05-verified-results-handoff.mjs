/**
 * Stage05 handoff of already-computed Stage01–04 results. No indicator
 * reweighting, original-stage recalculation, or theme decisions are permitted.
 * Ollama receives candidates only after the existing numeric gate is complete.
 */
import {SCHEMA_VERSION} from './stage05-fusion-core.mjs';

const approvedId = topicId => `approved-${topicId}`;
const isScore = value => Number.isFinite(value) && value >= 0 && value <= 100;

export function buildVerifiedResultsHandoff({audit = null, completedSnapshot = null,
  fusion = null} = {}) {
  if(audit!==null&&completedSnapshot!==null)
    throw new Error('STAGE05_MULTIPLE_HANDOFF_INPUTS');
  if(completedSnapshot!==null&&(
    completedSnapshot.schemaVersion!==SCHEMA_VERSION
    ||!Array.isArray(completedSnapshot.stage03?.themes)))
    throw new Error('STAGE05_COMPLETED_RESULTS_REQUIRED');
  if(completedSnapshot===null&&(audit?.version!=='R79_EXISTING_STAGE01_04_EVIDENCE_BRIDGE'
    ||!Array.isArray(audit.themes)||audit.themes.length!==9))
    throw new Error('STAGE05_APPROVED_ARCHIVE_REQUIRED');
  const sourceRows=completedSnapshot!==null
    ?completedSnapshot.stage03.themes.filter(row=>row?.approved===true).map(row=>({
      topicId:null,id:row.id,theme:row.name||row.theme,
      historicalF:null,currentF:null,industryHistory:null,
    }))
    :audit.themes.map(row=>({
      ...row,id:approvedId(row.topicId),
    }));
  if(sourceRows.length!==9||sourceRows.some(row=>
    typeof row.id!=='string'||!row.id.trim()
    ||typeof row.theme!=='string'||!row.theme.trim()))
    throw new Error('STAGE05_APPROVED_NINE_NAME_AND_ID_REQUIRED');
  const approved=new Set(sourceRows.map(row=>row.id));
  if (approved.size !== 9) throw new Error('STAGE05_DUPLICATE_APPROVED_ID');

  let scoredById = new Map();
  if (fusion !== null) {
    if (fusion.schemaVersion !== SCHEMA_VERSION
      || fusion.snapshotDate !== (completedSnapshot?.snapshotDate||audit.asOfDate)
      || !Array.isArray(fusion.rows)
      || fusion.rows.length !== approved.size)
      throw new Error('STAGE05_VERIFIED_FUSION_CONTRACT_MISMATCH');
    scoredById = new Map(fusion.rows.map(row => [row.themeId, row]));
    if (scoredById.size !== approved.size
      || [...scoredById.keys()].some(id => !approved.has(id)))
      throw new Error('STAGE05_UNAPPROVED_OR_DUPLICATE_THEME');
  }

  const candidates = sourceRows.map(row => {
    const id = row.id;
    const score = scoredById.get(id);
    const valid = score?.status === 'RANKABLE'
      && isScore(score.stage02Score) && isScore(score.stage03Score)
      && isScore(score.stage04M4) && isScore(score.S5)
      && score.S5 === score.stage04M4
      && score.calculation === 'STAGE04_FINAL_SCORE_REUSED_NO_REWEIGHTING'
      && Array.isArray(score.blockReasons) && score.blockReasons.length === 0;
    return {
      themeId:id,theme:row.theme,
      stage03Approved:true,
      archivedFearGreed:row.historicalF ? {...row.historicalF} : null,
      currentFearGreed:row.currentF ? {...row.currentF} : null,
      industryHistory:row.industryHistory ? {...row.industryHistory} : null,
      stage02Score:isScore(score?.stage02Score) ? score.stage02Score : null,
      stage03Score:isScore(score?.stage03Score) ? score.stage03Score : null,
      stage04M4:isScore(score?.stage04M4) ? score.stage04M4 : null,
      stage05S5:valid ? score.S5 : null,
      status:valid ? 'VERIFIED_FOR_RESEARCH' : 'INPUT_INCOMPLETE',
      reasons:valid ? [] : score?.blockReasons?.length
        ? [...score.blockReasons] : ['VERIFIED_STAGE01_04_SCORE_NOT_CONNECTED'],
    };
  });
  const complete = candidates.every(row => row.status === 'VERIFIED_FOR_RESEARCH');
  const scoredCount = candidates.filter(row => row.status === 'VERIFIED_FOR_RESEARCH').length;
  const ollamaInput = complete ? {
    researchMode:'STAGE05_THEME_TECHNOLOGY_ONLY',
    asOfDate:completedSnapshot?.snapshotDate||audit.asOfDate,
    instruction:'기존 01~04단계에서 이미 확정한 점수를 재계산하지 말고 시장 위험·섹터·테마·산업 결과를 함께 읽어 우선 테마를 판단한다. 핵심 기술의 수요·상용화·대체 기술을 공식 출처에서 조사한다. 기업 재무·주문 판단을 하지 않는다. 근거 URL·발행일·한계와 불확실성을 기록한다.',
    stage01MarketRisk:fusion?.stage01?.risk||'UNKNOWN',
    candidates:candidates.map(({themeId,theme,stage02Score,stage03Score,stage04M4,stage05S5}) =>
      ({themeId,theme,stage02Score,stage03Score,stage04M4,stage05S5})),
  } : null;

  return {
    version:'STAGE05_VERIFIED_RESULTS_HANDOFF_R85',
    mode:'READ_ONLY_NO_RESEARCH_EXECUTION',
    status:complete ? 'READY_FOR_OLLAMA_RESEARCH' : 'BLOCKED_STAGE01_04_SCORES',
    asOfDate:completedSnapshot?.snapshotDate||audit.asOfDate,
    inputSources:{roster:completedSnapshot?'COMPLETED_STAGE03_ROSTER':'R67_APPROVED_NINE',
      archive:completedSnapshot?'NOT_USED':'R17_HISTORICAL_NOT_CURRENT',
      fusion:fusion ? 'COMPLETED_STAGE01_04_RESULTS' : 'NOT_CONNECTED'},
    coverage:{approvedThemes:9,historicalF:audit?.coverage?.historicalF??null,
      industrySourcesObserved:audit?.coverage?.historicalIndustrySourceObserved??null,
      verifiedCompleteScores:scoredCount,requiredCompleteScores:9},
    candidates,ollamaInput,
    caution:'기존 R17 점수·R77 미래 CAGR은 Stage04 확정 M4가 아니다. Stage05는 이미 확정한 04 최종값을 재가중하지 않는다. 결측은 NULL, 별도 Ollama 실행 전 테마 선정/기업 조사/주문은 실행하지 않는다.',
  };
}
