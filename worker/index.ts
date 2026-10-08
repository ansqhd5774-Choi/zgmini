import {runPublicFeeds} from "./public-feed-collectors";
import {readPublicFeed,readPublicFeedHealth} from "./public-feed-store.mjs";
import {storedRateSentimentResponse} from "./rate-sentiment-public.mjs";
/// <reference types="vite/client" />
import { fredApiShadow } from "./p0-fred-api-shadow.mjs";
import { fredBlsShadow } from "./p0-fred-bls-shadow.mjs";
import { blsDiagnostic } from "./p0-bls-diagnostic.mjs";
import { productionFredProbe } from "./p0-production-fred-probe.mjs";
/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import sitemapXml from "../public/sitemap.xml?raw";
import { phase1KoreaDataCheck } from "./phase1-korea.mjs";
import { phase2KoreaHistoryCheck } from "./phase2-korea-history.mjs";
import { koreaFunds } from "./korea-funds.mjs";
import { phase3KoreaStockPriceCheck } from "./phase3-korea-stock-price.mjs";
import { runConsumptionR3OperationalRefresh } from "./consumption-r3-operational-refresh.mjs";
import { refreshKoreaRev7 } from "./korea-rev7-refresh.mjs";
import { koreaRev7ExternalScheduler } from "./korea-rev7-external-scheduler.mjs";
import { env as runtimeEnv } from "cloudflare:workers";
import { runMarketOperationalRefresh, refreshStoredMarketScoreSnapshot } from "./market-operational-refresh.mjs";
import { runEmploymentR6Producer } from "./employment-r6-producer.mjs";
import { ensureGrowthR2ChartHistoryR1 } from "../lib/market-score/growth-r2-worker-domain-r1.mjs";
import { inspectEmploymentR6AuthProbe } from "./employment-r6-auth-probe.mjs";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ScheduledController {
  cron: string;
  scheduledTime: number;
  type: "scheduled";
  noRetry(): void;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

export async function runMarketExternalRefresh(args:any){
  const startedAt=Date.now();
  const feedStartedAt=Date.now();
  const feeds=await runPublicFeeds({...args,maxFeedsPerRun:1}).catch(()=>({status:'ERROR',attempted:0,feeds:[]}));
  const feedMs=Date.now()-feedStartedAt;
  const attempted=feeds?.attempted??0;
  const feedStatus=feeds?.status??'ERROR';
  console.log('PUBLIC_FEEDS',JSON.stringify({...feeds,elapsedMs:feedMs}));
  if(attempted>0){
    console.log('MARKET_EXTERNAL_STAGE',JSON.stringify({
      stage:'public-feed',
      status:feedStatus,
      attempted,
      elapsedMs:feedMs,
    }));
    return {
      status:feedStatus==='PARTIAL'?'SOURCE_FAILED':'BACKLOG',
      job:'public-feed',
      sourceStatus:feedStatus,
      readyDomains:null,
      precomputeStatus:'SKIPPED_EXTERNAL_PHASED',
      publicFeedStatus:feedStatus,
      stageDurationsMs:{precompute:0,market:0,publicFeeds:feedMs,total:Date.now()-startedAt},
    };
  }

  const marketStartedAt=Date.now();
  const result=await runMarketOperationalRefresh(args).catch(()=>({status:'ERROR'}));
  const marketMs=Date.now()-marketStartedAt;
  console.log('MARKET_EXTERNAL_STAGE',JSON.stringify({
    stage:'market',
    status:result?.status??null,
    job:result?.job??null,
    elapsedMs:marketMs,
  }));
  return {
    ...result,
    precomputeStatus:'SKIPPED_EXTERNAL_PHASED',
    stageDurationsMs:{precompute:0,market:marketMs,publicFeeds:feedMs,total:Date.now()-startedAt},
    publicFeedStatus:feedStatus,
  };
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.replace(/\/$/, '') === '/api/internal/korea-rev7-scheduled') return koreaRev7ExternalScheduler(request, runtimeEnv, {ctx});
    if (url.pathname.replace(/\/$/, '') === '/api/internal/market-scheduled') return koreaRev7ExternalScheduler(request, runtimeEnv, {ctx,refresh:runMarketExternalRefresh,responseBudgetMs:5000,logTag:'MARKET_EXTERNAL'});
    if (url.pathname.replace(/\/$/, '') === '/api/internal/employment-r6-scheduled') return koreaRev7ExternalScheduler(request, runtimeEnv, {ctx,refresh:runEmploymentR6Producer,responseBudgetMs:5000,logTag:'EMP_R6_EXTERNAL'});
    if (url.pathname.replace(/\/$/, '') === '/api/internal/employment-r6-auth-probe') return Response.json(inspectEmploymentR6AuthProbe(request), {status:200,headers:{"cache-control":"no-store, no-cache, must-revalidate","pragma":"no-cache","x-robots-tag":"noindex, nofollow"}});
    if (url.pathname === "/api/internal/p0-fred-api-shadow-check") return fredApiShadow(request, env, { importMetaProd: import.meta.env.PROD, nodeEnv: typeof process !== "undefined" ? process.env.NODE_ENV : undefined, workerContext: ctx, workerUserAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined });
    if (url.pathname === "/api/internal/p0-fred-bls-shadow-check") return fredBlsShadow(request, { importMetaProd: import.meta.env.PROD, nodeEnv: typeof process !== "undefined" ? process.env.NODE_ENV : undefined, workerContext: ctx, workerUserAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined });
    if (url.pathname === "/api/internal/p0-fred-transport-check") return productionFredProbe(request, { importMetaProd: import.meta.env.PROD, nodeEnv: typeof process !== "undefined" ? process.env.NODE_ENV : undefined, workerContext: ctx, workerUserAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined });
    if (url.pathname === "/api/internal/p0-bls-transport-check") return blsDiagnostic(request, env, { importMetaProd: import.meta.env.PROD, nodeEnv: typeof process !== "undefined" ? process.env.NODE_ENV : undefined, workerContext: ctx, workerUserAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined });
    if (url.pathname === "/api/indicators/korea-funds") return koreaFunds(request, env);
    if (url.pathname === "/api/core-pce") return readPublicFeed(runtimeEnv.DB, "core-pce");
    if (url.pathname === "/api/rate-sentiment") return storedRateSentimentResponse(request,{db:runtimeEnv.DB});
    if (url.pathname === "/api/data-health") return readPublicFeedHealth(runtimeEnv.DB);
    if (url.pathname === "/api/internal/phase1-korea-data-check") return phase1KoreaDataCheck(request, env);
    if (url.pathname === "/api/internal/phase2-korea-history-check") return phase2KoreaHistoryCheck(request, env);
    if (url.pathname === "/api/internal/phase3-korea-stock-price-check") return phase3KoreaStockPriceCheck(request, env);
    // Serve the static sitemap without rendering pages or calling APIs.
    if (url.pathname === "/sitemap.xml" && (request.method === "GET" || request.method === "HEAD")) {
      return new Response(request.method === "HEAD" ? null : sitemapXml, {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },

  async scheduled(controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    if(controller.cron==='*/5 * * * *'){
      const growthChart = await ensureGrowthR2ChartHistoryR1({
        env,
        asOf: new Date(controller.scheduledTime).toISOString().slice(0,10),
        fetchImpl: globalThis.fetch,
        now: () => new Date(controller.scheduledTime),
      }).catch(error=>({status:'ERROR',rowsWritten:0,recordCount:0,error:String(error?.message??error)}));
      console.log("GROWTH_R2_CHART_HISTORY", JSON.stringify({
        cron: controller.cron,
        status: growthChart?.status ?? null,
        rowsWritten: growthChart?.rowsWritten ?? 0,
        recordCount: growthChart?.recordCount ?? 0,
      }));
      const precompute = await refreshStoredMarketScoreSnapshot({
        env,
        now: controller.scheduledTime,
      });
      console.log("MARKET_SCORE_PRECOMPUTE_CRON", JSON.stringify({
        cron: controller.cron,
        status: precompute?.status ?? null,
        providerRequests: precompute?.providerRequests ?? 0,
        readyDomains: precompute?.readyDomains ?? null,
        reason: precompute?.reason ?? null,
      }));
      const result = await runMarketOperationalRefresh({
        env,
        now: controller.scheduledTime,
        fetchImpl: globalThis.fetch,
      });
      console.log("MARKET_OP_R1_CRON", JSON.stringify({
        cron: controller.cron,
        status: result?.status ?? null,
        job: result?.job ?? null,
        sourceStatus: result?.sourceStatus ?? null,
        readyDomains: result?.readyDomains ?? null,
      }));
      return;
    }
    if(controller.cron==='37 * * * *'){
      console.log('KOREA_REV7_REFRESH',JSON.stringify(await refreshKoreaRev7({env,now:new Date(controller.scheduledTime)})));
      return;
    }
    const asOf = new Date(controller.scheduledTime).toISOString().slice(0, 10);
    const result = await runConsumptionR3OperationalRefresh({
      env,
      asOf,
      fetchImpl: globalThis.fetch,
    });
    console.log("C1_OP_R2_CRON", JSON.stringify({
      cron: controller.cron,
      asOf,
      status: result?.status ?? null,
      providerRequests: result?.providerRequests ?? 0,
      remainingSources: result?.remainingSources ?? null,
      calculated: result?.calculated ?? false,
    }));
  },
};

export default worker;


