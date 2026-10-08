import {ContentHelp} from './content-help';
import {HELP,HelpText} from './help-copy';
import type { ReactNode } from 'react';
import {ArrowUpRight,Info} from 'lucide-react';
import { MarketCardHeader } from './market-card-header';
import { MarketCardFooter } from './market-card-footer';
import { MarketScoreOrb } from './market-score-orb';
import { MarketTrendFrame } from './market-trend-frame';

type FearGreedCardShellProps = {
  className?: string;
  layoutVariant?: 'legacy' | 'shared';
  testId: string;
  marketState: string;
  busy: boolean;
  detailHref?: string;
  header: { flag: string; eyebrow: string; title: string; description: string; dateLabel: string; date: string; source: string; rightContent?: ReactNode };
  score: { value: string; state: string; caption?: string; variant?: 'compact' | 'hero'; dayDelta?: number | null; periodDelta?: number | null; periodLabel?: string; metaDate?: string; dayLabel?: string; comparisonAriaLabel?: string };
  period: ReactNode;
  chart: ReactNode;
  footer: { href: string; label: string; ariaLabel?: string; children: ReactNode };
};

/** The only owner of Fear & Greed card geometry. Renderers receive the chart slot. */
export function FearGreedCardShell({className='',layoutVariant='legacy',testId,marketState,busy,detailHref,header,score,period,chart,footer}:FearGreedCardShellProps){
  const layoutClass = layoutVariant === 'shared' ? 'fg-shared-shell' : '';
  return <section className={`cnn-reference-panel fg-card ${layoutClass} ${className}`.trim()} data-testid={testId} data-market-state={marketState} aria-busy={busy}>
    <div className="fg-header-slot"><MarketCardHeader {...header} titleAction={<a className="fg-market-detail-link" href={detailHref??footer.href} aria-label={detailHref?`${header.title} 상세페이지 열기`:footer.ariaLabel??`${header.title} 상세페이지 열기`}><ArrowUpRight size={14}/></a>} rightContent={layoutVariant==='shared'?<></>:header.rightContent}/></div>
    <div className="fg-content-slot">
      <div className="fg-score-slot"><MarketScoreOrb score={score.value} state={score.state} caption={score.caption} variant={score.variant} dayDelta={score.dayDelta} periodDelta={score.periodDelta} periodLabel={score.periodLabel} metaDate={score.metaDate} dayLabel={score.dayLabel} comparisonAriaLabel={score.comparisonAriaLabel}/></div>
      <MarketTrendFrame className="fg-analysis-slot"><span className="zg-fg-info-wrap"><ContentHelp label={`${header.title} 공포·탐욕 도움말`}><HelpText copy={header.title.includes('한국')?HELP.korea:HELP.usa}/></ContentHelp></span><div className="fg-period-slot">{period}</div><div className="fg-chart-slot"><div className="fg-renderer">{chart}</div></div></MarketTrendFrame>
    </div>
    <div className="fg-footer-slot"><MarketCardFooter {...footer} date={score.metaDate}/></div>
  </section>;
}
