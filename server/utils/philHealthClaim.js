const PHILHEALTH_CLAIM_STATUSES = Object.freeze([
  'Draft',
  'Submitted',
  'Approved',
  'Denied',
  'Paid',
]);

function normalizePhilHealthClaim(input = {}) {
  const claimReference = String(input.claimReference ?? input.claim_reference ?? '').trim();
  const claimDate = String(input.claimDate ?? input.claim_date ?? '').trim();
  const status = String(input.status ?? 'Draft').trim();
  const rawAmount = String(input.amount ?? '').trim();
  const notes = String(input.notes ?? '').trim();

  if (claimReference.length > 80) {
    return { error: 'Claim reference must be 80 characters or fewer.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(claimDate)) {
    return { error: 'A valid claim date is required.' };
  }
  const parsedDate = new Date(`${claimDate}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== claimDate) {
    return { error: 'A valid claim date is required.' };
  }
  if (!PHILHEALTH_CLAIM_STATUSES.includes(status)) {
    return { error: 'Choose a valid claim status.' };
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(rawAmount)) {
    return { error: 'Claim amount must be a non-negative number with up to 2 decimal places.' };
  }
  const amount = Number(rawAmount);
  if (!Number.isFinite(amount) || amount > 1_000_000) {
    return { error: 'Claim amount must not exceed 1,000,000.00.' };
  }
  if (notes.length > 1000) {
    return { error: 'Claim notes must be 1,000 characters or fewer.' };
  }

  return {
    claim: {
      claimReference: claimReference || null,
      claimDate,
      status,
      amount: amount.toFixed(2),
      notes: notes || null,
    },
  };
}

module.exports = { PHILHEALTH_CLAIM_STATUSES, normalizePhilHealthClaim };
