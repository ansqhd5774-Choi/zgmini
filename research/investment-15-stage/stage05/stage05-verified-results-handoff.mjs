/**
 * R89 Stage05: pass only user-confirmed Stage04 themes to technology research.
 * Never require or reconstruct retired realized-growth, acceleration, M4 or S5.
 */
import {SCHEMA_VERSION} from './stage05-fusion-core.mjs';

const isScore = n => typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;

export function buildVerifiedResultsHandoff({completedSnapshot=null,fusion=null}={}) {
  if(completedSnapshot?.schemaVersion!==SCHEMA_VERSION
    ||!Array.isArray(completedSnapshot.stage03?.themes))
    throw new Error('STAGE05_COMPLETED_RESULTS_REQUIRED');
  const approved=completedSnapshot.stage03.themes.filter(row=>row?.approved===true);
  if(approved.length!==9||new Set(approved.map(row=>row.id)).size!==9
    ||approved.some(row=>typeof row.id!=='string'||!row.id.trim()
      ||typeof (row.name||row.theme)!=='string'||!(row.name||row.theme).trim()))
    throw new Error('STAGE05_APPROVED_NINE_NAME_AND_ID_REQUIRED');
  if(fusion?.schemaVersion!==SCHEMA_VERSION
    ||fusion.snapshotDate!==completedSnapshot.snapshotDate
    ||!Array.isArray(fusion.rows)||fusion.rows.length!==approved.length)
    throw new Error('STAGE05_VERIFIED_FUSION_CONTRACT_MISMATCH');
  const byId=new Map(fusion.rows.map(row=>[row.themeId,row]));
  if(byId.size!==approved.length
    ||approved.some(row=>!byId.has(row.id)))
    throw new Error('STAGE05_UNAPPROVED_OR_DUPLICATE_THEME');
  const candidates=approved.map(row=>{
    const state=byId.get(row.id);
    const ready=state.status==='CONFIRMED_FOR_RESEARCH'
      &&state.calculation==='NONE_USER_SELECTION_ONLY'
      &&state.blockReasons?.length===0
      &&isScore(state.stage02Score)&&isScore(state.stage03Score);
    return {themeId:row.id,theme:row.name||row.theme,
      stage03Approved:true,
      stage02Score:isScore(state.stage02Score)?state.stage02Score:null,
      stage03Score:isScore(state.stage03Score)?state.stage03Score:null,
      status:ready?'USER_CONFIRMED_FOR_RESEARCH':'INPUT_INCOMPLETE',
      reasons:ready?[]:[...state.blockReasons]};
  });
  const selected=candidates.filter(row=>row.status==='USER_CONFIRMED_FOR_RESEARCH');
  const researchReady=selected.length>0
    &&completedSnapshot.stage04?.final_selection?.state==='FINAL_CONFIRMED';
  return {
    version:'STAGE05_USER_CONFIRMED_HANDOFF_R89',
    mode:'READ_ONLY_NO_RESEARCH_EXECUTION_NO_TRADE',
    status:researchReady?'READY_FOR_OLLAMA_RESEARCH':'BLOCKED_USER_CONFIRMATION_OR_PRIOR_RESULTS',
    asOfDate:completedSnapshot.snapshotDate,
    inputSources:{roster:'COMPLETED_STAGE03_ROSTER',
      selection:'EXPLICIT_STAGE04_USER_APPROVAL',
      forecastCagr:'SEPARATE_RESEARCH_CONTEXT'},
    coverage:{approvedThemes:9,userConfirmed:selected.length},
    candidates,
    ollamaInput:researchReady?{
      researchMode:'STAGE05_CONFIRMED_THEME_TECHNOLOGY_ONLY',
      asOfDate:completedSnapshot.snapshotDate,
      stage01MarketRisk:fusion.stage01.risk,
      userApprovalEvidence:completedSnapshot.stage04.final_selection.approval_evidence,
      candidates:selected.map(({themeId,theme,stage02Score,stage03Score})=>
        ({themeId,theme,stage02Score,stage03Score})),
    }:null,
    caution:'사용자 확정 테마만 기술 조사에 전달. 과거 산업 실측·YoY·가속도 및 G/D/M4/S5 산식은 폐기. 자동 테마 재선정·주문 없음.',
  };
}
