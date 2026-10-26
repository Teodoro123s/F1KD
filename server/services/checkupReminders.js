const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TIME_ZONE = 'Asia/Manila';
const DEFAULT_RUN_TIME = '08:00';

const REMINDER_STAGES = new Map([
  [3, {
    key: '3_days',
    title: 'Upcoming Check-Up',
    describe: ({ beneficiaryType, name, checkupType, scheduledDate }) =>
      `Upcoming check-up: ${beneficiaryType} ${name} is scheduled for a ${checkupType} on ${scheduledDate}, in 3 days.`,
  }],
  [1, {
    key: '1_day',
    title: 'Check-Up Tomorrow',
    describe: ({ beneficiaryType, name, checkupType, scheduledDate }) =>
      `Check-up reminder: ${beneficiaryType} ${name} is scheduled for a ${checkupType} tomorrow, ${scheduledDate}.`,
  }],
  [0, {
    key: 'today',
    title: 'Check-Up Due Today',
    describe: ({ beneficiaryType, name, checkupType, scheduledDate }) =>
      `Check-up due today: ${beneficiaryType} ${name} is scheduled for a ${checkupType} today, ${scheduledDate}.`,
  }],
  [-1, {
    key: 'missed_yesterday',
    title: 'Missed Check-Up',
    describe: ({ beneficiaryType, name, checkupType, scheduledDate }) =>
      `Missed check-up: ${beneficiaryType} ${name} had a scheduled ${checkupType} yesterday, ${scheduledDate}, which is still incomplete.`,
  }],
]);

const SCHEDULE_QUERIES = {
  mother: `SELECT
      'mother' AS beneficiaryType,
      mc.id AS scheduleRecordId,
      m.id AS beneficiaryId,
      m.mother_code AS beneficiaryCode,
      DATE_FORMAT(mc.next_checkup_date, '%Y-%m-%d') AS scheduledDate,
      TRIM(CONCAT_WS(' ', m.first_name, m.middle_name, m.last_name, m.maiden_surname, m.suffix)) AS beneficiaryName,
      c.id AS communityId,
      m.group_id AS groupId,
      c.name AS communityName,
      g.name AS groupName,
      b.name AS batchName
    FROM mother_checkups mc
    INNER JOIN mothers m ON m.id = mc.mother_id
    LEFT JOIN communities c ON c.id = m.community_id
    LEFT JOIN groups g ON g.id = m.group_id
    LEFT JOIN batches b ON b.id = m.batch_id
    WHERE mc.next_checkup_date BETWEEN DATE_SUB(?, INTERVAL 1 DAY) AND DATE_ADD(?, INTERVAL 3 DAY)
      AND LOWER(COALESCE(m.status, 'active')) NOT IN ('inactive', 'cancelled', 'canceled', 'archived')
      AND NOT EXISTS (
        SELECT 1 FROM mother_checkups completed
        WHERE completed.mother_id = mc.mother_id
          AND completed.checkup_date >= mc.next_checkup_date
      )`,
  child: `SELECT
      'child' AS beneficiaryType,
      cc.id AS scheduleRecordId,
      ch.id AS beneficiaryId,
      ch.child_code AS beneficiaryCode,
      DATE_FORMAT(cc.next_checkup_date, '%Y-%m-%d') AS scheduledDate,
      TRIM(CONCAT_WS(' ', ch.first_name, ch.middle_name, ch.last_name, ch.suffix)) AS beneficiaryName,
      COALESCE(ch.community_id, m.community_id) AS communityId,
      COALESCE(ch.group_id, m.group_id) AS groupId,
      c.name AS communityName,
      g.name AS groupName,
      b.name AS batchName
    FROM child_checkups cc
    INNER JOIN children ch ON ch.id = cc.child_id
    LEFT JOIN mothers m ON m.id = ch.mother_id
    LEFT JOIN communities c ON c.id = COALESCE(ch.community_id, m.community_id)
    LEFT JOIN groups g ON g.id = COALESCE(ch.group_id, m.group_id)
    LEFT JOIN batches b ON b.id = COALESCE(ch.batch_id, m.batch_id)
    WHERE cc.next_checkup_date BETWEEN DATE_SUB(?, INTERVAL 1 DAY) AND DATE_ADD(?, INTERVAL 3 DAY)
      AND LOWER(COALESCE(m.status, 'active')) NOT IN ('inactive', 'cancelled', 'canceled', 'archived')
      AND NOT EXISTS (
        SELECT 1 FROM child_checkups completed
        WHERE completed.child_id = cc.child_id
          AND completed.visit_date >= cc.next_checkup_date
      )`,
};

function getDateParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

function getLocalDate(date, timeZone = DEFAULT_TIME_ZONE) {
  const parts = getDateParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getDayDifference(dateA, dateB) {
  const [yearA, monthA, dayA] = dateA.split('-').map(Number);
  const [yearB, monthB, dayB] = dateB.split('-').map(Number);
  const timestampA = Date.UTC(yearA, monthA - 1, dayA);
  const timestampB = Date.UTC(yearB, monthB - 1, dayB);
  return Math.round((timestampA - timestampB) / DAY_MS);
}

function getReminderStage(scheduledDate, today) {
  return REMINDER_STAGES.get(getDayDifference(scheduledDate, today)) || null;
}

function getCheckupType(beneficiaryType) {
  return beneficiaryType === 'mother' ? 'Maternal Check-Up' : 'Child Check-Up';
}

function getNotificationMessage(schedule, stage) {
  const checkupType = getCheckupType(schedule.beneficiaryType);
  const baseMessage = stage.describe({
    beneficiaryType: schedule.beneficiaryType === 'mother' ? 'Mother' : 'Child',
    name: schedule.beneficiaryName,
    checkupType,
    scheduledDate: schedule.scheduledDate,
  });
  const location = [
    schedule.communityName && `Community: ${schedule.communityName}`,
    schedule.groupName && `Group: ${schedule.groupName}`,
    schedule.batchName && `Batch: ${schedule.batchName}`,
  ].filter(Boolean);
  return location.length ? `${baseMessage} ${location.join(' · ')}.` : baseMessage;
}

function getNotificationLink(schedule) {
  const identifier = encodeURIComponent(schedule.beneficiaryCode || schedule.beneficiaryId);
  return schedule.beneficiaryType === 'mother'
    ? `/beneficiary/mother/${identifier}/monitoring`
    : `/beneficiary/child/${identifier}/profile`;
}

function getIdempotencyKey(schedule, stage, recipientId) {
  return `checkup:${schedule.beneficiaryType}:${schedule.scheduleRecordId}:${schedule.scheduledDate}:${stage.key}:${recipientId}`;
}

async function getScheduledCheckups(database, today) {
  const schedules = [];
  for (const [beneficiaryType, sql] of Object.entries(SCHEDULE_QUERIES)) {
    const [rows] = await database.query(sql, [today, today]);
    schedules.push(...rows.map((row) => ({ ...row, beneficiaryType })));
  }
  return schedules;
}

async function getAssignedRecipients(database, communityId, groupId) {
  if (!Number.isInteger(Number(communityId)) || Number(communityId) <= 0) return [];
  const [rows] = await database.query(
    `SELECT DISTINCT u.id
     FROM users u
     INNER JOIN communities c ON c.id = ?
     LEFT JOIN notification_preferences np
       ON np.user_id = u.id AND np.category = 'Monitoring' AND np.enabled = FALSE
     WHERE LOWER(TRIM(u.status)) = 'active'
       AND np.user_id IS NULL
       AND (
         (
           LOWER(REPLACE(REPLACE(TRIM(u.role), '_', ''), ' ', ''))
             IN ('communityorganizer', 'communitycoordinator', 'coordinator', 'co')
           AND (
             (u.id = c.coordinator_id AND u.school_id = c.id)
             OR (c.coordinator_id IS NULL AND u.school_id = c.id)
           )
         )
         OR (
           LOWER(REPLACE(REPLACE(TRIM(u.role), '_', ''), ' ', '')) = 'healthworker'
           AND u.school_id = c.id
           AND (u.group_id IS NULL OR u.group_id = ?)
         )
       )`,
    [communityId, groupId || null],
  );
  return [...new Set(rows.map(({ id }) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
}

async function runCheckupReminderJob(database, {
  now = new Date(),
  timeZone = process.env.CHECKUP_REMINDER_TIMEZONE || DEFAULT_TIME_ZONE,
} = {}) {
  const today = getLocalDate(now, timeZone);
  const schedules = await getScheduledCheckups(database, today);
  let created = 0;

  for (const schedule of schedules) {
    const stage = getReminderStage(schedule.scheduledDate, today);
    if (!stage || !schedule.communityId || !schedule.beneficiaryName) continue;
    const recipients = await getAssignedRecipients(database, schedule.communityId, schedule.groupId);
    for (const recipientId of recipients) {
      const [result] = await database.query(
        `INSERT INTO notifications
          (event_type, category, title, message, entity_type, entity_id, link_to,
           school_id, group_id, recipient_user_ids, idempotency_key)
         VALUES (?, 'Monitoring', ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
        [
          `checkup.reminder.${stage.key}`,
          stage.title,
          getNotificationMessage(schedule, stage),
          schedule.beneficiaryType,
          String(schedule.beneficiaryCode || schedule.beneficiaryId),
          getNotificationLink(schedule),
          schedule.communityId,
          schedule.groupId || null,
          String(recipientId),
          getIdempotencyKey(schedule, stage, recipientId),
        ],
      );
      created += Number(result?.affectedRows) || 0;
    }
  }

  return { today, schedules: schedules.length, created };
}

function parseRunTime(value = DEFAULT_RUN_TIME) {
  const match = String(value).match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) throw new Error('CHECKUP_REMINDER_TIME must use HH:mm in 24-hour time');
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function isRunTimeReached(now, timeZone, runTime) {
  const parts = getDateParts(now, timeZone);
  return Number(parts.hour) > runTime.hour
    || (Number(parts.hour) === runTime.hour && Number(parts.minute) >= runTime.minute);
}

function startCheckupReminderScheduler(database, {
  timeZone = process.env.CHECKUP_REMINDER_TIMEZONE || DEFAULT_TIME_ZONE,
  runTimeValue = process.env.CHECKUP_REMINDER_TIME || DEFAULT_RUN_TIME,
  intervalMs = 60 * 1000,
} = {}) {
  const runTime = parseRunTime(runTimeValue);
  new Intl.DateTimeFormat('en', { timeZone });
  let lastRunDate = '';
  let running = false;

  const tick = async () => {
    if (running) return;
    const now = new Date();
    const today = getLocalDate(now, timeZone);
    if (today === lastRunDate || !isRunTimeReached(now, timeZone, runTime)) return;
    running = true;
    try {
      const result = await runCheckupReminderJob(database, { now, timeZone });
      lastRunDate = today;
      console.info(`[Check-Up Reminders] Processed ${result.schedules} schedules; created ${result.created} notifications for ${today}.`);
    } catch (error) {
      console.error('[Check-Up Reminders] Daily reminder run failed:', error.stack || error.message);
    } finally {
      running = false;
    }
  };

  const interval = setInterval(() => { void tick(); }, intervalMs);
  void tick();
  return () => clearInterval(interval);
}

module.exports = {
  DEFAULT_RUN_TIME,
  DEFAULT_TIME_ZONE,
  getDayDifference,
  getLocalDate,
  getNotificationLink,
  getNotificationMessage,
  getReminderStage,
  parseRunTime,
  runCheckupReminderJob,
  startCheckupReminderScheduler,
};
