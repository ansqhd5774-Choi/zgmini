export function requiresDebtHistoryRefresh(envelope){
 const p=envelope?.payload;
 return p?.status==='READY'&&p?.methodologyVersion==='DEBT_RISK_R7'&&p.historyPolicy!=='STORED_INPUTS_CURRENT_VINTAGE_LATEST_OBSERVATION_AT_OR_BEFORE_DATE_NO_INTERPOLATION';
}
