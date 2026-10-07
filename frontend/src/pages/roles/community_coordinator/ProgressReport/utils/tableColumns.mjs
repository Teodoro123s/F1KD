export function getDisplayableFields({ visibleFields, resultsRows, showProfileFilter, profileFieldSections, profileSection, hiddenFields = new Set() }) {
  const normalizedVisibleFields = Array.isArray(visibleFields) ? visibleFields : [];
  const hasActualData = resultsRows && resultsRows.length > 0;

  const baseFields = normalizedVisibleFields.filter(([id]) => {
    if (!showProfileFilter || !profileFieldSections || !profileFieldSections[id]) return true;
    return profileFieldSections[id] === profileSection;
  });

  const fieldCandidates = baseFields.filter(([id]) => {
    if (hasActualData) {
      return resultsRows.some((row) => {
        const value = row[id];
        return value !== undefined && value !== null && String(value).trim() !== '';
      });
    }
    return true;
  });

  return fieldCandidates.filter(([id]) => !hiddenFields.has(id));
}
