import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import {ArticleJsonLd,WebPageJsonLd} from '../seo-jsonld';

export function guideMetadata(title:string,description:string,path:string):Metadata {
  const fullTitle=`${title} | ZGmini`,url=`https://zgmini.kr${path}`;
  return {title:fullTitle,description,alternates:{canonical:url},robots:{index:true,follow:true},
    openGraph:{title:fullTitle,description,url,type:'article',siteName:'ZGmini'},
    twitter:{card:'summary',title:fullTitle,description}};
}
export default function GuidePage({title,answer,path,datePublished='2026-10-07',dateModified='2026-10-07',children}:{title:string;answer:string;path:string;datePublished?:string;dateModified?:string;children:ReactNode}) {
  return <main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12">
    <WebPageJsonLd name={title} description={answer} path={path}/>
    <ArticleJsonLd headline={title} description={answer} path={path} datePublished={datePublished} dateModified={dateModified}/>
    <article className="mx-auto max-w-4xl text-sm leading-7 sm:text-base">
      <a href="/" className="inline-flex min-h-11 items-center text-blue-200">← ZGmini 대시보드</a>
      <header className="mt-5 space-y-4"><p className="text-sm text-slate-400">투자 지표 활용 안내 · 내용 확인일 {dateModified}</p>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
        <p className="rounded-lg border border-slate-700 p-4 text-slate-200">{answer}</p>
      </header>
      {children}
      <nav aria-label="다른 투자 지표 안내" className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-700 pt-4">
        <a href="/guides/fear-greed-buying/" className="inline-flex min-h-11 items-center text-blue-200 underline">공탐 매수 기준과 한계 →</a>
        <a href="/guides/cpi-pce-release/" className="inline-flex min-h-11 items-center text-blue-200 underline">CPI·PCE 발표 해석 →</a>
        <a href="/guides/fomc/" className="inline-flex min-h-11 items-center text-blue-200 underline">FOMC 일정과 금리 결정 →</a>
      </nav>
    </article>
  </main>;
}
