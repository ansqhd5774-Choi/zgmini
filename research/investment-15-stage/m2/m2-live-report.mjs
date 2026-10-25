// A static, offline-viewable HTML report. No third-party resources or scripts.
import {SOURCE_POLICY,withoutProhibitedStage6Evidence,blockedLegacyFinancials} from './m2-source-policy.mjs';
const enforceSourcePolicy=model=>({
 ...model,sourcePolicy:SOURCE_POLICY,
 stage6:withoutProhibitedStage6Evidence(model.stage6),
 stage7:blockedLegacyFinancials(model.stage6),
 liveIssuer:{status:'DISABLED_BY_SOURCE_POLICY',items:[]},
 companyEvidence:null,
});
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
})[char]);
const fmt = value => typeof value==='number'&&Number.isFinite(value)?value.toFixed(1):'—';
const dateOf = value => typeof value==='string'?value:'—';

function monthBefore(iso, months) {
  const value = new Date(iso+'T00:00:00Z');
  const day = value.getUTCDate();
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth()-months);
  const last = new Date(Date.UTC(value.getUTCFullYear(),value.getUTCMonth()+1,0)).getUTCDate();
  value.setUTCDate(Math.min(day,last));
  return value.toISOString().slice(0,10);
}
export function monthChange(points) {
  if (!points?.length) return null;
  const latest = points.at(-1);
  const reference = monthBefore(latest.date,1);
  const before = points.findLast(p=>p.date<=reference);
  return before ? latest.score-before.score : null;
}
const changeText = value => value===null?'—':`${value>0?'+':''}${fmt(value)}p`;
function zoneClass(value) {
  if(value<25)return 'z0';if(value<45)return 'z1';if(value<55)return 'z2';
  if(value<75)return 'z3';return 'z4';
}

