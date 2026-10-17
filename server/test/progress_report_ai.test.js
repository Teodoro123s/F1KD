const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'progress-report-ai-test-secret';

const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const testPool = {
  query: async () => [[]],
  getConnection: async () => ({
    query: async () => [[]],
    release() {},
  }),
};

mysql.createPool = () => testPool;
mysql.createConnection = async () => ({
  query: async () => [[]],
  end: async () => {},
});

const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const { authorizeOperational, authorizeProgressReport } = require('../middleware/authorize');
const progressReportRouter = require('../routes/progressReport');
const {
  ProgressReportAIError,
  createEntryAssistance,
  createMonitoringReportIntent,
  createReportProposal,
  createReportSummary,
  getAIConfiguration,
  normalizeReportSummary,
  validateMonitoringReportIntent,
  validateReportProposal,
} = require('../utils/progressReportAI');

const modelEnvironment = {
  PROGRESS_REPORT_AI_BASE_URL: 'http://127.0.0.1:11434/v1',
  PROGRESS_REPORT_AI_MODEL: 'test-model',
};

test('AI configuration is unavailable until a private model endpoint and model are configured', () => {
  assert.equal(getAIConfiguration({}), null);
  assert.throws(
    () => getAIConfiguration({ ...modelEnvironment, PROGRESS_REPORT_AI_BASE_URL: 'https://user:pass@example.com/v1' }),
    ProgressReportAIError,
  );
});

test('report proposals accept only known report types and fields for the selected beneficiary type', async () => {
  await assert.rejects(createReportProposal('x'.repeat(1001), { env: modelEnvironment }), /between 3 and 1,000 characters/);
  assert.deepEqual(validateReportProposal({
    reportCategory: 'monitor',
    beneficiaryType: 'child',
    metricIds: ['measurementDate', 'weightForAge', 'heightForAge', 'bmiForAge', 'weightForAgeInterpretation'],
    explanation: 'Review growth.',
    scope: { schoolId: 999 },
  }), {
    reportCategory: 'monitor',
    beneficiaryType: 'child',
    metricIds: ['measurementDate', 'weightForAge', 'heightForAge', 'bmiForAge', 'weightForAgeInterpretation'],
    explanation: 'Review growth.',
  });

  assert.throws(() => validateReportProposal({
    reportCategory: 'monitor',
    beneficiaryType: 'child',
    metricIds: ['philhealthNumber'],
  }), /unsupported report fields/);
  assert.throws(() => validateReportProposal({
    reportCategory: 'monitor',
    beneficiaryType: 'child',
    metricIds: ['bmiInterpretation'],
  }), /unsupported report fields/);
  assert.deepEqual(validateReportProposal({
    reportCategory: 'monitor',
    beneficiaryType: 'mother',
    metricIds: ['measurementDate', 'weightForAge', 'heightForAge', 'bmiForAge', 'bmiInterpretation'],
  }).metricIds, ['measurementDate', 'weightForAge', 'heightForAge', 'bmiForAge', 'bmiInterpretation']);
  assert.deepEqual(validateReportProposal({
    reportCategory: 'monitor',
    beneficiaryType: 'mother',
    profileMetricIds: ['age', 'birthPlace'],
    metricIds: ['measurementDate', 'weightForAge', 'heightForAge', 'bmiForAge'],
  }), {
    reportCategory: 'monitor',
    beneficiaryType: 'mother',
    metricIds: ['measurementDate', 'weightForAge', 'heightForAge', 'bmiForAge'],
    profileMetricIds: ['age', 'birthPlace'],
    explanation: '',
  });
  assert.throws(() => validateReportProposal({
    reportCategory: 'program',
    beneficiaryType: 'mother',
    profileMetricIds: ['age'],
    metricIds: ['receivedBenefitTotal'],
  }), /unsupported report fields/);
  assert.deepEqual(validateReportProposal({
    reportCategory: 'profile',
    beneficiaryType: 'mother',
    metricIds: ['philhealthNumber', 'medicalConditions', 'dentalCheckupDate', 'ttVaccineRecord'],
  }).metricIds, ['philhealthNumber', 'medicalConditions', 'dentalCheckupDate', 'ttVaccineRecord']);
  assert.deepEqual(validateReportProposal({
    needsClarification: true,
    question: 'Do you mean profile values or check-up measurements?',
    options: ['Profile values', 'Check-up measurements'],
  }), {
    needsClarification: true,
    question: 'Do you mean profile values or check-up measurements?',
    options: ['Profile values', 'Check-up measurements'],
  });
  assert.throws(() => validateReportProposal({
    needsClarification: true,
    question: 'Which measurements?',
    options: ['Profile values'],
  }), /invalid clarification request/);
});

