"use client";
import {Info} from "lucide-react";
import {useId,useState} from "react";

/* Korea's original introduction and methodology stay visible on desktop.
 * On mobile, only their presentation changes to the title's info disclosure. */
export default function KoreaIntroHeading(){
 const [expanded,setExpanded]=useState(false);
 const introId=useId();
 return <>
  <button type="button" className="zg-fg-intro-button" aria-label="한국 공포탐욕지수 소개" aria-controls={introId} aria-expanded={expanded} onClick={()=>setExpanded(was=>!was)}>
   <Info size={15} strokeWidth={2} aria-hidden="true"/>
  </button>
  <div id={introId} className={`zg-fg-korea-intro-content${expanded?" zg-fg-korea-intro-content--expanded":""}`}>
   <h2 className="zg-fg-subheading">코스피 투자심리를 0~100으로 읽는 데이터 지표</h2>
   <p className="zg-fg-intro">한국 공포탐욕지수는 한국 공탐지수라고도 부르며, 코스피 등 국내 주식시장의 위험 선호와 위험 회피 흐름을 0~100 점수로 보여주는 ZGmini 자체 지표입니다. 점수가 낮을수록 공포, 높을수록 탐욕 방향으로 해석합니다.</p>
   <p className="zg-fg-method">Momentum·Strength·Breadth·Put/Call·Volatility·Safe Haven·Junk Bond 등 <strong className="text-white">7개 핵심 신호</strong>를 각 신호의 최근 <strong className="text-white">504개 유효 관측치 기준창</strong>에서 비교해 한국 시장의 투자심리 흐름을 수치화합니다. CNN 미국 공포탐욕지수와는 입력 시장과 산출 방식이 다릅니다.</p>
  </div>
 </>;
}
