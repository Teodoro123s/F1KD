const scopeValue = (row, scope) => String(row[`${scope}Id`] ?? row[scope] ?? '');

export const getProfileReportScopeOptions = (rows, scope) => [...new Map(
  rows
    .map((row) => {
      const id = scopeValue(row, scope);
      return id ? [id, { id, name: row[scope] || `Unassigned ${scope}` }] : null;
    })
    .filter(Boolean),
).values()];

export const filterProfileReportRows = (rows, groupId = '', batchId = '') => rows.filter((row) => (
  (!groupId || scopeValue(row, 'group') === groupId)
  && (!batchId || scopeValue(row, 'batch') === batchId)
));

export const resolveIncludedProfileSection = (currentSection, selectedMetrics, fieldSections, sectionIds) => {
  const includedSections = sectionIds.filter((section) => (
    selectedMetrics.some((metric) => fieldSections[metric] === section)
  ));
  return includedSections.includes(currentSection) ? currentSection : includedSections[0] || currentSection;
};
