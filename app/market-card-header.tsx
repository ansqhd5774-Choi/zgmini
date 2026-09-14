import { MarketStateBadge } from './market-state-badge';

export function MarketCardHeader({flag,eyebrow,title,description,dateLabel,date,source}:{flag:string;eyebrow:string;title:string;description:string;dateLabel:string;date:string;source:string}){
 return <div className="cnn-panel-heading"><div className="cnn-market-title"><img src={flag} alt="" aria-hidden="true"/><div><p className="cnn-eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div></div><MarketStateBadge date={date} label={dateLabel} source={source}/></div>;
}
