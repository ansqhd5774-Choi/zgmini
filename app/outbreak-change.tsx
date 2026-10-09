import {TrendingUp,TrendingDown,Minus} from 'lucide-react';
import {percentChange} from '../lib/iran-progress/percent-change.mjs';
export function OutbreakChange({current,previous,comparison='전일'}:{current:number|null;previous:number|null;comparison?:string}){
 const percent=percentChange(current,previous);
 if(percent===null)return null;
 const direction=percent>0?'up':percent<0?'down':'flat';
 return <span className={`ob-direction ob-direction-${direction}`} title={`${comparison} 대비 ${percent>0?'+':''}${percent.toFixed(1)}%`} aria-label={`${comparison} 대비 ${percent>0?'+':''}${percent.toFixed(1)}%`}><span>{percent>0?'+':''}{percent.toFixed(1)}%</span>{percent>0?<TrendingUp aria-hidden="true"/>:percent<0?<TrendingDown aria-hidden="true"/>:<Minus aria-hidden="true"/>}</span>;
}
