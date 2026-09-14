"use client";

import { useEffect } from "react";

type AnalyticsWindow = Window & {
  wcs_add?: Record<string, string>;
  wcs?: unknown;
  wcs_do?: () => void;
  zgminiNaverAnalyticsStarted?: boolean;
};

export default function NaverAnalytics() {
  useEffect(() => {
    const analytics = window as AnalyticsWindow;
    // The shared layout and React Strict Mode must not load or count twice.
    if (analytics.zgminiNaverAnalyticsStarted) return;
    analytics.zgminiNaverAnalyticsStarted = true;
    analytics.wcs_add = analytics.wcs_add || {};
    analytics.wcs_add.wa = "18bc5d104a33b20";

    const script = document.createElement("script");
    script.src = "https://wcs.pstatic.net/wcslog.js";
    script.async = true;
    script.onload = () => {
      if (analytics.wcs && analytics.wcs_do) analytics.wcs_do();
    };
    document.body.appendChild(script);
  }, []);

  return null;
}
