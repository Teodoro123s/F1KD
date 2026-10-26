import React from 'react';
import { formatDateTimeForDisplay } from '../../utils/formatting/dateFormat';

export default function AuditSignatures({
  createdByName,
  createdByRole,
  createdAt,
  updatedByName,
  updatedByRole,
  updatedAt,
}) {
  const createdTimestamp = formatDateTimeForDisplay(createdAt);
  const updatedTimestamp = formatDateTimeForDisplay(updatedAt);

  const hasCreatedDetails = createdByName || createdByRole || createdAt;
  const hasUpdatedDetails = updatedByName || updatedByRole || updatedAt;
  if (!hasCreatedDetails && !hasUpdatedDetails) return null;

  return (
    <div className="audit-signatures" aria-label="Record audit signatures">
      {hasCreatedDetails && (
        <span>
          <strong>Created by:</strong> {createdByName ? `${createdByName}${createdByRole ? ` · ${createdByRole}` : ''}` : createdByRole}
          {createdTimestamp && <> · <time dateTime={createdAt instanceof Date ? createdAt.toISOString() : createdAt}>{createdTimestamp}</time></>}
        </span>
      )}
      {hasUpdatedDetails && (
        <span>
          <strong>Updated by:</strong> {updatedByName ? `${updatedByName}${updatedByRole ? ` · ${updatedByRole}` : ''}` : updatedByRole}
          {updatedTimestamp && <> · <time dateTime={updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt}>{updatedTimestamp}</time></>}
        </span>
      )}
    </div>
  );
}
