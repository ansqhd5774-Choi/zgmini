// Stored official calendar snapshot; no visitor/provider polling.
// Calendar dates are tentative until confirmed by the preceding FOMC meeting.
export const FOMC_SOURCE = 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm';
export const FOMC_CHECKED_AT = '2026-10-21';
export const FOMC_DATES = Object.freeze([
  '2026-10-28', '2026-12-09',
  '2027-01-27', '2027-03-17', '2027-04-28', '2027-06-09',
  '2027-07-28', '2027-09-15', '2027-10-27', '2027-12-08',
]);
const easternHour = new Intl.DateTimeFormat('en-US', {timeZone:'America/New_York', hour:'2-digit', hourCycle:'h23'});
// 14:00 Eastern policy statement, not the 14:30 press conference.
export function fomcInstant(date) {
  const probe = Date.parse(`${date}T14:00:00Z`);
  const offsetHours = 14 - Number(easternHour.format(probe));
  return new Date(probe + offsetHours * 3600000).toISOString();
}
export function fomcState(now, dates = FOMC_DATES) {
  if (!Number.isFinite(now)) return null;
  // Hold the reached event for 24h without asserting a decision/result.
  const at = dates.map(fomcInstant).find(at => now < Date.parse(at) + 86400000);
  if (!at) return null;
  const seconds = Math.max(0, Math.ceil((Date.parse(at) - now) / 1000));
  return {at, reached: now >= Date.parse(at), days:String(Math.floor(seconds/86400)).padStart(2,'0'),
    hours:String(Math.floor(seconds%86400/3600)).padStart(2,'0'),
    minutes:String(Math.floor(seconds%3600/60)).padStart(2,'0'), seconds:String(seconds%60).padStart(2,'0')};
}
export function fomcKst(at) {
  const kst = new Date(Date.parse(at)+9*3600000).toISOString();
  return `${kst.slice(5,10).replace('-','.')} ${kst.slice(11,16)}`;
}
