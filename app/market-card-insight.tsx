import { useLayoutEffect, useRef } from 'react';

export function MarketCardInsight({ text }: { text: string }) {
  const textRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const fit = () => {
      const max = 13.5;
      const min = 10;
      const step = 0.5;
      let size = max;

      element.style.fontSize = `${max}px`;
      element.style.lineHeight = "1.32";

      while (
        size > min &&
        (element.scrollHeight > element.clientHeight + 1 ||
          element.scrollWidth > element.clientWidth + 1)
      ) {
        size -= step;
        element.style.fontSize = `${size}px`;
        element.style.lineHeight = size <= 11 ? "1.24" : "1.3";
      }
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);

    return () => observer.disconnect();
  }, [text]);

  return <div className="cnn-header-insight" aria-label={text} title={text}>
    <p ref={textRef}>{text}</p>
  </div>;
}
