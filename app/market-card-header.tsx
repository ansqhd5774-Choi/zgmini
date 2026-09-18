import type { ReactNode } from 'react';
import { MarketStateBadge } from './market-state-badge';

export function MarketCardHeader({
  flag,
  eyebrow,
  title,
  description,
  dateLabel,
  date,
  source,
  rightContent,
}:{
  flag:string;
  eyebrow:string;
  title:string;
  description:string;
  dateLabel:string;
  date:string;
  source:string;
  rightContent?:ReactNode;
}){
  return <div className="cnn-panel-heading" role="group" aria-label={`${title} 시장 카드`}>
    <div className="cnn-market-title">
      <img src={flag} alt="" aria-hidden="true"/>
      <div>
        <p className="cnn-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
    {rightContent ? rightContent : <MarketStateBadge date={date} label={dateLabel} source={source}/>}
  </div>;
}
