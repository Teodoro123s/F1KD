import React, { useEffect, useMemo, useState } from 'react';
import {
  apiCreateDashboardInsight,
  apiGetProgressReportAiStatus,
} from '../../api/progressReport';
import InfoButton from '../../kinFlow/InfoButton';

export function DashboardInsights({ metrics, ready, refreshVersion }) {
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(true);
  const [insight, setInsight] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [asking, setAsking] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const metricsKey = useMemo(() => JSON.stringify(metrics), [metrics]);

  useEffect(() => {
    let active = true;
    apiGetProgressReportAiStatus()
      .then((status) => {
        if (active) setAvailable(Boolean(status?.available));
      })
      .catch((statusError) => {
        if (active) setError(statusError.message || 'Unable to check AI availability.');
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready || !available) return undefined;
    let active = true;
    setLoadingInsight(true);
    setError('');
    apiCreateDashboardInsight(metrics)
      .then((result) => {
        if (active) setInsight(result?.insight || '');
      })
      .catch((insightError) => {
        if (active) setError(insightError.message || 'Unable to prepare a dashboard insight.');
      })
      .finally(() => {
        if (active) setLoadingInsight(false);
      });
    return () => { active = false; };
  }, [available, metricsKey, ready, refreshVersion]);

  const askQuestion = async (event) => {
    event.preventDefault();
    setAsking(true);
    setAnswer('');
    setError('');
    try {
      const result = await apiCreateDashboardInsight(metrics, question.trim());
      setAnswer(result?.insight || '');
    } catch (questionError) {
      setError(questionError.message || 'Unable to answer this dashboard question.');
    } finally {
      setAsking(false);
    }
  };

  return (
    <section className="dashboard-panel dashboard-ai-panel" aria-labelledby="dashboard-ai-title">
      <div className="dashboard-panel-heading">
        <div>
          <span className="dashboard-panel-eyebrow">Aggregate metrics only</span>
          <div className="kin-flow-heading"><h3 id="dashboard-ai-title">AI dashboard insights</h3><InfoButton title="AI dashboard insights" /></div>
          <p>AI summarizes operational totals only. It cannot assess individual child growth or provide clinical advice.</p>
        </div>
        <div className="dashboard-ai-heading-actions">
          <button
            type="button"
            className="dashboard-ai-toggle"
            aria-expanded={expanded}
            aria-controls="dashboard-ai-content"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      <div id="dashboard-ai-content" hidden={!expanded}>
      {checking ? (
        <p className="dashboard-ai-status" role="status">Checking AI availability…</p>
      ) : !available ? (
        <p className="dashboard-ai-status" role="status">AI is unavailable. Ask your administrator to configure the approved private AI service.</p>
      ) : (
        <>
          <div className="dashboard-ai-insight" aria-live="polite">
            <strong>{loadingInsight ? 'Updating live insight…' : insight ? 'Current snapshot' : 'No insight yet'}</strong>
            {insight && <p>{insight}</p>}
          </div>
          <form className="dashboard-ai-question-form" onSubmit={askQuestion}>
            <label htmlFor="dashboard-ai-question">Ask about the dashboard totals</label>
            <div>
              <input
                id="dashboard-ai-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                maxLength={500}
                placeholder="For example: Which area has the most follow-ups?"
              />
              <button type="submit" disabled={asking || !question.trim()}>
                {asking ? 'Asking…' : 'Ask AI'}
              </button>
            </div>
            <small>Do not include names, IDs, contact details, or individual health information.</small>
          </form>
          {answer && <div className="dashboard-ai-answer" aria-live="polite"><strong>Answer</strong><p>{answer}</p></div>}
        </>
      )}
      {error && <p className="dashboard-ai-error" role="alert">{error}</p>}
      </div>
    </section>
  );
}
