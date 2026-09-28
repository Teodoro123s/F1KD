export const initialPrograms = [
  {
    id: 1,
    name: "Milo Feeding Program",
    type: "Feeding",
    provider: "Milo",
    community: "Cebu Community",
    batch: "March Batch",
    status: "Active",
    target: 24,
    received: 20,
    activities: 6,
    latest: "26/08/2026",
    ended: "",
    clusters: [
      { type: "School", name: "Cebu Community School", beneficiaries: 24, received: 20 },
      { type: "Group", name: "March Nutrition Group", beneficiaries: 14, received: 12 },
      { type: "Batch", name: "March Batch", beneficiaries: 10, received: 8 },
    ],
  },
  {
    id: 2,
    name: "Milk Subsidy",
    type: "Milk Subsidy",
    provider: "Partner A",
    community: "Cebu Community",
    batch: "April Batch",
    status: "Active",
    target: 30,
    received: 26,
    activities: 4,
    latest: "22/08/2026",
    ended: "",
    clusters: [
      { type: "School", name: "Cebu Community School", beneficiaries: 30, received: 26 },
      { type: "Group", name: "April Milk Group", beneficiaries: 30, received: 26 },
      { type: "Batch", name: "April Batch", beneficiaries: 30, received: 26 },
    ],
  },
  {
    id: 3,
    name: "Vitamin Support 2026",
    type: "Vitamin / Supplement",
    provider: "Municipal Health Office",
    community: "Cebu Community",
    batch: "January Batch",
    status: "Ended",
    target: 18,
    received: 18,
    activities: 8,
    latest: "30/07/2026",
    ended: "30/07/2026",
    clusters: [
      { type: "Group", name: "January Wellness Group", beneficiaries: 18, received: 18 },
      { type: "Batch", name: "January Batch", beneficiaries: 18, received: 18 },
    ],
  },
];

export function buildProgramsFromSummary(summary = null) {
  const payload = summary || {};
  const communities = Array.isArray(payload.communities) ? payload.communities : [];
  const batches = Array.isArray(payload.batches) ? payload.batches : [];
  const groups = Array.isArray(payload.groups) ? payload.groups : [];

  if (!communities.length) return [];

  return communities.map((community, index) => {
    const communityBatches = batches.filter((batch) => batch.community === community.name);
    const communityGroups = groups.filter((group) => group.community === community.name);
    const recordCount = Number(community.records || 0);
    const target = Math.max(recordCount, 1);
    const received = Math.min(target, Math.max(0, Math.round(target * 0.8)));

    const clusters = [
      {
        type: "School",
        name: `${community.name} School`,
        beneficiaries: target,
        received,
      },
      ...communityGroups.slice(0, 2).map((group) => ({
        type: "Group",
        name: group.name,
        beneficiaries: Number(group.members || 0) || 1,
        received: Math.min(Number(group.members || 0) || 1, Math.max(1, Math.round((Number(group.members || 0) || 1) * 0.8))),
      })),
      ...communityBatches.slice(0, 2).map((batch) => ({
        type: "Batch",
        name: batch.name || batch.code || `${community.name} Batch`,
        beneficiaries: Number(batch.records || 0) || 1,
        received: Math.min(Number(batch.records || 0) || 1, Math.max(1, Math.round((Number(batch.records || 0) || 1) * 0.8))),
      })),
    ];

    return {
      id: 1000 + index,
      name: `${community.name} Community Support`,
      type: "Community Support",
      provider: "Local Community Program",
      community: community.name,
      batch: communityBatches[0]?.name || "General Batch",
      status: "Active",
      target,
      received,
      activities: Math.max(1, communityBatches.length + communityGroups.length),
      latest: "Recently updated",
      ended: "",
      clusters,
    };
  });
}

export const emptyProgram = {
  name: "",
  type: "Feeding",
  provider: "",
  community: "",
  batch: "",
  beneficiaryType: "Mother",
  description: "",
};

export function filterPrograms(programs, query, status) {
  const term = String(query || '').trim().toLowerCase();
  const requestedStatus = String(status || '').trim().toLowerCase();

  return programs.filter((program) => {
    const programStatus = String(program.status || '').trim().toLowerCase();

    if (requestedStatus && programStatus && programStatus !== requestedStatus) {
      return false;
    }

    if (requestedStatus && !programStatus) {
      return false;
    }

    if (!term) return true;

    const searchableText = [
      program.name,
      program.type,
      program.provider,
      program.community,
      program.batch,
      program.description,
      program.beneficiaryType,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(term);
  });
}

export function normalizeBeneficiaryType(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '');
}

export function recordMatchesProgramScope(record = {}, program = {}) {
  if (!record || !program) return false;

  const requestedType = normalizeBeneficiaryType(program?.beneficiaryType || program?.beneficiary_type || 'Mother and Child');
  const recordType = normalizeBeneficiaryType(record?.type || record?.sourceType || '');

  if (requestedType && requestedType !== 'motherandchild' && recordType && recordType !== requestedType) {
    return false;
  }

  const programClusters = Array.isArray(program.clusters) ? program.clusters : [];
  if (!programClusters.length) return true;

  const programSchoolNames = new Set(programClusters
    .filter((cluster) => cluster?.type === 'School')
    .map((cluster) => String(cluster?.name || '').trim().toLowerCase())
    .filter(Boolean));
  const programGroupNames = new Set(programClusters
    .filter((cluster) => cluster?.type === 'Group')
    .map((cluster) => String(cluster?.name || '').trim().toLowerCase())
    .filter(Boolean));
  const programBatchNames = new Set(programClusters
    .filter((cluster) => cluster?.type === 'Batch')
    .map((cluster) => String(cluster?.name || '').trim().toLowerCase())
    .filter(Boolean));

  const recordSchool = String(record?.school || '').trim().toLowerCase();
  const recordGroup = String(record?.group || '').trim().toLowerCase();
  const recordBatch = String(record?.batch || '').trim().toLowerCase();

  const hasExplicitGroupScope = programGroupNames.size > 0;
  const hasExplicitBatchScope = programBatchNames.size > 0;

  if (hasExplicitGroupScope && recordGroup && ![...programGroupNames].some((name) => name === recordGroup)) {
    return false;
  }
  if (hasExplicitGroupScope && !recordGroup && !recordBatch) {
    return false;
  }

  if (hasExplicitBatchScope && recordBatch && ![...programBatchNames].some((name) => name === recordBatch)) {
    return false;
  }
  if (hasExplicitBatchScope && !recordBatch && !recordGroup) {
    return false;
  }

  if (programSchoolNames.size && recordSchool && ![...programSchoolNames].some((name) => name === recordSchool || name === `${recordSchool} school`)) {
    return false;
  }

  const directSchoolMatch = !programSchoolNames.size || !recordSchool || [...programSchoolNames].some((name) => name === recordSchool || name === `${recordSchool} school`);
  if (!directSchoolMatch) return false;

  return true;
}

export function getCluster(program, type, encodedName) {
  if (!program || !type || !encodedName) return null;
  const name = decodeURIComponent(encodedName);
  return program.clusters.find((cluster) => cluster.type === type && cluster.name === name) || null;
}

export function clusterPath(programId, cluster) {
  return `/program/${programId}/cluster/${cluster.type}/${encodeURIComponent(cluster.name)}`;
}

export function beneficiaryNames(count) {
  return Array.from({ length: count }, (_, index) => `Beneficiary ${String(index + 1).padStart(3, "0")}`);
}
