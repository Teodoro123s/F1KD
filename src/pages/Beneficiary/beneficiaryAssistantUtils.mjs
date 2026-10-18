const VALID_SCREENING_STATUSES = new Set(['Normal', 'Needs Follow-up', 'At Risk']);

const normalizeText = (value) => String(value ?? '').trim().toLowerCase();

export function getBeneficiaryScreeningMatches(record, statusFilter = 'All') {
  const checkups = Array.isArray(record?.checkups) ? record.checkups.flat(Infinity).filter(Boolean) : [];
  return checkups.flatMap((checkup) => {
    const status = String(checkup.developmentalStatus ?? checkup.developmental_status ?? '').trim();
    if (!VALID_SCREENING_STATUSES.has(status)) return [];
    if (statusFilter === 'Non-normal' && status === 'Normal') return [];
    if (statusFilter !== 'All' && statusFilter !== 'Non-normal' && status !== statusFilter) return [];
    return [{
      status,
      date: checkup.checkupDate ?? checkup.checkup_date ?? checkup.visit_date ?? '',
    }];
  });
}

export function filterBeneficiaryAssistantRecords(records, intent) {
  if (!intent || intent.mode === 'redirect' || intent.mode === 'clinical-info') return [];
  const terms = normalizeText(intent.searchText).split(/\s+/).filter(Boolean);
  if (intent.mode === 'profile-change' && !terms.length) return [];
  return records.filter((record) => {
    if (intent.entityType !== 'All' && record.entityType !== intent.entityType) return false;
    if (intent.mode === 'screening' && !getBeneficiaryScreeningMatches(record, intent.screeningStatus).length) return false;
    if (!terms.length) return true;
    const searchable = normalizeText([
      record.entityType,
      record.name,
      record.code,
      record.age,
      record.gender,
      record.community,
      record.group,
      record.batch,
      record.address,
      record.status,
      record.profileSearchText,
    ].filter(Boolean).join(' '));
    return terms.every((term) => searchable.includes(term));
  });
}
