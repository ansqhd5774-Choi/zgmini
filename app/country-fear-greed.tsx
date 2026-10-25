"use client";

import { memo } from "react";
import { ArrowUpRight, BookOpen, Gauge } from "lucide-react";
import { DashboardTip } from "./dashboard-ui";
import { KoreanCountryCard } from "./korea-composite-view";
import CnnPanel from "./fear-greed/usa/cnn-panel";
import { MarketChartAnimationContext } from "./market-fear-greed-chart";
import { HELP, HelpText } from "./help-copy";

function CountryFearGreed() {
  return (
    <section className="zg-section zg-country-section" aria-labelledby="global-title">
      <div className="zg-section-heading">
        <h1 id="global-title" style={{display:"flex",alignItems:"center",gap:6}}>
          <Gauge aria-hidden="true" size={20} color="#fabc42" style={{flexShrink:0}}/>
          공포·탐욕
          <DashboardTip label="공포·탐욕 도움말"><HelpText copy={HELP.fear}/></DashboardTip>
        </h1>
        <p>공포·탐욕 지수는 투자자의 시장 심리를 보여줍니다. ‘공탐 지수’라고도 부르며, 미국과 한국은 서로 다른 모델로 산출합니다.</p>
        <a
          href="/guides/fear-greed-buying/"
          className="ml-auto inline-flex min-h-9 shrink-0 items-center gap-1.5 px-2 text-xs font-semibold text-amber-300 transition-colors hover:text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          aria-label="공포탐욕지수 매수 판단 가이드 보기"
        >
          <BookOpen aria-hidden="true" size={14}/>
          <span>매수 판단 가이드</span>
          <ArrowUpRight aria-hidden="true" size={14}/>
        </a>
      </div>
      <div className="zg-country-panel-grid">
        <MarketChartAnimationContext.Provider value={false}>
        <CnnPanel/>
        <div className="zg-country-grid">
          <KoreanCountryCard/>
        </div>
        </MarketChartAnimationContext.Provider>
      </div>
    </section>
  );
}

export default memo(CountryFearGreed);
