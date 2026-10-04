import * as miniflare from 'miniflare';
const {Miniflare,Response:MFResponse}=miniflare;
export function createMiniflare(options){return new Miniflare(miniflare.convertV4MiniflareOptions?miniflare.convertV4MiniflareOptions(options):options);}
export {MFResponse};
