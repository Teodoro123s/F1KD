const CLARIFICATION_PREFIX = '\nClarification: ';
const MAX_REPORT_PROMPT_LENGTH = 1000;

export function getReportClarificationMaxLength(prompt) {
  return Math.max(
    0,
    MAX_REPORT_PROMPT_LENGTH - String(prompt || '').trim().length - CLARIFICATION_PREFIX.length,
  );
}

export function buildReportClarificationRequest(prompt, answer) {
  return `${String(prompt || '').trim()}${CLARIFICATION_PREFIX}${String(answer || '').trim()}`;
}
