function addDays(dateString, days) {
  const date = new Date(dateString + 'T00:00:00');
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildMotherCheckupSamples() {
  const motherProfiles = [
    {
      motherId: 1,
      trimesterStart: '2026-01-12',
      bpBase: '110/70',
      weightStart: 54.2,
      height: 150,
      source: 'Municipal Fund',
      facility: 'RHU',
      providerStart: 'Nurse Maria Santos',
      providerLater: 'Midwife Ana Cruz',
      specialist: 'Dr. Liza Reyes',
      notes: [
        'Initial prenatal assessment completed.',
        'Mother advised to continue prenatal vitamins.',
        'No danger signs reported.',
        'Routine laboratory assistance provided.',
        'Fetal movement present.',
        'Growth consistent with gestational age.',
        'Counseled on birth preparedness.',
        'Mother reports good appetite and sleep.',
        'Final prenatal review; facility delivery encouraged.'
      ]
    },
    {
      motherId: 2,
      trimesterStart: '2026-06-15',
      bpBase: '118/76',
      weightStart: 62.1,
      height: 158,
      source: 'PhilHealth',
      facility: 'District Hospital',
      providerStart: 'Nurse Joel Lim',
      providerLater: 'Midwife Ana Cruz',
      specialist: 'Dr. Liza Reyes',
      notes: [
        'Initial assessment completed; folic acid started.',
        'Urinalysis supported through the municipal laboratory fund.',
        'Elevated blood pressure; referred for repeat assessment.',
        'Blood pressure returned to baseline after rest.',
        'Fetal movement first noted; nutrition counseling provided.',
        'Anomaly scan assistance provided; findings reviewed with mother.',
        'Discussed warning signs and emergency transport plan.',
        'Milk subsidy released; birth plan reviewed with spouse.',
        'Term pregnancy; final hospital referral and delivery instructions given.'
      ]
    }
  ];

  const rows = [];

  motherProfiles.forEach((profile, motherIndex) => {
    const trimesterConfigs = [
      { label: '1st Trimester', checkups: [
          { offset: 0, gestAge: 8, bp: '110/70', weight: 54.2, lab: 0, referral: 0, amount: null, facility: 'RHU', source: 'Municipal Fund', provider: profile.providerStart, noteIndex: 0 },
          { offset: 28, gestAge: 12, bp: '112/72', weight: 55.1, lab: 0, referral: 0, amount: null, facility: 'RHU', source: 'Municipal Fund', provider: profile.providerStart, noteIndex: 1 },
          { offset: 56, gestAge: 16, bp: '114/74', weight: 56.0, lab: 0, referral: 0, amount: null, facility: 'RHU', source: 'Municipal Fund', provider: profile.providerLater, noteIndex: 2 }
        ]
      },
      { label: '2nd Trimester', checkups: [
          { offset: 84, gestAge: 20, bp: '116/74', weight: 57.4, lab: 1, referral: 0, amount: 350, facility: 'RHU', source: 'Municipal Fund', provider: profile.providerLater, noteIndex: 3 },
          { offset: 112, gestAge: 24, bp: '118/76', weight: 58.3, lab: 0, referral: 0, amount: null, facility: 'RHU', source: 'Municipal Fund', provider: profile.providerLater, noteIndex: 4 },
          { offset: 140, gestAge: 28, bp: '120/78', weight: 59.0, lab: 0, referral: 0, amount: null, facility: 'RHU', source: 'Municipal Fund', provider: profile.specialist, noteIndex: 5 }
        ]
      },
      { label: '3rd Trimester', checkups: [
          { offset: 168, gestAge: 32, bp: '118/76', weight: 60.1, lab: 0, referral: 0, amount: null, facility: 'RHU', source: 'Municipal Fund', provider: profile.specialist, noteIndex: 6 },
          { offset: 196, gestAge: 34, bp: '120/80', weight: 60.8, lab: 0, referral: 0, amount: null, facility: 'RHU', source: 'Municipal Fund', provider: profile.specialist, noteIndex: 7 },
          { offset: 224, gestAge: 36, bp: '122/80', weight: 61.6, lab: 0, referral: 1, amount: 250, facility: 'District Hospital', source: 'PhilHealth', provider: profile.specialist, noteIndex: 8 }
        ]
      }
    ];

    trimesterConfigs.forEach((trimester, trimesterIndex) => {
      trimester.checkups.forEach((checkup, checkupIndex) => {
        const checkupDate = addDays(profile.trimesterStart, checkup.offset + ((motherIndex % 2) * 7));
        const referral = motherIndex === 1 && trimesterIndex === 0 && checkupIndex === 2 ? 1 : checkup.referral;
        const lab = checkup.lab;
        const amount = checkup.amount === null ? null : Number(checkup.amount);
        const facility = referral ? 'District Hospital' : checkup.facility;
        const recordDate = addDays(checkupDate, 2 + ((motherIndex + trimesterIndex + checkupIndex) % 4));

        rows.push([
          motherIndex + 1,
          trimester.label,
          checkupIndex + 1,
          checkupDate,
          checkup.gestAge,
          checkup.bp,
          Number((profile.weightStart + (trimesterIndex * 1.2) + (checkupIndex * 0.8)).toFixed(1)),
          profile.height,
          Number((checkup.gestAge / 4.2).toFixed(1)),
          checkup.gestAge > 25 ? 'At Risk' : 'Normal',
          checkup.gestAge >= 20 ? 20 + (trimesterIndex * 4) : 8 + checkupIndex * 4,
          checkup.gestAge === 34 ? 138 : 160 - (trimesterIndex * 5) - (checkupIndex * 2),
          checkup.provider,
          addDays(checkupDate, 21),
          referral,
          lab,
          amount,
          referral ? 'PhilHealth' : checkup.source,
          facility,
          referral ? addDays(checkupDate, 3) : null,
          referral ? 1 : 0,
          profile.notes[trimesterIndex * 3 + checkupIndex]
        ]);
      });
    });
  });

  return rows;
}

module.exports = { buildMotherCheckupSamples };
