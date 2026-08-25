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
    latest: "Aug 26, 2026",
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
    latest: "Aug 22, 2026",
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
    latest: "Jul 30, 2026",
    ended: "Jul 30, 2026",
    clusters: [
      { type: "Group", name: "January Wellness Group", beneficiaries: 18, received: 18 },
      { type: "Batch", name: "January Batch", beneficiaries: 18, received: 18 },
    ],
  },
];

export const emptyProgram = {
  name: "",
  type: "Feeding",
  provider: "",
  community: "",
  batch: "",
  beneficiaryType: "Mother and Child",
  description: "",
};

export function filterPrograms(programs, query, status) {
  const term = query.trim().toLowerCase();
  return programs.filter((program) => {
    if (program.status !== status) return false;
    if (!term) return true;
    return `${program.name} ${program.type} ${program.provider} ${program.community} ${program.batch}`
      .toLowerCase()
      .includes(term);
  });
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