test('AI proposal can ask whether height, weight, or BMI means profile data or monitoring visits', async () => {
  let request;
  const result = await createReportProposal('Show weight and height.', {
    env: modelEnvironment,
    fetchImpl: async (url, options) => {
      request = JSON.parse(options.body);
      return new Response(JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify({
              needsClarification: true,
              question: 'Do you mean profile values or check-up measurements?',
              options: ['Profile/baseline values', 'Measurements from each check-up'],
            }),
          },
        }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });

  assert.equal(result.needsClarification, true);
  assert.equal(result.options.length, 2);
  assert.match(request.messages[0].content, /ask which one instead of guessing/);
  assert.ok(request.response_format.json_schema.schema.anyOf.some(
    (variant) => variant.properties.needsClarification?.const === true,
  ));
});

test('monitoring AI reports can filter to yes referrals and include assistance details', async () => {
  let request;
  const intent = await createMonitoringReportIntent(
    'Show mother referral to hospital, only the yes, only the latest check-up, then facility type, source of funds, assistance amount, and laboratory requests.',
    'Mother',
    {
      env: modelEnvironment,
      fetchImpl: async (url, options) => {
        request = JSON.parse(options.body);
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                metricIds: ['hospitalReferral', 'facilityType', 'sourceOfFunds', 'assistanceAmount', 'laboratoryRequests'],
                onlyReferredToHospital: true,
                latestCheckupOnly: true,
                explanation: 'Shows yes referrals with saved facility and assistance details.',
              }),
            },
          }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      },
    });

  assert.deepEqual(intent, {
    beneficiaryType: 'Mother',
    metricIds: ['hospitalReferral', 'facilityType', 'sourceOfFunds', 'assistanceAmount', 'laboratoryRequests'],
    onlyReferredToHospital: true,
    latestCheckupOnly: true,
    explanation: 'Shows yes referrals with saved facility and assistance details.',
  });
  assert.deepEqual(request.messages[1], {
    role: 'user',
    content: 'Show mother referral to hospital, only the yes, only the latest check-up, then facility type, source of funds, assistance amount, and laboratory requests.',
  });
  assert.doesNotMatch(JSON.stringify(request.messages), /Jane Doe|checkups|motherId/i);
  assert.deepEqual(request.response_format.json_schema.schema.properties.metricIds.items.enum, [
    'measurementDate', 'weight', 'height', 'bmi', 'bmiInterpretation', 'hospitalReferral',
    'laboratoryRequests', 'assistanceAmount', 'sourceOfFunds', 'facilityType', 'bloodPressure', 'remarks',
  ]);
  assert.equal(request.response_format.json_schema.schema.required.includes('onlyReferredToHospital'), true);
  assert.equal(request.response_format.json_schema.schema.required.includes('latestCheckupOnly'), true);
  assert.match(request.messages[0].content, /budget, funds, or assistance given.*assistanceAmount/i);
  assert.match(request.messages[0].content, /facility type.*facilityType/i);
  assert.match(request.messages[0].content, /laboratory requests.*laboratoryRequests/i);
  assert.match(request.messages[0].content, /onlyReferredToHospital=true.*referral value is Yes/i);
  assert.match(request.messages[0].content, /latestCheckupOnly=true.*latest saved check-up per beneficiary/i);
  assert.throws(() => validateMonitoringReportIntent({ metricIds: ['bmiInterpretation'] }, 'Child'), /unsupported monitoring report fields/);
  assert.deepEqual(validateMonitoringReportIntent({
    metricIds: ['hospitalReferral', 'assistanceAmount', 'facilityType'],
    onlyReferredToHospital: true,
    latestCheckupOnly: false,
  }, 'Mother').onlyReferredToHospital, true);
  assert.throws(() => validateMonitoringReportIntent({
    metricIds: ['facilityType'],
    onlyReferredToHospital: true,
    latestCheckupOnly: false,
  }, 'Mother'), /unsupported monitoring report fields/);
  assert.deepEqual(validateMonitoringReportIntent({
    metricIds: ['hospitalReferral', 'assistanceAmount', 'facilityType'],
    onlyReferredToHospital: false,
    latestCheckupOnly: false,
  }, 'Child').metricIds, ['hospitalReferral', 'assistanceAmount', 'facilityType']);
  await assert.rejects(createMonitoringReportIntent('BMI', 'Both', { env: modelEnvironment }), /Choose Mother or Child/);
});

