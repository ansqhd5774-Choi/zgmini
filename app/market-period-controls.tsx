"use client";
import { useRef, type KeyboardEvent } from "react";
import { marketPeriods, type MarketPeriod } from './market-card-shared';

export function MarketPeriodControls({
  activeKey,
  onChange,
  ariaLabel,
}: {
  activeKey: MarketPeriod;
  onChange: (key: MarketPeriod) => void;
  ariaLabel: string;
}) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activate = (index: number) => {
    const item = marketPeriods[index];
    if (!item) return;
    onChange(item.key);
    buttonRefs.current[index]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % marketPeriods.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + marketPeriods.length) % marketPeriods.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = marketPeriods.length - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    activate(nextIndex);
  };

  return <div role="group" aria-label={ariaLabel} className="cnn-period-toolbar">
    {marketPeriods.map((item, index) => <button
      className="cnn-period-button"
      key={item.key}
      type="button"
      ref={(node) => {
        buttonRefs.current[index] = node;
      }}
      aria-label={`${item.label} 보기`}
      aria-pressed={activeKey === item.key}
      onClick={() => onChange(item.key)}
      onKeyDown={(event) => handleKeyDown(event, index)}
    >
      {item.label}
    </button>)}
  </div>;
}
