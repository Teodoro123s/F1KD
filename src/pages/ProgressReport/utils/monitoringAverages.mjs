export function buildMonitoringAverageRow(rows, fields, labelField) {
  const averageRow = { [labelField]: 'Average' };
  let hasAverage = false;

  fields
    .filter((field) => field !== labelField && field !== 'measurementDate' && !field.endsWith('Interpretation'))
    .forEach((field) => {
      const values = rows
        .map((row) => row[field])
        .filter((value) => value !== null && value !== undefined && String(value).trim() !== '')
        .map(Number)
        .filter(Number.isFinite);
      if (!values.length) return;

      averageRow[field] = Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
      hasAverage = true;
    });

  return hasAverage ? averageRow : null;
}
