import { Gauge } from 'lucide-react';

export function MarketScoreOrb({score,state,caption}:{score:string;state:string;caption:string}){
 const tone=state.includes('공포')?'is-fear':state.includes('탐욕')?'is-greed':'';
 return <div className={`cnn-score-orb ${tone}`} role="group" aria-live="polite" aria-label={`${caption} ${score}점 ${state}`}><Gauge size={22} aria-hidden="true"/><strong>{score}</strong><span>{state}</span><small>{caption}</small></div>;
}
