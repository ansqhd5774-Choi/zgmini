import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Miniflare } from "miniflare";
import {writeFile,unlink} from 'node:fs/promises';

test("renders ZGmini metadata in the Workers runtime", async () => {
  // Execute the unchanged build in workerd, including native cloudflare modules.
  // Reuse the Miniflare harness already used by fetch regression tests.
  let outboundCalls = 0;
  // Miniflare rewrites the incoming Host. Restore the production host inside
  // the test worker so canonical redirects cannot silently test the live site.
  const entry=new URL('../dist/server/html-test-entry.js',import.meta.url);
  await writeFile(entry,`import worker from './index.js'; export default {fetch(req,env,ctx){const headers=new Headers(req.headers);headers.set('host','zgmini.kr');return worker.fetch(new Request(req,{headers}),env,ctx);}};`);
  const mf = new Miniflare({
    modules: true,
    scriptPath: fileURLToPath(entry),
    modulesRules: [{ type: "ESModule", include: ["**/*.js"] }],
    // Match the installed workerd harness used by fetch regression tests.
    compatibilityDate: "2026-05-15",
    compatibilityFlags: ["nodejs_compat"],
    cf: false,
    outboundService: () => {
      outboundCalls++;
      throw new Error("External requests are forbidden in the HTML test");
    },
    serviceBindings: {
      ASSETS: () => new Response("Not found", { status: 404 }),
    },
  });
  try {
    const response = await mf.dispatchFetch("http://localhost/", {
      headers: { accept: "text/html", host: "zgmini.kr" },
      redirect: "manual",
    });

    assert.equal(response.status, 200);
    assert.match(
      response.headers.get("content-type") ?? "",
      /^text\/html\b/i,
    );
    const html = await response.text();
    assert.ok(html.includes('data-testid="korea-funds"'));
    const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? "";
    assert.ok(head.includes("<title>ZGmini | 공포탐욕지수·글로벌 증시·경제지표 한눈에</title>"));
    assert.equal((head.match(/rel="canonical"/g) ?? []).length, 1);
    assert.ok(/<link(?=[^>]*rel="canonical")(?=[^>]*href="https:\/\/zgmini\.kr\/")[^>]*>/i.test(head));
    assert.ok(/<meta(?=[^>]*name="robots")(?=[^>]*content="index, follow")[^>]*>/i.test(head));
    assert.equal(outboundCalls, 0);
  } finally {
    await mf.dispose();
    await unlink(entry);
  }
});