function plot(points, provisionalFrom, {width=360,height=92}={}) {
  if(!points?.length)return '<span class="muted">관측 이력 없음</span>';
  const x=i=>9+i*(width-18)/Math.max(1,points.length-1);
  const y=s=>8+(100-s)*(height-16)/100;
  const loc=(p,i)=>`${x(i).toFixed(2)},${y(p.score).toFixed(2)}`;
  const confirmed = points.slice(0,provisionalFrom);
  const first = confirmed.map(loc).join(' ');
  const provisional = points.length>provisionalFrom
    ?points.slice(Math.max(0,provisionalFrom-1)).map((p,i)=>loc(p,Math.max(0,provisionalFrom-1)+i)).join(' '):'';
  const bands=[[0,25,'#bd3c51'],[25,45,'#9d663a'],[45,55,'#6e7987'],[55,75,'#388b65'],[75,100,'#178c86']]
    .map(([low,high,color])=>`<rect x="9" y="${y(high)}" width="${width-18}" height="${y(low)-y(high)}" fill="${color}" opacity=".15"/>`).join('');
  const last=points.at(-1);
  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="관측 ${points.length}개, ${escape(points[0].date)}부터 ${escape(last.date)}까지의 실제 점수 추이" role="img">
    ${bands}<line x1="9" x2="${width-9}" y1="${y(50)}" y2="${y(50)}" stroke="#718296" stroke-dasharray="3 6"/>
    ${first?`<polyline points="${first}" fill="none" stroke="#63bbeb" stroke-width="2" vector-effect="non-scaling-stroke"/>`:''}
    ${provisional?`<polyline points="${provisional}" fill="none" stroke="#63bbeb" stroke-width="2" stroke-dasharray="5 5" vector-effect="non-scaling-stroke"/>`:''}
    <circle cx="${x(points.length-1)}" cy="${y(last.score)}" r="3" fill="#eaf4fa"/>
  </svg>`;
}

function entry(item, index) {
  const change=monthChange(item.points);
  const pending=item.phase==='PROVISIONAL';
  const observationLag=item.confirmedDate!==item.date?`확정 ${escape(item.confirmedDate)} · 잠정 ${escape(item.date)}`:`확정 ${escape(item.date)}`;
  const source=escape(item.source);
  return `<article class="row-item">
    <div class="row-top"><span class="rank">${index+1}</span><strong class="item-name">${escape(item.name)}</strong>
      <span class="score ${zoneClass(item.score)}">${fmt(item.score)}</span><span class="delta">${changeText(change)}</span></div>
    <div class="row-chart">${plot(item.points,item.provisionalFrom)}</div>
    <div class="row-meta"><span>${observationLag}${pending?' · <em>점선 잠정</em>':''}</span><span>1년 ${item.points.length}개 관측</span></div>
    ${item.etfs?`<div class="row-meta"><span>ETF ${escape(item.etfs.join(' / '))}</span></div>`:''}
    <details><summary>이력·출처 확인</summary><p>${escape(item.points[0].date)} ~ ${escape(item.date)} · 표기된 점수는 공개 저장값입니다.</p>
      <p><a href="${source}" target="_blank" rel="noopener noreferrer">ZGMINI 공개 JSON 원본 ↗</a></p></details>
  </article>`;
}

function section(feed,label,route) {
  if(feed.status!=='READY')return `<section class="panel unavailable"><h2>${label}</h2><p>조회 불가 · ${escape(feed.reason)}</p>
    <p>실패한 자료에 임의 점수를 입력하지 않았습니다.</p><a href="${escape(feed.source)}" target="_blank" rel="noopener noreferrer">공개 API 확인 ↗</a></section>`;
  const items=[...feed.items].sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'ko'));
  const dateLabel=feed.kind==='theme'
    ?`최근 관측 ${feed.date} · API 기준 ${feed.apiObservationDate} · ${feed.phase}`
    :`${feed.date} · ${feed.phase}`;
  return `<section class="panel"><div class="section-head"><div><span class="eyebrow">${escape(route)}</span><h2>${label} <small>${items.length}개</small></h2></div>
    <span class="tag">${escape(dateLabel)}</span></div>
    <p class="disclaimer">공포·탐욕 점수의 크기순입니다. 투자 매력도·추천 순위가 아닙니다. 관측일이 다르면 비교를 보류하세요.</p>
    <div class="items">${items.map(entry).join('')}</div></section>`;
}

function auditSection(model) {
  if(!model.audit) return '';
  const {status,checks,themeAlignment}=model.audit;
  const themeDetail=themeAlignment
    ?`시장 기준일 ${escape(themeAlignment.referenceDate||'없음')} · 테마 동일일 ${themeAlignment.matchingCount}/${themeAlignment.total}개 · 252개 확정 이력 ${themeAlignment.confirmed252Count}/${themeAlignment.total}개 · 잠정 관측 포함 ${themeAlignment.provisionalCount}개`
    :'테마 원본을 확인하지 못해 날짜별 분석을 보류했습니다.';
  return `<section class="panel audit"><div class="section-head"><div><span class="eyebrow">SOURCE / DATE / COVERAGE</span><h2>자료 교차검사</h2></div>
    <span class="tag">${escape(status)}${status==='REVIEW'?' · 날짜 차이 확인 필요':''}</span></div>
    <p class="disclaimer">READY는 세 API의 응답 확인 상태입니다. 서로 다른 날짜의 데이터를 동일 기준일 점수로 간주하지 않습니다.</p>
    <p>${themeDetail}</p><div class="audit-list">${checks.map(c=>`<div><strong class="audit-${escape(c.status.toLowerCase())}">${escape(c.status)}</strong><span>${escape(c.description)}</span></div>`).join('')}</div>
    <p class="disclaimer">검증 대상은 ZGMINI가 이미 공개한 저장 점수와 그 이력입니다. 외부 원천 ETF 가격·재계산 산식 자체의 정확성을 독립 확인했다는 뜻은 아닙니다.</p></section>`;
}

function themeResearchSection(model) {
  const research=model.themeResearch;
  if(!research || research.status==='BLOCKED') return `<section class="panel unavailable"><span class="eyebrow">04 / ATTRACTIVENESS</span>
    <h2>매력 테마 연구 · 중단</h2><p>테마 입력 부재 · ${escape(research?.reason||'NOT_AVAILABLE')}</p></section>`;
  const pilotSelected=model.stage6?.status==='READY';
  const cards=[...research.items].sort((a,b)=>b.sentiment.score-a.sentiment.score||a.name.localeCompare(b.name,'ko')).map(item=>{
    const source=item.demand;
    const sentiment=item.sentiment;
    const fact=item.researchFact;
    const factSection=!fact||fact.status==='NO_REVIEWED_FACT'
      ?'<p class="muted">실물 통계 근거 없음 · 조사 보류</p>'
      :`<div class="fact-block"><p><b>실물·산업 원자료:</b> <span class="${fact.status==='RECHECK_REQUIRED'?'review-label':'verified-fact'}">${fact.status==='RECHECK_REQUIRED'?'기간 경과 · 재조사 필요':'발표 내용 대조'}</span></p>
        <p>${escape(fact.fact)}</p>
        <p class="muted">지표 범위 ${escape(fact.dimension)} · 관측 ${escape(fact.period)} · <a href="${escape(fact.url)}" target="_blank" rel="noopener noreferrer">${escape(fact.publisher)} ↗</a></p>
        <p class="muted">해석 한계: ${escape(fact.boundary)}</p>
        ${fact.broadRevenue?`<p><b>업계 매출 참고:</b> <span class="${fact.broadRevenue.status==='VERSION_CONFLICT_REVIEW'?'review-label':'verified-fact'}">${escape(fact.broadRevenue.status)}</span> · ${escape(fact.broadRevenue.fact)}</p>
          <p class="muted">${escape(fact.broadRevenue.period)} · <a href="${escape(fact.broadRevenue.url)}" target="_blank" rel="noopener noreferrer">${escape(fact.broadRevenue.publisher)} ↗</a></p>`:''}
        <p class="muted">원문 확인 ${escape(fact.checkedAt)} · 이후 자동 재조회 없음 · 실적·매매 신호와 별도</p></div>`;
    const sourceBody=source.status==='SOURCE_LOCATED_NOT_VERIFIED' && source.url!==fact?.url
      ?`<p><b>추가 교차검사 경로:</b> <a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.authority)} ↗</a>
          · ${escape(source.topic)} · ${escape(source.period)}</p>
        <p class="muted">적용 한계: ${escape(source.limitation)}</p>
        <p class="muted">링크 확인 ${escape(source.discoveredAt)} · 실행할 때 원문이나 최신 수치를 재검증하지 않습니다.</p>`
      :'';
    const datedFact=fact?.status==='DATED_ORIGINAL_VERIFIED'||fact?.status==='RECHECK_REQUIRED';
    return `<article class="research-item"><div class="research-line">${pilotSelected?`<strong>${escape(item.name)}</strong>`:`<label class="interest-choice"><input type="radio" name="stage4-interest"
       value="${escape(item.name)}" data-score="${escape(String(sentiment.score))}" data-date="${escape(sentiment.date)}"
       data-phase="${escape(sentiment.phase)}" data-date-match="${sentiment.comparableToMarket?'yes':'no'}"
       data-fact-status="${escape(fact?.status||'NO_REVIEWED_FACT')}"/><strong>${escape(item.name)}</strong></label>`}
       <span>공탐 <b class="${zoneClass(sentiment.score)}">${fmt(sentiment.score)}</b> · ${escape(sentiment.date)} ${sentiment.phase==='PROVISIONAL'?'잠정':'확정'}</span>
       <small>${sentiment.comparableToMarket?'시장 기준일 일치':'시장 기준일 다름'}</small></div>
       <p class="research-glance"><b>산업 관측:</b> ${datedFact?escape(fact.fact):'확인된 실물 근거 없음'}</p>
       <p class="research-glance caution"><b>판단 한계:</b> ${datedFact?escape(fact.boundary):'성장률·상용화·매출을 판단할 수 없음'}${fact?.status==='RECHECK_REQUIRED'?' · 원문 재확인 필요':''}</p>
       <details><summary>원문 근거·관측 범위 펼치기</summary>
       <div class="research-body"><p><b>가격·심리:</b> ${fmt(sentiment.score)}점 / ${escape(sentiment.date)} (관측), ZGMINI 공개 점수</p>
       ${factSection}
       ${sourceBody}
       <p><b>테마 수익화:</b> <span class="review-label">NOT VERIFIED</span> · 개별 기업의 테마 귀속 매출·마진·현금흐름 확인 필요</p>
       <p class="muted">기존 05~06 시범 자료의 일부 기업 전체 재무제표는 테마 수익성 증거가 아닙니다. 공탐 점수를 투자 매력 점수로 환산하지 않습니다.</p></div></details></article>`;
  }).join('');
  return `<section class="panel"><div class="section-head"><div><span class="eyebrow">04 / ATTRACTIVENESS</span>
    <h2>${pilotSelected?'관심 테마 원자료 · 시험 선택 완료':'관심 테마 직접 선택'} <small>${research.items.length}개</small></h2></div>
    <span class="tag">${pilotSelected?'5단계 시험 이력 적용':'사용자 판단'} · NO TRADE</span></div>
    <p class="disclaimer">${pilotSelected?'로봇·자동화 시험 선택이 다음 단계에 연결되어 재선택을 요청하지 않습니다.':'왼쪽 선택 버튼으로 5단계에 넘길 <b>조사 대상 테마 1개</b>를 고르세요.'} 목록은 공탐 점수가 높은 순이며 투자 매력 순위가 아닙니다.
    산업 관측과 판단 한계는 ${escape(research.factsCheckedAt)} 기준 조사 스냅샷으로 실행 시 자동 최신화되지 않습니다.</p>
    <div class="research-list" id="stage4-candidates">${cards}</div>
    ${pilotSelected?'<p class="muted">현재 선택은 프로그램 흐름 검증용으로 고정한 입력이며, 최종 자동 산업 선정·투자 순위는 아직 구현되지 않았습니다.</p>':`<div class="interest-handoff" id="stage4-handoff"><h3>5단계 · 성장 산업·기술 분석으로 연결</h3>
      <p id="stage4-current" role="status" aria-live="polite">아직 선택하지 않았습니다. 테마 선택 후 다음 단계 조사 대상을 확인할 수 있습니다.</p>
      <p class="muted">관심 테마 선택은 투자 적합성 승인이나 매수 결정이 아닙니다. 성장률·상용화·수익화는 5단계에서 별도로 확인합니다.</p>
      <button type="button" id="stage4-export" disabled>선택 기록 내려받기 (다음 단계용)</button>
      <button type="button" id="stage4-clear">선택 취소</button>
      <span class="muted" id="stage4-storage">보고서 안에서 선택할 수 있습니다. 내려받은 JSON은 다음 개발 단계에서 사용할 기록입니다.</span>
    </div>`}</section>`;
}

function stage5ResearchSection(model) {
  const r=model.stage5;
  if(!r||r.status!=='READY')return `<section class="panel unavailable"><span class="eyebrow">05 / GROWTH INDUSTRY &amp; TECHNOLOGY</span>
    <h2>5단계 · 선택 기록 대기</h2><p>4단계 선택 파일 <code>M2_STAGE4_SELECTION.json</code>을 실행 폴더에 두면 선정한 테마만 조사 결과와 연결합니다.</p>
    <p class="muted">상태: ${escape(r?.reason||'SELECTION_NOT_LOADED')} · 선택 없이 산업을 임의 지정하지 않습니다.</p></section>`;
  const stage6Ready=model.stage6?.status==='READY';
  const observation=r.selection.sentiment;
  const current=r.currentSentiment;
  const compareMessage=r.sentimentComparison==='SAME_SCORE_SAME_DATE'
    ?'선택 기록과 현재 공개 API의 공탐 수치·관측일이 일치합니다.'
    :r.sentimentComparison==='DIFFERENT_OBSERVATION_DATES'
      ?'현재 API와 관측일이 달라 별도 시점입니다. 선택 당시 점수를 그대로 보존합니다.'
      :r.sentimentComparison==='SAME_DATE_SCORE_CHANGED'
        ?'동일 관측일 공개 점수가 달라졌습니다. 원인 확인 전 둘을 동일 값으로 보지 않습니다.'
        :'현재 공개 점수를 조회할 수 없습니다. 선택 기록을 원값으로 보존합니다.';
  const metrics=items=>items.length?`<div class="stage5-metrics">${items.map(m=>`<div><small>${escape(m.label)} · ${m.source==='industrial'?'IFR 산업용':'IFR 서비스'} · ${m.source==='industrial'?'실적':'실적'}</small><b>${escape(m.value.toLocaleString('ko-KR',{maximumFractionDigits:1}))} ${escape(m.unit)}</b>
    <span>${m.yoyPct===null?'전년 증감률 미제시':`전년비 ${m.yoyPct>0?'+':''}${escape(m.yoyPct)}%`}</span></div>`).join('')}</div>`:'';
  const cards=r.segments.map(segment=>`<article class="stage5-segment">
    <div class="stage5-top">${stage6Ready?`<strong>${escape(segment.name)}${model.stage6.selection.industryId===segment.id?' · 시험 선정':''}</strong>`:`<label class="interest-choice"><input type="radio" name="stage5-focus" value="${escape(segment.id)}" data-label="${escape(segment.name)}"/><strong>${escape(segment.name)}</strong></label>`}<span class="tag">${escape(segment.stage)}</span></div>
    <p class="research-glance">${escape(segment.insight)}</p>${metrics(segment.observations)}
    ${segment.outlooks.length?`<div class="stage5-forecast"><b>향후 예상치 · 관측값 아님</b>${segment.outlooks.map(m=>`<p>${escape(m.label)}: ${escape(m.value.toLocaleString('ko-KR'))}${escape(m.unit)} ${m.yoyPct===null?'':`· 예상 증감률 +${m.yoyPct}%`} · <a href="${escape(r.sources[m.source].url)}" target="_blank" rel="noopener noreferrer">IFR ↗</a></p>`).join('')}</div>`:''}
    <details><summary>기술 단계·지역 편차·검증 필요 조건</summary>
      <p><b>기술:</b> ${escape(segment.technologies.join(' / '))}</p>
      <p><b>지역·범위:</b> ${escape(segment.regional)}</p>
      ${segment.missing.map(m=>`<p class="review-label">미확인: ${escape(m)}</p>`).join('')}
      <p><b>후속 조사:</b> ${escape(segment.focus)}</p>
      <p class="muted">근거: ${[...new Set([...segment.observations,...segment.outlooks].map(m=>m.source))].map(key=>`<a href="${escape(r.sources[key].url)}" target="_blank" rel="noopener noreferrer">${escape(r.sources[key].publisher)} · ${escape(r.sources[key].published)} ↗</a>`).join(' / ')}</p>
    </details></article>`).join('');
  const tech=r.technologies.map(t=>`<article class="stage5-tech"><div class="stage5-top"><strong>${escape(t.name)}</strong><span class="tag">${escape(t.status)}</span></div>
    <p>${escape(t.basis)}</p><p class="review-label">확인 과제: ${escape(t.gap)}</p>
    <a href="${escape(r.sources[t.source].url)}" target="_blank" rel="noopener noreferrer">${escape(r.sources[t.source].publisher)} · 원문 ↗</a></article>`).join('');
  return `<section class="panel" id="stage5">
    <div class="section-head"><div><span class="eyebrow">05 / GROWTH INDUSTRY &amp; TECHNOLOGY</span><h2>로봇·자동화 성장 산업과 기술 <small>4개 사업 축</small></h2></div><span class="tag">공식 근거 대조 ${escape(r.evidenceCheckedAt)} · ${escape(r.evidenceStatus)}</span></div>
    <div class="stage5-choice-source"><b>4단계 사용자 선택: ${escape(r.selection.selectedTheme)}</b> · 공탐 <strong>${escape(String(observation.score))}</strong>점 · ${escape(observation.observationDate)} ${observation.phase==='PROVISIONAL'?'잠정':'확정'}
      <p class="muted">${escape(compareMessage)}${current?` · API 현재 ${escape(String(current.score))}점 (${escape(current.date)})`:''}</p></div>
    <p class="disclaimer">아래 통계는 2025년의 서로 다른 로봇 시장 실물 관측치입니다. 설치·판매·운용재고·달러 매출을 합산하지 않으며, ETF 수익률·공탐 점수로 성장률을 만들지 않습니다. 조사 사실은 실행 시 자동 재검증되지 않습니다.</p>
    ${r.evidenceStatus==='RECHECK_REQUIRED'?'<p class="review-label">원문 확인 후 45일 경과 · 새로운 실적 발표를 재확인하기 전 최신 자료로 판단하지 마세요.</p>':''}
    <div class="stage5-list" id="stage5-candidates">${cards}</div>
    <h3 class="stage5-subhead">기술 준비 수준 · 별도 평가</h3><div class="stage5-tech-grid">${tech}</div>
    <div class="stage5-warning"><b>결측·판단 보류</b><p>전체 로봇 산업 TAM/SAM, 세부 기술별 독립 매출, 기업별 수혜 매출·마진, 특허 경쟁우위, 동일 조건 기술 KPI, 투자 매력도·밸류에이션은 확정하지 않았습니다. 2026~2029 수치는 전망이며 2025년 관측과 구분합니다.</p>
    <p>산업 분야 선택은 매수 승인으로 연결되지 않습니다. ${stage6Ready?'6단계의 상장사 실매출 공시 대조 결과를 아래에서 확인하세요.':'다음 6단계에서 선택한 분야의 상장사 실매출 노출을 검증해야 합니다.'}</p></div>
    ${stage6Ready?'<p class="muted">휴머노이드 시험 선택 파일을 자동으로 읽어 6단계 기업 근거로 연결했습니다. 새 선택·다운로드가 필요하지 않습니다.</p>':`<div class="interest-handoff"><h3>6단계 조사에 넘길 세부 산업 직접 선택</h3>
      <p id="stage5-current" role="status" aria-live="polite">아직 선택하지 않았습니다.</p>
      <button type="button" id="stage5-export" disabled>5단계 선정 기록 내려받기</button><button type="button" id="stage5-clear">선택 취소</button>
      <span class="muted" id="stage5-storage">파일명 M2_STAGE5_SELECTION.json · 주문·추천 없음</span>
    </div>`}</section>`;
}

function stage6IssuerSection(model){
 const r=model.productEvidence;
 const header=r?'<b>회사 공식 제품·사업 페이지 원문 확인</b> · '+escape(r.status)+
  ' · '+escape(r.matched??0)+'/'+escape(r.requested??0)+'건 확인':'<b>회사 공식 제품·사업 페이지</b> · 조사 전';
 const cards=(r?.items||[]).map(x=>'<article class="stage6-company"><div class="stage5-top"><strong>'+
  escape(x.company||x.ticker)+' · '+escape(x.ticker)+'</strong><span class="tag">'+escape(x.status)+'</span></div>'+
  (x.status==='ISSUER_PRODUCT_CLAIM_OBSERVED'?'<p>'+escape(x.description)+'</p><p class="muted">'+
   escape(x.segment)+' · 게시일 '+escape(x.sourceDate==='NOT_PUBLISHED'?'표기 없음':x.sourceDate)+' · 조회 '+escape(x.checkedAt)+'</p>'+
   '<a href="'+escape(x.sourceUrl)+'" target="_blank" rel="noopener noreferrer">회사 공식 페이지 ↗</a>':
   '<p class="review-label">'+escape(x.reason||'원문 확인 실패')+' · 확인되지 않은 사업 사실은 반영하지 않습니다.</p>')+
  '</article>').join('');
 return '<div class="stage5-choice-source"><h3>'+header+'</h3><p class="review-label">회사가 공개한 제품·기술 설명만 확인합니다. 독립 성능 검증·휴머노이드 매출·재무 수치·투자점수로 간주하지 않습니다. 회사 원문은 실행할 때마다 새로 조회하며, 연결 실패 시 과거 결과로 대체하지 않습니다. 게시일이 없는 제품 페이지는 임의 날짜를 만들지 않습니다.</p><div class="stage6-grid">'+cards+'</div></div>'+
  '<p class="review-label">금지된 자료원은 자동 조회 및 보고서 입력에서 차단했습니다. 기업 예비 후보는 유지하되, 별도 재무평가는 계속 보류합니다.</p>';
}

export function stage6UniverseSection(model){
 model=enforceSourcePolicy(model);
 const u=model.usUniverse;
 const r=model.stage6;
 const d=model.roboticsDiscovery;
 const bq=model.businessQuant;
 if(!u)return `<section class="panel unavailable" id="us-universe"><span class="eyebrow">06 / US STOCK UNIVERSE</span><h2>미국 상장 종목 자동 발굴 · 데이터 연결 전</h2><p>공식 상장 심볼 디렉터리의 자동 조회 결과가 없습니다.</p></section>`;
 const c=u.marketCounts||{};
 return `<section class="panel" id="us-universe"><div class="section-head"><div><span class="eyebrow">06 / US STOCK UNIVERSE</span><h2>미국 증시 전체 상장 후보 확인 · ${u.status==='READY'?escape(u.totalRows.toLocaleString('ko-KR'))+'개':'수집 실패'}</h2></div><span class="tag">상장 심볼 ${escape(u.status)} · 사업 실체 미검증</span></div>
 <p class="disclaimer">기준 <a href="https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt" target="_blank" rel="noopener noreferrer">나스닥 공식 상장목록 ↗</a> + <a href="https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt" target="_blank" rel="noopener noreferrer">NYSE·NYSE American 등 공식 상장목록 ↗</a>. ETF·시험종목·명백한 우선주·워런트 등을 제외한 <b>잠재 주식 심볼</b>이며, 실제 보통주·ADR·사업 산업·매출 검증 이전 후보입니다. 이 수는 특정 산업과 연관된 기업 수가 아닙니다.</p>
 ${u.status==='READY'?`<div class="stage7-metrics"><div><small>나스닥</small><b>${escape((c.NASDAQ||0).toLocaleString('ko-KR'))}</b></div><div><small>NYSE</small><b>${escape((c.NYSE||0).toLocaleString('ko-KR'))}</b></div><div><small>NYSE American</small><b>${escape((c.NYSE_AMERICAN||0).toLocaleString('ko-KR'))}</b></div><div><small>산업 필터 통과·검증 기업</small><b>—</b></div></div>`:`<p class="review-label">공식 목록 확인 실패: ${escape(u.reason)}. 이전 심볼 개수를 현재치로 대체하지 않았습니다.</p>`}
 <div class="stage5-choice-source"><h3>자동 탐색 · 공개 로봇기업 두 목록 ↔ 미국 거래소 교차</h3>
  ${d?.status==='READY'?`<p><a href="https://en.wikipedia.org/wiki/List_of_robotics_companies" target="_blank" rel="noopener noreferrer">세계 로봇기업 예시 ↗</a> ${escape(d.worldCandidatePool)}개 + <a href="https://en.wikipedia.org/wiki/Category:Robotics_companies_of_the_United_States" target="_blank" rel="noopener noreferrer">미국 로봇기업 분류 ↗</a> ${escape(d.usCategoryPool)}개 → 이름 중복 제거 ${escape(d.candidatePool)}개. 이 중 미국 거래소 실제 발행사 이름이 일치하는 <b>${escape(d.matchingCount)}개 예비 후보</b>를 찾았습니다.</p>
  ${d.usCategoryIssue?`<p class="review-label">미국 카테고리 수집 문제: ${escape(d.usCategoryIssue)}. 세계 기업 예시만 남겨 비교했습니다.</p>`:''}
  <p class="review-label">휴머노이드 관련 사업·매출·투자 순위 미검증 · 금융 스크리닝 아님</p>
  <div class="stage6-grid">${d.companyCandidates.map(x=>`<article class="stage6-company"><strong>${escape(x.topicalName)} · ${escape(x.ticker)}</strong><p class="muted">${escape(x.market)} · 분류 ${escape(x.sourceCountry)}</p></article>`).join('')}</div>`:
   `<p class="review-label">로봇기업 교차조회 실패: ${escape(d?.reason||'NOT_EXECUTED')}. 과거 2개 시험기업으로 임의 대체하지 않았습니다.</p>`}
  <p class="disclaimer">두 목록은 위키미디어 기여자들의 공개 문서를 공식 API로 읽었습니다. <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0 ↗</a> · 원문 출처표시. 세계와 미국 카테고리 모두 완전한 산업/기업 데이터베이스가 아닙니다. 회사의 미국 상장 여부와 발행사 소재국도 다릅니다. ETF 운용사 원본 보유종목처럼 파생 사용이 제한된 자료는 자동 발굴에 포함하지 않았습니다.</p></div>
 <div class="stage5-choice-source"><h3>전문 기업 스크리너 · Business Quant 공식 API (개인 로컬 사용)</h3>
 <p>상태: <b>${escape(bq?.status||'NOT_RUN')}</b>${bq?.status==='READY'?` · 거래소 일치 기업 ${escape(bq.usExchangeMatched)}개 · 명시적 로봇·자동화 업종 ${escape(bq.targetIndustries.length)}개 · 재무 스크리너 결과 ${escape(bq.screenedMatchCount)}개`:''}</p>
 ${bq?.status==='READY'?`
 <p class="review-label">산업명 기반 예비 후보만 표시하며 실제 물리 로봇·휴머노이드 제품 또는 매출 여부는 미검증입니다. 재무 스크리너 분류는 투자 추천이 아닙니다.</p>
 <p><b>로봇·산업 자동화 후보 ${escape(bq.physicalReviewCandidates?.length??0)}개</b> · 업무 자동화 소프트웨어 별도 ${escape(bq.softwareOnlyCandidates?.length??0)}개 · 기타 ${escape(bq.screenedMatches.length-(bq.physicalReviewCandidates?.length??0)-(bq.softwareOnlyCandidates?.length??0))}개</p>
 <h3>로봇·산업 자동화 · 평가 후보 유지</h3><div class="stage6-grid">${(bq.physicalReviewCandidates||[]).map(x=>`<article class="stage6-company"><strong>${escape(x.company)} · ${escape(x.ticker)}</strong><p class="muted">${escape(x.market)} · ${escape(x.industry)} · 사업·매출 검증 전</p></article>`).join('')}</div>
 <details><summary>업무 자동화 소프트웨어 후보 ${escape(bq.softwareOnlyCandidates?.length??0)}개 · 로봇 후보와 별도 표시</summary><div class="stage6-grid">${(bq.softwareOnlyCandidates||[]).map(x=>`<article class="stage6-company"><strong>${escape(x.company)} · ${escape(x.ticker)}</strong><p class="muted">${escape(x.market)} · ${escape(x.industry)} · 물리 로봇 검증 대상 아님</p></article>`).join('')}</div></details>
 ${bq.screenedMatches.length>(bq.physicalReviewCandidates?.length??0)+(bq.softwareOnlyCandidates?.length??0)?`<details><summary>기타 자동화 업종 · 미분류</summary><div class="stage6-grid">${bq.screenedMatches.filter(x=>!['ROBOTICS_INDUSTRY_CANDIDATE','INDUSTRIAL_AUTOMATION_REVIEW','SOFTWARE_AUTOMATION_SEPARATE'].includes(x.screeningLane)).map(x=>`<article class="stage6-company"><strong>${escape(x.company)} · ${escape(x.ticker)}</strong><p class="muted">${escape(x.industry)} · 미분류</p></article>`).join('')}</div></details>`:''}`:bq?.status==='NEEDS_API_KEY'?`<p class="review-label">무료 공식 API의 첫 연결을 위해 개인 API 키가 1회 필요합니다. 환경변수 M2_BUSINESSQUANT_API_KEY가 없으므로 API 요청을 하지 않았습니다. 계정 등록: <a href="https://businessquant.com/pricing" target="_blank" rel="noopener noreferrer">Business Quant 무료 플랜 ↗</a>.</p>`:`<p class="review-label">${escape(bq?.reason||'명시적 로봇 업종 없음 / 스크리너 결과 대기')}. 현재 7개 목록을 검증된 결과로 대체하지 않았습니다.</p>`}
 <p class="disclaimer">공식 <a href="https://businessquant.com/docs/api/screener" target="_blank" rel="noopener noreferrer">Stock Screener API ↗</a> · <a href="https://businessquant.com/docs/api/universe" target="_blank" rel="noopener noreferrer">Equity Universe ↗</a>. 키는 보고서에 표시하거나 저장하지 않습니다. 이용 범위는 사용자 개인 로컬 조사로 제한하며 공개 사이트로 재배포하지 않습니다.</p></div>
 ${stage6IssuerSection(model)}
 <div class="stage5-warning"><b>최종 기업 선별은 아직 미완료</b><p>전문 산업 분류·재무 스크리너는 기업 조사 출발점이며, 개별 기업의 휴머노이드 기술·사업 매출 노출을 보증하지 않습니다. <b>재무·성장성 심층평가와 자동 투자 순위는 미구현</b>입니다. 기존 2개 시범 공시를 새로 발굴한 종목이라고 표시하지 않습니다.</p></div>
 <p class="muted">미국 주식 우선 조사. 한국 ${escape(r?.koreaQueue?.length??0)}개는 등록 구성만 유지하고 조사 대기. 신규 종목 수동 선택 요구 없음 · 자동 투자 순위/매수 없음.</p></section>`;
}

function stage6CompanySection(model){
 const r=model.stage6;
 if(!r||r.status!=='READY')return `<section class="panel unavailable" id="stage6"><span class="eyebrow">06 / REPRESENTATIVE LISTED COMPANIES</span>
   <h2>6단계 · 기업 사업노출 조회 보류</h2><p>시험 선택 기록의 검증이 필요합니다: ${escape(r?.reason||'STAGE5_SELECTION_NOT_FOUND')}</p>
   <p class="muted">기존 공탐 산식·ETF 편입구성은 검사하지 않습니다. 기업 목록·매출액을 임의 생성하지 않습니다.</p></section>`;
 const verified=r.candidates.filter(c=>c.revenue!==null);
 const other=r.candidates.filter(c=>c.revenue===null);
 const company=entry=>{
  const f=entry.revenue;
  return `<article class="stage6-company">
   <div class="stage5-top"><strong>${escape(entry.name)} <small>${escape(entry.ticker)} · ${escape(entry.exchange)}</small></strong>
    <span class="tag ${f?'stage6-verified':'stage6-unverified'}">${f?'분리 매출 공시 확인':'휴머노이드 매출 미확인'}</span></div>
   <p class="muted">${escape(entry.legalName)} · ${escape(entry.issuerId)} · ${escape(entry.shareClass)} · 상장통화 ${escape(entry.listingCurrency)}</p>
   <p>${escape(entry.connection)}</p>
   ${f?`<div class="stage6-revenues"><div><small>2026 상반기 전신형 휴머노이드 제품·서비스 매출</small><b>${escape(f.humanoidProductsAndServices.toFixed(3))} ${escape(f.currency)} 백만</b></div>
    <div><small>2026 상반기 그룹 전체 매출 중 구성비</small><b>${escape(f.disclosedSharePct.toFixed(1))}%</b></div>
    <div><small>그룹 총매출 / 그룹 기간 순손실</small><b>${escape(f.totalConsolidated.toFixed(3))} / -${escape(f.netLossTotal.toFixed(3))} ${escape(f.currency)} 백만</b></div></div>
    <p class="muted">${escape(f.period)} · 미감사 발표치 · 별도 분류 매출 ≠ 해당 제품 이익</p>`:
    '<p class="review-label">매출액 — · 매출 비중 — · 수익화 판단 보류 (0원으로 간주하지 않음)</p>'}
   <p class="review-label">해석 한계: ${escape(entry.boundary)}</p>
   <details><summary>발행사 원문·다음 검증 확인</summary><p>후속 과제: ${escape(entry.nextVerification)}</p>
    ${entry.latestSource?`<p>공시·발표 ${escape(entry.latestSource.date)} · <a href="${escape(entry.latestSource.url)}" target="_blank" rel="noopener noreferrer">${escape(entry.latestSource.publisher)} ↗</a></p>`:'<p class="review-label">허용된 공식 원문을 새로 확보하기 전에는 근거 미확인입니다.</p>'}</details></article>`;
 };
 return `<details class="panel archived-pilot" id="stage6"><summary><b>기존 2개 미국 종목 시범 조사 스냅샷</b> · 전체 미국 시장 스크리닝 결과 아님 (펼치기)</summary><div class="section-head"><div><span class="eyebrow">06 / ARCHIVED ISSUER EVIDENCE PILOT</span>
  <h2>6단계 · 휴머노이드 관련 상장사 사업 노출 · 시범 근거 <small>${r.candidates.length}개</small></h2></div>
  <span class="tag">공식 원문 확인 ${escape(r.evidenceCheckedAt)} · ${escape(r.evidenceStatus)}</span></div>
  <div class="stage5-choice-source"><b>시험 선택: ${escape(r.selection.industryName)}</b>
    <p class="muted">사용자가 이번 한 번 선택한 입력을 프로그램이 자동 연결했습니다. 재선택·추가 수동 파일 작업은 필요 없습니다. 향후 산업 자동 선정 규칙은 미구현입니다.</p></div>
  <p class="disclaimer"><b>과거 지정한 미국 상장 ${r.candidates.length}개의 제한적 시험 표본</b> · 산업 스크리너로 발견한 종목이 아닙니다. 한국 상장 ${r.koreaQueue.length}개는 식별정보만 구성한 뒤 연구 대기 · 홍콩 단독 상장은 제외했습니다. 미국 상장 ADR인 XPEV는 중국 사업 기반 케이맨 발행사입니다. 독립 매출 공시 ${verified.length}개 / 미확인 ${other.length}개. 결측을 0원으로 취급하지 않습니다. 재무 공시 수치는 자동 갱신되지 않습니다.</p>
  ${r.evidenceStatus==='RECHECK_REQUIRED'?'<p class="review-label">원문 검증 후 45일 이상 경과했습니다. 후속 기업 공시를 새로 확인하기 전 최신 매출이라고 간주하지 마세요.</p>':''}
  ${verified.length?`<h3 class="stage5-subhead">별도 휴머노이드 매출 인식 확인 (${verified.length})</h3><div class="stage6-grid">${verified.map(company).join('')}</div>`:''}
  <h3 class="stage5-subhead">사업 연관성 추가 검증 필요 · 휴머노이드 매출 미확인 (${other.length})</h3>
  <div class="stage6-grid">${other.map(company).join('')}</div>
  <h3 class="stage5-subhead">한국 상장 · 추후 추가 대기 (${r.koreaQueue.length})</h3>
  <div class="stage6-grid">${r.koreaQueue.map(c=>`<article class="stage6-company"><strong>${escape(c.name)} · ${escape(c.ticker)}</strong><p class="muted">${escape(c.exchange)} · ${escape(c.shareClass)} · CONFIGURED_NOT_RESEARCHED</p><p>재무·사업 검증 — (조사 보류)</p></article>`).join('')}</div>
  <details class="stage6-exclusions"><summary>이번 조사 대상에서 제외·구분한 사례</summary>
   ${r.exclusions.map(x=>`<p><b>${escape(x.name)}</b> · ${escape(x.reason)} · <a href="${escape(x.source)}" target="_blank" rel="noopener noreferrer">참고 출처 ↗</a></p>`).join('')}</details>
  <div class="stage5-warning"><b>7단계 연결: 미국 상장 기업 재무 체력</b>
   <p>이 시험 ${r.candidates.length}개 기업의 기존 재무 기록은 현재 평가에 사용할 수 없습니다. 한국 기업은 보류하며 신규 자동 발굴·15개 평가 점수·자동 우선순위는 아직 없습니다.</p></div></details>`;
}

function stage7AllowedEarningsSection(model){
 const e=model.allowedEarnings;
 if(!e)return '<section class="panel unavailable" id="stage7-live"><h2>7단계 · 허용된 기업 실적 원문 조사 전</h2></section>';
 const rows=(e.items||[]).map(item=>{
  const observed=item.status==='ISSUER_SELF_REPORTED_EARNINGS_OBSERVED';
  const facts=observed?'<div class="stage7-metrics"><div><small>2026년 2분기 · 그룹 전체 발표 매출</small><b>$'+
   escape(item.companyWideRevenue.value.toFixed(1))+'백만</b></div><div><small>보고기간</small><b>'+escape(item.periodStart)+' ~ '+escape(item.periodEnd)+'</b></div></div>':
   '<p class="review-label">매출 확인 — · '+escape(item.reason||'원문 확인 실패')+' · 0원으로 처리하지 않습니다.</p>';
  return '<article class="stage7-company"><h3>'+escape(item.company)+' · '+escape(item.ticker)+'</h3>'+facts+
   '<p class="muted">'+escape(item.status)+'</p>'+
   (observed?'<p class="muted">'+escape(item.publisher)+' · 발표 '+escape(item.sourceDate)+
    ' · 확인 '+escape(item.retrievedAt)+' · 발행사 자체 발표 · 제3자 검증 전</p><a href="'+
    escape(item.sourceUrl)+'" target="_blank" rel="noopener noreferrer">실적 발표 원문 ↗</a>':'')+'</article>';
 }).join('');
 return '<section class="panel" id="stage7-live"><div class="section-head"><div><span class="eyebrow">07 / ALLOWED COMPANY EARNINGS</span>'+ 
  '<h2>7단계 · 허용된 회사 실적 발표 원문 · '+escape(e.status)+'</h2></div><span class="tag">발행사 수치 '+escape(e.matched)+'/'+escape(e.requested)+' · 점수 미평가</span></div>'+ 
  '<p class="review-label">회사·배포사에서 공개한 독립된 실적 보도자료만 매 실행 새로 확인합니다. 모든 매출은 <b>기업 전체의 자가 발표 매출</b>입니다. 휴머노이드·피지컬 AI 관련 매출, 감사받은 재무제표, 독립적인 교차검증, 15개 투자점수 또는 매수신호를 뜻하지 않습니다.</p>'+ 
  '<div class="stage7-grid">'+(rows||'<p class="review-label">개인 산업 스크리너의 후보가 없어 원문 조회를 진행하지 않았습니다.</p>')+'</div>'+ 
  '<p class="disclaimer">별도 보도자료를 확보하지 못한 기업은 결측을 유지합니다. 금지 출처의 문서·미러·과거 저장값으로 빈칸을 채우지 않습니다. 기존 기록 기반 7단계 재무 스냅샷은 별도로 차단되어 있으며, 원본 15개 계산기 입력은 비어 있습니다.</p></section>';
}

function stage8OriginalScorecardSection(model){
 const r=model.stage8;
 if(!r)return '<section class="panel unavailable" id="stage8"><h2>8단계 · 원본 15개 기준서 연결 대기</h2><p>원본 계산기와 PDF 검증을 실행하지 않았습니다.</p></section>';
 const source=r.integrity;
 const standards=r.catalog.map(c=>'<div class="stage8-standard"><b>'+escape(c.index)+'. '+escape(c.name)+'</b><small>'+escape(c.id)+' · '+escape(c.implementation==='EXACT_CALCULATOR'?'기존 산식 구현':'부분 구현 · 추가 조건 필요')+'</small></div>').join('');
 const companies=r.candidates.map(c=>'<article class="stage7-company"><h3>'+escape(c.company)+' · '+escape(c.ticker)+'</h3><p class="review-label">'+escape(c.status)+' · 15개 원본 점수 '+c.graded+'/15 계산</p><p class="muted">'+escape(c.market)+' · '+escape(c.issuerProductClaimStatus)+' · '+escape(c.issuerProductSegment||'사업분류 미확인')+' · 발행사 주장과 독립 사업 검증은 다릅니다.</p></article>').join('');
 return '<section class="panel" id="stage8"><div class="section-head"><div><span class="eyebrow">08 / ORIGINAL INVESTMENT SCORECARDS</span><h2>8단계 · 사용자 원본 PDF 15개 평가 기준 연결</h2></div><span class="tag">읽기 전용 · 점수 생성 '+r.calculatedScores+'/'+r.possibleScorecards+'</span></div>'+
  '<div class="stage7-metrics"><div><small>기준서 무결성</small><b>'+source.standardsPassed+'/'+source.standardsExpected+' · '+escape(source.status)+'</b></div><div><small>원본 계산기 무결성</small><b>'+escape(source.calculatorStatus)+'</b></div><div><small>기존 정확 구현</small><b>'+r.exactCount+'/15</b></div><div><small>부분 구현 · 보완 전 평가 보류</small><b>'+r.partialCount+'/15</b></div></div>'+
  '<p class="review-label">'+escape(r.status)+' · 모든 기존 기준서 산식·가중치 파일은 수정하지 않았습니다. 각 기준서의 데이터 출처가 충족되지 않으면 NOT_EVALUATED이며 점수 0점과 다릅니다. 15개 점수를 임의로 합산하거나 투자 순위를 생성하지 않습니다.</p>'+
  '<details><summary class="review-label">원본 15개 점수표 명칭·구현 상태 펼치기</summary><div class="stage8-standards">'+standards+'</div></details>'+
  '<div class="stage7-grid">'+(companies||'<p class="review-label">현재 전문 스크리너에서 물리 로봇 업종 예비 후보를 확보하지 못했습니다. 근거가 없더라도 기존 기업을 부적격 판정하지 않습니다.</p>')+'</div>'+
  '<p class="disclaimer">Finviz 기본지표·TipRanks 실적 이력·일일 거래 데이터 등 각 원본 기준서가 요구하는 독립 근거는 별도로 확인해야 합니다. 원본에서 금지 자료원을 필수로 지정한 항목은 기준 변경 승인 전까지 미평가입니다.</p></section>';
}

function stage5SelectionScript() {
  return `<script>(function(){
    'use strict';
    var area=document.getElementById('stage5-candidates');
    var report=document.getElementById('stage5');
    var current=document.getElementById('stage5-current');
    var saveButton=document.getElementById('stage5-export');
    var clearButton=document.getElementById('stage5-clear');
    if(!area||!report||!current||!saveButton||!clearButton)return;
    var radios=Array.from(area.querySelectorAll('input[name="stage5-focus"]'));
    var key='ZGMINI_M2_STAGE5_FOCUS_V1';
    function active(){return radios.find(function(r){return r.checked;});}
    function update(){
      var chosen=active();saveButton.disabled=!chosen;
      current.textContent=chosen?'선택: '+chosen.dataset.label+' · 6단계 기업 매출 노출 조사 대상으로 기록':'아직 선택하지 않았습니다.';
      try {if(chosen)localStorage.setItem(key,chosen.value);} catch (_) { /* file scheme may deny storage */ }
    }
    radios.forEach(function(r){r.addEventListener('change',update);});
    clearButton.addEventListener('click',function(){radios.forEach(function(r){r.checked=false;});
      try {localStorage.removeItem(key);} catch(_){} update();});
    try {var restored=localStorage.getItem(key);var match=radios.find(function(r){return r.value===restored;});
      if(match)match.checked=true;} catch(_){} update();
    saveButton.addEventListener('click',function(){
      var chosen=active();if(!chosen)return;
      var rec={schema:'ZGMINI_M2_STAGE5_SELECTION_V1',purpose:'STAGE6_COMPANY_EXPOSURE_RESEARCH_ONLY',
        parentTheme:'로봇·자동화',industryId:chosen.value,industryName:chosen.dataset.label,
        selectedAt:new Date().toISOString(),evidenceCheckedAt:'2026-10-24',
        researchSources:['https://ifr.org/ifr-press-releases/news/five-million-robots-now-operate-in-factories-globally',
          'https://ifr.org/ifr-press-releases/news/global-sales-of-professional-service-robots-surge-24-percent'],
        industryInvestmentScore:null,investmentAttractiveness:'NOT_EVALUATED',noTrade:true};
      var b=new Blob([JSON.stringify(rec,null,2)+'\\n'],{type:'application/json'});
      var href=URL.createObjectURL(b);var a=document.createElement('a');a.href=href;a.download='M2_STAGE5_SELECTION.json';
      document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(href);},1000);
    });
  })();</script>`;
}

// Inline-only script. The source scores, calculation and local files are never modified.
// A user click produces a portable selection record; no automatic investment decision.
function stage4SelectionScript() {
  return `<script>(function(){
    'use strict';
    var container=document.getElementById('stage4-candidates');
    var current=document.getElementById('stage4-current');
    var exportButton=document.getElementById('stage4-export');
    var clearButton=document.getElementById('stage4-clear');
    var storageNote=document.getElementById('stage4-storage');
    if(!container||!current||!exportButton||!clearButton)return;
    var radios=Array.from(container.querySelectorAll('input[name="stage4-interest"]'));
    var key='ZGMINI_M2_STAGE4_INTEREST_V1';
    function save(name){
      try {localStorage.setItem(key,name);return true;}
      catch (_) {return false;}
    }
    function selected(){return radios.find(function(radio){return radio.checked;});}
    function update(){
      var radio=selected();
      exportButton.disabled=!radio;
      if(!radio){current.textContent='아직 선택하지 않았습니다.';return;}
      var warnings=[];
      if(radio.dataset.dateMatch!=='yes')warnings.push('시장과 관측일 차이');
      if(radio.dataset.factStatus!=='DATED_ORIGINAL_VERIFIED')warnings.push('산업 근거 추가 확인 필요');
      current.textContent='선택: '+radio.value+' · 공탐 '+radio.dataset.score+'점 ('+radio.dataset.date+') · 5단계 조사 대기'
        +(warnings.length?' · 주의: '+warnings.join(', '):'');
      if(!save(radio.value))storageNote.textContent='이 브라우저에서는 선택 자동 보존이 제한됩니다. 선택 기록 파일을 내려받으세요.';
    }
    radios.forEach(function(radio){radio.addEventListener('change',update);});
    clearButton.addEventListener('click',function(){
      radios.forEach(function(radio){radio.checked=false;});
      try {localStorage.removeItem(key);} catch(_) { /* file:// storage can be unavailable */ }
      update();
    });
    try {
      var previous=localStorage.getItem(key);
      var restored=radios.find(function(radio){return radio.value===previous;});
      if(restored)restored.checked=true;
    } catch(_) { /* file:// storage can be unavailable */ }
    update();
    exportButton.addEventListener('click',function(){
      var radio=selected();if(!radio)return;
      var record={schema:'ZGMINI_M2_STAGE4_SELECTION_V1',selectedTheme:radio.value,
        selectedAt:new Date().toISOString(),purpose:'STAGE5_INDUSTRY_TECH_RESEARCH_ONLY',
        source:'https://zgmini.kr/api/theme-fear-greed',
        sentiment:{score:Number(radio.dataset.score),observationDate:radio.dataset.date,
          phase:radio.dataset.phase,marketDateMatch:radio.dataset.dateMatch==='yes'},
        industryEvidenceStatus:radio.dataset.factStatus,
        investmentAttractiveness:'NOT_EVALUATED',noTrade:true};
      var blob=new Blob([JSON.stringify(record,null,2)+'\\n'],{type:'application/json'});
      var href=URL.createObjectURL(blob);
      var a=document.createElement('a');a.href=href;a.download='M2_STAGE4_SELECTION.json';
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(function(){URL.revokeObjectURL(href);},1000);
    });
  })();</script>`;
}

function marketSection(feed) {
  if(feed.status!=='READY')return section(feed,'미국 시장','01 / MARKET');
  return `<section class="panel market"><div class="section-head"><div><span class="eyebrow">01 / MARKET</span><h2>미국 시장 투자심리</h2></div><span class="tag">${escape(feed.date)} · 검증 저장값</span></div>
    <div class="market-summary"><strong class="big-score ${zoneClass(feed.score)}">${fmt(feed.score)}</strong>
     <div><b>${escape(feed.rating)}</b><p>${escape(feed.detail)}</p><small>1개월 변화 ${changeText(monthChange(feed.points))}</small></div></div>
    <div class="market-chart">${plot(feed.points,feed.points.length,{width:900,height:160})}</div>
    <p class="row-meta">${escape(feed.points[0].date)} ~ ${escape(feed.date)} · ${feed.points.length}개 실제 관측</p>
    <a href="${escape(feed.source)}" target="_blank" rel="noopener noreferrer">시장 공개 점수 확인 ↗</a></section>`;
}

const stageInfo = {
  OBSERVED:['시장','관측 확인'], BLOCKED:['시장','자료 없음'],
  SAME_DATE_REVIEW:['섹터','시장과 동일 관측일'], DATE_OR_DATA_GAP:['날짜 검토','동일일 확정 불가'],
  DATED_REVIEW:['테마','섹터 관측일에 점수 존재'], NOT_EVALUATED:['매력도','성장성·수익화 미평가'],
};

export function renderHtml(model) {
  model=enforceSourcePolicy(model);
  const safeTime=Number.isFinite(Date.parse(model.retrievedAt))
    ?new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Seoul'}).format(new Date(model.retrievedAt))
    :model.retrievedAt;
  const stagePairs=[['market',model.stages.market],['sector',model.stages.sector],
    ['theme',model.stages.theme],['attractiveness',model.stages.attractiveness],
    ['industry',model.stage5?.status==='READY'?'INDUSTRY_RESEARCH':'SELECTION_REQUIRED'],
    ['company',model.roboticsDiscovery?.status==='READY'?'TOPICAL_MATCH_UNVERIFIED':model.usUniverse?.status==='READY'?'LISTING_DIRECTORY_ONLY':'SELECTION_REQUIRED'],
    ['financial','NOT_EVALUATED']];
  const stages=stagePairs.map(([key,state],i)=>{
    const themeCount=model.audit?.themeAlignment;
    const description=key==='theme'&&themeCount&&themeCount.referenceDate
      ?`시장 기준일 일치 ${themeCount.matchingCount}/${themeCount.total}`
      :key==='attractiveness'&&model.themeResearch?.status==='SOURCE_DISCOVERY_UNRANKED'
        ?model.stage6?.status==='READY'?'시험 선택 연결':'관심 테마 직접 선택':stageInfo[state]?.[1]||state;
    return `<li><b>${i+1}단계</b><span>${key==='market'?'시장':key==='sector'?'섹터':key==='theme'?'테마':key==='industry'?'산업·기술':key==='company'?'대표 기업':key==='financial'?'기업 재무':'매력 테마'}</span><small>${escape(key==='industry'?(model.stage5?.status==='READY'?'로봇·자동화 공식 근거':'테마 선정 기록 필요'):key==='company'?(model.roboticsDiscovery?.status==='READY'?`미국 로봇 분야 예비 기업 ${model.roboticsDiscovery.matchingCount} · 사업 미검증`:model.usUniverse?.status==='READY'?`미국 상장 후보 ${model.usUniverse.totalRows} · 산업 선별 미실행`:'미국 상장목록 조회 대기'):key==='financial'?`회사 실적 발표 ${model.allowedEarnings?.matched||0}/${model.allowedEarnings?.requested||0} · 재무평가 미실행`:description)}</small></li>`;
  }).join('');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>투자 분석 M2 R25 · ZGMINI 읽기 전용</title><style>
*{box-sizing:border-box}body{margin:0;background:#363636;color:#f0f2f4;font:13px/1.6 system-ui,-apple-system,"Malgun Gothic",sans-serif}
main{max-width:1260px;margin:0 auto;padding:24px 16px 45px}h1{font-size:20px;margin:0}h2{font-size:17px;margin:3px 0}a{color:#93d6ff;text-decoration:none}a:hover{text-decoration:underline}p{margin:5px 0}.muted,.disclaimer,.row-meta{color:#adb8c2}
.hero{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}.hero p{color:#abbccb}.tag{border:1px solid #66717b;color:#d5e3eb;font-size:11px;padding:4px 8px;white-space:nowrap}
.state{border-left:3px solid #63bbeb;margin:14px 0 18px;background:#414141;padding:10px 13px}.state b{font-size:14px}.state.partial{border-color:#f0b96d}.state.unavailable{border-color:#df7885}
.steps{list-style:none;padding:0;margin:0 0 18px;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}.steps li{background:#424242;padding:8px 12px;min-width:0}.steps b{font-size:10px;color:#86abbc;display:block}.steps span{display:block;font-weight:700}.steps small{color:#aebdc8}
.panel{padding:16px;background:#404040;margin:0 0 10px}.section-head{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.eyebrow{font-size:10px;color:#83afc8;letter-spacing:1.4px}.panel small{color:#a9bac5}.disclaimer{font-size:11px;margin:7px 0 12px}.items{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.row-item{padding:10px 12px;background:#383838;min-width:0}.row-top{display:flex;align-items:center;gap:8px}.rank{color:#aab4ba;font-size:12px;min-width:16px}.item-name{flex:1;min-width:0;font-size:13px}.score{font-size:17px;font-weight:800}.delta{color:#b8c9d1;min-width:55px;text-align:right;font-size:12px}.z0{color:#f2748a}.z1{color:#f8b775}.z2{color:#bbc5cf}.z3{color:#85dcae}.z4{color:#65e0d8}
.row-chart svg{width:100%;height:77px;display:block;margin:3px 0}.row-meta{font-size:10px;display:flex;justify-content:space-between;gap:5px;flex-wrap:wrap}.row-meta em{color:#e7c888;font-style:normal}.row-item details{margin-top:4px;color:#b8cbd7;font-size:11px}.row-item summary{cursor:pointer;user-select:none}.row-item details p{margin:2px 0}.market-summary{display:flex;align-items:center;gap:16px}.big-score{font-size:46px}.market-summary b{font-size:18px}.market-summary p,.market-summary small{color:#b7c3c9}.market-chart svg{width:100%;height:156px;display:block;margin:10px 0 4px}.unavailable{border-left:3px solid #b16d6d}.foot{margin-top:14px;font-size:11px;color:#bdc8d0}
.audit-list{display:grid;gap:5px;margin:10px 0}.audit-list>div{display:flex;align-items:flex-start;gap:10px;background:#393939;padding:5px 8px;font-size:11px}.audit-list strong{min-width:55px}.audit-pass{color:#85dcae}.audit-review,.audit-info{color:#e7c888}.audit-fail{color:#ef7a8d}
.research-list{display:grid;gap:5px}.research-item{background:#393939;padding:6px 10px}.research-item summary{display:flex;align-items:center;gap:9px;flex-wrap:wrap;cursor:pointer;list-style-position:inside}.research-item summary strong{min-width:120px;color:#eff5f8}.research-item summary span{font-variant-numeric:tabular-nums}.research-item summary small{flex:1}.research-item .review-label{color:#e7c888;font-size:11px}.research-body{padding:6px 6px 8px 17px;color:#d5dce1}.research-body p{margin:5px 0}
.research-line{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.interest-choice{display:flex;align-items:center;gap:10px;min-width:150px;cursor:pointer}.interest-choice input{width:20px;height:20px;margin:0;accent-color:#63bbeb;cursor:pointer}.interest-choice strong{font-size:13px}.research-line>span{font-variant-numeric:tabular-nums}.research-line>small{margin-left:auto}.research-glance{font-size:11px;color:#c4d3d9;padding-left:30px}.research-glance b{color:#88c3dd}.research-glance.caution{color:#e3cb98}.research-glance.caution b{color:#e6bf72}.research-item details{padding-left:30px;margin-top:5px}.research-item details summary{font-size:11px;color:#b3dafa}.research-item:has(input:checked){outline:2px solid #63bbeb;background:#303e42}
.interest-handoff{margin-top:13px;background:#30383b;padding:13px;border-left:3px solid #63bbeb}.interest-handoff h3{font-size:14px;margin:0 0 5px}.interest-handoff button{background:#22789d;border:0;color:#fff;font:inherit;padding:10px 14px;margin:8px 12px 5px 0;cursor:pointer;min-height:44px}.interest-handoff #stage4-clear{background:#59636a}.interest-handoff button:disabled{opacity:.45;cursor:not-allowed}.interest-handoff .muted{font-size:11px}.archived-pilot{border-left:2px solid #5a696f}.archived-pilot>summary{cursor:pointer;color:#bbcad2;font-size:12px}.archived-pilot[open]>summary{margin-bottom:13px}
.fact-block{padding:7px 9px;background:#323a3c;margin:8px 0}.fact-block .verified-fact{color:#85dcae;font-size:11px}
.company-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.company-card{background:#383838;padding:10px 12px;min-width:0}.company-card .muted{font-size:11px}.company-head{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.company-head strong{flex:1;font-size:13px}.company-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:8px 0}.company-metrics div{padding:6px;background:#30383b}.company-metrics small{display:block;font-size:10px}.company-metrics b{font-size:13px;color:#d5f1ed;font-variant-numeric:tabular-nums}.company-card p{margin:5px 0}.review-label{color:#e7c888}
.stage5-choice-source{background:#303e42;padding:10px 12px;margin:10px 0;border-left:3px solid #63bbeb}.stage5-choice-source strong{font-variant-numeric:tabular-nums;color:#85dcae}.stage5-list,.stage5-tech-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.stage5-segment,.stage5-tech{background:#383838;padding:12px;min-width:0}.stage5-top{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.stage5-top .interest-choice{flex:1}.stage5-segment .research-glance{padding-left:0;margin:9px 0}.stage5-segment details{margin-top:10px}.stage5-segment summary{color:#a3d7f4;cursor:pointer}.stage5-segment details p{margin:7px 0}.stage5-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:5px;margin:8px 0}.stage5-metrics>div{background:#303638;padding:7px}.stage5-metrics small{display:block;font-size:10px}.stage5-metrics b{display:block;font-size:15px;color:#b7e7cb;font-variant-numeric:tabular-nums}.stage5-metrics span{display:block;font-size:11px;color:#c8d2d7}.stage5-forecast{border-left:2px solid #e7c888;background:#383b3c;padding:8px 10px;margin:8px 0}.stage5-forecast>b{font-size:11px;color:#e7c888}.stage5-forecast p{font-size:11px}.stage5-subhead{font-size:14px;margin:17px 0 7px}.stage5-tech p,.stage5-tech a{font-size:11px}.stage5-warning{padding:10px;margin:12px 0;background:#494036;border-left:3px solid #e7c888}.stage5-warning b{color:#f0cc8e}
.stage6-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.stage6-company{background:#383838;padding:12px;min-width:0}.stage6-company p{margin:7px 0}.stage6-company summary,.stage6-exclusions summary{cursor:pointer;color:#9fd5f0;font-size:11px}.stage6-company details{margin-top:9px}.stage6-company details p,.stage6-exclusions p{font-size:11px}.stage6-verified{color:#a5e7be;border-color:#4a986e}.stage6-unverified{color:#e7cb9a;border-color:#9e8055}.stage6-revenues{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:5px;margin:9px 0}.stage6-revenues>div{padding:9px;background:#30383b}.stage6-revenues small{display:block;font-size:10px}.stage6-revenues b{display:block;font-size:14px;color:#a5e7be;white-space:normal;font-variant-numeric:tabular-nums}.stage6-exclusions{padding:10px;margin-top:12px;background:#363c3f}
.stage7-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.stage7-company{background:#383838;padding:12px;min-width:0}.stage7-company h3{font-size:14px;margin:0}.stage7-company h4{font-size:12px;color:#a5d7ec;margin:6px 0}.stage7-block{background:#343b3e;padding:8px;margin-top:9px}.stage7-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.stage7-metrics>div{background:#303335;padding:7px;min-width:0}.stage7-metrics small{display:block;font-size:10px}.stage7-metrics b{display:block;font-size:14px;color:#d4f3e5;font-variant-numeric:tabular-nums}.stage7-company .muted{font-size:11px}
.stage8-standards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin:8px 0}.stage8-standard{background:#34393b;padding:8px}.stage8-standard b,.stage8-standard small{display:block}.stage8-standard b{font-size:12px}.stage8-standard small{font-size:10px}
@media(max-width:980px){.steps{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:700px){main{padding:12px 9px 30px}.steps{grid-template-columns:repeat(2,minmax(0,1fr))}.items,.company-list,.stage5-list,.stage5-tech-grid,.stage6-grid,.stage7-grid,.stage8-standards{grid-template-columns:1fr}.panel{padding:12px}.market-chart svg{height:130px}.row-chart svg{height:64px}.tag{white-space:normal}.research-line>small{margin-left:30px}.research-glance,.research-item details{padding-left:30px}}
</style></head><body><main><header class="hero"><div><span class="eyebrow">ZGMINI / INVESTMENT PROCESS</span><h1>투자 흐름 M2</h1><p>기존 시장·섹터·테마 공개 점수를 자동 조회합니다. 조회만 수행하며 주문·게시·원자료 수정은 하지 않습니다.</p></div><span class="tag">조회 ${escape(safeTime)} (KST)</span></header>
<div class="state ${escape(model.status.toLowerCase())}"><b>자료 상태: ${escape(model.status)}</b><p>${model.status==='READY'?'시장·섹터·테마 공개 응답을 확인했습니다. 관측일과 확정·잠정 구분은 각 카드에 표시합니다.':model.status==='PARTIAL'?'일부 공개 자료만 확인했습니다. 실패한 자료에 숫자를 채우지 않았습니다.':'공개 API 자료를 확인하지 못했습니다. 네트워크 또는 저장 상태를 점검하세요.'}</p></div>
<ol class="steps">${stages}</ol>
${auditSection(model)}${marketSection(model.feeds.market)}${section(model.feeds.sector,'11개 미국 섹터','02 / SECTOR')}${section(model.feeds.theme,'ETF 기반 투자 테마','03 / THEME')}${themeResearchSection(model)}${stage5ResearchSection(model)}${stage6UniverseSection(model)}${stage6CompanySection(model)}${stage7AllowedEarningsSection(model)}${stage8OriginalScorecardSection(model)}
<p class="foot">미국 상장목록과 위키미디어 로봇기업 예시를 교차조회하고, 개인 API 키가 있으면 Business Quant의 업종 스크리닝을 별도로 실행합니다. 금지 자료원은 수집·검증·평가·출력에 사용하지 않습니다. 과거 금지 출처의 재무 스냅샷은 표시하지 않습니다. 현재 투자점수·매매·공개배포·공탐 산식 재검증은 수행하지 않습니다.</p></main>${stage4SelectionScript()}${stage5SelectionScript()}</body></html>`;
}

