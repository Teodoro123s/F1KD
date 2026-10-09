import {
  normalizeNutritionLabel,
  getBmiInterpretation,
  averageNumeric,
  getMode,
} from '../progressReportConfig.js';

export const getGrowthMonthKey = (point, isMother = false) => {
  const dateValue = point?.date || point?.measurementDate;
  const date = dateValue ? new Date(dateValue) : null;
  if (date && !Number.isNaN(date.getTime())) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  const ageWeeks = Number(point?.ageWeeks);
  if (!isMother && point?.ageWeeks !== null && point?.ageWeeks !== undefined && point?.ageWeeks !== '' && Number.isFinite(ageWeeks)) {
    const estimatedDate = new Date(Date.now() - (Math.max(0, ageWeeks) * 7 * 24 * 60 * 60 * 1000));
    return `${estimatedDate.getFullYear()}-${String(estimatedDate.getMonth() + 1).padStart(2, '0')}`;
  }
  return null;
};

export const getModeSummary = (values) => {
  const normalizedValues = values.map(normalizeNutritionLabel).filter(Boolean);
  const mode = getMode(normalizedValues);
  return {
    mode,
    count: normalizedValues.filter((value) => value === mode).length,
    total: normalizedValues.length,
  };
};

export const aggregateGrowthRows = (rows, focus, beneficiaryType = 'child') => {
  const groupField = focus === 'batch-group' || focus === 'batch-school'
    ? 'batch'
    : focus === 'group-school' ? 'group' : null;
  if (!groupField) return rows;

  const groupedRows = new Map();
  rows.forEach((row) => {
    const groupName = row[groupField] || `Unassigned ${groupField}`;
    const groupRows = groupedRows.get(groupName) || [];
    groupRows.push(row);
    groupedRows.set(groupName, groupRows);
  });

  return [...groupedRows.entries()].map(([groupName, groupRows]) => {
    const pointsByMonth = new Map();
    groupRows.forEach((row) => {
      const beneficiaryId = String(row.childId || row.motherId || row.child || row.mother || row.id || 'beneficiary');
      (row.growthSeries || []).forEach((point) => {
        const monthKey = getGrowthMonthKey(point, beneficiaryType === 'mother');
        if (!monthKey) return;
        const monthPoints = pointsByMonth.get(monthKey) || [];
        const currentPoint = monthPoints.find((item) => item.beneficiaryId === beneficiaryId);
        const currentDate = String(currentPoint?.point.date || currentPoint?.point.measurementDate || '');
        const nextDate = String(point.date || point.measurementDate || '');
        if (!currentPoint) monthPoints.push({ beneficiaryId, point });
        else if (nextDate.localeCompare(currentDate) > 0) currentPoint.point = point;
        pointsByMonth.set(monthKey, monthPoints);
      });
    });
    const growthSeries = [...pointsByMonth.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([monthKey, monthRecords]) => {
      const points = monthRecords.map(({ point }) => point);
      const weightForLengthMode = getModeSummary(points.map((point) => point.weightForLengthInterpretation));
      const weightForAgeMode = getModeSummary(points.map((point) => point.weightForAgeInterpretation));
      const lengthForAgeMode = getModeSummary(points.map((point) => point.lengthForAgeInterpretation));
      return {
      ageWeeks: averageNumeric(points.map((point) => point.ageWeeks)),
      date: points.map((point) => point.date || point.measurementDate).filter(Boolean).sort().at(-1) || '',
      weight: averageNumeric(points.map((point) => point.weight)),
      height: averageNumeric(points.map((point) => point.height)),
      bmi: averageNumeric(points.map((point) => point.bmi)),
      weightForLengthZScore: averageNumeric(points.map((point) => point.weightForLengthZScore)),
      weightForAgeZScore: averageNumeric(points.map((point) => point.weightForAgeZScore)),
      lengthForAgeZScore: averageNumeric(points.map((point) => point.lengthForAgeZScore)),
      weightForLengthInterpretation: weightForLengthMode.mode,
      weightForLengthInterpretationModeCount: weightForLengthMode.count,
      weightForLengthInterpretationModeTotal: weightForLengthMode.total,
      weightForAgeInterpretation: weightForAgeMode.mode,
      weightForAgeInterpretationModeCount: weightForAgeMode.count,
      weightForAgeInterpretationModeTotal: weightForAgeMode.total,
      lengthForAgeInterpretation: lengthForAgeMode.mode,
      lengthForAgeInterpretationModeCount: lengthForAgeMode.count,
      lengthForAgeInterpretationModeTotal: lengthForAgeMode.total,
    };
    });
    return {
      ...groupRows[0],
      child: groupName,
      mother: groupName,
      weightForAge: averageNumeric(groupRows.map((row) => row.weightForAge)),
      heightForAge: averageNumeric(groupRows.map((row) => row.heightForAge)),
      bmiForAge: averageNumeric(groupRows.map((row) => row.bmiForAge)),
      bmiInterpretation: getBmiInterpretation(averageNumeric(groupRows.map((row) => row.bmiForAge))),
      weightForLengthInterpretation: normalizeNutritionLabel(getMode(groupRows.map((row) => row.weightForLengthInterpretation))),
      weightForAgeInterpretation: normalizeNutritionLabel(getMode(groupRows.map((row) => row.weightForAgeInterpretation))),
      lengthForAgeInterpretation: normalizeNutritionLabel(getMode(groupRows.map((row) => row.lengthForAgeInterpretation))),
      growthSeries,
      isGroupAggregate: true,
    };
  });
};

export const aggregateReportRows = (rows, focus) => {
  const groupField = focus === 'batch-group' || focus === 'batch-school'
    ? 'batch'
    : focus === 'group-school' ? 'group' : null;
  if (!groupField) return rows;

  const groupedRows = new Map();
  rows.forEach((row) => {
    const key = row[groupField] || `Unassigned ${groupField}`;
    const groupRows = groupedRows.get(key) || [];
    groupRows.push(row);
    groupedRows.set(key, groupRows);
  });

  return [...groupedRows.entries()].map(([groupName, groupRows]) => {
    const firstRow = groupRows[0] || {};
    const totalActivities = groupRows.reduce((sum, row) => sum + Number(row.totalActivities || 0), 0);
    const progress = totalActivities
      ? Math.round(groupRows.reduce((sum, row) => sum + Number(row.progress || 0) * Number(row.totalActivities || 0), 0) / totalActivities)
      : Math.round(groupRows.reduce((sum, row) => sum + Number(row.progress || 0), 0) / Math.max(groupRows.length, 1));

    return {
      ...firstRow,
      mother: groupField === 'group' ? groupName : '',
      child: groupField === 'group' ? groupName : '',
      group: groupField === 'group' ? groupName : firstRow.group,
      batch: groupField === 'batch' ? groupName : firstRow.batch,
      activitiesCompleted: groupRows.reduce((sum, row) => sum + Number(row.activitiesCompleted || 0), 0),
      totalActivities,
      progress,
      receivedBenefitTotal: groupRows.reduce((sum, row) => sum + Number(row.receivedBenefitTotal || 0), 0),
      receivedBenefitFrequency: groupRows.reduce((sum, row) => sum + Number(row.receivedBenefitFrequency || 0), 0),
      receivedBenefitAveragePerMonth: Number((groupRows.reduce((sum, row) => sum + Number(row.receivedBenefitAveragePerMonth || 0), 0) / Math.max(groupRows.length, 1)).toFixed(1)),
    };
  });
};
