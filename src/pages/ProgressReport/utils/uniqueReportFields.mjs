export const uniqueReportFields = (fields) => fields.filter(([id], index, allFields) => (
  allFields.findIndex(([candidateId]) => candidateId === id) === index
));
