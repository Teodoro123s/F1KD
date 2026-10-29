const PII_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /(?:\+?63[\s().-]*|0)9\d{2}[\s().-]*\d{3}[\s.-]*\d{4}\b/,
  /\b(?:full\s+name|first\s+name|last\s+name|name\s*(?::|=|is)|named\s+(?!by\b))[ \t]*[A-Z][A-Za-z'-]+(?:[ \t]+[A-Z][A-Za-z'-]+){0,2}\b/i,
  /\b(?:beneficiary|mother|child|record|user)\s*(?:id|number|no\.?)\s*(?::|=|#|is)?\s*[A-Z0-9][A-Z0-9-]{3,}\b/i,
  /\b(?:F1KD|BEN|MOTHER|CHILD)[- #]?\d{3,}\b/i,
];

export function detectPotentialPii(value) {
  const prompt = String(value || '');
  return PII_PATTERNS.some((pattern) => pattern.test(prompt));
}
