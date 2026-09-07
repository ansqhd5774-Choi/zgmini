"use client";
import { useEffect, useState } from "react";

type Index = { status: "verified"; score: number; rating: string; observedAt?: string; updatedAt?: string; kospi?: { level?: number; change_pct?: number } | null };
const countries = [{name:"미국",code:"us"},{name:"한국",code:"kr"},{name:"일본",code:"jp"},{name:"유럽",code:"eu"}];

export default function CountryFearGreed() {
  const [index, setIndex] = useState<Index | null>(null);
  const [koreaIndex, setKoreaIndex] = useState<Index | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function refresh() {
      try {
        const [usResponse, krResponse] = await Promise.all([fetch("/api/fear-greed", {cache:"no-store", signal:controller.signal}), fetch("/api/kospi-fear-greed", {cache:"no-store", signal:controller.signal})]);
        const [usData, krData] = await Promise.all([usResponse.json(), krResponse.json()]);
        if (active) {
          setIndex(usResponse.ok && usData.status === "verified" ? usData : null);
          setKoreaIndex(krResponse.ok && krData.status === "verified" ? krData : null);
        }
      } catch { if (active) { setIndex(null); setKoreaIndex(null); } }
      finally { if (active) setLoading(false); }
    }
    void refresh();
    const timer = window.setInterval(refresh, 5 * 60 * 1000);
    return () => { active = false; controller.abort(); window.clearInterval(timer); };
  }, []);
  return <section className="mt-6" aria-labelledby="global-title">
    <h2 id="global-title" className="text-xl font-extrabold text-white">국가별 공포·탐욕 지수</h2>
    <p className="mt-1 mb-3 text-sm text-slate-300">미국은 CNN 7개 지표 종합 지수, 한국은 KOSPI 전용 4개 요소 모델입니다. 출처별 지수를 섞지 않습니다.</p>
    <div className="sentiment-grid sentiment-grid-global">
      {countries.map(country => {
        const value = country.code === "us" ? index : country.code === "kr" ? koreaIndex : null;
        return <article key={country.code} className="sentiment-card country-sentiment-card relative" style={{borderTopColor:value ? "#d97706" : "#94a3b8"}}>
          <img className="country-flag-backdrop" src={`/flags/${country.code}.svg`} alt=""/>
          <h3 className="text-lg font-extrabold text-slate-950">{country.name}</h3>
          <p className="mt-1 text-sm text-slate-600">{country.code === "us" ? "CNN Fear & Greed Index" : country.code === "kr" ? "KOSPI Fear & Greed · 4요소 모델" : "검증된 지수 미연결"}</p>
          <div className="my-5" aria-live="polite"><strong className="text-5xl font-black text-slate-950">{value ? Math.round(value.score) : "—"}</strong><span className="ml-3 text-sm font-bold text-slate-700">{value ? value.rating : loading && country.code === "us" ? "확인 중" : "확인 불가"}</span></div>
          {value ? <><div role="meter" aria-label={`${country.name} 공포·탐욕 지수`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value.score} className="h-2 overflow-hidden rounded bg-slate-200"><div className="h-full bg-amber-600" style={{width:`${value.score}%`}}/></div><p className="mt-3 text-xs text-slate-600">{country.code === "kr" ? `기준일: ${value.updatedAt} · KOSPI ${value.kospi?.level?.toLocaleString("ko-KR") ?? "—"}` : `원본 발표: ${value.observedAt ? new Date(value.observedAt).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"}) : "—"} KST`}</p></> : <p className="text-sm text-slate-600">{country.code === "us" ? "원본 확인 실패 시 예시 점수로 대체하지 않습니다." : country.code === "kr" ? "KOSPI 전용 지수 조회 실패 시 숫자를 표시하지 않습니다." : "이 지역의 검증된 지수는 아직 연결하지 않았습니다."}</p>}
          {country.code === "us" && <a className="mt-3 inline-block text-sm font-bold text-blue-700 underline" href="https://www.cnn.com/markets/fear-and-greed" target="_blank" rel="noreferrer">CNN 원본 확인 ↗</a>}
          {country.code === "kr" && <a className="mt-3 inline-block text-sm font-bold text-blue-700 underline" href="https://kospi.feargreedchart.com/api-docs" target="_blank" rel="noreferrer">KOSPI 모델·출처 확인 ↗</a>}
        </article>;
      })}
    </div>
  </section>;
}
