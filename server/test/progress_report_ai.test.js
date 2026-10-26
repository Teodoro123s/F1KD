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
const { attachVaccineProfileFields } = progressReportRouter;
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
  const detailedProfileMetrics = [
    'civilStatus',
    'employmentStatus',
    'educationalAttainment',
    'totalChildren',
    'childrenBornAlive',
    'obHistory',
    'allergies',
    'maternalCondition_hypertension',
    'dentalWork_tartarRemoval',
    'influenzaDose2Date',
    'covid19Remarks',
  ];
  assert.deepEqual(validateReportProposal({
    reportCategory: 'profile',
    beneficiaryType: 'mother',
    metricIds: detailedProfileMetrics,
  }).metricIds, detailedProfileMetrics);
  assert.deepEqual(validateReportProposal({
    reportCategory: 'profile',
    beneficiaryType: 'child',
    metricIds: [
      'headCircumference',
      'chestCircumference',
      'childCongenitalHeartDisease',
      'ipvDose1Date',
      'pcvDose3Date',
      'mmrRemarks',
    ],
  }).metricIds, [
    'headCircumference',
    'chestCircumference',
    'childCongenitalHeartDisease',
    'ipvDose1Date',
    'pcvDose3Date',
    'mmrRemarks',
  ]);
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

test('profile vaccine details expose individual child doses and maternal vaccine subfields', async () => {
  const originalQuery = pool.query;
  try {
    pool.query = async (sql) => [sql.includes('child_vaccinations')
      ? [
        { beneficiary_id: 22, vaccine_name: 'BCG', dose_number: 1, vaccine_date: '2026-01-02', remarks: 'Clinic A' },
        { beneficiary_id: 22, vaccine_name: 'IPV', dose_number: 2, vaccine_date: '2026-02-03', remarks: null },
        { beneficiary_id: 22, vaccine_name: 'PCV', dose_number: 3, vaccine_date: '2026-03-04', remarks: null },
      ]
      : [
        { beneficiary_id: 11, vaccine_name: 'TT1', vaccine_date: '2025-11-01', remarks: 'Dose one' },
        { beneficiary_id: 11, vaccine_name: 'Hepatitis A Dose 2', vaccine_date: '2025-12-02', remarks: null },
        { beneficiary_id: 11, vaccine_name: 'COVID-19 Dose 3', vaccine_date: '2026-01-03', remarks: null },
      ]];

    const childRows = [{ childId: 22 }];
    await attachVaccineProfileFields(childRows, 'child');
    assert.equal(childRows[0].bcgDose1Date, '2026-01-02');
    assert.equal(childRows[0].ipvDose2Date, '2026-02-03');
    assert.equal(childRows[0].pcvDose3Date, '2026-03-04');
    assert.equal(childRows[0].bcgRemarks, 'Dose 1: Clinic A');
    assert.deepEqual(childRows[0].bcgDate, {
      doses: [{ dose: 1, date: '2026-01-02' }],
      remarks: 'Dose 1: Clinic A',
    });

    const motherRows = [{ motherId: 11 }];
    await attachVaccineProfileFields(motherRows, 'mother');
    assert.equal(motherRows[0].tt1Date, '2025-11-01');
    assert.equal(motherRows[0].tt1Remarks, 'Dose one');
    assert.equal(motherRows[0].hepatitisADose2Date, '2025-12-02');
    assert.equal(motherRows[0].covid19Dose3Date, '2026-01-03');
    assert.deepEqual(motherRows[0].ttVaccineRecord, {
      doses: [{ dose: 1, date: '2025-11-01' }],
      remarks: 'Dose one',
    });
  } finally {
    pool.query = originalQuery;
  }
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
              reportCategory: 'profile',
              beneficiaryType: 'child',
              profileMetricIds: [],
              metricIds: [],
              explanation: '',
            }),
          },
        }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });

  assert.equal(result.needsClarification, true);
  assert.equal(result.options.length, 2);
  assert.match(request.messages[0].content, /ask which one instead of guessing/);
  assert.match(request.messages[0].content, /Beneficiary\/profile details/);
  assert.match(request.messages[0].content, /program benefits or receipts/);
  assert.deepEqual(request.response_format, { type: 'json_object' });
});

test('clear latest maternal BMI requests and their answers do not trigger another AI clarification', async () => {
  const requests = [
    {
      prompt: 'SWU mother latest BMI',
      expected: ['measurementDate', 'bmiForAge'],
    },
    {
      prompt: 'mother latest BMI\nClarification: BMI screening interpretation',
      expected: ['measurementDate', 'bmiInterpretation'],
    },
    {
      prompt: 'mother latest BMI\nClarification: Both value and interpretation',
      expected: ['measurementDate', 'bmiForAge', 'bmiInterpretation'],
    },
  ];

  for (const { prompt, expected } of requests) {
    const proposal = await createReportProposal(prompt, {
      env: modelEnvironment,
      fetchImpl: async () => {
        throw new Error('A clear maternal BMI request should not call the AI service.');
      },
    });

    assert.deepEqual(proposal, {
      reportCategory: 'monitor',
      beneficiaryType: 'mother',
      metricIds: expected,
      explanation: 'Latest BMI from the mother’s check-up history.',
    });
  }
});

test('maternal BMI requests for a specific trimester check-up resolve without AI clarification', async () => {
  const proposal = await createReportProposal('Mother: BMI T3-c3 if available', {
    env: modelEnvironment,
    fetchImpl: async () => {
      throw new Error('Specific maternal check-up slots should not call the AI service.');
    },
  });

  assert.deepEqual(proposal, {
    reportCategory: 'monitor',
    beneficiaryType: 'mother',
    metricIds: ['bmiForAge'],
    explanation: 'Mother BMI from check-up history.',
  });
});

