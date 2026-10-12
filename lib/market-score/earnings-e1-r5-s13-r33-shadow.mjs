import {
  buildEarningsR5RawComponents,
  scoreEarningsR5RawComponents,
} from "./earnings-e1-r5-shadow-calculator.mjs";

export const E1_R5_S13_R33_SHADOW_POLICY=Object.freeze({
  version:"E1-R5-S13-R33-SHADOW-R1",
  source:"SEC_R33",
  requiredAuditVersion:"E1-R5-R33-GUIDANCE-CANDIDATE-AUDIT-R1",
  requiredPolicyVersion:"E1-R5-R33-GUIDANCE-CANDIDATE-R1",
  researchOnly:true,
  productionActivation:false,
  formulaChanged:false,
  scoringGateChanged:false,
  networkCalls:0,
  dbWrites:0,
});

const DIRECTIONS=Object.freeze(["UP","FLAT","DOWN","WITHDRAW","MIXED","UNCLASSIFIED"]);
const nonNegativeInteger=value=>Number.isInteger(value)&&value>=0;
const finite=value=>typeof value==="number"&&Number.isFinite(value);

function invalid(reason,extra={}){
  return {
    status:"INVALID",
    reason,
    source:E1_R5_S13_R33_SHADOW_POLICY.source,
    sourceVersion:E1_R5_S13_R33_SHADOW_POLICY.requiredPolicyVersion,
    guidance:null,
    ...extra,
  };
}

export function bindR33GuidanceAuditToS13(report){
  if(!report||typeof report!=="object")return invalid("R33_AUDIT_REQUIRED");
  if(report.version!==E1_R5_S13_R33_SHADOW_POLICY.requiredAuditVersion)return invalid("R33_AUDIT_VERSION_MISMATCH");
  if(report.policyVersion!==E1_R5_S13_R33_SHADOW_POLICY.requiredPolicyVersion)return invalid("R33_POLICY_VERSION_MISMATCH");
  if(report.status!=="COMPLETE")return invalid("R33_AUDIT_NOT_COMPLETE");
  if(report.r17Complete!==true)return invalid("R33_R17_NOT_COMPLETE");

  const total=report.checkpointEntries;
  if(!Number.isInteger(total)||total<=0)return invalid("R33_CHECKPOINT_COUNT_INVALID");
  if(report.hashMatched!==total||report.missingDocuments!==0||report.hashMismatch!==0)return invalid("R33_DOCUMENT_INTEGRITY_FAILED");

  const counts=report.r33DirectionCounts;
  if(!counts||typeof counts!=="object")return invalid("R33_DIRECTION_COUNTS_REQUIRED");
  for(const direction of DIRECTIONS){
    if(!nonNegativeInteger(counts[direction]))return invalid("R33_DIRECTION_COUNT_INVALID",{direction});
  }
  const counted=DIRECTIONS.reduce((sum,direction)=>sum+counts[direction],0);
  if(counted!==total)return invalid("R33_DIRECTION_COUNT_TOTAL_MISMATCH",{counted,total});

  const eligible=counts.UP+counts.FLAT+counts.DOWN;
  if(eligible<=0)return invalid("R33_ELIGIBLE_COUNT_EMPTY",{total});
  if(report.r33Eligible!==eligible)return invalid("R33_ELIGIBLE_COUNT_MISMATCH",{eligible,reportedEligible:report.r33Eligible});

  const netBreadth=(counts.UP-counts.DOWN)/eligible;
  if(!finite(report.r33NetBreadth)||Math.abs(report.r33NetBreadth-netBreadth)>1e-12){
    return invalid("R33_NET_BREADTH_MISMATCH",{netBreadth,reportedNetBreadth:report.r33NetBreadth});
  }

  return {
    status:"READY",
    reason:null,
    source:E1_R5_S13_R33_SHADOW_POLICY.source,
    sourceVersion:E1_R5_S13_R33_SHADOW_POLICY.requiredPolicyVersion,
    auditVersion:report.version,
    guidance:{up:counts.UP,flat:counts.FLAT,down:counts.DOWN},
    eligibleCount:eligible,
    totalCount:total,
    netBreadth,
    excludedCounts:{
      withdraw:counts.WITHDRAW,
      mixed:counts.MIXED,
      unclassified:counts.UNCLASSIFIED,
    },
  };
}

function withS13Provenance(raw,binding){
  const guidanceBreadth=raw?.components?.guidanceBreadth;
  if(!guidanceBreadth)return {...raw,s13Binding:binding};
  return {
    ...raw,
    s13Binding:binding,
    components:{
      ...raw.components,
      guidanceBreadth:{
        ...guidanceBreadth,
        source:E1_R5_S13_R33_SHADOW_POLICY.source,
        sourceVersion:E1_R5_S13_R33_SHADOW_POLICY.requiredPolicyVersion,
        bindingVersion:E1_R5_S13_R33_SHADOW_POLICY.version,
        bindingStatus:binding.status,
        bindingReason:binding.reason??null,
        eligibleCount:binding.eligibleCount??null,
        totalCount:binding.totalCount??null,
        excludedCounts:binding.excludedCounts??null,
      },
    },
  };
}

export function buildEarningsR5RawComponentsWithS13R33(input={}){
  const source=input&&typeof input==="object"?input:{};
  const binding=bindR33GuidanceAuditToS13(source.guidanceR33Audit);
  const base={...source};
  delete base.guidanceR33Audit;
  delete base.guidance;
  const raw=buildEarningsR5RawComponents({
    ...base,
    guidance:binding.status==="READY"?binding.guidance:null,
  });
  return withS13Provenance(raw,binding);
}

export function buildEarningsR5ShadowWithS13R33(input={},options={}){
  const raw=buildEarningsR5RawComponentsWithS13R33(input);
  const scored=scoreEarningsR5RawComponents(raw,options);
  return {
    ...scored,
    s13Binding:raw.s13Binding,
  };
}
