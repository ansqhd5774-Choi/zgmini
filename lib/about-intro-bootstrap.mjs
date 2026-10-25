export const INTRO_POLICY = Object.freeze({
  dialogId: 'zg-about-intro-dialog',
  dismissedKey: 'zgmini-about-intro-dismissed-r1',
  hiddenKey: 'zgmini-about-intro-hidden-until-r1',
  week: 7 * 24 * 60 * 60 * 1000,
  hydratedEvent: 'zg-intro-hydrated',
  dismissedValue: 'zg-intro-dismissed',
});

// React navigation uses the same policy as the parser-time script below.
export function shouldShowIntroduction(target, policy) {
  if (target.location.pathname.replace(/\/+$/, '') === '/about') return false;
  try {
    if (target.sessionStorage.getItem(policy.dismissedKey) === '1') return false;
  } catch { /* Storage restrictions must not prevent closing. */ }
  try {
    const until = Number(target.localStorage.getItem(policy.hiddenKey));
    if (Number.isFinite(until) && until > Date.now()) return false;
  } catch { /* Continue without persistent storage. */ }
  return true;
}

// Literal source is identical in SSR/client builds; Function.toString() is not,
// because server/client transforms can emit different function bodies.
// Only owns this dialog until React attaches its handlers. No data/API work.
export const INTRO_BOOTSTRAP_SCRIPT = `(function(target, policy) {
  if (target.location.pathname.replace(/\\/+$/, '') === '/about') return;
  try {
    if (target.sessionStorage.getItem(policy.dismissedKey) === '1') return;
  } catch {}
  try {
    const until = Number(target.localStorage.getItem(policy.hiddenKey));
    if (Number.isFinite(until) && until > Date.now()) return;
  } catch {}
  const dialog = target.document.getElementById(policy.dialogId);
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const dismiss = () => {
    try { target.sessionStorage.setItem(policy.dismissedKey, '1'); } catch { /* optional */ }
    if (dialog.querySelector('input[type="checkbox"]')?.checked) {
      try { target.localStorage.setItem(policy.hiddenKey, String(Date.now() + policy.week)); } catch { /* optional */ }
    }
    dialog.close(policy.dismissedValue);
  };
  const click = event => {
    if (event.target === dialog || event.target.closest?.('[data-intro-dismiss]')) dismiss();
  };
  const cancel = event => { event.preventDefault(); dismiss(); };
  const cleanup = () => {
    dialog.removeEventListener('click', click);
    dialog.removeEventListener('cancel', cancel);
  };
  dialog.addEventListener('click', click);
  dialog.addEventListener('cancel', cancel);
  dialog.addEventListener(policy.hydratedEvent, cleanup, { once: true });
  dialog.showModal();
})(window,${JSON.stringify(INTRO_POLICY)});`;
