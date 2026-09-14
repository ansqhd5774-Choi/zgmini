"use client";
import { marketPeriods } from './market-card-shared';

export function MarketPeriodControls({activeKey,onChange,ariaLabel}:{activeKey:string;onChange:(key:string)=>void;ariaLabel:string}){
 return <div role="group" aria-label={ariaLabel} className="cnn-period-toolbar">{marketPeriods.map(item=><button className="cnn-period-button" key={item.key} type="button" aria-pressed={activeKey===item.key} onClick={()=>onChange(item.key)}>{item.label}</button>)}</div>;
}
