import React, { useEffect, useState } from 'react';
import { apiCreateProgramAssistantResponse, apiGetProgressReportAiStatus } from '../../api/progressReport';

const GENERAL_SUGGESTED_QUESTIONS = [
  'List programs created this year.',
  'How many check-ins were recorded this year?',
  'How many eligible beneficiaries are there in each active program?',
];

export default function ProgramAiAssistant({ currentProgramId = null, result, onResult }) {
  const suggestedQuestions = currentProgramId
    ? [
      'List programs created this year.',
      'How many check-ins were recorded this year?',
      'How many eligible beneficiaries are in this program?',
    ]
    : GENERAL_SUGGESTED_QUESTIONS;
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    let active = true;
    apiGetProgressReportAiStatus()
      .then((status) => {
        if (active) setAvailable(Boolean(status?.available));
      })
      .catch((statusError) => {
        if (active) setError(statusError.message || 'Unable to check the private AI service.');
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    onResult(null);
  }, [currentProgramId, onResult]);

  const askQuestion = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    onResult(null);
    try {
      onResult(await apiCreateProgramAssistantResponse(prompt.trim(), currentProgramId));
    } catch (questionError) {
      setError(questionError.message || 'Unable to answer the Program question.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="progress-report-ai-card program-ai-assistant" aria-labelledby="program-ai-assistant-title">
      <div className="progress-report-ai-heading">
        <div>
          <h2 id="program-ai-assistant-title">AI Program Assistant</h2>
          <p>Ask about programs, eligible beneficiaries, or recorded attendance and check-ins. Answers use Program data your account can access.</p>
        </div>
        <div className="progress-report-ai-heading-actions">
          <button
            type="button"
            className="progress-report-ai-toggle"
            aria-expanded={expanded}
            aria-controls="program-ai-assistant-content"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>
      <div id="program-ai-assistant-content" className="progress-report-ai-content" hidden={!expanded}>
        {checking ? (
          <p className="progress-report-ai-message" role="status">Checking private AI availability…</p>
        ) : !available ? (
          <p className="progress-report-ai-message" role="status">The private AI service is not available. Program records have not been changed.</p>
        ) : (
          <>
            <form onSubmit={askQuestion}>
              <label className="progress-report-ai-prompt-label" htmlFor="program-ai-assistant-prompt">
                Ask a question about Program
              </label>
              <textarea
                id="program-ai-assistant-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                maxLength={500}
                rows={2}
                placeholder="For example: How many beneficiaries are in this program?"
                required
              />
              <div className="progress-report-ai-suggestions" aria-label="Suggested Program questions">
                {suggestedQuestions.map((question) => (
                  <button key={question} type="button" onClick={() => setPrompt(question)}>
                    {question}
                  </button>
                ))}
              </div>
              <p className="progress-report-ai-message">
                Only your question and whether a Program is selected are sent to the configured AI service. Program records, beneficiary data, and account scope stay in the app. Check-in totals count saved entries marked received.
              </p>
              <div className="progress-report-ai-actions">
                <span>{prompt.length}/500</span>
                <button type="submit" className="primary-btn" disabled={loading || prompt.trim().length < 3}>
                  {loading ? 'Answering…' : 'Ask AI'}
                </button>
              </div>
            </form>
            {result && (
              <div className="progress-report-ai-proposal program-ai-answer" aria-live="polite">
                <h3>Program results</h3>
                <p role="status">{result.answer}</p>
                {result.intent?.explanation && <p className="progress-report-ai-message">{result.intent.explanation}</p>}
                <p className="progress-report-ai-message">
                  {result.programs?.length
                    ? 'Matching records are displayed in the Program table below.'
                    : 'The Program table below will show that no saved programs matched your question.'}
                </p>
                {result.truncated && <p className="progress-report-ai-message">Showing the first 50 matching programs in the Program table below.</p>}
              </div>
            )}
          </>
        )}
        {error && <p className="progress-report-ai-message" role="alert">{error}</p>}
      </div>
    </section>
  );
}
