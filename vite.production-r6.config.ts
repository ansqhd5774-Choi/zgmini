import vinext from 'vinext';
import {defineConfig} from 'vite';
import {production2dbImportBoundary} from './scripts/production-2db-import-boundary.mjs';

export default defineConfig(async()=>{
 process.env.WRANGLER_WRITE_LOGS??='false';
 process.env.WRANGLER_LOG_PATH??='.wrangler/logs';
 process.env.MINIFLARE_REGISTRY_PATH??='.wrangler/registry';
 const {cloudflare}=await import('@cloudflare/vite-plugin');
 return {
  plugins:[
   production2dbImportBoundary(process.cwd()),
   vinext(),
   cloudflare({
    configPath:'wrangler.production-r6.json',
    viteEnvironment:{name:'rsc',childEnvironments:['ssr']},
    inspectorPort:false,
    remoteBindings:false
   })
  ]
 };
});