test('AI note assistance only rewrites allowlisted note fields and returns an unsaved preview', async () => {
  let request;
  const revisedDraft = await createEntryAssistance('nutritionNotes', 'Child eats vegetables. No concerns reported.', {
    env: modelEnvironment,
    fetchImpl: async (url, options) => {
      request = JSON.parse(options.body);
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'The child eats vegetables. No concerns were reported.' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });
  assert.equal(revisedDraft, 'The child eats vegetables. No concerns were reported.');
  assert.match(request.messages[0].content, /do not invent/i);
  assert.equal(request.messages[1].content, 'Child eats vegetables. No concerns reported.');
  await assert.rejects(createEntryAssistance('birthDate', '2026-01-01', { env: modelEnvironment }), /supported notes field/);
  await assert.rejects(createEntryAssistance('nutritionNotes', 'x'.repeat(2001), { env: modelEnvironment }), /between 1 and 2,000/);
});

test('AI proposal sends the prompt and fixed metric catalog, never authenticated scope or beneficiary records', async () => {
  let request;
  const result = await createReportProposal('Compare child weight-for-age progress.', {
    env: modelEnvironment,
    fetchImpl: async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify({
              reportCategory: 'monitor',
              beneficiaryType: 'child',
              metricIds: ['weightForAgeInterpretation'],
              explanation: 'Review the selected growth measure.',
            }),
          },
        }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });

  assert.equal(result.metricIds[0], 'weightForAgeInterpretation');
  assert.equal(request.url, 'http://127.0.0.1:11434/v1/chat/completions');
  assert.equal(request.body.response_format.type, 'json_schema');
  const childMonitorSchema = request.body.response_format.json_schema.schema.anyOf.find(
    (variant) => variant.properties.reportCategory.const === 'monitor'
      && variant.properties.beneficiaryType.const === 'child',
  );
  assert.equal(childMonitorSchema.properties.metricIds.maxItems, 12);
  assert.deepEqual(
    childMonitorSchema.properties.metricIds.items.enum,
    [
      'measurementDate',
      'weightForAge',
      'heightForAge',
      'bmiForAge',
      'weightForLengthInterpretation',
      'weightForAgeInterpretation',
      'lengthForAgeInterpretation',
      'weightForLengthZScore',
      'weightForAgeZScore',
      'lengthForAgeZScore',
    ],
  );
  const motherMonitorSchema = request.body.response_format.json_schema.schema.anyOf.find(
    (variant) => variant.properties.reportCategory.const === 'monitor'
      && variant.properties.beneficiaryType.const === 'mother',
  );
  assert.ok(['measurementDate', 'weightForAge', 'heightForAge', 'bmiForAge', 'bmiInterpretation']
    .every((field) => motherMonitorSchema.properties.metricIds.items.enum.includes(field)));
  const serializedRequest = JSON.stringify(request.body);
  assert.match(serializedRequest, /Compare child weight-for-age progress/);
  assert.match(serializedRequest, /weightForAgeInterpretation/);
  assert.doesNotMatch(serializedRequest, /schoolId|groupId|batchId|beneficiaryId|patientName/i);
  assert.doesNotMatch(serializedRequest, /Jane A\. Doe|Mila Demo Coordinator/i);
});

