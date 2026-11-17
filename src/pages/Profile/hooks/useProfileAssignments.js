import { useEffect, useState } from 'react';
import { getSummary } from '../../Community/communityService';

export default function useProfileAssignments(user) {
  const [assignedSchoolName, setAssignedSchoolName] = useState('');
  const [assignedGroupName, setAssignedGroupName] = useState('');

  useEffect(() => {
    let active = true;

    if (!user?.school_id && !user?.schoolId) {
      setAssignedSchoolName('Not assigned');
      setAssignedGroupName('Not assigned');
      return undefined;
    }

    getSummary()
      .then((summary) => {
        if (!active) return;
        const schoolId = user.school_id ?? user.schoolId;
        const school = (summary.communities || []).find((item) => String(item.id) === String(schoolId));
        setAssignedSchoolName(school?.name || `School ID ${schoolId}`);

        const groupId = user.group_id ?? user.groupId;
        const group = (summary.groups || []).find((item) => String(item.id) === String(groupId));
        setAssignedGroupName(group?.name || (groupId ? `Group ID ${groupId}` : 'Not assigned'));
      })
      .catch(() => {
        if (!active) return;
        setAssignedSchoolName(user?.school_id || user?.schoolId ? `School ID ${user.school_id ?? user.schoolId}` : 'Not assigned');
        setAssignedGroupName('Not assigned');
      });

    return () => { active = false; };
  }, [user]);

  return { assignedSchoolName, assignedGroupName };
}
