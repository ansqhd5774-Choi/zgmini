/**
 * Stage05 handoff of already-computed Stage01–04 results. No new scores, theme
 * decisions, collection, or historical-to-current substitutions are permitted.
 * Ollama receives candidates only after the existing numeric gate is complete.
 */
import {SCHEMA_VERSION} from './stage05-fusion-core.mjs';

const approvedId = topicId => `approved-${topicId}`;
const isScore = value => Number.isFinite(value) && value >= 0 && value <= 100;

export function buildVerifiedResultsHandoff({audit, fusion = null} = {}) {
  if (audit?.version !== 'R79_EXISTING_STAGE01_04_EVIDENCE_BRIDGE'
    || !Array.isArray(audit.themes) || audit.themes.length !== 9)
    throw new Error('STAGE05_APPROVED_ARCHIVE_REQUIRED');
  const approved = new Set(audit.themes.map(row => approvedId(row.topicId)));
  if (approved.size !== 9) throw new Error('STAGE05_DUPLICATE_APPROVED_ID');

  let scoredById = new Map();
  if (fusion !== null) {
    if (fusion.schemaVersion !== SCHEMA_VERSION
      || fusion.snapshotDate !== audit.asOfDate || !Array.isArray(fusion.rows)
      || fusion.rows.length !== approved.size)
      throw new Error('STAGE05_VERIFIED_FUSION_CONTRACT_MISMATCH');
    scoredById = new Map(fusion.rows.map(row => [row.themeId, row]));
    if (scoredById.size !== approved.size
      || [...scoredById.keys()].some(id => !approved.has(id)))
      throw new Error('STAGE05_UNAPPROVED_OR_DUPLICATE_THEME');
  }

  const candidates = audit.themes.map(row => {
    const id = approvedId(row.topicId);
    const score = scoredById.get(id);
    const valid = score?.status === 'RANKABLE' && isScore(score.E)
      && isScore(score.T) && isScore(score.S5)
      && Array.isArray(score.blockReasons) && score.blockReasons.length === 0;
    return {
      themeId:id,theme:row.theme,
      stage03Approved:true,
      archivedFearGreed:{...row.historicalF},
      currentFearGreed:row.currentF ? {...row.currentF} : null,
      industryHistory:{...row.industryHistory},
      stage04M4:isScore(score?.E) ? score.E : null,
      stage05T:isScore(score?.T) ? score.T : null,
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
    asOfDate:audit.asOfDate,
    instruction:'기존 01~04 결과로 한정하여 우선 테마를 판단하고 핵심 기술의 수요·상용화·대체 기술을 공식 출처에서 조사한다. 기존 수치/산식을 변경하거나 기업의 재무·주문을 판단하지 않는다. 근거 URL·발행일·한계와 불확실성을 기록한다.',
    candidates:candidates.map(({themeId,theme,stage04M4,stage05T,stage05S5}) =>
      ({themeId,theme,stage04M4,stage05T,stage05S5})),
  } : null;

  return {
    version:'STAGE05_VERIFIED_RESULTS_HANDOFF_R81',
    mode:'READ_ONLY_NO_RESEARCH_EXECUTION',
    status:complete ? 'READY_FOR_OLLAMA_RESEARCH' : 'BLOCKED_STAGE01_04_SCORES',
    asOfDate:audit.asOfDate,
    inputSources:{roster:'R67_APPROVED_NINE',archive:'R17_HISTORICAL_NOT_CURRENT',
      fusion:fusion ? 'EXPLICIT_VERIFIED_STAGE01_04_SNAPSHOT' : 'NOT_CONNECTED'},
    coverage:{approvedThemes:9,historicalF:audit.coverage.historicalF,
      industrySourcesObserved:audit.coverage.historicalIndustrySourceObserved,
      verifiedCompleteScores:scoredCount,requiredCompleteScores:9},
    candidates,ollamaInput,
    caution:'기존 R17 점수·R77 미래 CAGR은 현재 Stage04 M4나 Stage05 S5가 아니다. 결측은 NULL, 테마 선정/기업 조사/주문은 실행하지 않는다.',
  };
}
