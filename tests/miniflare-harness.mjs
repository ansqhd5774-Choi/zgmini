import {Miniflare, convertV4MiniflareOptions, Response as MFResponse} from 'miniflare';
export function createMiniflare(options){return new Miniflare(convertV4MiniflareOptions(options));}
export {MFResponse};
