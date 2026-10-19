"use client";

import { Gauge } from "lucide-react";
import { DashboardTip } from "./dashboard-ui";
import { KoreanCountryCard } from "./korea-composite-view";
import CnnPanel from "./fear-greed/usa/cnn-panel";
import { HELP, HelpText } from "./help-copy";

export default function CountryFearGreed() {
  return (
    <section className="zg-section zg-country-section" aria-labelledby="global-title">
      <div className="zg-section-heading">
        <h1 id="global-title" style={{display:"flex",alignItems:"center",gap:6}}>
          <Gauge aria-hidden="true" size={20} color="#fabc42" style={{flexShrink:0}}/>
          공포·탐욕
          <DashboardTip label="공포·탐욕 도움말"><HelpText copy={HELP.fear}/></DashboardTip>
        </h1>
        <p>각 시장의 별도 모델 · 국가 간 동일 척도로 해석하지 마세요.</p>
      </div>
      <div className="zg-country-panel-grid">
        <CnnPanel/>
        <div className="zg-country-grid">
          <KoreanCountryCard/>
        </div>
      </div>
    </section>
  );
}
