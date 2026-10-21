import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiGetChild } from '../../api/children';
import { apiGetMother } from '../../api/mothers';
import { apiGetBeneficiaryMonitoringReport, apiGetPrograms } from '../../api/programs';
import AuditSignatures from '../../components/ui/AuditSignatures';
import ModuleSummaryCards from '../../components/ui/ModuleSummaryCards';
import PageHeader from '../../components/ui/PageHeader';
import { notifyAction } from '../../components/ActionFeedback';
import { formatDateForDisplay } from '../../utils/dateFormat';
import { canViewAuditSignatures } from '../../utils/permissions';
import { useAuth } from '../../auth/AuthProvider';
import { navigateBack } from '../../utils/navigation';

const normalizeProgramBeneficiaryType = (value) => String(value || 'Mother')
  .trim()
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/\s+/g, ' ');

const supportsBeneficiaryType = (programType, beneficiaryType) => {
  const normalizedType = normalizeProgramBeneficiaryType(programType);
  return normalizedType === beneficiaryType || normalizedType === 'mother and child';
};

const getBeneficiaryName = (beneficiary, beneficiaryType) => {
  const firstName = beneficiary?.firstName || beneficiary?.first_name || '';
  const middleName = beneficiary?.middleName || beneficiary?.middle_name || '';
  const lastName = beneficiary?.lastName || beneficiary?.last_name || '';
  const suffix = beneficiary?.suffix || '';
  const name = [firstName, middleName, lastName, suffix].filter(Boolean).join(' ').trim();
  return name || (beneficiaryType === 'mother' ? 'Mother' : 'Child');
};

export default function BeneficiaryProgramReportPage({ beneficiaryType }) {
  const { id, childId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const routeId = beneficiaryType === 'mother' ? id : childId;
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [reportRows, setReportRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const showAuditSignatures = canViewAuditSignatures(currentUser?.role);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const loadReport = async () => {
      try {
        const [beneficiaryResponse, programsResponse] = await Promise.all([
          beneficiaryType === 'mother' ? apiGetMother(routeId) : apiGetChild(routeId),
          apiGetPrograms(),
        ]);
        const beneficiary = beneficiaryType === 'mother'
          ? beneficiaryResponse?.mother
          : beneficiaryResponse?.child;
        if (!beneficiary) throw new Error(`Unable to load this ${beneficiaryType} record.`);

        const beneficiaryId = beneficiaryType === 'mother'
          ? beneficiary.raw?.id || beneficiary.id
          : beneficiary.id;
        if (beneficiaryId === null || beneficiaryId === undefined || beneficiaryId === '') {
          throw new Error(`Unable to determine the ${beneficiaryType} record ID.`);
        }

        const name = getBeneficiaryName(beneficiary, beneficiaryType);
        const eligiblePrograms = (programsResponse?.programs || [])
          .filter((program) => supportsBeneficiaryType(program.beneficiaryType || program.beneficiary_type, beneficiaryType));
        const reportGroups = await Promise.all(eligiblePrograms.map(async (program) => {
          const response = await apiGetBeneficiaryMonitoringReport(program.id, beneficiaryType, beneficiaryId);
          return (response?.report || []).map((row) => ({
            ...row,
            programId: program.id,
            programName: row.program_name || program.name || 'Program',
          }));
        }));

        if (active) {
          setBeneficiaryName(name);
          setReportRows(reportGroups.flat().sort((left, right) => (
            String(right.date || '').localeCompare(String(left.date || ''))
          )));
        }
      } catch (loadError) {
        if (!active) return;
        const message = loadError.message || 'Unable to load this beneficiary program report.';
        setError(message);
        setReportRows([]);
        notifyAction(message, 'error');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadReport();
    return () => { active = false; };
  }, [beneficiaryType, routeId]);

  const summary = useMemo(() => ({
    total: reportRows.length,
    received: reportRows.filter((row) => Boolean(row.monitored)).length,
    programs: new Set(reportRows.map((row) => String(row.programId))).size,
  }), [reportRows]);
  const fallbackReturnTo = beneficiaryType === 'mother'
    ? `/beneficiary/mother/${routeId}`
    : `/beneficiary/child/${routeId}`;
  const title = beneficiaryName || (beneficiaryType === 'mother' ? 'Mother' : 'Child');

  return (
    <div className="community-page program-page">
      <PageHeader
        title="Individual Program Report"
        breadcrumbs={[
          { label: 'Beneficiaries', href: '/beneficiary' },
          { label: title },
          { label: 'Program Report' },
        ]}
      />
      <section className="program-monitoring-report program-receipt-history-page" aria-labelledby="beneficiary-program-report-title">
        <div className="program-monitoring-report__header">
          <div>
            <p className="program-section-eyebrow">Program participation</p>
            <h2 id="beneficiary-program-report-title">{title}</h2>
            <p>Receipt history across programs available to your account.</p>
          </div>
          <button
            type="button"
            className="view-btn view-btn--secondary back-action"
            onClick={() => navigateBack(navigate, location, fallbackReturnTo)}
          >
            Back to beneficiary
          </button>
        </div>

        {!loading && !error && (
          <ModuleSummaryCards cards={[
            { key: 'programs', label: 'Programs with activity', value: summary.programs },
            { key: 'entries', label: 'Receipt entries', value: summary.total },
            { key: 'received', label: 'Marked received', value: summary.received },
          ]} />
        )}

        {loading ? <p>Loading individual program report...</p> : error ? (
          <p role="alert">{error}</p>
        ) : (
          <div className="program-receipt-table-scroll">
            <table className="data-table program-beneficiary-report-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Program</th>
                  <th>Receipt status</th>
                  <th>Notes</th>
                  <th>School / Community</th>
                  <th>Group</th>
                  <th>Batch</th>
                  {showAuditSignatures && <th>Recorded by</th>}
                </tr>
              </thead>
              <tbody>
                {reportRows.length ? reportRows.map((row, index) => (
                  <tr key={`${row.programId}-${row.date}-${index}`}>
                    <td>{formatDateForDisplay(String(row.date || '').slice(0, 10)) || '—'}</td>
                    <td>{row.programName}</td>
                    <td>{row.monitored ? 'Received' : 'Not received'}</td>
                    <td>{row.notes || '—'}</td>
                    <td>{row.school_name || '—'}</td>
                    <td>{row.group_name || '—'}</td>
                    <td>{row.batch_name || '—'}</td>
                    {showAuditSignatures && (
                      <td>
                        <AuditSignatures
                          createdByName={row.created_by_name}
                          createdByRole={row.created_by_role}
                          createdAt={row.recorded_at}
                          updatedByName={row.updated_by_name}
                          updatedByRole={row.updated_by_role}
                          updatedAt={row.updated_at}
                        />
                      </td>
                    )}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={showAuditSignatures ? 8 : 7} className="no-data">
                      No program receipt history found for this beneficiary.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
