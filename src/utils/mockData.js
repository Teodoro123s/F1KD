const makeMockMother = (id, name, area, progress, batches, records, override = {}) => {
  const parts = name.split(' ');
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  const middleName = parts.length > 2 ? parts[1] : 'Dela Cruz';

  const idNum = parseInt(id.split('-')[1], 10);
  const isHighRisk = override.isHighRisk || (idNum % 5 === 0 ? 'Yes' : 'No');

  const lmpDaysAgo = 60 + (idNum % 5) * 30;
  const lmpDateObj = new Date();
  lmpDateObj.setDate(lmpDateObj.getDate() - lmpDaysAgo);
  const lmpDate = lmpDateObj.toISOString().split('T')[0];

  const eddDateObj = new Date(lmpDateObj.getTime() + 280 * 24 * 60 * 60 * 1000);
  const eddDate = eddDateObj.toISOString().split('T')[0];

  const dobYear = 1990 + (idNum % 10);
  const dobMonth = String((idNum % 12) + 1).padStart(2, '0');
  const dobDay = String((idNum % 28) + 1).padStart(2, '0');
  const dob = `${dobYear}-${dobMonth}-${dobDay}`;

  const prenatalRegDateObj = new Date(lmpDateObj.getTime() + 45 * 24 * 60 * 60 * 1000);
  const prenatalRegDate = prenatalRegDateObj.toISOString().split('T')[0];

  const trimesters = ['1st Trimester', '2nd Trimester', '3rd Trimester'];
  const trimester = trimesters[idNum % 3];

  const obHistory = [
    { event: 'G1', gestationalAge: '39 weeks', outcome: 'Normal Vaginal Delivery, Healthy baby' },
    { event: 'G2', gestationalAge: '', outcome: '' },
    { event: 'G3', gestationalAge: '', outcome: '' },
    { event: 'G4', gestationalAge: '', outcome: '' },
    { event: 'G5', gestationalAge: '', outcome: '' },
    { event: 'G6', gestationalAge: '', outcome: '' },
    { event: 'G7', gestationalAge: '', outcome: '' },
  ];

  const completedCheckupsCount = Math.min(9, Math.max(0, Math.round(progress / 11)));
  const checkups = [[null, null, null], [null, null, null], [null, null, null]];
  let count = 0;
  for (let t = 0; t < 3; t += 1) {
    for (let s = 0; s < 3; s += 1) {
      if (count < completedCheckupsCount) {
        checkups[t][s] = {
          completed: true,
          autoMarked: false,
          bp: override.prenatalBp || (idNum % 4 === 0 ? '130/90' : '110/70'),
          weight: override.prenatalWeight || override.weight || String(50 + (idNum % 15)),
          fundalHeight: override.fundalHeight || String(12 + (idNum % 6)),
          fhr: override.fhr || String(140 + (idNum % 10)),
          notes: 'Mock checkup record from initial data loading.',
          date: prenatalRegDate,
        };
        count += 1;
      }
    }
  }

  const finalProgress = Math.round((completedCheckupsCount / 9) * 100);

  return {
    id,
    name,
    firstName,
    middleName,
    lastName,
    suffix: '',
    motherId: `M-2026-${String(idNum).padStart(4, '0')}`,
    weight: String(50 + (idNum % 15)),
    height: String(150 + (idNum % 12)),
    dob,
    lmpDate,
    eddDate,
    contactNumber: `0917${String(1234567 + idNum * 99).padEnd(7, '0')}`,
    isHighRisk,
    programType: 'Maternal Health Program',
    emergencyName: `Juan ${lastName}`,
    emergencyContact: `0918${String(7654321 - idNum * 99).padEnd(7, '0')}`,
    emergencyRelationship: 'Husband',
    spouseName: `Juan ${lastName}`,
    address: `${10 + idNum} Mabini St, Barangay ${area}, Province`,
    prenatalRegDate,
    trimester,
    gestationalAge: String(8 + (idNum % 8)),
    prenatalWeight: String(49 + (idNum % 15)),
    prenatalBp: idNum % 4 === 0 ? '130/90' : '110/70',
    prenatalHeight: String(150 + (idNum % 12)),
    fundalHeight: String(12 + (idNum % 6)),
    fhr: String(140 + (idNum % 10)),
    gravida: String(1 + (idNum % 3)),
    para: String(idNum % 3),
    abortion: '0',
    stillbirth: '0',
    obHistory,
    medicalConditions: {
      hypertension: idNum % 4 === 0,
      diabetes: idNum % 6 === 0,
      asthma: idNum % 7 === 0,
      heartDisease: false,
      kidneyDisease: false,
      epilepsy: false,
      goiter: false,
      tuberculosis: false,
      cancer: false,
      std: false,
      multiplePregnancy: false,
      prevCesarean: idNum % 5 === 0,
    },
    otherMedicalHistory: idNum % 7 === 0 ? 'Asthma controlled' : 'None',
    dentalCheckupDate: prenatalRegDate,
    dentalFacility: `${area} Health Center`,
    dentistInCharge: 'Dr. Santos Dela Cruz',
    communityDentist: 'Dr. Santos Dela Cruz',
    dentistLicense: 'LIC-789012',
    dentistContact: '09201234567',
    teethCount: '28',
    dentalFindings: 'Normal check-up',
    dentalWork: {
      tartarRemoval: idNum % 3 === 0,
      filling: false,
      cleaning: true,
      extraction: false,
      rootCanal: false,
      other: false,
    },
    dentalRemarks: 'Keep brushing twice daily.',
    tt1Date: lmpDate,
    tt1Remarks: 'Dose 1',
    tt2Date: prenatalRegDate,
    tt2Remarks: 'Dose 2',
    tt3Date: '',
    tt3Remarks: '',
    tt4Date: '',
    tt4Remarks: '',
    tt5Date: '',
    tt5Remarks: '',
    area,
    batches,
    records,
    progress: finalProgress,
    checkups,
    ...override,
  };
};

