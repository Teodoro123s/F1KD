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
  createDashboardInsight,
  createMonitoringReportIntent,
  createReportProposal,
  getAIConfiguration,
  normalizeDashboardMetrics,
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

test('dashboard AI receives only validated aggregate metrics and returns a concise insight', async () => {
  let request;
  const insight = await createDashboardInsight({
    motherCount: 12,
    childCount: 8,
    followUpCount: 3,
    operationalAccounts: 8,
    communitySchools: 4,
    communityGroups: 9,
    operationalSignInsLast30Days: 36,
    unreadNotifications: 2,
  }, 'What should I review?', {
    env: modelEnvironment,
    fetchImpl: async (url, options) => {
      request = JSON.parse(options.body);
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'There are 20 beneficiaries and 3 follow-ups to review.' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });

  assert.equal(insight, 'There are 20 beneficiaries and 3 follow-ups to review.');
  assert.deepEqual(JSON.parse(request.messages[1].content), {
    question: 'What should I review?',
    metrics: {
      motherCount: 12,
      childCount: 8,
      followUpCount: 3,
      operationalAccounts: 8,
      communitySchools: 4,
      communityGroups: 9,
      operationalSignInsLast30Days: 36,
      unreadNotifications: 2,
    },
  });
  assert.doesNotMatch(JSON.stringify(request.messages), /Jane Doe|beneficiary ID|birth date/i);
  assert.throws(() => normalizeDashboardMetrics({ mothers: 3 }), /supported non-negative aggregate counts/);
  assert.throws(() => normalizeDashboardMetrics({ motherCount: -1 }), /supported non-negative aggregate counts/);
  await assert.rejects(createDashboardInsight({ motherCount: 1 }, 'x'.repeat(501), { env: modelEnvironment }), /no longer than 500 characters/);
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

test('maternal monitoring AI reports can filter yes referrals and include assistance details', async () => {
  const intent = await createMonitoringReportIntent(
    'Show mother referral to hospital, only the yes, only the latest check-up, then facility type, source of funds, assistance amount, and laboratory requests.',
    'Mother',
  );

  assert.deepEqual(intent, {
    beneficiaryType: 'Mother',
    metricIds: ['measurementDate', 'hospitalReferral', 'laboratoryRequests', 'assistanceAmount', 'sourceOfFunds', 'facilityType'],
    onlyReferredToHospital: true,
    onlyNonNormalScreenings: false,
    developmentalStatusFilter: [],
    latestCheckupOnly: true,
    firstCheckupOnly: false,
    currentMonthOnly: false,
    explanation: 'Showing check-up date, hospital referral, laboratory requests, assistance amount (php), source of funds, facility / referral source for mothers with a recorded hospital referral and the latest saved check-up per beneficiary.',
  });
  assert.throws(() => validateMonitoringReportIntent({ metricIds: ['bmiInterpretation'] }, 'Child'), /unsupported monitoring report fields/);
  assert.deepEqual(validateMonitoringReportIntent({
    metricIds: ['hospitalReferral', 'assistanceAmount', 'facilityType'],
    onlyReferredToHospital: true,
    latestCheckupOnly: false,
  }, 'Mother').onlyReferredToHospital, true);
  assert.throws(() => validateMonitoringReportIntent({
    metricIds: ['facilityType'],
    onlyReferredToHospital: true,
    onlyNonNormalScreenings: false,
    latestCheckupOnly: false,
  }, 'Mother'), /unsupported monitoring report fields/);
  await assert.rejects(
    createMonitoringReportIntent('BMI', 'Both', { env: modelEnvironment }),
    /Start the request with Mother\/Mothers or Child\/Children/,
  );
});

test('child monitoring AI reports include child form fields and exclude fields not in that form', async () => {
  let request;
  const intent = await createMonitoringReportIntent(
    'Show only details.',
    'Child',
    {
      env: modelEnvironment,
      fetchImpl: async (url, options) => {
        request = JSON.parse(options.body);
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                metricIds: ['measurementDate'],
                onlyReferredToHospital: false,
                onlyNonNormalScreenings: false,
                latestCheckupOnly: false,
                explanation: 'Shows child check-up dates.',
              }),
            },
          }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      },
    },
  );

  assert.deepEqual(intent.metricIds, ['measurementDate']);
  assert.deepEqual(request.response_format.json_schema.schema.properties.metricIds.items.enum, [
    'measurementDate', 'nextCheckupDate', 'currentAgeMonths', 'breastfeedingStatus', 'weight', 'height', 'bmi',
    'weightForAgeInterpretation', 'lengthForAgeInterpretation', 'weightForLengthInterpretation',
    'developmentalStatus', 'serviceProvider', 'remarks',
  ]);
  assert.match(request.messages[0].content, /fields not recorded by the child check-up form/i);
  for (const metricId of ['hospitalReferral', 'laboratoryRequests', 'assistanceAmount', 'sourceOfFunds', 'facilityType', 'labAssistanceProvided']) {
    assert.throws(() => validateMonitoringReportIntent({
      metricIds: [metricId],
      onlyReferredToHospital: false,
      onlyNonNormalScreenings: false,
      latestCheckupOnly: false,
    }, 'Child'), /unsupported monitoring report fields/);
  }
  for (const metricId of [
    'bmi',
    'weightForAgeInterpretation',
    'lengthForAgeInterpretation',
    'weightForLengthInterpretation',
    'serviceProvider',
    'currentAgeMonths',
    'breastfeedingStatus',
  ]) {
    assert.doesNotThrow(() => validateMonitoringReportIntent({
      metricIds: [metricId],
      onlyReferredToHospital: false,
      onlyNonNormalScreenings: false,
      latestCheckupOnly: false,
    }, 'Child'));
  }
  assert.throws(() => validateMonitoringReportIntent({
    metricIds: ['measurementDate'],
    onlyReferredToHospital: true,
    onlyNonNormalScreenings: false,
    latestCheckupOnly: false,
  }, 'Child'), /unsupported monitoring report fields/);
});

