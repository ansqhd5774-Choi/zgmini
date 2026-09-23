import {buildEarningsE1R2,E1_R2_LIMITS} from "./earnings-e1-r2.mjs";

export const E1_R3_LIMITS=E1_R2_LIMITS;
export const E1_R3_METHODOLOGY_VERSION="E1-R3";

export function buildEarningsE1R3(args={}){
  const base=buildEarningsE1R2(args);
  const missingReason=Array.isArray(base?.missing)?base.missing[0]:null;
  const inputPeriodValid=missingReason!=="INVALID_AS_OF_DATE"&&missingReason!=="INVALID_FINANCIAL_PERIOD"&&typeof args?.financialPeriodEnd==="string";
  const financialPeriodEnd=base?.financialPeriodEnd??(inputPeriodValid?args.financialPeriodEnd:null);
  return {
    ...base,
    ...(financialPeriodEnd?{financialPeriodEnd}:{}),
    methodologyVersion:E1_R3_METHODOLOGY_VERSION,
    persistenceMode:"D1_CURRENT_UPSERT_PLUS_CHANGE_HISTORY",
    interpretation:base?.interpretation
      ? `${base.interpretation} 기업별 동일 분기 최신 유효값은 D1에 누적 저장하며, 반복 조회에서 누락된 기업을 자동 삭제하지 않습니다.`
      : undefined,
  };
}
