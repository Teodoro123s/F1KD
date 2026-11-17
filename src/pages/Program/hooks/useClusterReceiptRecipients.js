import { useEffect, useState } from 'react';
import { apiGetChildren } from '../../../api/children';
import { apiGetMothers } from '../../../api/mothers';
import { apiGetPrograms } from '../../../api/programs';
import {
  getRecipientKey,
  isValidRecipient,
  normalizeScopeValue,
} from '../utils/receiptHistoryUtils.mjs';

export default function useClusterReceiptRecipients({
  programId,
  clusterName,
  clusterType,
  isClusterHistory,
  locationState,
  setError,
}) {
  const [clusterRecipients, setClusterRecipients] = useState([]);
  const [selectedRecipientKeys, setSelectedRecipientKeys] = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(isClusterHistory);

  useEffect(() => {
    if (!isClusterHistory) {
      setClusterRecipients([]);
      setSelectedRecipientKeys([]);
      setRecipientsLoading(false);
      return undefined;
    }

    let active = true;
    setRecipientsLoading(true);
    const loadClusterRecipients = async () => {
      const passedRecipients = (Array.isArray(locationState?.beneficiaries) ? locationState.beneficiaries : [])
        .filter(isValidRecipient)
        .map((recipient) => ({ ...recipient, type: String(recipient.type).toLowerCase() }));
      let recipients = passedRecipients;

      if (!recipients.length) {
        const programsResponse = await apiGetPrograms();
        const program = (programsResponse?.programs || []).find((item) => String(item.id) === String(programId));
        if (!program) throw new Error("Unable to determine this project's eligible beneficiary type.");
        const programType = String(program.beneficiaryType || program.beneficiary_type || 'Mother')
          .trim()
          .toLowerCase()
          .replace(/&/g, 'and')
          .replace(/\s+/g, ' ');
        const includeMothers = programType === 'mother' || programType === 'mother and child';
        const includeChildren = programType === 'child' || programType === 'mother and child';
        if (!includeMothers && !includeChildren) {
          throw new Error('This program has an unsupported beneficiary type.');
        }
        const [mothersResponse, childrenResponse] = await Promise.all([
          includeMothers ? apiGetMothers() : Promise.resolve({ mothers: [] }),
          includeChildren ? apiGetChildren() : Promise.resolve({ children: [] }),
        ]);
        const mothers = mothersResponse?.mothers || [];
        const children = childrenResponse?.children || [];
        const scope = normalizeScopeValue(clusterName);
        const matchesScope = (entity, type) => {
          if (type === 'group') return normalizeScopeValue(entity.group || entity.group_name || entity.groupName) === scope;
          if (type === 'batch') return normalizeScopeValue(entity.batch || entity.batch_name || entity.batchName) === scope;
          return normalizeScopeValue(entity.community || entity.community_name || entity.school) === scope;
        };

        recipients = [
          ...(includeMothers ? mothers : []).filter((mother) => matchesScope(mother, clusterType)).map((mother) => ({
            id: mother.raw?.id || mother.id || mother.motherId,
            type: 'mother',
            name: mother.name || [mother.firstName, mother.lastName].filter(Boolean).join(' '),
          })),
          ...(includeChildren ? children : []).filter((child) => matchesScope(child, clusterType)).map((child) => ({
            id: child.id || child.child_id,
            type: 'child',
            name: child.name || [child.first_name, child.last_name].filter(Boolean).join(' '),
          })),
        ].filter(isValidRecipient);
      }

      const uniqueRecipients = [...new Map(recipients.map((recipient) => [getRecipientKey(recipient), recipient])).values()];
      if (active) {
        setClusterRecipients(uniqueRecipients);
        setSelectedRecipientKeys(uniqueRecipients.map(getRecipientKey));
        setRecipientsLoading(false);
      }
    };

    loadClusterRecipients().catch((loadError) => {
      if (!active) return;
      setClusterRecipients([]);
      setSelectedRecipientKeys([]);
      setRecipientsLoading(false);
      setError(loadError.message || 'Unable to load beneficiaries for this cluster.');
    });

    return () => { active = false; };
  }, [clusterName, clusterType, isClusterHistory, locationState, programId, setError]);

  return {
    clusterRecipients,
    selectedRecipientKeys,
    setSelectedRecipientKeys,
    recipientsLoading,
  };
}