test('child BMI clarification offers the three growth indicators and maps the chosen indicator', async () => {
  const proposals = [
    {
      prompt: 'SWU child latest BMI',
      expectedClarification: {
        needsClarification: true,
        question: 'Which child growth indicator do you mean by BMI?',
        options: ['Weight-for-Length/Height', 'Weight-for-Age', 'Length/Height-for-Age'],
      },
    },
    {
      prompt: 'child latest BMI\nClarification: Weight-for-Length/Height',
      expectedMetric: 'weightForLengthInterpretation',
    },
    {
      prompt: 'child latest BMI\nClarification: Weight-for-Age',
      expectedMetric: 'weightForAgeInterpretation',
    },
    {
      prompt: 'child latest BMI\nClarification: Length/Height-for-Age',
      expectedMetric: 'lengthForAgeInterpretation',
    },
    {
      prompt: 'child BMI height-for-age',
      expectedMetric: 'lengthForAgeInterpretation',
    },
  ];

  for (const { prompt, expectedClarification, expectedMetric } of proposals) {
    const proposal = await createReportProposal(prompt, {
      env: modelEnvironment,
      fetchImpl: async () => {
        throw new Error('Child BMI requests should resolve without another AI call.');
      },
    });

    if (expectedClarification) {
      assert.deepEqual(proposal, expectedClarification);
    } else {
      assert.deepEqual(proposal, {
        reportCategory: 'monitor',
        beneficiaryType: 'child',
        metricIds: [expectedMetric],
        explanation: 'Showing the requested child growth indicator from check-up history.',
      });
    }
  }
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
              needsClarification: false,
              question: '',
              options: [],
              reportCategory: 'monitor',
              beneficiaryType: 'child',
              profileMetricIds: [],
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
  assert.deepEqual(request.body.response_format, { type: 'json_object' });
  assert.equal(request.body.max_completion_tokens, 2048);
  assert.equal(request.body.reasoning_effort, 'low');
  const serializedRequest = JSON.stringify(request.body);
  assert.match(serializedRequest, /Compare child weight-for-age interpretation progress/);
  assert.match(serializedRequest, /weightForAgeInterpretation/);
  assert.doesNotMatch(serializedRequest, /schoolId|groupId|batchId|beneficiaryId|patientName/i);
  assert.doesNotMatch(serializedRequest, /Jane A\. Doe|Mila Demo Coordinator/i);
});

test('AI proposal logs a bounded provider error detail without exposing credentials to the client', async () => {
  const originalConsoleError = console.error;
  const loggedErrors = [];
  console.error = (...args) => loggedErrors.push(args.join(' '));

  try {
    await assert.rejects(createReportProposal('mother bmi', {
      env: modelEnvironment,
      fetchImpl: async () => new Response(JSON.stringify({
        error: {
          type: 'invalid_request_error',
          code: 'invalid_json_schema',
          param: 'response_format',
          message: 'Unsupported schema keyword maxItems; token sk-testsecret',
        },
      }), { status: 400, headers: { 'Content-Type': 'application/json' } }),
    }), /The private AI service returned status 400\./);
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(loggedErrors.length, 1);
  assert.match(loggedErrors[0], /invalid_json_schema response_format/);
  assert.match(loggedErrors[0], /Unsupported schema keyword maxItems/);
  assert.doesNotMatch(loggedErrors[0], /sk-testsecret/);
  assert.ok(loggedErrors[0].length < 600);
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
              needsClarification: false,
              question: '',
              options: [],
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

test('AI profile-section requests expand into the tab subfields', async () => {
  const result = await createReportProposal(
    'Create a mother profile report with General, Prenatal/OB, Medical/Dental, and Vaccine sections.',
    {
      env: modelEnvironment,
      fetchImpl: async () => new Response(JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify({
              reportCategory: 'profile',
              beneficiaryType: 'mother',
              metricIds: ['medicalConditions'],
              profileMetricIds: [],
              explanation: '',
            }),
          },
        }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    },
  );

  assert.ok(result.metricIds.length > 8);
  assert.ok(result.metricIds.includes('civilStatus'));
  assert.ok(result.metricIds.includes('totalChildren'));
  assert.ok(result.metricIds.includes('maternalCondition_hypertension'));
  assert.ok(result.metricIds.includes('dentalWork_tartarRemoval'));
  assert.ok(result.metricIds.includes('tt2Date'));
  assert.ok(result.metricIds.includes('covid19Dose3Date'));
});

test('child monitor proposals include all three growth indicators when requested', async () => {
  const result = await createReportProposal(
    'Show the latest BMI and all 3 measurements for child growth.',
    {
      env: modelEnvironment,
      fetchImpl: async () => {
        throw new Error('All three child BMI indicators should resolve without another AI call.');
      },
    },
  );

  assert.deepEqual(result.metricIds, [
    'weightForLengthInterpretation',
    'weightForAgeInterpretation',
    'lengthForAgeInterpretation',
  ]);
});

test('child monitor requests for latest three growth metrics include all indicators', async () => {
  const result = await createReportProposal(
    'SWU child latest 3 metric growth measurement each child',
    {
      env: modelEnvironment,
      fetchImpl: async () => {
        throw new Error('The explicit three-metric request should resolve without an AI call.');
      },
    },
  );

  assert.equal(result.reportCategory, 'monitor');
  assert.deepEqual(result.metricIds, [
    'weightForLengthInterpretation',
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
