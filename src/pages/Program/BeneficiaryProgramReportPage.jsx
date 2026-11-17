import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ModuleSummaryCards from '../../components/ui/ModuleSummaryCards';
import PageHeader from '../../components/ui/PageHeader';
import { canViewAuditSignatures } from '../../utils/permissions';
import { useAuth } from '../../auth/AuthProvider';
import MotherNavigationCards from '../Beneficiary/mother/MotherNavigationCards';
import BeneficiarySuperHeader from '../Beneficiary/mother/BeneficiarySuperHeader';
import ChildNavigationCards from '../Beneficiary/child/ChildNavigationCards';
import { navigateBack } from '../../utils/navigation/navigation';
import BeneficiaryProgramReportTable from './components/BeneficiaryProgramReportTable';
import useBeneficiaryProgramReport from './hooks/useBeneficiaryProgramReport';

export default function BeneficiaryProgramReportPage({ beneficiaryType }) {
  const { id, childId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const routeId = beneficiaryType === 'mother' ? id : childId;
  const {
    beneficiaryName,
    beneficiaryRecord,
    reportRows,
    loading,
    error,
    selectedSummary,
    setSelectedSummary,
    tableSearch,
    setTableSearch,
    summary,
    visibleRows,
  } = useBeneficiaryProgramReport({
    beneficiaryType,
    routeId,
    initialBeneficiary: beneficiaryType === 'mother' ? location.state?.mother || null : location.state?.child || null,
  });
  const showAuditSignatures = canViewAuditSignatures(currentUser?.role);
  const title = beneficiaryName || (beneficiaryType === 'mother' ? 'Mother' : 'Child');

  return (
    <div className={`community-page program-page${beneficiaryType === 'mother' ? ' beneficiary-page' : ''}`}>
      {beneficiaryType === 'mother' && <BeneficiarySuperHeader />}
      <PageHeader
        title={title}
        breadcrumbs={[
          { label: 'Beneficiaries', href: '/beneficiary' },
          { label: title },
          { label: 'Project Report' },
        ]}
        actions={(
          <button
            type="button"
            className="btn-secondary back-action"
            onClick={() => navigateBack(
              navigate,
              location,
              beneficiaryType === 'mother'
                ? `/beneficiary/mother/${routeId}`
                : `/beneficiary/child/${routeId}`,
            )}
          >
            Back
          </button>
        )}
      />
      {beneficiaryType === 'mother' && (
        <MotherNavigationCards
          mother={beneficiaryRecord}
          motherId={routeId}
          activeCard="program-report"
        />
      )}
      {beneficiaryType === 'child' && (
        <ChildNavigationCards child={beneficiaryRecord} mother={location.state?.mother} activeCard="program-report" />
      )}
      {!loading && !error && (
        <section className="program-monitoring-report program-receipt-history-page program-report-summary-panel">
          <ModuleSummaryCards cards={[
            { key: 'programs', label: 'Projects with activity', value: summary.programs, description: 'Distinct projects with receipt history.', interactive: false },
            { key: 'entries', label: 'Receipt entries', value: summary.total, description: 'Show all receipt entries.' },
            { key: 'received', label: 'Marked received', value: summary.received, description: 'Show entries marked received.' },
          ]} onSelect={setSelectedSummary} selected={selectedSummary} />
        </section>
      )}

      <section className="program-monitoring-report program-receipt-history-page program-report-data-panel">
        {loading ? <p>Loading individual project report...</p> : error ? (
          <p role="alert">{error}</p>
        ) : (
          <BeneficiaryProgramReportTable
            reportRows={reportRows}
            visibleRows={visibleRows}
            showAuditSignatures={showAuditSignatures}
            tableSearch={tableSearch}
            onSearchChange={setTableSearch}
          />
        )}
      </section>
    </div>
  );
}
