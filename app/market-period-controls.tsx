"use client";
import { useRef, type KeyboardEvent } from "react";
import { marketPeriods, type MarketPeriod } from './market-card-shared';

export function MarketPeriodControls<T extends MarketPeriod | "1D">({
  activeKey,
  onChange,
  ariaLabel,
  includeOneDay = false,
}: {
  activeKey: T;
  onChange: (key: T) => void;
  ariaLabel: string;
  includeOneDay?: boolean;
}) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // The Korea card continues to receive the original five options unchanged.
  const periods = includeOneDay ? [{ key: "1D" as const, label: "1일", days: 1 }, ...marketPeriods] : marketPeriods;

  const activate = (index: number) => {
    const item = periods[index];
    if (!item) return;
    onChange(item.key as T);
    buttonRefs.current[index]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % periods.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + periods.length) % periods.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = periods.length - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    activate(nextIndex);
  };

  return <div role="group" aria-label={ariaLabel} className="cnn-period-toolbar" data-usa-one-day={includeOneDay ? "true" : undefined}>
    {periods.map((item, index) => <button
      className="cnn-period-button"
      key={item.key}
      data-period-short={item.key}
      type="button"
      ref={(node) => {
        buttonRefs.current[index] = node;
      }}
      aria-label={`${item.label} 보기`}
      aria-pressed={activeKey === item.key}
      onClick={() => onChange(item.key as T)}
      onKeyDown={(event) => handleKeyDown(event, index)}
    >
      {item.label}
    </button>)}
  </div>;
}
