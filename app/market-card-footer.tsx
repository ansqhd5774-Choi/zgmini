import type { ReactNode } from 'react';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';

export function MarketCardFooter({
 children,
 href,
 label,
 ariaLabel,
 date,
}:{
 children:ReactNode;
 href:string;
 label:string;
 ariaLabel?:string;
 date?:string;
}){
 return <div className="cnn-panel-note">
  <ShieldCheck size={16} aria-hidden="true"/>
  <span>{children}{date ? <time className="cnn-footer-date">{date}</time> : null}</span>
  <a href={href} aria-label={ariaLabel??label}>{label} <ArrowUpRight size={14} aria-hidden="true"/></a>
 </div>;
}
