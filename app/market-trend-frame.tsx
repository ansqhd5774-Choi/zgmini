import type { ReactNode } from 'react';

export function MarketTrendFrame({children, className = ''}:{children:ReactNode;className?:string}){
  return <div className={`cnn-trend-block market-trend-frame ${className}`.trim()}>{children}</div>;
}
