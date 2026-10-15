import snapshot from './release-snapshot.json';

const formatKst=(at:string)=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(at));

export default function ReleaseCalendar({kind}:{kind:'inflation'|'fomc'}) {
  const events=snapshot.events.filter(event=>kind==='inflation'?['cpi','pce'].includes(event.id):['fomc','press'].includes(event.id));
  const nextEvent=[...events].sort((a,b)=>new Date(a.at).getTime()-new Date(b.at).getTime()).at(0);
  return <section className="mt-10 space-y-5" aria-label="공식 발표 일정과 확인된 결과">
    <h2 className="text-xl font-bold text-white">공식 발표 일정과 확인된 결과</h2>
    <p className="text-sm text-slate-300">공식 자료 확인일: <time dateTime={snapshot.checkedAt}>{snapshot.checkedAt}</time>. 아래는 확인 당시 일정과 발표값입니다. 실시간 자동 갱신 자료가 아니며, 일정이 변경되거나 이후 발표가 있을 수 있으니 공식 출처를 확인하세요.</p>
    {nextEvent?<p className="text-sm text-slate-200"><strong className="text-white">확인 당시 다음 공식 일정</strong> · {nextEvent.name} · <time dateTime={nextEvent.at}>{formatKst(nextEvent.at)}</time> 한국시간</p>:null}
    <ul className="space-y-3">{events.map(event=><li key={event.id} className="rounded-lg border border-slate-700 p-4">
      <strong className="block text-white">{event.name}</strong>
      <time dateTime={event.at} className="block">{formatKst(event.at)} 한국시간</time>
      <span className="block text-sm text-slate-400">확인 당시 예정 · 발표값 미확인 · 예상치 미제공</span>
      <a href={event.source} className="inline-flex min-h-11 items-center text-blue-200 underline">공식 일정 확인 →</a>
    </li>)}</ul>
    {kind==='inflation'?<div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <caption className="mb-3 text-left text-slate-300">가장 최근 확인 가능한 공식 발표값입니다. CPI와 PCE는 발표 주기가 달라 기준월이 서로 다를 수 있습니다. ‘이전’은 같은 발표 자료에 기재된 직전 월 값입니다.</caption>
        <thead><tr>{['지표·기준월·단위','이전','예상치','발표값','발표일·출처'].map(label=><th key={label} scope="col" className="border-b border-slate-700 p-3">{label}</th>)}</tr></thead>
        <tbody>{snapshot.releases.map(row=><tr key={row.name}>
          <th scope="row" className="border-b border-slate-800 p-3">{row.name}<span className="block font-normal text-slate-400">{row.period} · {row.unit}</span></th>
          <td className="border-b border-slate-800 p-3">{row.previous.toFixed(1)}</td>
          <td className="border-b border-slate-800 p-3">미제공</td>
          <td className="border-b border-slate-800 p-3 font-semibold">{row.actual.toFixed(1)}</td>
          <td className="border-b border-slate-800 p-3"><a className="inline-flex min-h-11 items-center text-blue-200 underline" href={row.source}>{row.publishedAt} 공식 발표 →</a></td>
        </tr>)}</tbody>
      </table>
    </div>:<p className="rounded-lg border border-slate-700 p-4">확인된 금리 결정: {snapshot.fed.period}, 연방기금금리 목표 범위 <strong>{snapshot.fed.targetRange}</strong>, 직전 대비 {snapshot.fed.change}. 이는 금리인하 확률이나 향후 결정 예상치가 아닙니다. <a href={snapshot.fed.source} className="inline-flex min-h-11 items-center text-blue-200 underline">공식 성명 확인 →</a></p>}
    <p className="text-sm text-slate-400">시장 예상치는 설문·제공원에 따라 달라집니다. 검증된 제공원을 연결하지 않아 미제공으로 표시하며, 0이나 공식 예측값으로 대체하지 않습니다.</p>
  </section>;
}