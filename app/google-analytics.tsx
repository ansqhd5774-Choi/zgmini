"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {afterFirstLoadIdle} from '../lib/noncritical-startup.mjs';

const MEASUREMENT_ID = "G-KE3CHLGQPL";
type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  zgminiGoogleAnalyticsStarted?: boolean;
  zgminiGoogleAnalyticsScriptStarted?: boolean;
  zgminiGoogleAnalyticsPath?: string;
};

export default function GoogleAnalytics() {
  const pathname = usePathname();
  useEffect(() => {
    // Development and preview visits must not enter the production property.
    if (!["zgmini.kr", "www.zgmini.kr"].includes(window.location.hostname)) return;
    const analytics = window as AnalyticsWindow;
    if (!analytics.zgminiGoogleAnalyticsStarted) {
      analytics.zgminiGoogleAnalyticsStarted = true;
      analytics.dataLayer = analytics.dataLayer || [];
      analytics.gtag = function () { analytics.dataLayer!.push(arguments); };
      analytics.gtag("js", new Date());
      analytics.gtag("config", MEASUREMENT_ID, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
    }
    const stop=afterFirstLoadIdle(window,()=>{
      if(analytics.zgminiGoogleAnalyticsScriptStarted)return;
      analytics.zgminiGoogleAnalyticsScriptStarted=true;
      const script=document.createElement("script");
      script.async=true;script.fetchPriority="low";
      script.src=`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
      document.head.appendChild(script);
    });
    // One page view per route change, including client navigation, not hash changes.
    if (!pathname || analytics.zgminiGoogleAnalyticsPath === pathname) return stop;
    analytics.zgminiGoogleAnalyticsPath = pathname;
    analytics.gtag!("event", "page_view", {
      page_title: document.title,
      page_location: `${window.location.origin}${pathname}`,
      page_referrer: document.referrer ? document.referrer.split(/[?#]/)[0] : "",
    });
    return stop;
  }, [pathname]);
  return null;
}
