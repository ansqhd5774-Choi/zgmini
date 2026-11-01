export function percentChange(current,previous){
 if(!Number.isFinite(current)||!Number.isFinite(previous)||previous<=0)return null;
 return Number(((current-previous)/previous*100).toFixed(1));
}