test('monitoring AI field matching selects requested mother and child check-up form fields', async () => {
  const motherIntent = await createMonitoringReportIntent(
    'Show mothers with BMI value and BMI status, service provider, blood pressure, developmental screening, lab requests, assistance amount, gestational age, fundal height, fetal heart rate, next check-up date, and remarks.',
    'Mother',
  );

  assert.deepEqual(new Set(motherIntent.metricIds), new Set([
    'bmiInterpretation', 'bmi', 'serviceProvider', 'bloodPressure', 'developmentalStatus',
    'laboratoryRequests', 'assistanceAmount', 'gestationalAge', 'fundalHeight',
    'fetalHeartRate', 'nextCheckupDate', 'remarks',
  ]));

  const childIntent = await createMonitoringReportIntent(
    'Show children BMI value, weight-for-age, length-for-age, and weight-for-length interpretations, plus provider, breastfeeding status, current age, and notes.',
    'Child',
    { env: modelEnvironment },
  );
  assert.deepEqual(childIntent.metricIds, [
    'currentAgeMonths',
    'breastfeedingStatus',
    'bmi',
    'weightForAgeInterpretation',
    'lengthForAgeInterpretation',
    'weightForLengthInterpretation',
    'serviceProvider',
    'remarks',
  ]);
});

test('monitoring AI reports can find beneficiaries with non-normal developmental screenings', async () => {
  const intent = await createMonitoringReportIntent(
    'Find mothers with non-normal developmental screenings.',
    'Mother',
  );

  assert.equal(intent.onlyNonNormalScreenings, true);
  assert.deepEqual(intent.metricIds, ['developmentalStatus']);
  assert.deepEqual(validateMonitoringReportIntent({
    metricIds: ['developmentalStatus'],
    onlyReferredToHospital: false,
    onlyNonNormalScreenings: true,
    latestCheckupOnly: false,
  }, 'Child').metricIds, ['developmentalStatus']);
  assert.throws(() => validateMonitoringReportIntent({
    metricIds: ['measurementDate'],
    onlyReferredToHospital: false,
    onlyNonNormalScreenings: true,
    latestCheckupOnly: false,
  }, 'Mother'), /unsupported monitoring report fields/);
});

