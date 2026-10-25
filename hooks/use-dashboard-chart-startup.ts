'use client';
import {useEffect, useState} from 'react';
import {afterIntroductionPaint} from '../lib/dashboard-chart-startup.mjs';

export function useDashboardChartStartup(enabled = true) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    return afterIntroductionPaint(window, () => setReady(true));
  }, [enabled]);
  return !enabled || ready;
}
