type GuideSection = { title: string; text: string };
type GuideLink = { href: string; label: string };

const seoRelatedOverrides:Record<string,GuideLink[]|undefined>={
  "한국 지수의 출처와 관측일":[],
  "미국 공포탐욕지수 확인 순서":[],
  "미국 인플레이션 점수를 읽는 방법":[],
  "경기침체 방어점수의 의미와 한계":[],
  "한국 시장심리와 다른 지표를 함께 읽기":[
    {href:"/fear-greed/usa/",label:"미국 CNN 공포탐욕지수"},
    {href:"/sector-fear-greed/",label:"미국 섹터별 공포·탐욕 지수"},
  ],
  "공포탐욕지수를 상황별로 읽는 방법":[
    {href:"/sector-fear-greed/",label:"미국 섹터별 공포·탐욕 지수"},
    {href:"/recession/",label:"미국 경기침체 지표"},
    {href:"/inflation/",label:"미국 CPI·PCE와 물가 지표"},
  ],
  "CPI·PCE 현재값과 물가 점수를 구분하기":[
    {href:"/guides/cpi-pce-release/",label:"CPI·PCE 발표 가이드"},
    {href:"/guides/fomc/",label:"FOMC 가이드"},
    {href:"/recession/",label:"미국 경기침체 지표"},
  ],
  "경기침체 점수와 고용·소비 신호 읽기":[
    {href:"/credit-risk/",label:"회사채·신용 위험 지표"},
    {href:"/liquidity-crisis/",label:"유동성 위기 지표"},
    {href:"/debt-risk/",label:"부채 위험 지표"},
  ],
  "회사채와 신용 위험 지표 읽기":[
    {href:"/liquidity-crisis/",label:"유동성 위기 지표"},
    {href:"/debt-risk/",label:"부채 위험 지표"},
    {href:"/recession/",label:"미국 경기침체 지표"},
  ],
  "자산 버블 안전점수를 읽는 방법":[
    {href:"/sector-fear-greed/",label:"미국 섹터별 공포·탐욕 지수"},
    {href:"/credit-risk/",label:"회사채·신용 위험 지표"},
  ],
};

export default function DetailReadingGuide({ title, sections, sources, related }: {
  title: string;
  sections: GuideSection[];
  sources: GuideLink[];
  related: GuideLink[];
}) {
  const relatedLinks=seoRelatedOverrides[title]?.slice(0,4)??related.slice(0,4);
  return <section className="mt-12 space-y-6 text-sm leading-7 text-slate-300 sm:text-base" aria-label={title}>
    <h2 className="text-xl font-bold text-white">{title}</h2>
    {sections.map(section => <div key={section.title}>
      <h3 className="mb-2 font-bold text-white">{section.title}</h3>
      <p>{section.text}</p>
    </div>)}
    {sources.length>0&&<div>
      <h3 className="mb-2 font-bold text-white">출처와 확인 경로</h3>
      <ul className="flex flex-wrap gap-x-6 gap-y-2">{sources.map(link => <li key={link.href}>
        <a className="inline-flex min-h-11 items-center text-blue-200 underline" href={link.href}>{link.label} →</a>
      </li>)}</ul>
    </div>}
    {relatedLinks.length>0&&<nav aria-label="함께 읽을 지표" className="flex flex-wrap gap-x-6 gap-y-2">{relatedLinks.map(link =>
      <a key={link.href} className="inline-flex min-h-11 items-center text-blue-200 underline" href={link.href}>{link.label} →</a>
    )}</nav>}
  </section>;
}
