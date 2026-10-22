'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import styles from './usage-guide.module.css';

const steps = [
  {
    title: '시장 흐름',
    navDescription: '지금 시장이 어느 방향으로 움직이고 있는지 살펴봅니다.',
    heading: '시장 분위기부터 확인하기',
    description: '홈 화면에서 미국·한국 시장의 공포·탐욕과 주요 경제지표를 함께 살펴보세요. 하나의 숫자보다는 지표 간 방향이 같은지 먼저 확인하는 것이 좋습니다.',
  },
  {
    title: '종합 점수',
    navDescription: '시장과 경제 신호를 종합한 점수를 이해합니다.',
    heading: '종합 점수 이해하기',
    description: '점수는 시장과 경제 신호를 압축해 보여주는 참고 정보입니다. 현재 수치뿐 아니라 변화 방향과 구성 지표를 함께 확인하세요.',
  },
  {
    title: '구성 지표',
    navDescription: '점수를 구성하는 주요 지표를 확인합니다.',
    heading: '점수를 만든 근거 확인하기',
    description: '상세 페이지에는 점수를 만드는 구성 지표와 해석 기준이 있습니다. 물가·고용·금리·유동성처럼 서로 다른 신호를 함께 읽어보세요.',
  },
  {
    title: '기간 비교',
    navDescription: '다양한 기간에 따른 점수 변화를 비교합니다.',
    heading: '짧은 변화와 긴 추세 비교하기',
    description: '1주·1개월·3개월·6개월·1년 변화를 비교하면 최근 움직임과 장기 추세를 구분하기 쉽습니다. 자료 주기가 긴 지표는 짧은 기간에 변화가 없을 수 있습니다.',
  },
  {
    title: '주의사항',
    navDescription: '이용 전 꼭 확인해야 할 사항을 안내합니다.',
    heading: '점수는 참고 정보입니다',
    description: '점수가 높거나 낮다고 주가 방향이나 투자 성과가 보장되지는 않습니다. 지표마다 점수의 의미가 다르므로 각 상세 페이지의 설명과 관측일을 확인하세요.',
  },
] as const;

// The values below are an illustration only. They are not linked to the live indicator feeds.
const sampleValues = [54, 56, 55, 57, 51, 49, 44, 41, 38, 32, 29, 31, 35, 40, 46, 50, 52, 55, 57, 61, 59, 63, 56, 51, 49, 47, 50, 53, 56, 58, 61.2];
const sampleSeries = sampleValues.map((score, index) => ({
  date: index + 1,
  score,
  falling: index >= 5 && index <= 12 ? score : index >= 22 && index <= 26 ? score : null,
}));

const componentExamples = [
  ['물가', '물가 상승 압력과 안정 여부'],
  ['고용', '일자리와 노동시장 흐름'],
  ['금리', '통화정책과 금융 여건'],
  ['유동성', '시장에 공급되는 자금 여건'],
] as const;

export default function UsageGuide() {
  const [activeIndex, setActiveIndex] = useState(1);
  const activeStep = steps[activeIndex];

  return (
    <section id="usage" className={styles.guide} aria-labelledby="usage-title">
      <header className={styles.intro}>
        <span className={styles.breadcrumb}>ABOUT ZGMINI / USAGE GUIDE</span>
        <h2 id="usage-title">ZGMINI 이용안내</h2>
        <p>숫자보다 흐름을 먼저 읽어보세요.</p>
      </header>

      <div className={styles.layout}>
        <nav className={styles.stepNav} aria-label="이용안내 단계">
          {steps.map((step, index) => (
            <button
              className={`${styles.step} ${index === activeIndex ? styles.activeStep : ''}`}
              key={step.title}
              type="button"
              aria-current={index === activeIndex ? 'step' : undefined}
              aria-controls="usage-step-content"
              onClick={() => setActiveIndex(index)}
            >
              <span className={styles.stepNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <span className={styles.stepText}>
                <strong>{step.title}</strong>
                <span>{step.navDescription}</span>
              </span>
            </button>
          ))}
        </nav>

        <div id="usage-step-content" className={styles.content} role="region" aria-live="polite" aria-label={`${activeStep.title} 안내`}>
          <span className={styles.stepEyebrow}>STEP {String(activeIndex + 1).padStart(2, '0')}</span>
          <h3>{activeStep.heading}</h3>
          <p className={styles.description}>{activeStep.description}</p>

          {(activeIndex === 0 || activeIndex === 1 || activeIndex === 3) && (
            <div className={styles.visual}>
              <div className={styles.sampleHeader}>
                <div>
                  <span className={styles.sampleLabel}>설명용 점수 예시</span>
                  <strong>61.2</strong>
                </div>
                <span className={styles.sampleDisclaimer}>가상 데이터 · 실제 지표 아님</span>
              </div>
              <div className={styles.chart} role="img" aria-label="점수가 하락한 뒤 반등하는 설명용 가상 추이 차트">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={sampleSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#354249" strokeDasharray="2 5" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis orientation="right" domain={[20, 80]} ticks={[20, 40, 60, 80]} axisLine={false} tickLine={false} tick={{ fill: '#829199', fontSize: 11 }} width={30} />
                    <Tooltip content={() => null} cursor={false} />
                    <Area type="monotone" dataKey="score" fill="#1d806a" fillOpacity={0.12} stroke="none" isAnimationActive={false} />
                    <Line type="monotone" dataKey="score" stroke="#65ddbb" strokeWidth={2.2} dot={false} activeDot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="falling" stroke="#ec7876" strokeWidth={2.2} dot={false} activeDot={false} connectNulls={false} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className={styles.exampleMetrics} aria-label="예시 차트 읽는 방법">
                <div><span>현재 점수</span><strong>수준 확인</strong></div>
                <div><span>기간별 변화</span><strong>방향 비교</strong></div>
                <div><span>과거 추이</span><strong>흐름 확인</strong></div>
              </div>
            </div>
          )}

          {activeIndex === 2 && (
            <div className={styles.componentList} aria-label="구성 지표 예시">
              {componentExamples.map(([name, detail]) => (
                <div key={name}><strong>{name}</strong><span>{detail}</span></div>
              ))}
              <p>실제 구성과 산식은 지표별 상세 페이지를 기준으로 합니다.</p>
            </div>
          )}

          {activeIndex === 4 && (
            <div className={styles.noticeList}>
              <p><strong>01</strong> 점수의 높낮이만으로 매수·매도 시점을 판단하지 마세요.</p>
              <p><strong>02</strong> 발표일과 관측일, 잠정치 여부를 구분해 확인하세요.</p>
              <p><strong>03</strong> 결측이나 수집 지연은 새로운 관측값으로 해석하지 마세요.</p>
            </div>
          )}

          <div className={styles.controls}>
            <button type="button" onClick={() => setActiveIndex((index) => Math.max(index - 1, 0))} disabled={activeIndex === 0}>
              <ArrowLeft size={18} strokeWidth={1.8} aria-hidden="true" /> 이전
            </button>
            <button type="button" onClick={() => setActiveIndex((index) => Math.min(index + 1, steps.length - 1))} disabled={activeIndex === steps.length - 1}>
              다음 단계 <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
