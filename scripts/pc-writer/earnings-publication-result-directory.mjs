// B-scoped publication logs belong to the request, not to the tracked source checkout.
// This pure module neither invokes a provider nor opens DB/Cloudflare connections.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Never write one-shot diagnostics into the publisher checkout, even through
// a symlink/junction. This is a path guard, not permission to write D1.
export function resolvePublicationResultDirectory({
  requested,fallback=os.tmpdir(),excludedSourceRoot,
}={}){
  if(typeof fallback!=='string'||!path.isAbsolute(fallback))
    throw Error('EARNINGS_PUBLICATION_FALLBACK_DIRECTORY_INVALID');
  const chosen=requested===undefined||requested===null||requested===''?fallback:requested;
  if(typeof chosen!=='string'||!path.isAbsolute(chosen)
    ||!fs.existsSync(chosen)||!fs.statSync(chosen).isDirectory())
    throw Error('EARNINGS_PUBLICATION_RESULT_DIRECTORY_INVALID');
  if(excludedSourceRoot!==undefined){
    if(typeof excludedSourceRoot!=='string'||!path.isAbsolute(excludedSourceRoot))
      throw Error('EARNINGS_PUBLICATION_SOURCE_ROOT_INVALID');
    let root,dir;
    try {
      root=fs.realpathSync(excludedSourceRoot);
      dir=fs.realpathSync(chosen);
    }catch{throw Error('EARNINGS_PUBLICATION_SOURCE_ROOT_UNAVAILABLE');}
    const relative=path.relative(root,dir);
    if(relative===''||(relative!=='..'&&!relative.startsWith(`..${path.sep}`)
      &&!path.isAbsolute(relative)))
      throw Error('EARNINGS_PUBLICATION_RESULT_WITHIN_SOURCE_STOP');
  }
  return chosen;
}
