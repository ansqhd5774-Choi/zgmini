import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('USA and Korea investor intent metadata is page-specific and data-grounded',()=>{
 const us=read('app/fear-greed/usa/page.tsx');
 const kr=read('app/fear-greed/korea/page.tsx');
 const guide=read('app/fear-greed/investor-intent-guide.tsx');
 assert.ok(us.includes('CNN 공포지수·미국 증시'));
 assert.ok(kr.includes('코스피·국내 주식 투자심리'));
 assert.ok(us.includes('<InvestorIntentGuide market="usa"/>'));
 assert.ok(kr.includes('<InvestorIntentGuide market="korea"/>'));
 assert.ok(guide.includes('S&P500·나스닥'));
 assert.ok(guide.includes('VKOSPI200'));
 assert.ok(guide.includes('외국인·기관 순매수'));
 assert.ok(guide.includes('코스닥만을 대상으로 별도 계산한 공포탐욕지수가 아니며'));
 assert.ok(guide.includes('point-in-time 빈티지는 검증되지 않았습니다'));
 assert.ok(guide.includes('/guides/fear-greed-buying/'));
 assert.ok(guide.includes('/credit-risk/'));
 assert.ok(guide.includes('/sector-fear-greed/'));
 assert.equal((guide.match(/title:"/g)||[]).length,10);
 for(const page of [us,kr])assert.ok(page.includes('공탐 지수'));
 assert.ok(guide.includes('공탐은 공포와 탐욕의 줄임말'));
 assert.equal((guide.match(/<h2 /g)||[]).length,1);
 assert.equal((guide.match(/<h3 /g)||[]).length,1);
 assert.ok(!guide.includes('FAQPage'));
 assert.ok(!guide.includes('실시간'));
});
