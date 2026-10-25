// Keep covered chart work out of the introduction's first paint. No storage,
// data fetching or score calculation is involved in this rendering boundary.
export function afterIntroductionPaint(target, ready) {
  const dialog = target.document.getElementById('zg-about-intro-dialog');
  let frame = 0, disposed = false;
  const sync = () => {
    target.cancelAnimationFrame(frame);
    if (disposed || dialog?.open) return;
    frame = target.requestAnimationFrame(() => {
      frame = target.requestAnimationFrame(() => {
        if (!disposed && !dialog?.open) ready();
      });
    });
  };
  const observer = dialog ? new target.MutationObserver(sync) : null;
  observer?.observe(dialog, {attributes:true, attributeFilter:['open']});
  dialog?.addEventListener('close', sync);
  sync();
  return () => {
    disposed = true;
    target.cancelAnimationFrame(frame);
    observer?.disconnect();
    dialog?.removeEventListener('close', sync);
  };
}
