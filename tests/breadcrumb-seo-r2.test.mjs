import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');

test('shared WebPage JSON-LD owns a two-level BreadcrumbList',()=>{
  const seo=read('app/seo-jsonld.tsx');
  assert.match(seo,/export function BreadcrumbJsonLd/);
  assert.match(seo,/'@type':'BreadcrumbList'/);
  assert.match(seo,/'@id':`\$\{url\}#breadcrumb`/);
  assert.match(seo,/'@type':'ListItem',position:1,name:'ZGmini',item:`\$\{SITE_URL\}\/`/);
  assert.match(seo,/'@type':'ListItem',position:2,name,item:url/);
  assert.match(seo,/breadcrumb:\{'@id':`\$\{url\}#breadcrumb`\}/);
  assert.match(seo,/<BreadcrumbJsonLd name=\{name\} path=\{path\}\/>/);
});

test('all shared detail and guide WebPage JSON-LD users inherit breadcrumbs',()=>{
  const notes=read('app/detail-investor-notes.tsx');
  const sector=read('app/sector-fear-greed/page.tsx');
  const guide=read('app/guides/guide-page.tsx');
  assert.match(notes,/<WebPageJsonLd/);
  assert.match(sector,/<WebPageJsonLd/);
  assert.match(guide,/<WebPageJsonLd/);
});

test('About joins the shared WebPage and breadcrumb contract',()=>{
  const about=read('app/about/page.tsx');
  assert.match(about,/import \{WebPageJsonLd\} from '\.\.\/seo-jsonld'/);
  assert.match(about,/<WebPageJsonLd name=\{title\} description=\{description\} path="\/about\/"\/>/);
});
