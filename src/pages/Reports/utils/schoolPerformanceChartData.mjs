const nonNegativeCount = (value) => Math.max(0, Number(value) || 0);

function getCompleteness(summary = {}) {
  const expectedVisits = nonNegativeCount(summary.expectedVisits);
  const completeForms = nonNegativeCount(summary.completeForms);
  return {
    expectedVisits,
    completeForms,
    recordedVisits: nonNegativeCount(summary.recordedVisits),
    percentage: expectedVisits > 0
      ? Math.min(100, (completeForms / expectedVisits) * 100)
      : null,
  };
}

export function buildSchoolPerformanceChartData(schools = []) {
  return schools
    .map((school) => {
      const maternal = getCompleteness(school.monitoring?.mothers);
      const child = getCompleteness(school.monitoring?.children);
      const expectedVisits = maternal.expectedVisits + child.expectedVisits;
      const completeForms = maternal.completeForms + child.completeForms;

      return {
        id: String(school.id ?? school.name ?? ''),
        name: String(school.name || 'Unnamed school'),
        maternalPercentage: maternal.percentage,
        maternalCompleteForms: maternal.completeForms,
        maternalExpectedVisits: maternal.expectedVisits,
        maternalRecordedVisits: maternal.recordedVisits,
        childPercentage: child.percentage,
        childCompleteForms: child.completeForms,
        childExpectedVisits: child.expectedVisits,
        childRecordedVisits: child.recordedVisits,
        overallCompleteness: expectedVisits > 0 ? completeForms / expectedVisits : null,
      };
    })
    .sort((left, right) => {
      if (left.overallCompleteness === null) {
        return right.overallCompleteness === null ? left.name.localeCompare(right.name) : 1;
      }
      if (right.overallCompleteness === null) return -1;
      return left.overallCompleteness - right.overallCompleteness
        || left.name.localeCompare(right.name);
    });
}
