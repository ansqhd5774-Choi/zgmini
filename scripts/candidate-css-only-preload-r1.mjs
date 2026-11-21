// #1324: Vinext prerender HTML can hint CSS-only virtual .js modules that
// do not exist in the final immutable client assets. Remove only those
// non-executable modulepreload hints; never drop scripts or real JS chunks.
const CSS_ONLY_PRELOAD_JS=/^(?:risk-last3-hero-parity-r2|shared-risk-indicator-width-r1)-[A-Za-z0-9_-]+\.js$/;

export function omitMissingCssOnlyPreloads(html,emittedAssets){
 if(typeof html!=='string'||!(emittedAssets instanceof Set))
  throw Error('CANDIDATE_PRELOAD_INPUT_INVALID');
 const removed=[];
 const safeHtml=html.replace(/<link\b[^>]*>/gi,tag=>{
  const rel=/\brel\s*=\s*(["'])([^"']+)\1/i.exec(tag);
  if(rel?.[2]?.toLowerCase()!=='modulepreload')return tag;
  const href=/\bhref\s*=\s*(["'])([^"']+)\1/i.exec(tag);
  if(!href)return tag;
  let url;try{url=new URL(href[2],'https://zgmini.kr/')}catch{return tag}
  if(url.origin!=='https://zgmini.kr'||!url.pathname.startsWith('/assets/'))
   return tag;
  const name=url.pathname.slice('/assets/'.length);
  if(!CSS_ONLY_PRELOAD_JS.test(name)||emittedAssets.has(name))return tag;
  removed.push(name);
  return '';
 });
 return {html:safeHtml,removed};
}
