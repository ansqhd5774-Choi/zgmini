// B-scoped publication logs belong to the request, not to the tracked source checkout.
// This pure module neither invokes a provider nor opens DB/Cloudflare connections.
import fs from 'node:fs';
import path from 'node:path';

export function resolvePublicationResultDirectory({requested,fallback}={}){
  if(typeof fallback!=='string'||!path.isAbsolute(fallback))
    throw Error('EARNINGS_PUBLICATION_FALLBACK_DIRECTORY_INVALID');
  if(requested===undefined||requested===null||requested==='')return fallback;
  if(typeof requested!=='string'||!path.isAbsolute(requested)
    ||!fs.existsSync(requested)||!fs.statSync(requested).isDirectory())
    throw Error('EARNINGS_PUBLICATION_RESULT_DIRECTORY_INVALID');
  return requested;
}