test('AI summary forwards only approved aggregate values', async () => {
  let sentContent = '';
  const summary = await createReportSummary(
    { total: 8, averageProgress: 75, groupCount: 2, batchCount: 3, beneficiaryName: 'Sensitive name' },
    'monitor',
    'child',
    {
      env: modelEnvironment,
      fetchImpl: async (url, options) => {
        sentContent = JSON.parse(options.body).messages[1].content;
        return new Response(JSON.stringify({ choices: [{ message: { content: 'Eight records average 75% progress.' } }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  );
  assert.equal(summary, 'Eight records average 75% progress.');
  assert.deepEqual(JSON.parse(sentContent), {
    reportCategory: 'monitor',
    beneficiaryType: 'child',
    total: 8,
    averageProgress: 75,
    groupCount: 2,
    batchCount: 3,
  });
  assert.deepEqual(
    normalizeReportSummary({ total: 8, averageProgress: 75, groupCount: 2, batchCount: 3 }, 'profile'),
    { total: 8, groupCount: 2, batchCount: 3 },
  );
  assert.throws(() => normalizeReportSummary({ total: -1, averageProgress: 0, groupCount: 0, batchCount: 0 }), /Invalid aggregate/);
});

test('AI trend summaries forward validated aggregate measurement changes, never individual series', async () => {
  let sentContent = '';
  const summary = await createReportSummary(
    { total: 4, averageProgress: 60, groupCount: 1, batchCount: 1, names: ['Private beneficiary'] },
    'monitor',
    'mother',
    {
      trendStats: {
        metricId: 'bmiForAge',
        recordsWithMultipleMeasurements: 3,
        averageFirstValue: 24.2,
        averageLatestValue: 25.1,
        averageChange: 0.9,
        series: [{ beneficiary: 'Private beneficiary' }],
      },
      env: modelEnvironment,
      fetchImpl: async (url, options) => {
        sentContent = JSON.parse(options.body).messages[1].content;
        return new Response(JSON.stringify({ choices: [{ message: { content: 'Across three records, average BMI increased by 0.9.' } }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  );
  assert.match(summary, /average BMI increased/);
  assert.deepEqual(JSON.parse(sentContent).trend, {
    metric: 'BMI',
    recordsWithMultipleMeasurements: 3,
    averageFirstValue: 24.2,
    averageLatestValue: 25.1,
    averageChange: 0.9,
  });
  assert.doesNotMatch(sentContent, /Private beneficiary|series|beneficiaryName|beneficiaryId/i);
  assert.throws(() => normalizeReportSummary(
    { total: 4, averageProgress: 60, groupCount: 1, batchCount: 1 },
    'monitor',
    { metricId: 'philhealthNumber', recordsWithMultipleMeasurements: 1, averageFirstValue: 1, averageLatestValue: 2, averageChange: 1 },
  ), /Invalid aggregate monitoring trend/);
});

test('progress report AI endpoints require auth and do not pass user scope to the model', async (t) => {
  await pool.ready;
  const originalFetch = globalThis.fetch;
  const requestToApp = globalThis.fetch;
  const originalQuery = pool.query;
  const originalBaseUrl = process.env.PROGRESS_REPORT_AI_BASE_URL;
  const originalModel = process.env.PROGRESS_REPORT_AI_MODEL;
  const requests = [];
  process.env.PROGRESS_REPORT_AI_BASE_URL = modelEnvironment.PROGRESS_REPORT_AI_BASE_URL;
  process.env.PROGRESS_REPORT_AI_MODEL = modelEnvironment.PROGRESS_REPORT_AI_MODEL;
  globalThis.fetch = async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    const firstMessage = JSON.parse(options.body).messages[0]?.content || '';
    const content = url.endsWith('/chat/completions')
      ? firstMessage.includes('Convert the request into fields and filters for a read-only report')
        ? JSON.stringify({
          metricIds: ['measurementDate', 'bmi', 'hospitalReferral'],
          onlyReferredToHospital: false,
          latestCheckupOnly: false,
          explanation: 'Shows recorded check-up details.',
        })
        : firstMessage.includes('Translate the user request into a report configuration')
          ? JSON.stringify({ reportCategory: 'monitor', beneficiaryType: 'child', metricIds: ['weightForAgeInterpretation'] })
          : firstMessage.includes('Help edit a draft for the')
            ? 'The child eats vegetables. No concerns were reported.'
            : 'Summary of aggregate figures.'
      : '';
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  pool.query = async () => [[]];

  const app = express();
  app.use(express.json());
  app.use('/api/progress-report', verifyToken, authorizeOperational, authorizeProgressReport, progressReportRouter);
  const server = app.listen(0);
  t.after(async () => {
    globalThis.fetch = originalFetch;
    pool.query = originalQuery;
    if (originalBaseUrl === undefined) delete process.env.PROGRESS_REPORT_AI_BASE_URL;
    else process.env.PROGRESS_REPORT_AI_BASE_URL = originalBaseUrl;
    if (originalModel === undefined) delete process.env.PROGRESS_REPORT_AI_MODEL;
    else process.env.PROGRESS_REPORT_AI_MODEL = originalModel;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const baseUrl = `http://127.0.0.1:${server.address().port}/api/progress-report/ai`;
  const token = jwt.sign({ id: 17, role: 'Health Worker', school_id: 123, group_id: 456 }, process.env.JWT_SECRET);
  const unauthenticated = await requestToApp(`${baseUrl}/proposal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Show a child growth report.' }),
  });
  assert.equal(unauthenticated.status, 401);
  assert.equal(requests.length, 0);
  const unauthenticatedReport = await requestToApp(`${baseUrl}/monitoring-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ beneficiaryType: 'Mother', prompt: 'Show BMI.' }),
  });
  assert.equal(unauthenticatedReport.status, 401);
  assert.equal(requests.length, 0);
  const unauthenticatedEntryAssist = await requestToApp(`${baseUrl}/entry-assist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fieldId: 'nutritionNotes', draft: 'Draft.' }),
  });
  assert.equal(unauthenticatedEntryAssist.status, 401);
  assert.equal(requests.length, 0);

  const proposalResponse = await requestToApp(`${baseUrl}/proposal`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Show child weight-for-age progress.', schoolId: 999, groupId: 999 }),
  });
  assert.equal(proposalResponse.status, 200);
  assert.equal((await proposalResponse.json()).metricIds[0], 'weightForAgeInterpretation');
  const modelRequestText = JSON.stringify(requests[0].body);
  assert.doesNotMatch(modelRequestText, /123|456|999/);

  const entryAssistResponse = await requestToApp(`${baseUrl}/entry-assist`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fieldId: 'nutritionNotes', draft: 'Child eats vegetables. No concerns reported.' }),
  });
  assert.equal(entryAssistResponse.status, 200);
  assert.deepEqual(await entryAssistResponse.json(), {
    draft: 'The child eats vegetables. No concerns were reported.',
  });
  assert.equal(requests[1].body.messages[1].content, 'Child eats vegetables. No concerns reported.');

  const summaryResponse = await requestToApp(`${baseUrl}/summary`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reportCategory: 'monitor',
      beneficiaryType: 'child',
      summary: { total: 2, averageProgress: 50, groupCount: 1, batchCount: 1 },
      records: [{ name: 'Sensitive name', id: 12 }],
    }),
  });
  assert.equal(summaryResponse.status, 200);
  assert.equal((await summaryResponse.json()).summary, 'Summary of aggregate figures.');
  assert.doesNotMatch(JSON.stringify(requests[2].body), /Sensitive name|123|456|999/);

  const monitoringReportResponse = await requestToApp(`${baseUrl}/monitoring-report`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      beneficiaryType: 'Mother',
      prompt: 'Show saved BMI and hospital referral.',
      beneficiaryName: 'Jane Doe',
      checkups: [{ bmi: 25, referral: true }],
    }),
  });
  assert.equal(monitoringReportResponse.status, 200);
  assert.deepEqual(await monitoringReportResponse.json(), {
    beneficiaryType: 'Mother',
    metricIds: ['measurementDate', 'bmi', 'hospitalReferral'],
    onlyReferredToHospital: false,
    latestCheckupOnly: false,
    explanation: 'Shows recorded check-up details.',
  });
  assert.doesNotMatch(JSON.stringify(requests[3].body), /Jane Doe|checkups|123|456/);
});
