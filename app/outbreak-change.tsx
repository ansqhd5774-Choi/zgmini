import {outbreakChange} from '../lib/outbreak-change.mjs';
import {useScoreArrows} from '../components/score-arrow-provider';
export function OutbreakChange({current,previous,comparison='전일',series}:{current:number|null;previous:number|null;comparison?:string;series?:string}){
 const arrows=useScoreArrows(),visible=series?arrows(series,current):false;
 const change=outbreakChange(current,previous);
 if(!change)return null;
 const {amount,text,direction}=change;
 const description=`${comparison} 대비 ${amount}점 ${direction==='up'?'상승':direction==='down'?'하락':'변화 없음'}`;
 return <span className={`ob-direction ob-direction-${direction}`} data-arrow-active={visible} title={description} aria-label={description}>{text}{visible&&direction!=='flat'&&<svg aria-hidden="true" viewBox="0 0 6 12" fill="none"><path d={direction==='up'?'M3 11V1M1 3L3 1L5 3':'M3 1V11M1 9L3 11L5 9'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}</span>;
}
