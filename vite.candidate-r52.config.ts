import vinext from 'vinext';
import {defineConfig} from 'vite';
import {candidate2dbImportBoundary} from './scripts/candidate-2db-import-boundary.mjs';
import {candidateR5Ui} from './scripts/candidate-r5-ui.mjs';
export default defineConfig(async()=>{
 process.env.WRANGLER_WRITE_LOGS??='false';
 process.env.WRANGLER_LOG_PATH??='.wrangler/logs';
 process.env.MINIFLARE_REGISTRY_PATH??='.wrangler/registry';
 const {cloudflare}=await import('@cloudflare/vite-plugin');
 return {plugins:[candidate2dbImportBoundary(process.cwd()),candidateR5Ui(),vinext(),cloudflare({configPath:'wrangler.candidate-r52.json',viteEnvironment:{name:'rsc',childEnvironments:['ssr']},inspectorPort:false,remoteBindings:false})]};
});
