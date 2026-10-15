// Compare the same one-decimal scores shown on the cards, not rounded integers.
export function outbreakChange(current,previous){
 if(current===null||previous===null||!Number.isFinite(current)||!Number.isFinite(previous))return null;
 const difference=Number((Number(current.toFixed(1))-Number(previous.toFixed(1))).toFixed(1));
 const amount=Math.abs(difference);
 return {amount,text:String(amount),direction:amount===0?'flat':difference>0?'up':'down'};
}