export function renderSummary(model) {
  model=enforceSourcePolicy(model);
  const lines=[`REPORT=INVESTMENT_M2_R25_NASDAQ_EARNINGS_REPAIR`,`RETRIEVED_AT=${model.retrievedAt}`,
    `STATUS=${model.status}`,`AUDIT_STATUS=${model.audit?.status||'NOT_RUN'}`,
    `SOURCE=${model.sourceOrigin}`,`NO_TRADE=YES`,`NO_MUTATION=YES`,
    `SOURCE_POLICY=${model.sourcePolicy||'REQUIRES_EXPLICIT_POLICY'}`];
  for(const kind of ['market','sector','theme']){
    const f=model.feeds[kind];
    lines.push(`${kind.toUpperCase()}_STATUS=${f.status}`);
    lines.push(`${kind.toUpperCase()}_DATE=${f.date||'UNAVAILABLE'}`);
    if(f.reason)lines.push(`${kind.toUpperCase()}_REASON=${f.reason}`);
    if(f.items)lines.push(`${kind.toUpperCase()}_COUNT=${f.items.length}`);
    if(f.apiObservationDate)lines.push(`${kind.toUpperCase()}_API_OBSERVATION_DATE=${f.apiObservationDate}`);
  }
  if(model.audit){
    for(const check of model.audit.checks) lines.push(`AUDIT_${check.id}=${check.status} | ${check.description}`);
    const a=model.audit.themeAlignment;
    if(a){
      lines.push(`THEME_MARKET_DATE_MATCH=${a.matchingCount}/${a.total}`);
      lines.push(`THEME_PROVISIONAL_COUNT=${a.provisionalCount}`);
      for(const item of a.unmatched)lines.push(`THEME_DATE_EXCEPTION=${item.name} | ${item.date} | confirmed=${item.confirmedDate}`);
    }
  }
  for(const [kind,status] of Object.entries(model.stages))lines.push(`STAGE_${kind.toUpperCase()}=${status}`);
  if(model.usUniverse){
    const u=model.usUniverse;
    lines.push(`US_UNIVERSE_STATUS=${u.status}`);
    lines.push(`US_UNIVERSE_SOURCE=${u.source}`);
    lines.push(`US_UNIVERSE_POTENTIAL_LISTINGS=${u.totalRows??'UNAVAILABLE'}`);
    lines.push(`US_UNIVERSE_DISTINCT_TICKERS=${u.distinctTickers??'UNAVAILABLE'}`);
    if(u.reason)lines.push(`US_UNIVERSE_REASON=${u.reason}`);
    for(const [market,count] of Object.entries(u.marketCounts||{}))lines.push(`US_UNIVERSE_${market}_POTENTIAL_LISTINGS=${count}`);
    lines.push(`STAGE6_AUTO_INDUSTRY_COMPANY_SCREENER=${model.businessQuant?.status==='READY'?'INDUSTRY_FINANCIAL_LEADS_UNVERIFIED':u.screeningStatus}`);
    lines.push(`STAGE6_NEW_AUTO_DISCOVERED_COMPANIES=${model.roboticsDiscovery?.status==='READY'?model.roboticsDiscovery.matchingCount:0}`);
    lines.push('STAGE6_PROHIBITED_SOURCE_REQUESTS=0');
    lines.push('STAGE6_FINVIZ_API=PAID_ELITE_NOT_CONNECTED');
    lines.push('STAGE6_TRADINGVIEW_AUTOMATION=PROHIBITED_NOT_USED');
    lines.push(`STAGE6_BUSINESSQUANT_API=${model.businessQuant?.status||'NOT_RUN'}`);
    lines.push(`STAGE6_KR_STATUS=${u.koreaStatus||'DEFERRED_CONFIG_ONLY'}`);
  }
  if(model.businessQuant){
    const bq=model.businessQuant;
    lines.push(`STAGE6_BQ_PRIVATE_STATUS=${bq.status}`);
    lines.push(`STAGE6_BQ_PRIVATE_SCREEN_STATUS=${bq.screeningStatus}`);
    lines.push(`STAGE6_BQ_EXCHANGE_MATCHES=${bq.usExchangeMatched??'UNAVAILABLE'}`);
    lines.push(`STAGE6_BQ_TARGET_INDUSTRIES=${bq.targetIndustries?.length??'UNAVAILABLE'}`);
    lines.push(`STAGE6_BQ_SCREENED_LEADS=${bq.screenedMatchCount??0}`);
    lines.push('STAGE6_BQ_BUSINESS_VERIFICATION=NOT_PERFORMED');
    lines.push('STAGE6_BQ_FINANCIAL_STATEMENT_METRICS=NOT_REQUESTED');
    lines.push('STAGE6_BQ_ROBOTICS_INDUSTRY_LEADS='+(bq.laneCounts?.ROBOTICS_INDUSTRY_CANDIDATE??0));
    lines.push('STAGE6_BQ_INDUSTRIAL_AUTOMATION_REVIEW='+(bq.laneCounts?.INDUSTRIAL_AUTOMATION_REVIEW??0));
    lines.push('STAGE6_BQ_SOFTWARE_AUTOMATION_SEPARATE='+(bq.laneCounts?.SOFTWARE_AUTOMATION_SEPARATE??0));
    lines.push('STAGE6_BQ_OTHER_AUTOMATION_UNCLASSIFIED='+(bq.laneCounts?.OTHER_AUTOMATION_UNCLASSIFIED??0));
    lines.push('STAGE6_BQ_PUBLIC_REDISTRIBUTION=NOT_ALLOWED');
    if(bq.reason)lines.push(`STAGE6_BQ_ERROR=${bq.reason}`);
    for(const c of bq.screenedMatches||[])lines.push(`STAGE6_BQ_PRELIMINARY=${c.market}:${c.ticker} | INDUSTRY=${c.industry} | BUSINESS_VERIFIED=NO`);
  }
  if(model.productEvidence){
    const v=model.productEvidence;
    lines.push('STAGE6_DIRECT_ISSUER_PRODUCT_STATUS='+v.status);
    lines.push('STAGE6_DIRECT_ISSUER_PRODUCT_OBSERVED='+v.matched+'/'+v.requested);
    lines.push('STAGE6_DIRECT_ISSUER_PRODUCT_INDEPENDENTLY_VERIFIED=0');
    lines.push('STAGE6_DIRECT_ISSUER_PRODUCT_REVENUE_VERIFIED=0');
    for(const item of v.items||[])lines.push('STAGE6_DIRECT_ISSUER_PRODUCT='+item.market+':'+item.ticker+
      ' | STATUS='+item.status+' | SEGMENT='+(item.segment||'UNAVAILABLE')+
      ' | SOURCE='+(item.sourceUrl||'NOT_AVAILABLE')+' | DATE='+(item.sourceDate||'NOT_AVAILABLE')+
      ' | REASON='+(item.reason||'NONE'));
  }
  if(model.allowedEarnings){
    const e=model.allowedEarnings;
    lines.push('STAGE7_ALLOWED_EARNINGS_STATUS='+e.status);
    lines.push('STAGE7_ALLOWED_EARNINGS_OBSERVED='+e.matched+'/'+e.requested);
    lines.push('STAGE7_ALLOWED_EARNINGS_SOURCE_POLICY=STANDALONE_ISSUER_RELEASE_ONLY');
    lines.push('STAGE7_ALLOWED_EARNINGS_INDEPENDENTLY_VERIFIED=0');
    lines.push('STAGE7_ALLOWED_EARNINGS_HUMANOID_REVENUE_VERIFIED=0');
    lines.push('STAGE7_ALLOWED_EARNINGS_USED_IN_SCORECARDS=NO');
    if(e.reason)lines.push('STAGE7_ALLOWED_EARNINGS_REASON='+e.reason);
    for(const item of e.items||[])lines.push('STAGE7_ALLOWED_EARNINGS_COMPANY='+item.market+':'+item.ticker+
      ' | STATUS='+item.status+' | COMPANY_REVENUE_USD_MILLION='+
      (item.status==='ISSUER_SELF_REPORTED_EARNINGS_OBSERVED'?item.companyWideRevenue.value.toFixed(1):'NOT_AVAILABLE')+
      ' | PERIOD_END='+(item.periodEnd||'NOT_AVAILABLE')+
      ' | SOURCE='+(item.sourceUrl||'NOT_AVAILABLE')+' | REASON='+(item.reason||'NONE'));
  }
  if(model.liveIssuer?.status==='DISABLED_BY_SOURCE_POLICY'){
    lines.push('STAGE6_ISSUER_VERIFICATION=DISABLED_BY_SOURCE_POLICY');
    lines.push('STAGE7_LIVE_FUNDAMENTALS=NOT_EVALUATED');
  }
  if(model.stage8){
    const s=model.stage8;
    lines.push('STAGE8_STATUS='+s.status);
    lines.push('STAGE8_PDF_INTEGRITY='+s.integrity.status);
    lines.push('STAGE8_ORIGINAL_CALCULATOR_INTEGRITY='+s.integrity.calculatorStatus);
    lines.push('STAGE8_PDF_COVERAGE='+s.integrity.standardsPassed+'/'+s.integrity.standardsExpected);
    lines.push('STAGE8_CATALOG_COUNT='+s.catalog.length);
    lines.push('STAGE8_EXACT_CALCULATORS='+s.exactCount);
    lines.push('STAGE8_PARTIAL_CALCULATORS='+s.partialCount);
    lines.push('STAGE8_COMPANIES='+s.companyCount);
    lines.push('STAGE8_CALCULATED='+s.calculatedScores+'/'+s.possibleScorecards);
    lines.push('STAGE8_AGGREGATE_SCORE=NOT_EVALUATED');
    lines.push('STAGE8_INVESTMENT_RANKING=NOT_PERFORMED');
    lines.push('STAGE8_NO_TRADE=YES');
    for(const standard of s.catalog)lines.push('STAGE8_STANDARD='+standard.id+' | '+standard.implementation+' | EVIDENCE='+standard.evidenceNeeded);
    for(const company of s.candidates)lines.push('STAGE8_COMPANY='+company.ticker+
      ' | CALCULATED='+company.graded+'/15 | STATUS='+company.status+' | AS_OF='+company.asOf+
      ' | DIRECT_ISSUER_CLAIM='+company.issuerProductClaimStatus+
      ' | PRODUCT_SEGMENT='+(company.issuerProductSegment||'UNAVAILABLE'));
    for(const file of s.integrity.files)if(file.status!=='PASS')
      lines.push('STAGE8_PDF_ERROR='+file.id+' | '+file.status+' | '+file.filename);
  }
  if(model.roboticsDiscovery){
    const d=model.roboticsDiscovery;
    lines.push(`STAGE6_ROBOTICS_DISCOVERY_STATUS=${d.status}`);
    lines.push(`STAGE6_ROBOTICS_TOPIC_POOL=${d.candidatePool??'UNAVAILABLE'}`);
    lines.push(`STAGE6_ROBOTICS_WORLD_POOL=${d.worldCandidatePool??'UNAVAILABLE'}`);
    lines.push(`STAGE6_ROBOTICS_US_CATEGORY_POOL=${d.usCategoryPool??'UNAVAILABLE'}`);
    lines.push(`STAGE6_US_LISTED_ROBOTICS_CANDIDATES=${d.matchingCount}`);
    lines.push('STAGE6_HUMANOID_BUSINESS_VERIFICATION=NOT_PERFORMED');
    lines.push('STAGE6_WIKIMEDIA_SOURCE=https://en.wikipedia.org/wiki/List_of_robotics_companies');
    lines.push('STAGE6_WIKIMEDIA_US_CATEGORY=https://en.wikipedia.org/wiki/Category:Robotics_companies_of_the_United_States');
    if(d.usCategoryIssue)lines.push(`STAGE6_WIKIMEDIA_US_CATEGORY_ISSUE=${d.usCategoryIssue}`);
    if(d.reason)lines.push(`STAGE6_ROBOTICS_DISCOVERY_REASON=${d.reason}`);
    for(const c of d.companyCandidates)lines.push(`STAGE6_ROBOTICS_PRELIMINARY_COMPANY=${c.market}:${c.ticker} | MATCHED_NAME=${c.topicalName} | ROBOTICS_EXAMPLE_ONLY=YES | HUMANOID_REVENUE=UNVERIFIED`);
  }
  if(model.themeResearch){
    lines.push(`STAGE4_SOURCE_DISCOVERY=${model.themeResearch.status}`);
    lines.push(`STAGE4_THEMES=${model.themeResearch.items.length}`);
    lines.push(`STAGE4_SOURCE_CHECKED_AT=${model.themeResearch.researchedAt||'NOT_AVAILABLE'}`);
    lines.push(`STAGE4_ORIGINAL_FACTS_CHECKED_AT=${model.themeResearch.factsCheckedAt||'NOT_AVAILABLE'}`);
    lines.push(`STAGE4_ORIGINAL_FACTS_REVIEWED=${model.themeResearch.items.filter(item=>item.researchFact?.status==='DATED_ORIGINAL_VERIFIED').length}`);
    lines.push(`STAGE4_ORIGINAL_FACTS_RECHECK_REQUIRED=${model.themeResearch.items.filter(item=>item.researchFact?.status==='RECHECK_REQUIRED').length}`);
    lines.push(`STAGE4_INDUSTRY_SALES_REVIEWED=${model.themeResearch.items.filter(item=>item.researchFact?.broadRevenue?.status==='INDUSTRY_SALES_VERIFIED_NOT_ETF').length}`);
    lines.push(`STAGE4_VERSION_CONFLICT=${model.themeResearch.items.filter(item=>item.researchFact?.broadRevenue?.status==='VERSION_CONFLICT_REVIEW').length}`);
    lines.push('STAGE4_MONETIZATION_FACTS_VERIFIED=0');
    lines.push('STAGE4_RANKING=NOT_AUTHORIZED');
    lines.push('STAGE4_AUTOMATIC_SOURCE_REFRESH=NO');
    lines.push(`STAGE4_USER_THEME_SELECTION=${model.stage6?.status==='READY'?'COMPLETED_TEST_SELECTION_NO_REPEAT':'HTML_USER_ACTION_REQUIRED'}`);
    lines.push(`STAGE4_SELECTION_RECORD=${model.stage6?.status==='READY'?'M2_STAGE4_SELECTION.json_BUNDLED':'M2_STAGE4_SELECTION.json_ON_USER_DOWNLOAD'}`);
    lines.push('STAGE5_RESEARCH_FROM_EXPLICIT_SELECTION=YES_ONLY_IF_FILE_VALID');
  }
  if(model.stage5){
    const r=model.stage5;
    lines.push(`STAGE5_RESEARCH_STATUS=${r.status}`);
    if(r.status==='READY'){
      lines.push(`STAGE5_SELECTED_THEME=${r.selection.selectedTheme}`);
      lines.push(`STAGE5_SELECTED_SENTIMENT_SCORE=${r.selection.sentiment.score}`);
      lines.push(`STAGE5_SELECTED_SENTIMENT_DATE=${r.selection.sentiment.observationDate}`);
      lines.push(`STAGE5_SELECTED_SENTIMENT_PHASE=${r.selection.sentiment.phase}`);
      lines.push(`STAGE5_SENTIMENT_VS_LIVE=${r.sentimentComparison}`);
      lines.push(`STAGE5_INDUSTRY_SEGMENTS=${r.segments.length}`);
      lines.push(`STAGE5_TECHNOLOGY_TOPICS=${r.technologies.length}`);
      lines.push(`STAGE5_EVIDENCE_CHECKED_AT=${r.evidenceCheckedAt}`);
      lines.push(`STAGE5_EVIDENCE_STATUS=${r.evidenceStatus}`);
      lines.push('STAGE5_ETF_COMPOSITION_AUDIT=NOT_RUN');
      lines.push('STAGE5_ZGMINI_SCORE_FORMULA_AUDIT=NOT_RUN');
      lines.push('STAGE5_INVESTMENT_RANKING=NOT_AUTHORIZED');
      lines.push(`STAGE5_HUMAN_INDUSTRY_SELECTION=${model.stage6?.status==='READY'?'COMPLETED_TEST_SELECTION_NO_REPEAT':'HTML_USER_ACTION_REQUIRED'}`);
      lines.push(`STAGE5_SELECTION_RECORD=${model.stage6?.status==='READY'?'M2_STAGE5_SELECTION.json_BUNDLED':'M2_STAGE5_SELECTION.json_ON_USER_DOWNLOAD'}`);
    }else lines.push(`STAGE5_BLOCK_REASON=${r.reason}`);
  }
  if(model.stage6){
    const r=model.stage6;
    lines.push(`STAGE6_RESEARCH_STATUS=${r.status}`);
    if(r.status==='READY'){
      lines.push(`STAGE6_INDUSTRY=${r.selection.industryName}`);
      lines.push(`STAGE6_SELECTION_MODE=${r.selectionMode}`);
      lines.push(`STAGE6_ARCHIVED_PILOT_COMPANIES=${r.candidates.length}`);
      lines.push(`STAGE6_KR_QUEUED=${r.koreaQueue.length}`);
      lines.push('STAGE6_OTHER_MARKETS_EXCLUDED=YES');
      lines.push(`STAGE6_VERIFIED_HUMANOID_REVENUE=${r.verifiedHumanoidRevenueCount}`);
      lines.push(`STAGE6_UNVERIFIED_HUMANOID_REVENUE=${r.unverifiedHumanoidRevenueCount}`);
      lines.push(`STAGE6_EVIDENCE_CHECKED_AT=${r.evidenceCheckedAt}`);
      lines.push(`STAGE6_EVIDENCE_STATUS=${r.evidenceStatus}`);
      lines.push('STAGE6_NEXT_MANUAL_SELECTION_REQUIRED=NO');
      lines.push('STAGE6_ARCHIVED_PILOT_ISSUER_EVIDENCE_LIVE_REFRESH=NO');
      lines.push('STAGE6_FUTURE_AUTOMATIC_INDUSTRY_SELECTION=NOT_IMPLEMENTED_PENDING_APPROVED_RULES');
      lines.push('STAGE6_INVESTMENT_RANKING=NOT_AUTHORIZED');
      lines.push('STAGE7_NEXT=ALLOWED_INDEPENDENT_FINANCIAL_SOURCES_REQUIRED');
      for(const c of r.candidates)lines.push(`STAGE6_COMPANY=${c.issuerId} | ${c.verification} | HUMANOID_REVENUE_${c.revenue===null?'UNKNOWN':`${c.revenue.humanoidProductsAndServices}_${c.revenue.currency}_MILLION`} | SOURCE=${c.latestSource?.url||'NOT_AVAILABLE'}`);
    }else lines.push(`STAGE6_BLOCK_REASON=${r.reason}`);
  }
  if(model.stage7){
    const r=model.stage7;
    lines.push(`STAGE7_RESEARCH_STATUS=${r.status}`);
    if(['READY','PARTIAL'].includes(r.status)){
      lines.push(`STAGE7_ARCHIVED_PILOT_US_COMPANIES=${r.usCount}`);
      lines.push(`STAGE7_US_OFFICIAL_FINANCIALS=${r.usVerifiedCount}`);
      lines.push(`STAGE7_KR_CONFIGURED_NOT_RESEARCHED=${r.koreanConfigured}`);
      lines.push(`STAGE7_SOURCE_CHECKED_AT=${r.researchCheckedAt}`);
      lines.push(`STAGE7_SOURCE_STATUS=${r.evidenceStatus}`);
      lines.push('STAGE7_ISSUER_FINANCIALS_LIVE_REFRESH=NO');
      lines.push('STAGE7_EQUITY_PRICE_VALUATION=NOT_PERFORMED');
      lines.push('STAGE7_CROSS_CURRENCY_RANKING=NOT_PERFORMED');
      lines.push('STAGE7_INVESTMENT_SCORE=NOT_AUTHORIZED');
      for(const item of r.items){
        const f=item.financial;
        lines.push(`STAGE7_US_COMPANY=${item.issuerId} | ${item.evidenceStatus} | PERIOD=${f?.periods.income||'NOT_AVAILABLE'} | CURRENCY=${f?.reportingCurrency||'NOT_AVAILABLE'} | SOURCE=${f?.filing.url||'NOT_AVAILABLE'}`);
      }
    }else lines.push(`STAGE7_BLOCK_REASON=${r.reason}`);
  }
  return lines.join('\r\n')+'\r\n';
}
