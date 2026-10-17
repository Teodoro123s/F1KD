const MOTHER_ADDITIONAL_VACCINES = [
  { name: 'Influenza', key: 'influenza', remarksField: 'influenzaRemarks' },
  { name: 'Hepatitis A', key: 'hepatitisA', remarksField: 'hepatitisARemarks' },
  { name: 'Hepatitis B', key: 'hepatitisB', remarksField: 'hepatitisBRemarks' },
  { name: 'COVID-19', key: 'covid19', remarksField: 'covid19Remarks' },
].flatMap(({ name, key, remarksField }) => [1, 2, 3].map((dose) => ({
  name: dose === 1 ? name : `${name} Dose ${dose}`,
  dateField: `${key}${dose === 1 ? 'Date' : `Dose${dose}Date`}`,
  remarksField: dose === 1 ? remarksField : null,
})));

function getMotherVaccineRecords(body = {}) {
  const records = [];
  for (let dose = 1; dose <= 5; dose += 1) {
    const date = body[`tt${dose}Date`];
    const remarks = body.ttRemarks !== undefined
      ? (dose === 1 ? body.ttRemarks : null)
      : body[`tt${dose}Remarks`];
    if (date || remarks) records.push({ name: `TT${dose}`, date: date || null, remarks: remarks || null });
  }

  for (const vaccine of MOTHER_ADDITIONAL_VACCINES) {
    const date = body[vaccine.dateField];
    const remarks = vaccine.remarksField ? body[vaccine.remarksField] : null;
    if (date || remarks) records.push({ name: vaccine.name, date: date || null, remarks: remarks || null });
  }
  return records;
}

module.exports = { MOTHER_ADDITIONAL_VACCINES, getMotherVaccineRecords };
