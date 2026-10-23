import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import {ArticleJsonLd,WebPageJsonLd} from '../seo-jsonld';

export function guideMetadata(title:string,description:string,path:string):Metadata {
  const fullTitle=`${title} | ZGmini`,url=`https://zgmini.kr${path}`;
  return {title:fullTitle,description,alternates:{canonical:url},robots:{index:true,follow:true},
    openGraph:{title:fullTitle,description,url,type:'article',siteName:'ZGmini'},
    twitter:{card:'summary',title:fullTitle,description}};
}
export default function GuidePage({title,answer,path,datePublished='2026-10-07',dateModified='2026-10-07',variant='default',children}:{title:string;answer:string;path:string;datePublished?:string;dateModified?:string;variant?:'default'|'market';children:ReactNode}) {
  const market=variant==='market';
  const relatedLinks=[
    {href:'/guides/fear-greed-buying/',label:'공탐 매수 기준과 한계'},
    {href:'/guides/cpi-pce-release/',label:'CPI·PCE 발표 해석'},
    {href:'/guides/fomc/',label:'FOMC 일정과 금리 결정'},
  ].filter(link=>link.href!==path);
  return <main className={market?'min-h-screen bg-[#03121d] text-slate-100':'min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12'}>
    <WebPageJsonLd name={title} description={answer} path={path}/>
    <ArticleJsonLd headline={title} description={answer} path={path} datePublished={datePublished} dateModified={dateModified}/>
    <article className={market?'mx-auto max-w-[1360px] min-w-0 px-[11px] pb-12 pt-3 text-sm leading-7 sm:px-5 sm:pb-16 sm:pt-6':'mx-auto max-w-4xl text-sm leading-7 sm:text-base'}>
      {!market?<a href="/" className="inline-flex min-h-11 items-center text-blue-200">← ZGmini 대시보드</a>:null}
      {!market?<header className="mt-5 space-y-4">
        <p className="text-sm text-slate-400">투자 지표 활용 안내 · 내용 확인일 {dateModified}</p>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
        <p className="rounded-lg border border-slate-700 p-4 text-slate-200">{answer}</p>
      </header>:null}
      {children}
      <nav aria-label="다른 투자 지표 안내" className={market?'mt-7 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-[#25485a] py-3':'mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-700 pt-4'}>
        {market?<>
          <h2 className="text-[12px] font-bold text-[#a8c1cf]">관련 가이드</h2>
          {relatedLinks.map(link=><a key={link.href} href={link.href} className="inline-flex min-h-10 items-center gap-1 text-[12px] font-semibold text-[#b9e8ed] transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#79bbc4]">{link.label}<span aria-hidden="true">↗</span></a>)}
        </>:relatedLinks.map(link=><a key={link.href} href={link.href} className="inline-flex min-h-11 items-center text-blue-200 underline">{link.label} →</a>)}
      </nav>
    </article>
  </main>;
}
