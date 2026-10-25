export type InvestorSearchCopy={heading:string;items:{question:string;answer:string}[];links:{href:string;label:string}[]};

export default function InvestorSearchGuide({copy,id}:{copy:InvestorSearchCopy;id:string}){
 return <section className="mt-8 min-w-0 rounded-md border border-[#24485c] bg-[#071e2c] p-4 text-slate-200 sm:p-6" aria-labelledby={`${id}-title`} data-testid={id}>
  <h2 id={`${id}-title`} className="text-lg font-bold leading-7 text-white">{copy.heading}</h2>
  <div className="mt-4 grid gap-4 md:grid-cols-2">
   {copy.items.map(item=><article key={item.question} className="min-w-0"><h3 className="text-sm font-semibold leading-6 text-sky-100">{item.question}</h3><p className="mt-1 text-xs leading-6 text-slate-300 sm:text-sm">{item.answer}</p></article>)}
  </div>
  <nav className="mt-4 flex flex-wrap gap-2" aria-label="관련 주식 투자 지표와 발표 안내">{copy.links.map(link=><a key={link.href} href={link.href} className="inline-flex min-h-10 items-center rounded border border-[#285167] px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-[#123447] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">{link.label} →</a>)}</nav>
 </section>;
}
