"use client";
import { useEffect, useState } from "react";

type Index = { status: "verified"; score: number; rating: string; observedAt: string };
const countries = [{name:"미국",code:"us"},{name:"한국",code:"kr"},{name:"중국",code:"cn"},{name:"일본",code:"jp"},{name:"유럽",code:"eu"}];

export default function CountryFearGreed() {
  const [index, setIndex] = useState<Index | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/fear-greed", {cache:"no-store", signal:controller.signal});
        if (!response.ok) throw new Error("Unavailable");
        const data = await response.json();
        if (data.status !== "verified" || typeof data.score !== "number" || !Number.isFinite(data.score) || data.score < 0 || data.score > 100) throw new Error("Invalid index");
        if (active) setIndex(data);
      } catch { if (active) setIndex(null); }
      finally { if (active) setLoading(false); }
    }
    void refresh();
    const timer = window.setInterval(refresh, 5 * 60 * 1000);
    return () => { active = false; controller.abort(); window.clearInterval(timer); };
  }, []);
  return <section className="mt-6" aria-labelledby="global-title">
    <h2 id="global-title" className="text-xl font-extrabold text-white">국가별 공포·탐욕 지수</h2>
    <p className="mt-1 mb-3 text-sm text-slate-300">미국은 CNN의 7개 시장지표 종합 지수입니다. 다른 지역은 검증된 출처 연결 전까지 수치를 표시하지 않습니다.</p>
    <div className="sentiment-grid sentiment-grid-global">
      {countries.map(country => {
        const value = country.code === "us" ? index : null;
        return <article key={country.code} className="sentiment-card country-sentiment-card relative" style={{borderTopColor:value ? "#d97706" : "#94a3b8"}}>
          <img className="country-flag-backdrop" src={`/flags/${country.code}.svg`} alt=""/>
          <h3 className="text-lg font-extrabold text-slate-950">{country.name}</h3>
          <p className="mt-1 text-sm text-slate-600">{country.code === "us" ? "CNN Fear & Greed Index" : "검증된 지수 미연결"}</p>
          <div className="my-5" aria-live="polite"><strong className="text-5xl font-black text-slate-950">{value ? Math.round(value.score) : "—"}</strong><span className="ml-3 text-sm font-bold text-slate-700">{value ? value.rating : loading && country.code === "us" ? "확인 중" : "확인 불가"}</span></div>
          {value ? <><div role="meter" aria-label="CNN 공포·탐욕 지수" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value.score} className="h-2 overflow-hidden rounded bg-slate-200"><div className="h-full bg-amber-600" style={{width:`${value.score}%`}}/></div><p className="mt-3 text-xs text-slate-600">원본 발표: {new Date(value.observedAt).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})} KST</p></> : <p className="text-sm text-slate-600">{country.code === "us" ? "원본 확인 실패 시 예시 점수로 대체하지 않습니다." : "CNN 미국 지수를 이 지역의 지수로 대신 사용하지 않습니다."}</p>}
          {country.code === "us" && <a className="mt-3 inline-block text-sm font-bold text-blue-700 underline" href="https://www.cnn.com/markets/fear-and-greed" target="_blank" rel="noreferrer">CNN 원본 확인 ↗</a>}
        </article>;
      })}
    </div>
  </section>;
}
