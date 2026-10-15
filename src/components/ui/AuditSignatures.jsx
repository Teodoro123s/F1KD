import React from 'react';
import { formatDateTimeForDisplay } from '../../utils/dateFormat';

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

  if (!createdByName && !updatedByName) return null;

  return (
    <div className="audit-signatures" aria-label="Record audit signatures">
      {createdByName && (
        <span>
          <strong>Created by:</strong> {createdByName}{createdByRole ? ` · ${createdByRole}` : ''}
          {createdTimestamp && <> · <time dateTime={createdAt instanceof Date ? createdAt.toISOString() : createdAt}>{createdTimestamp}</time></>}
        </span>
      )}
      {updatedByName && (
        <span>
          <strong>Updated by:</strong> {updatedByName}{updatedByRole ? ` · ${updatedByRole}` : ''}
          {updatedTimestamp && <> · <time dateTime={updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt}>{updatedTimestamp}</time></>}
        </span>
      )}
    </div>
  );
}
