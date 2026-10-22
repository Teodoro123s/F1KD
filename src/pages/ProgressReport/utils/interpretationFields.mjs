export const filterInterpretationFields = (fields, includeInterpretationColumns = true) => (
  includeInterpretationColumns
    ? fields
    : fields.filter(([id]) => !/Interpretation$/i.test(id))
);
