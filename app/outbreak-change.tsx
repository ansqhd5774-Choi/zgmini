export function OutbreakChange({current,previous,comparison='전일'}:{current:number|null;previous:number|null;comparison?:string}){
 if(current===null||previous===null||!Number.isFinite(current)||!Number.isFinite(previous))return null;
 const difference=current-previous;
 const amount=Math.round(Math.abs(difference));
 const text=amount===0?'0':`${difference>0?'+':'-'}${amount}`;
 const direction=amount===0?'flat':difference>0?'up':'down';
 return <span className={`ob-direction ob-direction-${direction}`} title={`${comparison} 대비 ${text}점`} aria-label={`${comparison} 대비 ${text}점`}>{text}</span>;
}
