"use client";

import { Info } from "lucide-react";
import { useId, useState } from "react";

const intro = "미국 공탐 지수는 CNN이 제공하는 미국 주식시장 공포·탐욕지수를 줄여 부르는 말입니다. 종합점수와 실제 관측일, 7개 구성요소를 확인하세요.";

export default function UsaIntroHeading() {
  const [expanded, setExpanded] = useState(false);
  const introId = useId();

  return <>
    <div className="zg-fg-title-row">
      <h1>미국 공포탐욕지수</h1>
      <button
        type="button"
        className="zg-fg-intro-button"
        aria-label="미국 공포탐욕지수 소개"
        aria-controls={introId}
        aria-expanded={expanded}
        onClick={() => setExpanded((wasExpanded) => !wasExpanded)}
      >
        <Info size={15} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
    <p id={introId} className={`zg-fg-intro${expanded ? " zg-fg-intro--expanded" : ""}`}>{intro}</p>
  </>;
}
