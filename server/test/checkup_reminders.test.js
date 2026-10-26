const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getLocalDate,
  getNotificationLink,
  getReminderStage,
  parseRunTime,
  runCheckupReminderJob,
} = require('../services/checkupReminders');

function schedule({
  id,
  type = 'mother',
  date,
  communityId = 11,
  groupId = 7,
  beneficiaryCode = `B-${id}`,
} = {}) {
  return {
    scheduleRecordId: id,
    beneficiaryType: type,
    beneficiaryId: id,
    beneficiaryCode,
    scheduledDate: date,
    beneficiaryName: `Beneficiary ${id}`,
    communityId,
    groupId,
    communityName: `Community ${communityId}`,
    groupName: `Group ${groupId}`,
    batchName: 'Batch A',
  };
}

function createDatabase({ mothers = [], children = [], recipients = {} } = {}) {
  const inserted = new Map();
  const notifications = [];
  const queries = [];
  return {
    inserted,
    notifications,
    queries,
    async query(sql, params = []) {
      queries.push({ sql, params });
      if (sql.includes('FROM mother_checkups mc')) return [mothers];
      if (sql.includes('FROM child_checkups cc')) return [children];
      if (sql.includes('FROM users u')) {
        return [(recipients[params[0]] || []).map((id) => ({ id }))];
      }
      if (sql.includes('INSERT INTO notifications')) {
        const key = params[9];
        notifications.push({ params, sql });
        if (inserted.has(key)) return [{ affectedRows: 0 }];
        inserted.set(key, params);
        return [{ affectedRows: 1 }];
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
}

test('maps date offsets to the four one-time reminder stages only', () => {
  assert.equal(getReminderStage('2026-10-29', '2026-10-26').key, '3_days');
  assert.equal(getReminderStage('2026-10-27', '2026-10-26').key, '1_day');
  assert.equal(getReminderStage('2026-10-26', '2026-10-26').key, 'today');
  assert.equal(getReminderStage('2026-10-25', '2026-10-26').key, 'missed_yesterday');
  assert.equal(getReminderStage('2026-10-28', '2026-10-26'), null);
  assert.equal(getReminderStage('2026-10-24', '2026-10-26'), null);
});

test('uses Asia/Manila calendar dates across UTC date boundaries', () => {
  assert.equal(getLocalDate(new Date('2026-10-25T15:59:00.000Z')), '2026-10-25');
  assert.equal(getLocalDate(new Date('2026-10-25T16:00:00.000Z')), '2026-10-26');
  assert.equal(getLocalDate(new Date('2026-12-31T16:30:00.000Z')), '2027-01-01');
});

test('validates the configured daily run time', () => {
  assert.deepEqual(parseRunTime('08:00'), { hour: 8, minute: 0 });
  assert.deepEqual(parseRunTime('23:59'), { hour: 23, minute: 59 });
  assert.throws(() => parseRunTime('8:00'), /HH:mm/);
  assert.throws(() => parseRunTime('24:00'), /HH:mm/);
});

test('creates all four notification stages for assigned recipients with isolated scope and profile links', async () => {
  const database = createDatabase({
    mothers: [
      schedule({ id: 101, date: '2026-10-29', communityId: 11 }),
      schedule({ id: 102, date: '2026-10-27', communityId: 11 }),
      schedule({ id: 103, date: '2026-10-26', communityId: 11 }),
      schedule({ id: 104, date: '2026-10-25', communityId: 11 }),
      schedule({ id: 105, date: '2026-10-28', communityId: 11 }),
      schedule({ id: 106, date: '2026-10-24', communityId: 11 }),
    ],
    children: [
      schedule({ id: 107, type: 'child', date: '2026-10-29', communityId: 22, groupId: 9 }),
    ],
    recipients: { 11: [31, 42, 42], 22: [81, 82] },
  });
  const now = new Date('2026-10-26T03:00:00.000Z');

  const result = await runCheckupReminderJob(database, { now });

  assert.deepEqual(result, { today: '2026-10-26', schedules: 7, created: 10 });
  assert.equal(database.notifications.length, 10);
  const motherMessages = database.notifications.filter(({ params }) => params[3] === 'mother');
  const messagesByStage = new Map(motherMessages.map(({ params }) => [params[0], params[2]]));
  assert.match(messagesByStage.get('checkup.reminder.3_days'), /in 3 days/);
  assert.match(messagesByStage.get('checkup.reminder.1_day'), /tomorrow/);
  assert.match(messagesByStage.get('checkup.reminder.today'), /due today/);
  assert.match(messagesByStage.get('checkup.reminder.missed_yesterday'), /still incomplete/);
  assert.match(messagesByStage.get('checkup.reminder.3_days'), /Maternal Check-Up/);
  assert.match(messagesByStage.get('checkup.reminder.3_days'), /Community: Community 11 · Group: Group 7 · Batch: Batch A/);
  assert.deepEqual(new Set(motherMessages.map(({ params }) => params[8])), new Set(['31', '42']));
  assert.deepEqual(new Set(database.notifications.filter(({ params }) => params[3] === 'child').map(({ params }) => params[8])), new Set(['81', '82']));
  assert.ok(database.notifications.every(({ params }) => params[6] === 11 || params[6] === 22));
  assert.equal(database.notifications.find(({ params }) => params[3] === 'child').params[5], '/beneficiary/child/B-107/profile');
  assert.equal(getNotificationLink(schedule({ id: 201, type: 'mother', date: '2026-10-29' })), '/beneficiary/mother/B-201/monitoring');
  assert.ok(database.notifications.every(({ params }) => params[9].includes(params[8])));

  const recipientQueries = database.queries.filter(({ sql }) => sql.includes('FROM users u'));
  assert.deepEqual(recipientQueries.map(({ params }) => params[0]), [11, 11, 11, 11, 22]);
  assert.match(recipientQueries[0].sql, /u\.id = c\.coordinator_id/);
  assert.match(recipientQueries[0].sql, /u\.school_id = c\.id/);
  assert.match(recipientQueries[0].sql, /healthworker/);
  assert.match(recipientQueries[0].sql, /u\.group_id = \?/);
});

test('prevents duplicates across repeated runs and duplicate schedule rows', async () => {
  const due = schedule({ id: 301, date: '2026-10-26' });
  const database = createDatabase({
    mothers: [due, due],
    recipients: { 11: [31] },
  });
  const now = new Date('2026-10-26T03:00:00.000Z');

  const firstRun = await runCheckupReminderJob(database, { now });
  const secondRun = await runCheckupReminderJob(database, { now });

  assert.equal(firstRun.created, 1);
  assert.equal(secondRun.created, 0);
  assert.equal(database.inserted.size, 1);
  assert.match([...database.inserted.keys()][0], /mother:301:2026-10-26:today:31/);
});

test('uses current rescheduled dates and query-side completion/cancellation guards without overdue catch-up', async () => {
  const database = createDatabase({
    mothers: [
      schedule({ id: 401, date: '2026-10-29' }),
      schedule({ id: 402, date: '2026-10-24' }),
    ],
    recipients: { 11: [31] },
  });
  const now = new Date('2026-10-26T03:00:00.000Z');

  const result = await runCheckupReminderJob(database, { now });

  assert.equal(result.created, 1);
  assert.match(database.notifications[0].params[9], /2026-10-29/);
  const maternalQuery = database.queries.find(({ sql }) => sql.includes('FROM mother_checkups mc')).sql;
  const childQuery = database.queries.find(({ sql }) => sql.includes('FROM child_checkups cc')).sql;
  for (const sql of [maternalQuery, childQuery]) {
    assert.match(sql, /NOT EXISTS/);
    assert.match(sql, /completed\.(checkup_date|visit_date) >= .*next_checkup_date/);
    assert.match(sql, /next_checkup_date BETWEEN DATE_SUB\(\?, INTERVAL 1 DAY\) AND DATE_ADD\(\?, INTERVAL 3 DAY\)/);
    assert.match(sql, /cancelled/);
  }
  assert.deepEqual(
    database.queries.filter(({ sql }) => sql.includes('FROM mother_checkups mc'))[0].params,
    ['2026-10-26', '2026-10-26'],
  );

  const cancelledOrCompleted = createDatabase();
  const emptyResult = await runCheckupReminderJob(cancelledOrCompleted, { now });
  assert.equal(emptyResult.created, 0);
  assert.equal(cancelledOrCompleted.notifications.length, 0);
});

test('uses notification history defaults and category expected by the existing unread/read API', async () => {
  const database = createDatabase({
    children: [schedule({ id: 501, type: 'child', date: '2026-10-26' })],
    recipients: { 11: [31] },
  });

  await runCheckupReminderJob(database, { now: new Date('2026-10-26T03:00:00.000Z') });

  const { params, sql } = database.notifications[0];
  assert.match(sql, /INSERT INTO notifications/);
  assert.match(sql, /'Monitoring'/);
  assert.match(sql, /idempotency_key/);
  assert.equal(params[0], 'checkup.reminder.today');
  assert.equal(params[1], 'Check-Up Due Today');
  assert.equal(params[3], 'child');
  assert.equal(params[5], '/beneficiary/child/B-501/profile');
  assert.equal(params[8], '31');
});
