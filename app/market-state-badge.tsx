export function MarketStateBadge({date,label,source}:{date:string;label:string;source:string}){
 const showSource=Boolean(source)&&!source.startsWith('INFLATION_R2');
 return <div className="cnn-source" aria-live="polite"><span>{label}</span><strong>{date}</strong>{showSource?<small role="status">{source}</small>:null}</div>;
}