test('AI proposal sends the prompt and fixed metric catalog, never authenticated scope or beneficiary records', async () => {
  let request;
  const result = await createReportProposal('Compare child weight-for-age interpretation progress.', {
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
  assert.equal(request.body.max_tokens, 384);
  const schemaVariants = request.body.response_format.json_schema.schema.anyOf;
  assert.equal(schemaVariants.length, 7);
  const childMonitorSchema = schemaVariants.find(
    (variant) => variant.properties.reportCategory.const === 'monitor'
      && variant.properties.beneficiaryType.const === 'child',
  );
  assert.equal(childMonitorSchema.properties.metricIds.maxItems, 12);
  assert.deepEqual(childMonitorSchema.properties.metricIds.items.enum, [
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
  ]);
  const motherMonitorSchema = schemaVariants.find(
    (variant) => variant.properties.reportCategory.const === 'monitor'
      && variant.properties.beneficiaryType.const === 'mother',
  );
  assert.ok(['measurementDate', 'weightForAge', 'heightForAge', 'bmiForAge', 'bmiInterpretation']
    .every((field) => motherMonitorSchema.properties.metricIds.items.enum.includes(field)));
  const serializedRequest = JSON.stringify(request.body);
  assert.match(serializedRequest, /Compare child weight-for-age interpretation progress/);
  assert.match(serializedRequest, /weightForAgeInterpretation/);
  assert.doesNotMatch(serializedRequest, /schoolId|groupId|batchId|beneficiaryId|patientName/i);
  assert.doesNotMatch(serializedRequest, /Jane A\. Doe|Mila Demo Coordinator/i);
});

test('AI proposals retain only explicitly requested fields when the model adds related metrics', async () => {
  const result = await createReportProposal(
    "Show each child's check-up date, weight-for-age interpretation, and height-for-age interpretation.",
    {
      env: modelEnvironment,
      fetchImpl: async () => new Response(JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify({
              reportCategory: 'monitor',
              beneficiaryType: 'child',
              profileMetricIds: [],
              metricIds: [
                'measurementDate',
                'weightForAge',
                'heightForAge',
                'bmiForAge',
                'weightForLengthInterpretation',
                'weightForAgeInterpretation',
                'lengthForAgeInterpretation',
                'weightForLengthZScore',
              ],
              explanation: 'Shows requested growth interpretations.',
            }),
          },
        }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    },
  );

  assert.deepEqual(result.metricIds, [
    'measurementDate',
    'weightForAgeInterpretation',
    'lengthForAgeInterpretation',
  ]);
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
  const unauthenticatedDashboardInsight = await requestToApp(`${baseUrl}/dashboard-insight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metrics: { motherCount: 12 } }),
  });
  assert.equal(unauthenticatedDashboardInsight.status, 401);
  assert.equal(requests.length, 0);
  const proposalResponse = await requestToApp(`${baseUrl}/proposal`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Show child weight-for-age interpretation progress.', schoolId: 999, groupId: 999 }),
  });
  assert.equal(proposalResponse.status, 200);
  assert.equal((await proposalResponse.json()).metricIds[0], 'weightForAgeInterpretation');
  const modelRequestText = JSON.stringify(requests[0].body);
  assert.doesNotMatch(modelRequestText, /123|456|999/);

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
    onlyNonNormalScreenings: false,
    latestCheckupOnly: false,
    explanation: 'Shows recorded check-up details.',
  });
  assert.doesNotMatch(JSON.stringify(requests[1].body), /Jane Doe|checkups|123|456/);

  const superAdminToken = jwt.sign({ id: 18, role: 'Super Admin' }, process.env.JWT_SECRET);
  const superAdminMonitoringReportResponse = await requestToApp(`${baseUrl}/monitoring-report`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${superAdminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ beneficiaryType: 'Mother', prompt: 'Show saved BMI.' }),
  });
  assert.equal(superAdminMonitoringReportResponse.status, 403);
  assert.equal(requests.length, 2);

  const dashboardInsightResponse = await requestToApp(`${baseUrl}/dashboard-insight`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      metrics: { motherCount: 12, childCount: 8, followUpCount: 3 },
      question: 'What should I review?',
      records: [{ name: 'Jane Doe', id: 12 }],
    }),
  });
  const dashboardInsightBody = await dashboardInsightResponse.json();
  assert.equal(dashboardInsightResponse.status, 200, JSON.stringify(dashboardInsightBody));
  assert.deepEqual(dashboardInsightBody, { insight: 'Summary of aggregate figures.' });
  assert.doesNotMatch(JSON.stringify(requests[2].body), /Jane Doe|records|123|456/);

  for (const endpoint of ['admin-assistant', 'beneficiary-assistant', 'program-assistant', 'entry-assist']) {
    const removedAssistantResponse = await requestToApp(`${baseUrl}/${endpoint}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'test' }),
    });
    assert.equal(removedAssistantResponse.status, 403, `${endpoint} should no longer be available`);
  }
  assert.equal(requests.length, 3);
});
