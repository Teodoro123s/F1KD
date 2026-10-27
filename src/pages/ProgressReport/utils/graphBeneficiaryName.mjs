const NAME_SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v']);

export const formatGraphBeneficiaryName = (value) => {
  const parts = String(value ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || 'Beneficiary';

  const lastPart = parts.at(-1);
  const suffix = NAME_SUFFIXES.has(lastPart.replace(/\./g, '').toLowerCase()) ? parts.pop() : '';
  const surname = parts.pop();
  const initials = parts.map((part) => `${part[0].toUpperCase()}.`);
  return [`${surname}${suffix ? ` ${suffix}` : ''},`, ...initials].join(' ');
};
