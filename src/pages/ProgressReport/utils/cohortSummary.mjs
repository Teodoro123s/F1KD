const quantile = (sortedValues, fraction) => {
  if (!sortedValues.length) return null;
  const position = (sortedValues.length - 1) * fraction;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const weight = position - lowerIndex;
  return sortedValues[lowerIndex] + ((sortedValues[upperIndex] - sortedValues[lowerIndex]) * weight);
};

const visibleEntries = (entries, displayWeeks) => {
  const timelines = [...new Set(entries.map(({ timeline }) => timeline))].sort();
  const normalizedDisplayWeeks = String(displayWeeks ?? 'all').toLowerCase();
  const rangeSpec = normalizedDisplayWeeks.startsWith('range:')
    ? normalizedDisplayWeeks.slice(6).split(':')
    : null;
  let visibleTimelines = timelines;

  if (rangeSpec?.[0] && rangeSpec?.[1]) {
    visibleTimelines = timelines.filter((timeline) => timeline >= rangeSpec[0] && timeline <= rangeSpec[1]);
  } else {
    const requestedCount = Number(normalizedDisplayWeeks);
    if (normalizedDisplayWeeks !== 'all' && Number.isFinite(requestedCount) && requestedCount > 0 && requestedCount < timelines.length) {
      visibleTimelines = timelines.slice(-requestedCount);
    }
  }

  const visibleTimelineSet = new Set(visibleTimelines);
  return { visibleTimelines, entries: entries.filter(({ timeline }) => visibleTimelineSet.has(timeline)) };
};

export const summarizeNumericCohort = (entries, displayWeeks = 'all') => {
  const { visibleTimelines, entries: selectedEntries } = visibleEntries(entries, displayWeeks);
  return visibleTimelines.map((timeline) => {
    const values = selectedEntries
      .filter((entry) => entry.timeline === timeline && Number.isFinite(entry.value))
      .map((entry) => entry.value)
      .sort((left, right) => left - right);

    return {
      timeline,
      count: values.length,
      median: quantile(values, 0.5),
      lowerQuartile: quantile(values, 0.25),
      upperQuartile: quantile(values, 0.75),
    };
  }).filter(({ count }) => count > 0);
};

export const summarizeInterpretationCohort = (entries, categories, displayWeeks = 'all') => {
  const validEntries = entries.filter(({ interpretation }) => categories.includes(interpretation));
  const { visibleTimelines, entries: selectedEntries } = visibleEntries(validEntries, displayWeeks);
  return visibleTimelines.map((timeline) => {
    const monthEntries = selectedEntries.filter((entry) => entry.timeline === timeline);
    const counts = Object.fromEntries(categories.map((category) => [category, 0]));
    monthEntries.forEach(({ interpretation }) => {
      if (Object.hasOwn(counts, interpretation)) counts[interpretation] += 1;
    });

    return {
      timeline,
      count: monthEntries.length,
      categories: counts,
    };
  }).filter(({ count }) => count > 0);
};
