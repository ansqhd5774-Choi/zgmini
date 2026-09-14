/// <reference types="vite/client" />
import { blsDiagnostic } from "./p0-bls-diagnostic.mjs";
import { productionFredProbe } from "./p0-production-fred-probe.mjs";
/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { dataHealth, corePceResponse } from "./data-health.mjs";
import sitemapXml from "../public/sitemap.xml?raw";
import { phase1KoreaDataCheck } from "./phase1-korea.mjs";
import { phase2KoreaHistoryCheck } from "./phase2-korea-history.mjs";
import { koreaFunds } from "./korea-funds.mjs";
import { phase3KoreaStockPriceCheck } from "./phase3-korea-stock-price.mjs";

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

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/internal/p0-fred-transport-check") return productionFredProbe(request, { importMetaProd: import.meta.env.PROD, nodeEnv: typeof process !== "undefined" ? process.env.NODE_ENV : undefined, workerContext: ctx, workerUserAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined });
    if (url.pathname === "/api/internal/p0-bls-transport-check") return blsDiagnostic(request, env, { importMetaProd: import.meta.env.PROD, nodeEnv: typeof process !== "undefined" ? process.env.NODE_ENV : undefined, workerContext: ctx, workerUserAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined });
    if (url.pathname === "/api/indicators/korea-funds") return koreaFunds(request, env);
    if (url.pathname === "/api/core-pce") return corePceResponse(request, env);
    if (url.pathname === "/api/data-health") return dataHealth(request, env);
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
};

export default worker;


