import { useEffect, useMemo, useRef, useState } from 'react';
import { Gauge } from 'lucide-react';
import {fearGreedStateColor} from '../lib/fear-greed-state-color.mjs';
import {clampedAnimationProgress} from '../lib/animation-progress.mjs';
import {useScoreArrows} from '../components/score-arrow-provider';

type ScoreVariant = 'compact' | 'hero';

const GAUGE_CENTER_X = 110;
const GAUGE_CENTER_Y = 112;

function numericScore(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : null;
}

function gaugePoint(score: number, radius: number) {
  const angle = Math.PI - (score / 100) * Math.PI;
  return {
    x: GAUGE_CENTER_X + Math.cos(angle) * radius,
    y: GAUGE_CENTER_Y - Math.sin(angle) * radius,
  };
}

function gaugeArcPath(start: number, end: number, radius = 84) {
  const from = gaugePoint(start, radius);
  const to = gaugePoint(end, radius);
  return `M ${from.x} ${from.y} A ${radius} ${radius} 0 0 1 ${to.x} ${to.y}`;
}

const CNN_GAUGE_BANDS = [
  { key: 'extreme-fear', start: 0, end: 25, color: '#9f2233' },
  { key: 'fear', start: 25, end: 45, color: '#f2555a' },
  { key: 'neutral', start: 45, end: 55, color: '#9aa8b6' },
  { key: 'greed', start: 55, end: 75, color: '#58c88a' },
  { key: 'extreme-greed', start: 75, end: 100, color: '#15865e' },
] as const;