const initialCommunityData = [
  makeMockMother('SCH-0001', 'Maria Santos', 'Poblacion', 72, 2, 3),
  makeMockMother('SCH-0002', 'Liza Reyes', 'Poblacion', 58, 1, 2),
  makeMockMother('SCH-0003', 'Ana Cruz', 'Poblacion', 84, 2, 4),
  makeMockMother('SCH-0004', 'Teresa Gomez', 'Upland', 65, 3, 8),
  makeMockMother('SCH-0005', 'Isabel Mendoza', 'Downtown', 91, 4, 12),
  makeMockMother('SCH-0006', 'Clara dela Cruz', 'Coastal', 48, 1, 5),
  makeMockMother('SCH-0007', 'Lucia Rivera', 'Riverside', 77, 2, 7),
  makeMockMother('SCH-0008', 'Rosa Fernandez', 'Highland', 69, 2, 6),
  makeMockMother('SCH-0009', 'Elena Mercado', 'Forest', 55, 1, 3),
  makeMockMother('SCH-0010', 'Nora Santos', 'Lowland', 95, 5, 18),
  makeMockMother('SCH-0011', 'May Torres', 'Coastal', 38, 1, 2),
  makeMockMother('SCH-0012', 'Gloria Diaz', 'Highland', 82, 3, 9),
];

const initialBatchesData = [
  { id: 'BAT-0001', name: 'Health Visit 1', community: 'Maria Santos', records: 2, progress: 68, status: 'Active' },
  { id: 'BAT-0002', name: 'Health Visit 2', community: 'Maria Santos', records: 1, progress: 45, status: 'Active' },
  { id: 'BAT-0003', name: 'Health Visit 3', community: 'Liza Reyes', records: 2, progress: 92, status: 'Completed' },
  { id: 'BAT-0004', name: 'Health Visit 4', community: 'Ana Cruz', records: 2, progress: 100, status: 'Completed' },
  { id: 'BAT-0005', name: 'Health Visit 5', community: 'Ana Cruz', records: 2, progress: 57, status: 'Active' },
  { id: 'BAT-0006', name: 'Health Visit 6', community: 'Teresa Gomez', records: 3, progress: 18, status: 'Pending' },
  { id: 'BAT-0007', name: 'Health Visit 7', community: 'Teresa Gomez', records: 3, progress: 74, status: 'Active' },
  { id: 'BAT-0008', name: 'Health Visit 8', community: 'Teresa Gomez', records: 2, progress: 63, status: 'Active' },
  { id: 'BAT-0009', name: 'Health Visit 9', community: 'Isabel Mendoza', records: 4, progress: 88, status: 'Completed' },
  { id: 'BAT-0010', name: 'Health Visit 10', community: 'Isabel Mendoza', records: 3, progress: 41, status: 'Active' },
  { id: 'BAT-0011', name: 'Health Visit 11', community: 'Isabel Mendoza', records: 3, progress: 22, status: 'Pending' },
  { id: 'BAT-0012', name: 'Health Visit 12', community: 'Isabel Mendoza', records: 2, progress: 50, status: 'Active' },
];

const initialGroupsData = [
  {
    id: 'GRP-0001',
    name: 'Child Alpha',
    community: 'Maria Santos',
    assignedBatchIds: ['BAT-0001', 'BAT-0002'],
    leader: 'Liza Reyes',
    members: 12,
    status: 'Active',
    batches: 2,
  },
  {
    id: 'GRP-0002',
    name: 'Child Bravo',
    community: 'Liza Reyes',
    assignedBatchIds: ['BAT-0003'],
    leader: 'Marco Santos',
    members: 8,
    status: 'Pending',
    batches: 1,
  },
  {
    id: 'GRP-0003',
    name: 'Child Delta',
    community: 'Ana Cruz',
    assignedBatchIds: ['BAT-0004', 'BAT-0005', 'BAT-0008'],
    leader: 'Ana Cruz',
    members: 15,
    status: 'Active',
    batches: 3,
  },
  {
    id: 'GRP-0004',
    name: 'Child Sierra',
    community: 'Teresa Gomez',
    assignedBatchIds: [],
    leader: 'Renato Diaz',
    members: 6,
    status: 'Completed',
    batches: 0,
  },
  {
    id: 'GRP-0005',
    name: 'Child Central',
    community: 'Isabel Mendoza',
    assignedBatchIds: ['BAT-0009'],
    leader: 'May Torres',
    members: 9,
    status: 'Active',
    batches: 1,
  },
];

export { makeMockMother, initialCommunityData, initialBatchesData, initialGroupsData };
export default { makeMockMother, initialCommunityData, initialBatchesData, initialGroupsData };
