export function MarketStateBadge({date,label,source}:{date:string;label:string;source:string}){
 return <div className="cnn-source" aria-live="polite"><span>{label}</span><strong>{date}</strong><small role="status">{source}</small></div>;
}
