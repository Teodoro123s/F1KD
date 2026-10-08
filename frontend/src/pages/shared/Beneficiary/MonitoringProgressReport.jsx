import React from 'react';
import { formatDateForDisplay, formatDateForInput } from '../../../utils/dateFormat';
import './monitoring-progress-report.css';

const valueOrDash = (value, suffix = '') => (
  value === null || value === undefined || String(value).trim() === '' ? '—' : `${value}${suffix}`
);

function getMotherRecords(mother) {
  return (Array.isArray(mother?.checkups) ? mother.checkups : [])
    .flatMap((trimester, trimesterIndex) => (Array.isArray(trimester) ? trimester : []).map((record, checkupIndex) => ({
      ...record,
      period: `${['1st', '2nd', '3rd'][trimesterIndex] || `${trimesterIndex + 1}th`} Trimester · Check-up ${checkupIndex + 1}`,
      date: record?.checkupDate || record?.checkup_date || record?.visit_date,
      gestationalAge: record?.gestationalAge ?? record?.gestational_age,
      weight: record?.weight,
      bloodPressure: record?.bp || record?.bloodPressure || record?.blood_pressure,
      bmi: record?.bmi,
    })))
    .filter((record) => record && (record.completed || record.date || record.weight || record.bloodPressure));
}

function getChildRecords(child) {
  return (Array.isArray(child?.checkups) ? child.checkups : [])
    .map((record) => ({
      ...record,
      period: `Month ${record?.week_number ?? record?.weekNumber ?? '—'}`,
      date: record?.visit_date || record?.checkupDate || record?.checkup_date,
      weight: record?.weight,
      height: record?.height,
      status: record?.developmental_status || record?.developmentalStatus,
    }))
    .filter((record) => record && (record.date || record.weight || record.height || record.status));
}

export default function MonitoringProgressReport({ beneficiaryType, beneficiary }) {
  const isMother = beneficiaryType === 'Mother';
  const records = (isMother ? getMotherRecords(beneficiary) : getChildRecords(beneficiary))
    .sort((left, right) => formatDateForInput(right.date).localeCompare(formatDateForInput(left.date)));
  const total = isMother ? 9 : 24;
  const latest = records[0];
  const progress = Math.min(100, Math.round((records.length / total) * 100));

  return (
    <section className="monitoring-progress-report" aria-labelledby="monitoring-progress-report-title">
      <header className="monitoring-progress-report-header">
        <div>
          <span className="checkup-module-kicker">Monitoring summary</span>
          <h2 id="monitoring-progress-report-title">Current Progress Report</h2>
          <p>{beneficiary?.name || beneficiary?.full_name || 'Beneficiary'} · {beneficiaryType}</p>
        </div>
        <div className="monitoring-progress-report-count" aria-label={`${records.length} of ${total} check-ups recorded`}>
          <strong>{records.length}/{total}</strong>
          <span>check-ups recorded</span>
        </div>
      </header>

      <div className="monitoring-progress-report-meter" role="progressbar" aria-label="Monitoring check-up progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
        <span style={{ width: `${progress}%` }} />
      </div>

      {latest && (
        <div className="monitoring-progress-report-latest">
          <strong>Latest report</strong>
          <span>{latest.period}</span>
          <span>{formatDateForDisplay(latest.date)}</span>
          {isMother ? (
            <>
              <span>Gestational age: {valueOrDash(latest.gestationalAge, ' weeks')}</span>
              <span>Weight: {valueOrDash(latest.weight, ' kg')}</span>
              <span>Blood pressure: {valueOrDash(latest.bloodPressure)}</span>
            </>
          ) : (
            <>
              <span>Weight: {valueOrDash(latest.weight, ' kg')}</span>
              <span>Length: {valueOrDash(latest.height, ' cm')}</span>
              <span>Development: {valueOrDash(latest.status)}</span>
            </>
          )}
        </div>
      )}

      {records.length ? (
        <div className="monitoring-progress-report-table-wrap">
          <table className="monitoring-progress-report-table">
            <thead>
              <tr>
                <th scope="col">Check-up</th>
                <th scope="col">Date</th>
                {isMother ? (
                  <>
                    <th scope="col">Gestational age</th>
                    <th scope="col">Weight</th>
                    <th scope="col">Blood pressure</th>
                    <th scope="col">Remarks</th>
                  </>
                ) : (
                  <>
                    <th scope="col">Weight</th>
                    <th scope="col">Length</th>
                    <th scope="col">Development</th>
                    <th scope="col">Notes</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => (
                <tr key={`${record.period}-${record.date || index}`}>
                  <td>{record.period}</td>
                  <td>{formatDateForDisplay(record.date)}</td>
                  {isMother ? (
                    <>
                      <td>{valueOrDash(record.gestationalAge, ' weeks')}</td>
                      <td>{valueOrDash(record.weight, ' kg')}</td>
                      <td>{valueOrDash(record.bloodPressure)}</td>
                      <td>{valueOrDash(record.remarks || record.notes)}</td>
                    </>
                  ) : (
                    <>
                      <td>{valueOrDash(record.weight, ' kg')}</td>
                      <td>{valueOrDash(record.height, ' cm')}</td>
                      <td>{valueOrDash(record.status)}</td>
                      <td>{valueOrDash(record.notes || record.remarks)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="monitoring-progress-report-empty">No check-up progress has been recorded yet.</p>
      )}
    </section>
  );
}
