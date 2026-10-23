import { NextRequest, NextResponse } from "next/server";

const canonicalHost = "zgmini.kr";
const candidateWorkerPrefix = "zgmini-migration-candidate-r5.";

function cloudflareVisitorScheme(value: string | null) {
  if (!value) return undefined;
  try {
    const scheme = JSON.parse(value)?.scheme;
    return scheme === "http" || scheme === "https" ? scheme : undefined;
  } catch {
    return undefined;
  }
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0].toLowerCase();
  const cfVisitorProto = cloudflareVisitorScheme(request.headers.get("cf-visitor"));
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const protocol = cfVisitorProto || forwardedProto || request.nextUrl.protocol.replace(":", "").toLowerCase();
  // Local development must render the current worktree, not redirect to Production.
  if (process.env.NODE_ENV === "development" && (host === "localhost" || host === "127.0.0.1" || host === "terminal.local")) {
    return NextResponse.next();
  }
  if (host?.startsWith(candidateWorkerPrefix) && host.endsWith(".workers.dev")) {
    return NextResponse.next();
  }
  if ((host && host !== canonicalHost) || protocol !== "https") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = canonicalHost;
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
