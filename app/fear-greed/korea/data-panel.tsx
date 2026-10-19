"use client";
import {KoreanCountryCard} from "../../korea-composite-view";
export default function DataPanel(){
 return <section className="zg-fg-market-panel" aria-label="현재 한국 시장 투자심리">
  <KoreanCountryCard/>
  <p className="zg-fg-pit-notice">과거 점수는 현재 확보한 원자료로 재구성한 이력이며 당시 point-in-time 빈티지는 검증되지 않았습니다. 현재는 연구용 베타입니다.</p>
 </section>;
}