function formatDelta(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const rounded = Math.abs(value) < 0.05 ? 0 : value;
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}`;
}

function deltaDirection(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) < 0.05) return 'flat';
  return value > 0 ? 'up' : 'down';
}


function useAnimatedNumber(
  targetValue: number | null | undefined,
  {
    enabled = true,
    duration = 650,
    startFromZero = false,
  }: {
    enabled?: boolean;
    duration?: number;
    startFromZero?: boolean;
  } = {},
) {
  const target = typeof targetValue === 'number' && Number.isFinite(targetValue) ? targetValue : null;
  const [display, setDisplay] = useState<number | null>(null);
  const displayRef = useRef<number | null>(null);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (!enabled || target === null) {
      displayRef.current = target;
      setDisplay(target);
      return;
    }

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduceMotion) {
      displayRef.current = target;
      setDisplay(target);
      hasAnimatedRef.current = true;
      return;
    }

    const firstAnimation = !hasAnimatedRef.current;
    const start =
      firstAnimation && startFromZero
        ? 0
        : displayRef.current ?? target;

    hasAnimatedRef.current = true;

    if (Math.abs(target - start) < 0.0001) {
      displayRef.current = target;
      setDisplay(target);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const progress = clampedAnimationProgress(now,startedAt,duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = start + (target - start) * eased;

      displayRef.current = next;
      setDisplay(next);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        displayRef.current = target;
        setDisplay(target);
      }
    };

    displayRef.current = start;
    setDisplay(start);
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [duration, enabled, startFromZero, target]);

  // Important for async-loaded data:
  // on the first render where a verified target appears, render 0 immediately
  // instead of briefly flashing the final value before the effect starts.
  if (enabled && target !== null && display === null && startFromZero && !hasAnimatedRef.current) {
    return 0;
  }

  return display ?? target;
}


export function MarketScoreOrb({
  score,
  state,
  caption,
  variant = 'compact',
  dayDelta,
  periodDelta,
  periodLabel,
  metaDate,
  dayLabel = '전일 대비',
  comparisonAriaLabel = 'CNN 공포탐욕 변화량',
  arrowId,
}: {
  score: string;
  state: string;
  caption?: string;
  variant?: ScoreVariant;
  dayDelta?: number | null;
  periodDelta?: number | null;
  periodLabel?: string;
  metaDate?: string;
  dayLabel?: string;
  comparisonAriaLabel?: string;
  arrowId?: string;
}) {
  const arrows=useScoreArrows(),showArrows=arrowId?arrows(arrowId,numericScore(score)):false;
  const tone = state.includes('공포') ? 'is-fear' : state.includes('탐욕') ? 'is-greed' : '';
  const ariaLabel = [caption, `${score}점`, state].filter(Boolean).join(' ');
  const targetScore = useMemo(() => numericScore(score), [score]);
  const animatedScore = useAnimatedNumber(targetScore, {
    enabled: variant === 'hero',
    duration: 950,
    startFromZero: true,
  });
  const animatedDayDelta = useAnimatedNumber(dayDelta, {
    enabled: variant === 'hero',
    duration: 650,
    startFromZero: true,
  });
  const animatedPeriodDelta = useAnimatedNumber(periodDelta, {
    enabled: variant === 'hero',
    duration: 520,
    startFromZero: true,
  });

  const displayScore = animatedScore === null ? score : animatedScore.toFixed(1);
  const [wholeScore, decimalScore = ''] = displayScore.includes('.') ? displayScore.split('.', 2) : [displayScore, ''];

  if (variant === 'hero') {
    const value = animatedScore;
    const marker = value === null ? null : gaugePoint(value, 84);

    const ticks = [0, 25, 45, 50, 55, 75, 100].map((tick) => ({
      tick,
      inner: gaugePoint(tick, tick === 50 ? 70 : 72),
      outer: gaugePoint(tick, 96),
      label: gaugePoint(tick, 58),
    }));

    return (
      <div className={`cnn-score-orb cnn-score-orb-hero ${tone}`} role="group" aria-live="polite" aria-label={ariaLabel}>
        <div className="cnn-spectrum-gauge">
          <div className="cnn-linear-gauge" aria-hidden="true">
            {CNN_GAUGE_BANDS.map((band) => <div key={band.key} className="cnn-linear-band" style={{width:`${band.end-band.start}%`,background:band.color}}/>)}
            {value !== null ? <div className="cnn-linear-marker" style={{left:`${Math.max(0,Math.min(100,value))}%`}}/> : null}
          </div>
          <svg viewBox="0 0 220 142" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <defs>
              <linearGradient id="cnn-spectrum-gradient" x1="26" y1="0" x2="194" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#9f2233"/>
                <stop offset="25%" stopColor="#9f2233"/>
                <stop offset="25%" stopColor="#f2555a"/>
                <stop offset="45%" stopColor="#f2555a"/>
                <stop offset="45%" stopColor="#9aa8b6"/>
                <stop offset="55%" stopColor="#9aa8b6"/>
                <stop offset="55%" stopColor="#58c88a"/>
                <stop offset="75%" stopColor="#58c88a"/>
                <stop offset="75%" stopColor="#15865e"/>
                <stop offset="100%" stopColor="#15865e"/>
              </linearGradient>
            </defs>

            <path className="cnn-spectrum-backdrop" d="M 26 112 A 84 84 0 0 1 194 112"/>
            {CNN_GAUGE_BANDS.map((band) => (
              <path
                key={band.key}
                className={`cnn-spectrum-band is-${band.key}`}
                d={gaugeArcPath(band.start, band.end)}
                fill="none"
                stroke={band.color}
                strokeWidth={18}
                strokeLinecap="butt"
              />
            ))}
            <path className="cnn-spectrum-inner-guide" d="M 45 112 A 65 65 0 0 1 175 112"/>

            {ticks.map(({tick, inner, outer, label}) => (
              <g key={tick}>
                <line
                  className={`cnn-spectrum-tick ${tick === 0 || tick === 50 || tick === 100 ? 'is-major' : ''}`}
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                />
                {(tick === 0 || tick === 50 || tick === 100) ? (
                  <text
                    className={`cnn-spectrum-scale-label ${tick === 50 ? 'is-center' : ''}`}
                    x={tick === 0 ? 18 : tick === 100 ? 202 : label.x}
                    y={tick === 0 || tick === 100 ? 126 : label.y + 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {tick}
                  </text>
                ) : null}
              </g>
            ))}

            {marker ? (
              <circle
                className="cnn-dot-marker"
                cx={marker.x}
                cy={marker.y}
                r="5.2"
              />
            ) : null}
          </svg>

          <div className="cnn-spectrum-center">
            <strong className="cnn-score-value" style={{color:fearGreedStateColor(state)}}>
              <span className="cnn-score-whole">{wholeScore}</span>
              {decimalScore ? <span className="cnn-score-fraction">.{decimalScore}</span> : null}
            </strong>
            <span style={{color:fearGreedStateColor(state)}}>{state}</span>
            {caption ? <small>{caption}</small> : null}
          </div>
        </div>

        <div className="cnn-score-comparisons" aria-label={comparisonAriaLabel}>
          <div className={`cnn-score-comparison is-${deltaDirection(animatedDayDelta)}`}>
            <span aria-label={dayLabel}>{dayLabel.replace(/ 대비$/, "")}</span>
            <strong>
              {formatDelta(animatedDayDelta)}
              {showArrows&&(deltaDirection(animatedDayDelta) === 'up' ? <i aria-hidden="true">▲</i> : deltaDirection(animatedDayDelta) === 'down' ? <i aria-hidden="true">▼</i> : null)}
            </strong>
          </div>
          <div className="cnn-score-comparison-divider" aria-hidden="true"/>
          <div className={`cnn-score-comparison is-${deltaDirection(animatedPeriodDelta)}`}>
            <span aria-label={periodLabel ?? '기간 대비'}>{(periodLabel ?? '기간 대비').replace(/ 대비$/, '')}</span>
            <strong>
              {formatDelta(animatedPeriodDelta)}
              {showArrows&&(deltaDirection(animatedPeriodDelta) === 'up' ? <i aria-hidden="true">▲</i> : deltaDirection(animatedPeriodDelta) === 'down' ? <i aria-hidden="true">▼</i> : null)}
            </strong>
          </div>
        </div>
        {metaDate ? <div className="cnn-score-observed-date">{metaDate}</div> : null}
      </div>
    );
  }

  return (
    <div className={`cnn-score-orb ${tone}`} role="group" aria-live="polite" aria-label={ariaLabel}>
      <Gauge size={22} aria-hidden="true"/>
      <strong style={{color:fearGreedStateColor(state)}}>{score}</strong>
      <span style={{color:fearGreedStateColor(state)}}>{state}</span>
      {caption ? <small>{caption}</small> : null}
    </div>
  );
}
