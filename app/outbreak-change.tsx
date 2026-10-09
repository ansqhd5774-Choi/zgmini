export function OutbreakChange({current,previous,comparison='전일'}:{current:number|null;previous:number|null;comparison?:string}){
 if(current===null||previous===null||!Number.isFinite(current)||!Number.isFinite(previous))return null;
 const difference=current-previous;
 const amount=Math.round(Math.abs(difference));
 const text=String(amount);
 const direction=amount===0?'flat':difference>0?'up':'down';
 const description=`${comparison} 대비 ${amount}점 ${direction==='up'?'상승':direction==='down'?'하락':'변화 없음'}`;
 return <span className={`ob-direction ob-direction-${direction}`} title={description} aria-label={description}>{text}{direction!=='flat'&&<svg aria-hidden="true" viewBox="0 0 6 12" fill="none"><path d={direction==='up'?'M3 11V1M1 3L3 1L5 3':'M3 1V11M1 9L3 11L5 9'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}</span>;
}
