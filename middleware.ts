import { NextRequest, NextResponse } from "next/server";

const canonicalHost = "zgmini.kr";
const candidateWorkerPrefix = "zgmini-migration-candidate-r5.";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0].toLowerCase();
  // Local development must render the current worktree, not redirect to Production.
  if (process.env.NODE_ENV === "development" && (host === "localhost" || host === "127.0.0.1")) {
    return NextResponse.next();
  }
  if (host?.startsWith(candidateWorkerPrefix) && host.endsWith(".workers.dev")) {
    return NextResponse.next();
  }
  if (host && host !== canonicalHost) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = canonicalHost;
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
