export function normalizeChatDraft(input){
 if(!input||typeof input!=="object"||Array.isArray(input))return null;
 const nickname=typeof input.nickname==="string"?input.nickname.trim():"";
 const body=typeof input.body==="string"?input.body.trim():"";
 if(!nickname||[...nickname].length>20||/[\u0000-\u001f\u007f]/u.test(nickname))return null;
 if(!body||[...body].length>300||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(body))return null;
 if(/(?:https?:\/\/|www\.)/iu.test(body))return null;
 return {nickname,body};
}
export function chatRateAllowed(minuteCount,dayCount){return Number.isInteger(minuteCount)&&Number.isInteger(dayCount)&&minuteCount<=3&&dayCount<=100;}
