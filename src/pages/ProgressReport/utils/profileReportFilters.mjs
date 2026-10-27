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
