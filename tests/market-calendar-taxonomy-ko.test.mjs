import test from 'node:test';
import assert from 'node:assert/strict';
import {sectorKo,industryKo} from '../lib/market-calendar-taxonomy-ko.mjs';

test('all 12 published sector labels have Korean UI captions',()=>{
 const sectors=['—','Basic Materials','Communication Services','Consumer Cyclical',
  'Consumer Defensive','Energy','Financial Services','Healthcare','Industrials',
  'Real Estate','Technology','Utilities'];
 for(const sector of sectors){
  assert.notEqual(sectorKo(sector),sector,'Not translated: '+sector);
 }
});
test('published English industries in market calendar always use Korean labels',()=>{
 const examples=new Map([
  ['Agricultural Farm Products','농산물'],
  ['Engineering & Construction','엔지니어링·건설'],
  ['REIT - Residential','주거 리츠'],
  ['Computer Hardware','컴퓨터 하드웨어'],
  ['Financial - Credit Services','신용 서비스'],
  ['Waste Management','폐기물 처리'],
  ['Specialty Business Services','전문 비즈니스 서비스'],
  ['Drug Manufacturers - General','종합 제약'],
  ['Security & Protection Services','보안·경비 서비스'],
  ['Industrial - Machinery','산업 기계'],
  ['Medical - Devices','의료기기'],
  ['RETAIL-EATING PLACES','외식업'],
  ['MISC INDUSTRIAL & COMMERCIAL MACHINERY & EQUIPMENT','산업·상업용 기계·장비'],
  ['TELEVISION BROADCASTING STATIONS','텔레비전 방송국'],
  ['Asset Management - Cryptocurrency','암호화폐 자산운용'],
  ['Financial - Capital Markets','자본시장'],
  ['Independent Power Producers','독립 발전사업자']
 ]);
 for(const [english,korean] of examples)assert.equal(industryKo(english),korean);
});
test('source taxonomy is not changed by Korean presentation helper',()=>{
 const unknown='Future Unmapped Supplier Industry';
 assert.equal(industryKo(unknown),unknown);
 assert.equal(sectorKo(unknown),unknown);
});
