"use client";

import { useEffect, useState } from "react";
import { DashboardTip, ScoreScale } from "./dashboard-ui";
import { KoreanCountryCard } from "./korea-composite-view";

type Index = {
  status: "verified";
  score: number;
  rating: string;
  observedAt?: string;
  updatedAt?: string;
};

const ratingLabels: Record<string, string> = {
  "extreme fear": "극단적 공포",
  fear: "공포",
  neutral: "중립",
  greed: "탐욕",
  "extreme greed": "극단적 탐욕",
};

const countries = [
  { name: "미국", code: "us", api: "fear-greed", label: "CNN Fear & Greed Index" },
  { name: "한국", code: "kr", api: "kospi-fear-greed", label: "ZGmini 한국 2요소 베타" },
  { name: "일본", code: "jp", api: "nikkei-fear-greed", label: "Nikkei Fear & Greed · 4요소 모델" },
  { name: "중국", code: "cn", api: null, label: "검증된 데이터 미연결" },
  { name: "유럽", code: "eu", api: null, label: "검증된 데이터 미연결" },
];

export default function CountryFearGreed() {
  const [values, setValues] = useState<Record<string, Index | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const sources = countries.filter((country) => country.code !== "kr" && Boolean(country.api));

    async function refresh() {
      try {
        const responses = await Promise.all(
          sources.map((country) =>
            fetch(`/api/${country.api}`, { cache: "no-store", signal: controller.signal }),
          ),
        );
        const data = await Promise.all(responses.map((response) => response.json() as Promise<Index>));
        if (active) {
          const next: Record<string, Index | null> = {};
          sources.forEach((country, index) => {
            next[country.code] = responses[index].ok && data[index].status === "verified" ? data[index] : null;
          });
          setValues(next);
        }
      } catch {
        if (active) setValues({});
      } finally {
        if (active) setLoading(false);
      }
    }

    void refresh();
    const timer = window.setInterval(refresh, 5 * 60 * 1000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className="zg-section zg-country-section" aria-labelledby="global-title">
      <div className="zg-section-heading">
        <h2 id="global-title">국가별 공포·탐욕</h2>
        <p>각 시장의 별도 모델 · 국가 간 동일 척도로 해석하지 마세요.</p>
      </div>
      <div className="zg-country-grid">
        {countries.map((country) => {
          if (country.code === "kr") return <KoreanCountryCard key="kr" />;
          const value = values[country.code];
          const rating = value
            ? (ratingLabels[value.rating.trim().toLowerCase()] ?? value.rating)
            : loading && country.api
              ? "확인 중"
              : "미제공";
          const color = rating.includes("공포") ? "#EF3B3B" : rating.includes("탐욕") ? "#0B9F41" : "#64748B";
          return (
            <article key={country.code} className="zg-country-card">
              <img className="zg-flag" src={`/flags/${country.code}.svg`} alt="" aria-hidden="true" />
              <div className="zg-card-heading">
                <h3>{country.name}</h3>
                <DashboardTip label={`${country.name} 지수 안내`}>
                  {country.label}. {value ? `현재 ${Math.round(value.score)} · ${rating}.` : "검증된 원본이 없어 숫자를 표시하지 않습니다."}
                </DashboardTip>
              </div>
              <p>{country.label}</p>
              <div className="zg-country-number">
                <strong>{value ? Math.round(value.score) : "—"}</strong>
                <span style={{ color }}>{rating}</span>
              </div>
              <ScoreScale score={value?.score ?? null} label={`${country.name} 공포·탐욕`} color={color} />
              <div className="zg-country-meta">
                <small>기준 {(value?.updatedAt ?? value?.observedAt)?.slice(0, 10) ?? "—"}</small>
                {country.api ? <a className="zg-detail" href={country.code === "us" ? "https://www.cnn.com/markets/fear-and-greed" : "https://nikkei.feargreedchart.com/api-docs"} target="_blank" rel="noreferrer">출처 ↗</a> : <small>연결 준비 중</small>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
