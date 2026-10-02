import vinext from 'vinext';
import {defineConfig} from 'vite';
import {candidateImportBoundary} from './scripts/candidate-import-boundary.mjs';
import {candidateR5Ui} from './scripts/candidate-r5-ui.mjs';
export default defineConfig(async()=>{
 process.env.WRANGLER_WRITE_LOGS??='false';
 const {cloudflare}=await import('@cloudflare/vite-plugin');
 return {plugins:[candidateImportBoundary(process.cwd()),candidateR5Ui(),vinext(),cloudflare({configPath:'wrangler.candidate-prerender-r7.json',viteEnvironment:{name:'rsc',childEnvironments:['ssr']},inspectorPort:false,remoteBindings:false})]};
});
