export const sanitizeCurrencyAmount = (value) => {
  const input = String(value ?? '').replace(/[^\d.]/g, '');
  if (!input) return '';

  const decimalIndex = input.indexOf('.');
  if (decimalIndex === -1) return input;

  const integer = input.slice(0, decimalIndex);
  const fraction = input.slice(decimalIndex + 1).replace(/\./g, '').slice(0, 2);
  return `${integer}.${fraction}`;
};

export const normalizeCurrencyAmount = (value) => {
  const sanitized = sanitizeCurrencyAmount(value);
  if (!sanitized) return '';

  const [integerPart, fractionPart] = sanitized.split('.');
  const integer = (integerPart || '0').replace(/^0+(?=\d)/, '');
  return fractionPart ? `${integer}.${fractionPart}` : integer;
};

export const formatCurrencyAmount = (value) => {
  const normalized = normalizeCurrencyAmount(value);
  if (!normalized) return '';

  const [integer, fraction] = normalized.split('.');
  const groupedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${groupedInteger}.${fraction}` : groupedInteger;
};
