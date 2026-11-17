import { useEffect, useMemo, useState } from 'react';
import { apiGetChild } from '../../../api/children';
import { apiGetMother } from '../../../api/mothers';
import { apiGetBeneficiaryMonitoringReport, apiGetPrograms } from '../../../api/programs';
import { notifyAction } from '../../../components/ActionFeedback';
import { formatDateForDisplay } from '../../../utils/formatting/dateFormat';
import { getBeneficiaryName, isReceiptReceived, supportsBeneficiaryType } from '../utils/beneficiaryProgramReportUtils.mjs';

export default function useBeneficiaryProgramReport({
  beneficiaryType,
  routeId,
  initialBeneficiary,
}) {
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryRecord, setBeneficiaryRecord] = useState(initialBeneficiary);
  const [reportRows, setReportRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSummary, setSelectedSummary] = useState('entries');
  const [tableSearch, setTableSearch] = useState('');

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
          setBeneficiaryRecord(beneficiary);
          setReportRows(reportGroups.flat().sort((left, right) => (
            String(right.date || '').localeCompare(String(left.date || ''))
          )));
        }
      } catch (loadError) {
        if (!active) return;
        const message = loadError.message || 'Unable to load this beneficiary project report.';
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
    received: reportRows.filter((row) => isReceiptReceived(row.monitored)).length,
    programs: new Set(reportRows.map((row) => String(row.programId))).size,
  }), [reportRows]);

  const visibleRows = useMemo(() => {
    const rows = reportRows.filter((row) => {
      if (selectedSummary === 'received') return isReceiptReceived(row.monitored);
      return true;
    });
    const query = tableSearch.trim();
    if (!query) return rows;
    return rows.filter((row) => {
      const searchableValues = [
        formatDateForDisplay(String(row.date || '').slice(0, 10)),
        row.programName,
        isReceiptReceived(row.monitored) ? 'Received' : 'Not received',
        row.notes,
        row.school_name,
        row.group_name,
        row.batch_name,
        row.created_by_name,
        row.created_by_role,
        row.updated_by_name,
        row.updated_by_role,
      ];
      return searchableValues.some((value) => String(value || '').includes(query));
    });
  }, [reportRows, selectedSummary, tableSearch]);

  return {
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
  };
}
