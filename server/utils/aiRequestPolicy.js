const WRITE_ACTION = '(?:create|register|add|update|edit|modify|delete|remove|change|assign|suspend|make|alter|overwrite|insert|drop)';
const MANAGED_OBJECT = '(?:mothers?|children|beneficiar(?:y|ies)|records?|check[\\s-]?ups?|communities|groups|batches|programs|accounts|users|health workers?|roles|assignments)';
const POTENTIAL_PII_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /(?:\+?63[\s().-]*|0)9\d{2}[\s().-]*\d{3}[\s.-]*\d{4}\b/,
  /\b(?:full\s+name|first\s+name|last\s+name|name\s*(?::|=|is)|named\s+(?!by\b))[ \t]*[A-Z][A-Za-z'-]+(?:[ \t]+[A-Z][A-Za-z'-]+){0,2}\b/i,
  /\b(?:beneficiary|mother|child|record|user)\s*(?:id|number|no\.?)\s*(?::|=|#|is)?\s*[A-Z0-9][A-Z0-9-]{3,}\b/i,
  /\b(?:F1KD|BEN|MOTHER|CHILD)[- #]?\d{3,}\b/i,
];

function isDisallowedAIRequest(prompt) {
  const request = String(prompt || '').trim();
  if (!request) return false;
  const directWrite = new RegExp(`\\b${WRITE_ACTION}\\s+(?:(?:a|an|the|new|existing|this|these|their)\\s+){0,2}${MANAGED_OBJECT}\\b`, 'i');
  const indirectWrite = new RegExp(`\\b${MANAGED_OBJECT}\\b.{0,40}\\b${WRITE_ACTION}\\b`, 'i');
  const commandRequest = /\b(?:execute|run)\b.{0,24}\b(?:sql|shell|command|database statement)\b/i;
  return directWrite.test(request) || indirectWrite.test(request) || commandRequest.test(request);
}

function containsPotentialPii(prompt) {
  const request = String(prompt || '');
  return POTENTIAL_PII_PATTERNS.some((pattern) => pattern.test(request));
}

module.exports = { containsPotentialPii, isDisallowedAIRequest };
