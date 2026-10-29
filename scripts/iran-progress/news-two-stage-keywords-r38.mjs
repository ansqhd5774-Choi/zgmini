// Existing R38 user-approved two-stage relevance contract. No translation.
const PRIMARY=/\b(?:iran(?:ian)?s?|saudis?|yemen(?:is?)?|houthis?)\b|이란|사우디(?:아라비아)?|예멘|예맨|후티/i;
const SECONDARY=/\b(?:wars?|cease[ -]?fires?|truces?|agreements?|accords?|deals?|negotiat(?:e|es|ed|ing|ion|ions)|talks?|progress|breakthroughs?)\b|전쟁|합의|휴전|협상|진전/i;
export const matchesIranTwoStageKeywordsR38=text=>typeof text==='string'&&PRIMARY.test(text)&&SECONDARY.test(text);
