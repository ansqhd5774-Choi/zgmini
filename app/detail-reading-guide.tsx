type GuideSection = { title: string; text: string };
type GuideLink = { href: string; label: string };

export default function DetailReadingGuide({ title, sections, sources, related }: {
  title: string;
  sections: GuideSection[];
  sources: GuideLink[];
  related: GuideLink[];
}) {
  return <section className="mt-12 space-y-6 text-sm leading-7 text-slate-300 sm:text-base" aria-label={title}>
    <h2 className="text-xl font-bold text-white">{title}</h2>
    {sections.map(section => <div key={section.title}>
      <h3 className="mb-2 font-bold text-white">{section.title}</h3>
      <p>{section.text}</p>
    </div>)}
    <div>
      <h3 className="mb-2 font-bold text-white">출처와 확인 경로</h3>
      <ul className="flex flex-wrap gap-x-6 gap-y-2">{sources.map(link => <li key={link.href}>
        <a className="inline-flex min-h-11 items-center text-blue-200 underline" href={link.href}>{link.label} →</a>
      </li>)}</ul>
    </div>
    <nav aria-label="함께 읽을 지표" className="flex flex-wrap gap-x-6 gap-y-2">{related.map(link =>
      <a key={link.href} className="inline-flex min-h-11 items-center text-blue-200 underline" href={link.href}>{link.label} →</a>
    )}</nav>
  </section>;
}
