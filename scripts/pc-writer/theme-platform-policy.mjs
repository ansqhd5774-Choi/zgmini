// Decision rules for already-authorized common work. This is not a credential
// issuer and never changes OS/Cloudflare/GitHub permissions or creates approvals.
const publicActions=new Set(['publish','activate']);
export const ROUTINE_ACTIONS=Object.freeze(['inspect','validate','plan','private-register','collect','calculate','shadow','test','document','push-existing-branch']);
const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
export function decideThemeAction({action,grant,context={}}={}){
 need(typeof action==='string'&&grant?.schema==='ZGMINI_THEME_DELEGATION_V1','THEME_POLICY_CONTRACT');
 const result=(decision,reason,next)=>({decision,reason,next,changesPermissions:false});
 if(context.scopeRevoked)return result('NEEDS_USER','AUTHORIZATION_REVOKED','OBTAIN_CURRENT_SCOPE');
 if(!grant.actions?.includes(action))return result('NEEDS_USER','ACTION_OUTSIDE_DELEGATION','REQUEST_ONLY_MISSING_ACTION');
 if(context.paidResourceChange||context.accountConsent||context.secretRequired||context.destructive)
  return result('NEEDS_USER','EXTERNAL_OR_IRREVERSIBLE_BOUNDARY','USE_EXISTING_SAFE_PATH_OR_REQUEST_SPECIFIC_DECISION');
 if(context.automationUnavailable)return result('MANUAL_PATH','AUTOMATION_BLOCKED_NOT_RUNTIME_FAILURE','USE_EXISTING_PACKAGE_OR_READONLY_RESULT');
 if(context.runningLease)return result('WAIT','ACTIVE_LEASE','RESUME_AFTER_NORMAL_RELEASE');
 if(context.sourceMissing)return result('BLOCKED','EDITABLE_SOURCE_REQUIRED','LOCATE_APPROVED_SOURCE_WITHOUT_REINSTALL');
 if(context.sourceDrift)return result('BLOCKED','SOURCE_CHANGED','COMPARE_DIFF_PRESERVE_EXISTING_WORK');
 if(action==='push-existing-branch'&&(!context.existingBranch||context.protectedBranch||
  context.branch!==grant.workBranch))
  return result('NEEDS_USER','TARGET_BRANCH_OUTSIDE_SCOPE','USE_DESIGNATED_EXISTING_WORK_BRANCH');
 if(publicActions.has(action)){
  if(!context.selectionVerified||!context.formulaVerified||!context.inputVerified)
   return result('BLOCKED','PUBLICATION_INPUT_NOT_VERIFIED','COMPLETE_ONLY_FAILED_LOCAL_GATE');
  if(!context.rightsEvidenceValid)
   return result('BLOCKED','RIGHTS_EVIDENCE_MISSING','VERIFY_EXISTING_PROVIDER_TERMS_AND_ENTITLEMENT');
  if(!context.publicationApprovalValid)
   return result('NEEDS_USER','PUBLICATION_SCOPE_NOT_APPROVED','REQUEST_PUBLICATION_SCOPE_ONCE');
  if(!context.readerCompatible)
   return result('BLOCKED','READER_CONTRACT_NOT_DEPLOYED','PREPARE_SELECTIVE_COMPATIBLE_READER_CHANGE');
 }
 if(!ROUTINE_ACTIONS.includes(action)&&!publicActions.has(action))
  return result('NEEDS_USER','UNSUPPORTED_ACTION','DEFINE_SPECIFIC_OPERATION');
 return result('PROCEED','WITHIN_EXISTING_AUTHORIZATION','EXECUTE_AND_RECORD_EVIDENCE_NO_REPEAT_APPROVAL');
}

// A budget or missing source pauses only the affected operation. Neither a
// fixture nor successful transport satisfies formula/runtime evidence.
export function explainThemeBarrier(code){
 const known={
  AUTOMATION_BLOCKED_PC_ACCESS:['MANUAL_PATH','기존 CMD/ZIP 1회 실행 또는 저장 결과 파일로 이어가기'],
  CORE_LOCK_ALREADY_EXISTS:['WAIT','실행 작업과 lease를 조회하고 정상 해제 후 이어가기'],
  SOURCE_CHANGED:['BLOCKED','기존 파일과 후보 차이만 대조하고 덮어쓰지 않기'],
  PROVIDER_BUDGET_EXHAUSTED:['WAIT','기존 checkpoint와 cursor에서 다음 예산 구간에 재개'],
  PROVIDER_DATE_NOT_AVAILABLE:['WAIT','원래 관측일 보존, 같은 구간을 정책에 따라 재확인'],
  RIGHTS_EVIDENCE_MISSING:['BLOCKED','기존 권리 자료의 누락 부분만 확인'],
  PUBLICATION_SCOPE_NOT_APPROVED:['NEEDS_USER','정확한 공개 범위만 한 번 확인'],
  FORMULA_VERSION_MISMATCH:['BLOCKED','해당 테마의 실제 계산기·Reader 연결만 수정'],
 };
 const [classification,next]=known[code]??['UNCLASSIFIED','정확한 첫 실패 단계와 원본 오류를 확인'];
 return {code,classification,next};
}
