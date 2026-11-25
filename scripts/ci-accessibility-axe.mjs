// R2 Accessibility CI: one local axe-core check, reusing existing Playwright.
// Only rule IDs, impacts and counts are retained; no DOM text or personal data.
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const ORIGIN='http://127.0.0.1:5173';
export const ACCESSIBILITY_SCOPE='LOCAL_DEV_ABOUT_WCAG_A_AA';
export const VIEWPORTS=Object.freeze([
 {name:'mobile-390',width:390,height:844},
 {name:'desktop-1440',width:1440,height:900}
]);
export const AXE_TAGS=Object.freeze(['wcag2a','wcag2aa','wcag21a','wcag21aa']);
const IMPACTS=new Set(['critical','serious','moderate','minor',null]);
const ID=/^[a-z][a-z0-9-]{0,90}$/;

function summarizeRules(rules){
 if(!Array.isArray(rules))throw Error('CI_AXE_RULES_UNVERIFIED');
 const entries=[];
 const seen=new Set();
 for(const rule of rules){
  if(!rule||typeof rule.id!=='string'||!ID.test(rule.id)||
     seen.has(rule.id)||!IMPACTS.has(rule.impact)||
     !Array.isArray(rule.nodes)||rule.nodes.length<1||
     rule.nodes.length>10000)
   throw Error('CI_AXE_RULE_INVALID');
  seen.add(rule.id);
  entries.push({ruleId:rule.id,impact:rule.impact??'unknown',
   affectedNodes:rule.nodes.length});
 }
 return entries.sort((a,b)=>a.ruleId.localeCompare(b.ruleId,'en'));
}

export function summarizeAxeResults(result,viewport){
 if(!VIEWPORTS.some(v=>v.name===viewport)||
    !result||typeof result!=='object'||Array.isArray(result)||
    !Array.isArray(result.violations)||!Array.isArray(result.incomplete)||
    !Array.isArray(result.passes)||!Array.isArray(result.inapplicable))
  throw Error('CI_AXE_RESULT_INVALID');
 const violations=summarizeRules(result.violations);
 const incomplete=summarizeRules(result.incomplete);
 return {viewport,
  checkedPassRules:result.passes.length,
  unverifiedRules:incomplete.length,
  violatedRules:violations.length,
  violatedNodes:violations.reduce((s,x)=>s+x.affectedNodes,0),
  violations,incomplete
 };
}

export function finalizeAccessibilityReport(observations){
 if(!Array.isArray(observations)||observations.length!==VIEWPORTS.length||
    !VIEWPORTS.every((v,i)=>observations[i]?.viewport===v.name))
  throw Error('CI_AXE_VIEWPORT_SET_INVALID');
 return {schemaVersion:1,scope:ACCESSIBILITY_SCOPE,
  source:'axe-core 4.14.1 + Playwright Chromium local dev page',
  tags:[...AXE_TAGS],
  baselineStatus:'OBSERVED_ONLY_NO_GATING',
  operationalClaims:false,
  viewports:observations};
}

export async function collectAccessibility(chromium,axeScriptPath){
 if(!chromium||typeof chromium.launch!=='function'||
    typeof axeScriptPath!=='string'||!axeScriptPath)
  throw Error('CI_AXE_BROWSER_REQUIRED');
 const browser=await chromium.launch({headless:true});
 try{
  const results=[];
  for(const viewport of VIEWPORTS){
   const context=await browser.newContext({
    viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1
   });
   try{
    const page=await context.newPage();
    const response=await page.goto(ORIGIN+'/about',
     {waitUntil:'domcontentloaded',timeout:20000});
    if(response?.status()!==200||
       new URL(page.url()).origin!==ORIGIN||
       !['/about','/about/'].includes(new URL(page.url()).pathname)||
       await page.locator('main').count()!==1)
      throw Error('CI_AXE_LOCAL_PAGE_NOT_READY');
    await page.addScriptTag({path:axeScriptPath});
    // One-off diagnostic: map axe's incomplete nodes to a fixed public page
    // region and semantic kind. Never print DOM text, HTML, or CSS selectors.
    const {result,diagnostics}=await page.evaluate(async tags=>{
     if(!window.axe||typeof window.axe.run!=='function')
      throw Error('CI_AXE_LIBRARY_NOT_INJECTED');
     const result=await window.axe.run(document,{
      runOnly:{type:'tag',values:tags},
      resultTypes:['violations','incomplete','passes','inapplicable']
     });
     const diagnostics=result.incomplete
      .filter(rule=>rule.id==='color-contrast')
      .flatMap(rule=>rule.nodes.slice(0,12).map(node=>{
       let element=null;
       try{
        const selector=node.target?.[0];
        if(typeof selector==='string'&&selector.length<400)
         element=document.querySelector(selector);
       }catch{}
       const region=element?.closest('section[aria-labelledby="about-headline"]')?'hero':
        element?.closest('section[aria-label="개발자 이야기"]')?'questions':
        element?.closest('main footer')?'footer':
        element?.closest('main details')?'details':
        element?.closest('main header')?'header':'other';
       const tag=element?.closest('h1,h2,h3,p,a,button,summary')?.tagName?.toLowerCase()||'other';
       const checks=[...(node.any??[]),...(node.all??[]),...(node.none??[])];
       const message=(checks.find(c=>c.id==='color-contrast')?.message??'').toLowerCase();
       const cause=message.includes('partially obscured')?'obscured':
        message.includes('background image')?'background-image':
        message.includes('background color')?'background-undetermined':
        message.includes('foreground')?'foreground-undetermined':'other';
       const style=element?getComputedStyle(element):null;
       const parent=element?.parentElement?getComputedStyle(element.parentElement):null;
       return {region,tag,cause,
        foreground:style?.color??null,
        background:style?.backgroundColor??null,
        parentBackground:parent?.backgroundColor??null};
      }));
     return {result,diagnostics};
    },AXE_TAGS);
    console.log('CI_AXE_INCOMPLETE_PROFILE '+JSON.stringify({
     viewport:viewport.name,nodes:diagnostics
    }));
    results.push(summarizeAxeResults(result,viewport.name));
   }finally{await context.close();}
  }
  return finalizeAccessibilityReport(results);
 }finally{await browser.close();}
}

async function main(){
 if(process.argv.length!==2)throw Error('CI_AXE_NO_ARGUMENTS');
 const {chromium}=await import('playwright');
 const axeScriptPath=require.resolve('axe-core/axe.min.js');
 const report=await collectAccessibility(chromium,axeScriptPath);
 const path=resolve('artifacts/ci-accessibility/summary.json');
 await mkdir(resolve('artifacts/ci-accessibility'),{recursive:true});
 await writeFile(path,JSON.stringify(report,null,2)+'\n','utf8');
 console.log('CI_AXE_OBSERVED '+JSON.stringify(report.viewports.map(v=>({
  viewport:v.viewport,violatedRules:v.violatedRules,
  violatedNodes:v.violatedNodes,unverifiedRules:v.unverifiedRules
 }))));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
