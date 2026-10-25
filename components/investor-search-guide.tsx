import {ArrowUpRight,BookOpen,CalendarDays,ChartNoAxesCombined,Gauge,Layers3,Link2,ChevronsDown} from 'lucide-react';

export type InvestorSearchCopy={heading:string;items:{question:string;answer:string}[];links:{href:string;label:string}[]};

const DASHBOARD_CARD_ICONS=[ChartNoAxesCombined,Gauge,CalendarDays,Layers3];
const DASHBOARD_CARD_ACCENTS=['border-l-[#5ccef1]','border-l-[#ffc66e]','border-l-[#81d9b4]','border-l-[#c2a6f8]'];

function DashboardSearchContent({copy}:{copy:InvestorSearchCopy}){
 return <div className="border-t border-[#24485c] px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
  <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2">
   {copy.items.map((item,index)=>{
    const Icon=DASHBOARD_CARD_ICONS[index]??BookOpen;
    return <article key={item.question} className={`min-w-0 rounded border border-[#24485c] border-l-[3px] bg-[#0d2a3b] p-3 ${DASHBOARD_CARD_ACCENTS[index]??'border-l-[#5ccef1]'}`}>
     <h3 className="flex min-w-0 items-start gap-2 text-xs font-semibold leading-5 text-sky-100 sm:text-sm">
      <Icon size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-[#8ed2e6]"/>
      <span>{item.question}</span>
     </h3>
     <p className="mt-2 text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6">{item.answer}</p>
    </article>;
   })}
  </div>
  <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-sky-100"><Link2 size={14} aria-hidden="true" className="text-[#6fd0e6]"/>관련 지표 바로가기</div>
  <nav className="mt-2 grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-4" aria-label="관련 주식 투자 지표와 발표 안내">
   {copy.links.map(link=><a key={link.href} href={link.href} className="flex min-h-9 min-w-0 items-center justify-between gap-1.5 rounded border border-[#285167] bg-[#0b293b] px-2 py-1.5 text-[11px] font-semibold leading-4 text-cyan-100 hover:bg-[#123e52] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 sm:text-xs">
    <span className="min-w-0 break-keep">{link.label}</span><ArrowUpRight size={13} aria-hidden="true" className="shrink-0 text-[#65c8de]"/>
   </a>)}
  </nav>
 </div>;
}

export default function InvestorSearchGuide({copy,id,collapsible=false}:{copy:InvestorSearchCopy;id:string;collapsible?:boolean}){
 if(collapsible)return <details className="group col-span-full mt-4 min-w-0 rounded-md border border-[#24485c] bg-[#071e2c] text-slate-200" aria-labelledby={`${id}-title`} data-testid={id}>
  <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 sm:px-4 [&::-webkit-details-marker]:hidden">
   <h2 id={`${id}-title`} className="flex min-w-0 items-center gap-2 text-sm font-bold leading-5 text-white"><BookOpen size={16} aria-hidden="true" className="shrink-0 text-[#75c9e6]"/><span>{copy.heading}</span></h2>
   <ChevronsDown size={16} aria-hidden="true" className="shrink-0 text-[#a5c8da] transition-transform group-open:rotate-180"/>
  </summary>
  <DashboardSearchContent copy={copy}/>
 </details>;
 return <section className="col-span-full mt-8 min-w-0 rounded-md border border-[#24485c] bg-[#071e2c] p-4 text-slate-200 sm:p-6" aria-labelledby={`${id}-title`} data-testid={id}>
  <h2 id={`${id}-title`} className="text-lg font-bold leading-7 text-white">{copy.heading}</h2>
  <div className="mt-4 grid gap-4 md:grid-cols-2">
   {copy.items.map(item=><article key={item.question} className="min-w-0"><h3 className="text-sm font-semibold leading-6 text-sky-100">{item.question}</h3><p className="mt-1 text-xs leading-6 text-slate-300 sm:text-sm">{item.answer}</p></article>)}
  </div>
  <nav className="mt-4 flex flex-wrap gap-2" aria-label="관련 주식 투자 지표와 발표 안내">{copy.links.map(link=><a key={link.href} href={link.href} className="inline-flex min-h-10 items-center rounded border border-[#285167] px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-[#123447] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">{link.label} →</a>)}</nav>
 </section>;
}
