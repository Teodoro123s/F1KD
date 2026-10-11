export function getUserDraftKey(draftType, userId) {
  if (!draftType || userId === null || userId === undefined || userId === '') return null;
  return `f1kd.draft.${encodeURIComponent(String(draftType))}.${encodeURIComponent(String(userId))}`;
}
