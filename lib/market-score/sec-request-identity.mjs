// The SEC requests an organization and reachable email in its declared bot UA.
// Never invent a contact address, or expose the configured address in diagnostics.
export const SEC_LEGACY_USER_AGENT='ZGMINI/1.0 (+https://zgmini.kr)';
const emailPattern=/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;
export function secRequestIdentity(contactEmail){
 const email=typeof contactEmail==='string'?contactEmail.trim():null;
 const declared=Boolean(email&&email.length<=254&&emailPattern.test(email)&&
  !/[\r\n]/.test(email));
 return {userAgent:declared?`ZGMINI/1.0 ${email}`:SEC_LEGACY_USER_AGENT,
  contactDeclared:declared};
}
